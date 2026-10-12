import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {useRecentlyViewed} from '@/context/RecentlyViewedContext'
import {deriveHomeDiscoveryInterests} from '@/lib/homeDiscovery'
import {fetchMarketplaceProducts,type WooProduct} from '@/lib/woocommerce'
import type {AssistantProduct} from '@/lib/shoppingAssistant'

export default function AssistantDiscovery({searches,products}:{searches:string[];products:AssistantProduct[]}) {
 const {items}=useRecentlyViewed()
 const interests=deriveHomeDiscoveryInterests({searches,recentlyViewed:items.slice(0,10)})
 const key=interests.join('|')
 const [recommended,setRecommended]=useState<WooProduct[]>([])
 const [matchedInterest,setMatchedInterest]=useState(false)
 const [loading,setLoading]=useState(false)
 const [failed,setFailed]=useState(false)
 const [page,setPage]=useState(0)
 const [refresh,setRefresh]=useState(0)
 useEffect(()=>{
  let cancelled=false;setLoading(true);setFailed(false);setPage(0)
  const query=interests[0] || ''
  async function load(){
   try{
    let result=await fetchMarketplaceProducts({query,perPage:12,sort:'featured'})
    const matched=Boolean(query && result.products.length)
    if(query && !result.products.length)result=await fetchMarketplaceProducts({perPage:12,sort:'featured'})
    if(!cancelled){setRecommended(result.products);setMatchedInterest(matched)}
   }catch{if(!cancelled){setFailed(true);setRecommended([])}}
   finally{if(!cancelled)setLoading(false)}
  }
  void load();return ()=>{cancelled=true}
 },[key,refresh])
 const cards=useMemo(()=>{
  const merged=[...products.map(p=>({id:p.id,name:p.name,price:p.price,url:new URL(p.url).pathname,image:p.image,reason:'From your search'})),...recommended.filter(p=>p.slug).map(p=>({id:p.id,name:p.name,price:p.price,url:'/product/'+encodeURIComponent(p.slug),image:p.images[0] || '/product-placeholder.svg',reason:matchedInterest?'Related to your searches or recently viewed categories':'Explore the catalogue'}))]
  return merged.filter((p,i)=>merged.findIndex(x=>x.id===p.id)===i).slice(0,18)
 },[products,recommended,key,matchedInterest])
 const pages=Math.max(1,Math.ceil(cards.length/3));const current=Math.min(page,pages-1)
 return <aside className="ai-discovery" aria-label="Product discovery"><h2>Product discovery</h2><p>Real listings based on your searches and recently viewed products.</p><button type="button" disabled={loading} onClick={()=>setRefresh(v=>v+1)}>Refresh suggestions</button>
 {loading && <p role="status">Finding products…</p>}
 {failed && <p role="status">Recommendations are unavailable. Your search results and the shop remain available.</p>}
 {!loading && !cards.length && <p>Explore the shop or search for a product to find suggestions.</p>}
 {cards.slice(current*3,current*3+3).map(p=><Link className="ai-mini" key={p.id} to={p.url}><img src={p.image.startsWith('https://')?p.image:'/product-placeholder.svg'} alt="" width={64} height={64} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/product-placeholder.svg'}}/><span><strong>{p.name}</strong><small>{Number.isFinite(p.price)&&p.price>0?new Intl.NumberFormat('en-ZM',{style:'currency',currency:'ZMW'}).format(p.price):'Check live price'}</small><small>{p.reason}</small><small>View product →</small></span></Link>)}
 {pages>1 && <div className="ai-actions"><button type="button" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><small>{current+1} / {pages}</small><button type="button" disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</button></div>}
 <Link to="/shop">Explore all products →</Link><p className="ai-source">Suggestions use marketplace listings. Verify stock, seller and delivery on the listing and checkout. No paid placement is added here.</p>
 </aside>
}
