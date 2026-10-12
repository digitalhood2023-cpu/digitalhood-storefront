import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {fetchMarketplaceProducts,type WooProduct} from '@/lib/woocommerce'
import {shuffleDiscovery} from '@/lib/assistantDiscovery'

export default function AssistantDiscovery({excludedIds}:{excludedIds:number[]}) {
 const [pool,setPool]=useState<WooProduct[]>([])
 const [cards,setCards]=useState<WooProduct[]>([])
 const [loading,setLoading]=useState(false)
 const [failed,setFailed]=useState(false)
 const [page,setPage]=useState(0)
 const [playing,setPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
 const [engaged,setEngaged]=useState(false)
 const first=useRef<number|undefined>(undefined)
 const exclusionKey=excludedIds.join(',')
 useEffect(()=>{
  let cancelled=false;setLoading(true);setFailed(false)
  fetchMarketplaceProducts({perPage:48,sort:'featured'}).then(result=>{if(!cancelled)setPool(result.products.filter(p=>Boolean(p.slug)))}).catch(()=>{if(!cancelled)setFailed(true)}).finally(()=>{if(!cancelled)setLoading(false)})
  return ()=>{cancelled=true}
 },[])
 useEffect(()=>{const next=shuffleDiscovery(pool,excludedIds,first.current);setCards(next);first.current=next[0]?.id;setPage(0)},[pool,exclusionKey])
 const pages=Math.max(1,Math.ceil(cards.length/3));const current=Math.min(page,pages-1)
 useEffect(()=>{
  if(!playing || engaged || pages<2)return
  const timer=setInterval(()=>{if(!document.hidden)setPage(p=>(p+1)%pages)},8000)
  return ()=>clearInterval(timer)
 },[playing,engaged,pages])
 function refresh(){const next=shuffleDiscovery(pool,excludedIds,cards[current*3]?.id);setCards(next);first.current=next[0]?.id;setPage(0)}
 return <aside className="ai-discovery" aria-label="Marketplace product slideshow" onMouseEnter={()=>setEngaged(true)} onMouseLeave={()=>setEngaged(false)} onFocusCapture={()=>setEngaged(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setEngaged(false)}}><h2>Discover the marketplace</h2><p>Explore other catalogue products beyond your search.</p><button type="button" disabled={loading || !pool.length} onClick={refresh}>Shuffle products</button>
 {loading && <p role="status">Finding products…</p>}
 {failed && <p role="status">Discovery is unavailable. <button type="button" onClick={()=>{setFailed(false);setLoading(true);fetchMarketplaceProducts({perPage:48,sort:'featured'}).then(r=>setPool(r.products.filter(p=>Boolean(p.slug)))).catch(()=>setFailed(true)).finally(()=>setLoading(false))}}>Retry</button></p>}
 {!loading && !failed && !cards.length && <p>No other products in this selection. Explore the full shop below.</p>}
 <div aria-live={playing?'off':'polite'}>{cards.slice(current*3,current*3+3).map(p=><Link className="ai-mini" key={p.id} to={'/product/'+encodeURIComponent(p.slug)}><img src={p.images[0]?.startsWith('https://')?p.images[0]:'/product-placeholder.svg'} alt="" width={64} height={64} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/product-placeholder.svg'}}/><span><strong>{p.name}</strong><small>{Number.isFinite(p.price)&&p.price>0?new Intl.NumberFormat('en-ZM',{style:'currency',currency:'ZMW'}).format(p.price):'Check live price'}</small><small>View product →</small></span></Link>)}</div>
 {pages>1 && <div className="ai-actions"><button type="button" onClick={()=>setPage((current-1+pages)%pages)}>Previous</button><small>{current+1} / {pages}</small><button type="button" onClick={()=>setPage((current+1)%pages)}>Next</button><button type="button" aria-pressed={!playing} onClick={()=>setPlaying(v=>!v)}>{playing?'Pause slideshow':'Play slideshow'}</button></div>}
 <Link to="/shop">Explore all products →</Link><p className="ai-source">Real marketplace listings. Check current stock, seller and delivery before buying.</p>
 </aside>
}
