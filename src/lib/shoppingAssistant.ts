export type AssistantProduct = {
  id: number; name: string; price: number; url: string; image: string; brand?: string;
  sellerStoreName?: string; stockStatus?: string; stockLabel?: string; averageRating?: number | null;
  ratingCount?: number; canAddToCart?: boolean; type?: string;
  whyPicked?:string; specifications: {label: string; value: string}[];
}
export type AssistantReply = {
  searchState?:string; responseMode?: 'answer' | 'results'; answer: string; products: AssistantProduct[]; aiUsed: boolean; clarification?: boolean;
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
      return [{whyPicked:typeof p.whyPicked==='string'?p.whyPicked.slice(0,180):'',id:p.id, price:p.price, name:p.name.slice(0,130), url:url.href, image:safeProductImage(p.image),
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
  return {searchState:typeof raw.searchState==='string'?raw.searchState.slice(0,300):undefined,responseMode:raw.responseMode==='answer'?'answer':'results',answer:raw.answer.slice(0,1200), products, aiUsed:raw.aiUsed === true, clarification:raw.clarification === true, filters, relaxedFilters:Array.isArray(raw.relaxedFilters) ? raw.relaxedFilters.filter(k => k === 'maxPrice') : [], followups:Array.isArray(raw.followups) ? raw.followups.filter(f => typeof f === 'string').slice(0,3).map(f => f.slice(0,80)) : []}
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

export function resolveAssistantContext(message:string,explicitIds:number[],selectedIds:number[],previousIds:number[],focusedIds:number[]=previousIds,knownProducts:{id:number;name:string}[]=[]):number[]{
 if(isAssistantAcknowledgement(message))return []
 if(/\b(?:site|marketplace|shop|store|catalogue)\b.*\b(?:has|have|does|lists?|sells?)\b/i.test(message) && /\b(?:chargers?|mice|mouse|laptops?|phones?|tablets?)\b/i.test(message))return []
 if(/^(?:cheaper|show cheaper|less expensive|more like this|same search|only |under |below |budget )/i.test(message))return []
 if(/^(?:hello|hi|hey|thanks|thank you)\b/i.test(message) || /^(?:find|search|i (?:want|need)|looking for)\b/i.test(message))return []
 if(/\b(?:show|display|list)\s+(?:me\s+)?(?:these|those|the|matching)?\s*(?:products|options|listings|items|again)\b/i.test(message))return previousIds.length<=4?previousIds:[]
 if(explicitIds.length)return explicitIds.slice(0,4)
 const words=message.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w && !['what','whats','s','is','the','price','cost','for','of','how','much','does','it','a','an','tell','me','about','please','this','that','and','have'].includes(w))
 if(words.length>=2 || words.some(w=>/\d/.test(w))){
  const unique=[...new Map(knownProducts.map(p=>[p.id,p])).values()]
  const matches=unique.filter(p=>{const name=p.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ');return words.every(w=>name.includes(w))})
  if(matches.length===1)return [matches[0].id]
  if(matches.length>1)return []
 }
 const compare=/\b(?:compare|comparison|versus|which.*(?:better|best|cheap|expensive)|difference|cheapest|most expensive)\b/i.test(message)
 const followup=/\b(?:it|this|that|these|those|them|which one|worth|specifications|does|has|have|battery|price|cost|how much)\b/i.test(message)
 if(!compare && !followup)return []
 if(selectedIds.length)return selectedIds.slice(0,4)
 if(/\btop two\b/i.test(message))return previousIds.slice(0,2)
 const candidates=compare?previousIds:focusedIds
 return candidates.length<=4 ? candidates : []
}

export type ChatTurn={id:number;question:string;reply:AssistantReply;removeFilters?:string[];photoPreview?:string;feedback?:'up'|'down';taskCompleted?:boolean}
export type AssistantConversation={id:string;title:string;updated:number;turns:ChatTurn[]}
export function normalizeConversations(value:unknown):AssistantConversation[]{
 if(!Array.isArray(value))return []
 const seen=new Set<string>()
 return value.slice(0,20).flatMap(c=>{
  if(!c || typeof c.id!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(c.id) || seen.has(c.id) || !Array.isArray(c.turns))return []
  seen.add(c.id)
  const turns:ChatTurn[]=c.turns.slice(-30).flatMap((t:ChatTurn)=>{try{
   if(typeof t.question!=='string' || !Number.isFinite(t.id))return []
   return [{id:t.id,question:t.question.slice(0,500),reply:normalizeAssistantReply(t.reply),removeFilters:Array.isArray(t.removeFilters)?t.removeFilters.filter(k=>['brand','category','maxPrice'].includes(k)).slice(0,3):[],taskCompleted:t.taskCompleted===true,feedback:t.feedback==='up'||t.feedback==='down'?t.feedback:undefined,photoPreview:typeof t.photoPreview==='string' && t.photoPreview.length<=60000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(t.photoPreview)?t.photoPreview:undefined}]
  }catch{return []}})
  return turns.length?[{id:c.id,title:typeof c.title==='string'?c.title.slice(0,70):turns[0].question.slice(0,70),updated:Number.isFinite(c.updated)?c.updated:0,turns}]:[]
 })
}
export function saveConversation(chats:AssistantConversation[],id:string,turns:ChatTurn[],updated:number):AssistantConversation[]{
 if(!turns.length || (!chats.some(c=>c.id===id) && chats.length>=20))return chats
 const existing=chats.find(c=>c.id===id)
 const conversation={id,title:existing?.title || turns[0].question.slice(0,70),updated,turns:turns.slice(-30)}
 return [conversation,...chats.filter(c=>c.id!==id)].slice(0,20)
}

export function deleteConversation(chats:AssistantConversation[],id:string){return chats.filter(c=>c.id!==id)}

export type ConciergeMetrics={searches:number;refinements:number;cartAdds:number;escalations:number;completed:number;positive:number;negative:number}
export function incrementConciergeMetric(current:Partial<ConciergeMetrics>,key:keyof ConciergeMetrics):ConciergeMetrics{if(!current || typeof current!=='object')current={};const result={searches:0,refinements:0,cartAdds:0,escalations:0,completed:0,positive:0,negative:0};for(const name of Object.keys(result) as (keyof ConciergeMetrics)[])result[name]=Number.isSafeInteger(current[name])&&Number(current[name])>=0?Number(current[name]):0;result[key]++;return result}

export function isAssistantAcknowledgement(text:string){
 const normalized=text.normalize('NFKC').replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu,'').replace(/[.!?,;:]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase()
 return normalized ? /^(?:great|cool|nice|awesome|perfect|brilliant|excellent|lovely|sounds good|looks good|got it|okay|ok|alright|thanks|thank you)(?:\s+(?:mate|thanks|thank you|so much))?$/.test(normalized) : /(?:👍|👌|🙌|👏|🙏|😊|😁|😄|🙂|✅|❤)/u.test(text)
}
