import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, Search } from 'lucide-react'
import { fetchWooProducts, type WooProduct } from '@/lib/woocommerce'
import { getOptimizedImageUrl } from '@/lib/images'
import { isAccessoryListingTitle } from '@/lib/services'
import content from '../../../config/services.json'

const money = new Intl.NumberFormat('en-ZM', {style:'currency',currency:'ZMW'})
export default function AccessoryExplorer() {
  const [group,setGroup] = useState(content.accessoryGroups[0])
  const [products,setProducts] = useState<WooProduct[]>([])
  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading')
  const [retry,setRetry] = useState(0)
  const attempt = useRef(0)
  useEffect(() => {
    const current = ++attempt.current
    setProducts([]);setStatus('loading')
    fetchWooProducts(8,1,group.query).then(response => {
      if (current !== attempt.current) return
      setProducts(response.products.filter(product=>isAccessoryListingTitle(product.name,group.id)));setStatus('ready')
    }).catch(() => { if(current === attempt.current) setStatus('error') })
    return () => { attempt.current += 1 }
  }, [group,retry])
  return <section className="dh-service-panel dh-accessory-explorer" id="accessory-catalogue" aria-labelledby="accessory-catalogue-title">
    <div className="dh-service-section-heading"><div><span className="dh-service-eyebrow">From the marketplace</span><h2 id="accessory-catalogue-title">Find your everyday essentials</h2></div><Link to="/categories">All marketplace categories <ArrowRight /></Link></div>
    <div className="dh-service-tabs" role="group" aria-label="Accessory type">{content.accessoryGroups.map(item => <button type="button" aria-pressed={item.id === group.id} key={item.id} onClick={() => setGroup(item)}>{item.label}</button>)}</div>
    <p className="dh-service-catalogue-note">Current catalogue results for “{group.query}”. Check the exact model and specifications on each listing; matching a keyword does not confirm compatibility.</p>
    <div className="dh-accessory-results" aria-busy={status === 'loading'}>
      {status === 'loading' ? <p role="status"><Loader2 className="animate-spin" /> Loading {group.label.toLowerCase()}…</p> : status === 'error' ? <div role="alert"><h3>The catalogue is taking a break.</h3><p>We could not load these listings. Your enquiry options are still available.</p><button type="button" className="dh-service-secondary" onClick={() => setRetry(n=>n+1)}>Retry catalogue</button></div> : products.length === 0 ? <div role="status"><h3>No listings found in this selection.</h3><p>Try another accessory type, browse the full catalogue, or ask the team about your exact device.</p></div> : <div className="dh-accessory-products">{products.map(product => <Link key={product.id} to={`/product/${encodeURIComponent(product.slug || String(product.id))}`} className="dh-accessory-product"><img src={getOptimizedImageUrl(product.image,'card')} alt="" loading="lazy" width="220" height="160" /><div><h3>{product.name}</h3><strong>{Number.isFinite(product.price) && product.price > 0 ? money.format(product.price) : 'See listing for price'}</strong><span>{product.stockLabel || 'Check listing availability'}</span><span className="dh-service-text-link">View item <ArrowRight /></span></div></Link>)}</div>}
    </div>
    <div className="dh-service-actions"><Link className="dh-service-secondary" to={`/shop?q=${encodeURIComponent(group.query)}`}><Search /> See all {group.label.toLowerCase()}</Link><Link className="dh-service-text-link" to="/services/accessories/request">Ask about compatibility <ArrowRight /></Link></div>
  </section>
}
