export type AssistantProduct = {
  id: number; name: string; price: number; url: string; image: string; brand?: string;
  sellerStoreName?: string; stockStatus?: string; stockLabel?: string; averageRating?: number | null;
  ratingCount?: number; canAddToCart?: boolean; type?: string;
  specifications: {label: string; value: string}[];
}
export type AssistantReply = {
  answer: string; products: AssistantProduct[]; aiUsed: boolean; clarification?: boolean;
  filters: {key: string; value: string | number; label: string}[]; relaxedFilters: string[]; followups: string[];
}
export function safeProductImage(value: unknown) {
  try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '/product-placeholder.svg' } catch { return '/product-placeholder.svg' }
}
export function normalizeAssistantReply(body: unknown): AssistantReply {
  if (!body || typeof body !== 'object') throw new Error('Invalid assistant response.')
  const raw = body as Record<string, unknown>
  if (typeof raw.answer !== 'string' || !Array.isArray(raw.products)) throw new Error('Invalid assistant response.')
  const seen = new Set<number>()
  const products = raw.products.flatMap((value): AssistantProduct[] => {
    if (!value || typeof value !== 'object') return []
    try {
      const p = value as AssistantProduct; const url = new URL(p.url)
      if (!Number.isSafeInteger(p.id) || p.id <= 0 || seen.has(p.id) || typeof p.name !== 'string' || !Number.isFinite(p.price) || p.price <= 0 || url.origin !== 'https://store.digitalhood.info' || !/^\/product\/[^/]+$/.test(url.pathname) || url.username || url.password) return []
      seen.add(p.id)
      return [{id:p.id, price:p.price, name:p.name.slice(0,130), url:url.href, image:safeProductImage(p.image),
        brand:typeof p.brand === 'string' ? p.brand.slice(0,40) : '',
        sellerStoreName:typeof p.sellerStoreName === 'string' ? p.sellerStoreName.slice(0,100) : '',
        stockStatus:['instock','outofstock','onbackorder'].includes(p.stockStatus || '') ? p.stockStatus : 'unknown',
        stockLabel:typeof p.stockLabel === 'string' ? p.stockLabel.slice(0,100) : '',
        type:typeof p.type === 'string' ? p.type.slice(0,30) : '',
        canAddToCart:p.canAddToCart === true,
        averageRating:typeof p.averageRating === 'number' && Number.isFinite(p.averageRating) ? Math.max(0,Math.min(5,p.averageRating)) : null,
        ratingCount:Number.isSafeInteger(p.ratingCount) && (p.ratingCount || 0)>0 ? p.ratingCount : 0,
        specifications:Array.isArray(p.specifications) ? p.specifications.filter(s => typeof s?.label === 'string' && typeof s?.value === 'string').slice(0,6).map(s => ({label:s.label.slice(0,60),value:s.value.slice(0,90)})) : []}]
    } catch { return [] }
  }).slice(0,12)
  const filters = Array.isArray(raw.filters) ? raw.filters.filter(f => f && ['brand','category','maxPrice'].includes(f.key) && typeof f.label === 'string').slice(0,3).map(f=>({key:f.key,value:typeof f.value === 'number' || typeof f.value === 'string' ? f.value : '',label:f.label.slice(0,100)})) : []
  return {answer:raw.answer.slice(0,1200), products, aiUsed:raw.aiUsed === true, clarification:raw.clarification === true, filters, relaxedFilters:Array.isArray(raw.relaxedFilters) ? raw.relaxedFilters.filter(k => k === 'maxPrice') : [], followups:Array.isArray(raw.followups) ? raw.followups.filter(f => typeof f === 'string').slice(0,3).map(f => f.slice(0,80)) : []}
}
export async function readAssistantResponse(response: Response, onText: (text: string) => void) {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) return normalizeAssistantReply(await response.json())
  if (!response.body) throw new Error('The response was interrupted.')
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let answer = ''; let bytes = 0; let result: AssistantReply | null = null
  try {
    while (true) {
      const {value, done} = await reader.read(); if (done) break
      bytes += value.length; if (bytes > 65536) throw new Error('Assistant response too large.')
      buffer += decoder.decode(value,{stream:true})
      let boundary
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0,boundary); buffer = buffer.slice(boundary+2)
        const event = frame.match(/^event: (.+)$/m)?.[1]; const data = frame.match(/^data: (.+)$/m)?.[1]
        if (!data) continue
        const body = JSON.parse(data)
        if (event === 'text' && typeof body.text === 'string') { answer = (answer + body.text).slice(0,1200); onText(answer) }
        if (event === 'result') result = normalizeAssistantReply(body)
      }
    }
    if (!result) throw new Error('The response was interrupted. Please try again.')
    return result
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
export function canConfirmAssistantCart(product: {id:number; price:number; type:string; hasOptions:boolean; purchasable:boolean; canAddToCart:boolean; stockStatus:string; sellerKey?:string; seller?:{key?:string}|null}, expectedId: number) {
  return product.id === expectedId && product.type === 'simple' && !product.hasOptions && product.purchasable === true && product.canAddToCart === true && product.stockStatus === 'instock' && Number.isFinite(product.price) && product.price > 0 && Boolean(product.sellerKey || product.seller?.key)
}

export function resolveAssistantContext(message:string,explicitIds:number[],selectedIds:number[],previousIds:number[]):number[]{
 if(explicitIds.length)return explicitIds.slice(0,4)
 if(/^(?:hello|hi|hey|thanks|thank you)\b/i.test(message) || /^(?:find|show|search|i (?:want|need)|looking for)\b/i.test(message))return []
 const compare=/\b(?:compare|comparison|versus|which.*better|difference)\b/i.test(message)
 const followup=/\b(?:it|this|that|these|those|them|which one|worth|specifications)\b/i.test(message)
 if(!compare && !followup)return []
 if(selectedIds.length)return selectedIds.slice(0,4)
 if(/\btop two\b/i.test(message))return previousIds.slice(0,2)
 return previousIds.length<=4 ? previousIds : []
}
