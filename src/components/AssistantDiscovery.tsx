import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {fetchMarketplaceProducts,type WooProduct} from '@/lib/woocommerce'
import {shuffleDiscovery,nextDiscoveryStep} from '@/lib/assistantDiscovery'

export default function AssistantDiscovery({excludedIds}:{excludedIds:number[]}) {
 const [pool,setPool]=useState<WooProduct[]>([])
 const [cards,setCards]=useState<WooProduct[]>([])
 const [loading,setLoading]=useState(false)
 const [failed,setFailed]=useState(false)
 const [page,setPage]=useState(0)
 const [sourcePage,setSourcePage]=useState(1)
 const [totalPages,setTotalPages]=useState(1)
 const seen=useRef(new Set<number>())
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches
 const [engaged,setEngaged]=useState(false)
 const first=useRef<number|undefined>(undefined)
 const exclusionKey=excludedIds.join(',')
 useEffect(()=>{
  let cancelled=false;setLoading(true);setFailed(false)
  fetchMarketplaceProducts({page:sourcePage,perPage:50,sort:'featured'}).then(result=>{if(!cancelled){setTotalPages(Math.max(1,Math.floor(result.totalPages)));const fresh=result.products.filter(p=>Boolean(p.slug)&&!seen.current.has(p.id));fresh.forEach(p=>seen.current.add(p.id));setPool(fresh)}}).catch(()=>{if(!cancelled)setFailed(true)}).finally(()=>{if(!cancelled)setLoading(false)})
  return ()=>{cancelled=true}
 },[sourcePage])
 useEffect(()=>{const next=shuffleDiscovery(pool,excludedIds,first.current);setCards(next);first.current=next[0]?.id;setPage(0)},[pool,exclusionKey])
 const pages=Math.max(1,Math.ceil(cards.length/5));const current=Math.min(page,pages-1)
 function advance(){
  const next=nextDiscoveryStep(current,pages,sourcePage,totalPages)
  if(next.cycleComplete)seen.current.clear()
  if(next.sourcePage!==sourcePage){setSourcePage(next.sourcePage);setPage(0);return}
  if(next.cycleComplete){setCards(shuffleDiscovery(pool,excludedIds,cards[0]?.id));setPage(0);return}
  setPage(next.page)
 }
 useEffect(()=>{
  if(reducedMotion || engaged || loading || (!cards.length && totalPages===1))return
  const timer=setInterval(()=>{if(!document.hidden)advance()},8000)
  return ()=>clearInterval(timer)
 },[reducedMotion,engaged,loading,current,pages,sourcePage,totalPages,cards])
 function refresh(){advance()}
 return <aside className="ai-discovery" aria-label="Marketplace product slideshow" onMouseEnter={()=>setEngaged(true)} onMouseLeave={()=>setEngaged(false)} onFocusCapture={()=>setEngaged(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setEngaged(false)}}><h2>Discover the marketplace</h2><p>Explore other catalogue products beyond your search.</p><button type="button" disabled={loading || !pool.length} onClick={refresh}>Show different products</button>
 {loading && <p role="status">Finding products…</p>}
 {failed && <p role="status">Discovery is unavailable. <button type="button" onClick={()=>{setFailed(false);setLoading(true);fetchMarketplaceProducts({page:sourcePage,perPage:50,sort:'featured'}).then(r=>setPool(r.products.filter(p=>Boolean(p.slug)))).catch(()=>setFailed(true)).finally(()=>setLoading(false))}}>Retry</button></p>}
 {!loading && !failed && !cards.length && <p>No other products in this selection. Explore the full shop below.</p>}
 <div aria-live="off">{cards.slice(current*5,current*5+5).map(p=><Link className="ai-mini" key={p.id} to={'/product/'+encodeURIComponent(p.slug)}><img src={p.images[0]?.startsWith('https://')?p.images[0]:'/product-placeholder.svg'} alt="" width={64} height={64} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/product-placeholder.svg'}}/><span><strong>{p.name}</strong><small>{Number.isFinite(p.price)&&p.price>0?new Intl.NumberFormat('en-ZM',{style:'currency',currency:'ZMW'}).format(p.price):'Check live price'}</small><small>View product →</small></span></Link>)}</div>
 {(cards.length>0 || totalPages>1) && <div className="ai-actions"><button type="button" disabled={current===0 || loading} onClick={()=>setPage(current-1)}>Previous</button><small>Selection {sourcePage} · {current+1} / {pages}</small><button type="button" disabled={loading} onClick={advance}>Next</button></div>}
 <Link to="/shop">Explore all products →</Link><p className="ai-source">Real marketplace listings. Check current stock, seller and delivery before buying.</p>
 </aside>
}
