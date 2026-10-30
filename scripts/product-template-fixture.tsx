import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { MarketplaceProductPreview } from '../src/components/product/MarketplaceProductPreview'
import '../src/index.css'

const photo = (color: string) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="720"><rect width="900" height="720" fill="'+color+'"/><rect x="320" y="100" width="260" height="520" rx="42" fill="white"/><text x="450" y="400" text-anchor="middle" font-size="32">CASE</text></svg>')
function Fixture() {
const live = new URLSearchParams(location.search).has('live')
const [id, setId] = useState(live ? 6317 : undefined)
return <main style={{ maxWidth: 1200, margin: 'auto', padding: 12 }}>
  {live && <><button type="button" onClick={() => setId(6318)}>Switch product</button><div className="dh-product-layout" style={{ display:'block', margin:'12px 0' }}><div className="dh-product-meta" aria-label="Shopper signals"><span className="dh-product-signal dh-product-signal--rating">4.8 (4)</span><span className="dh-product-signal dh-product-signal--sold">100 sold</span><span className="dh-product-signal dh-product-signal--delivery">Same-day delivery available</span><span className="dh-product-signal dh-product-signal--cutoff">6h 41m left for same-day Lusaka delivery</span></div></div></>}
  <MarketplaceProductPreview sellerName="Fixture Store" product={{
    wooProductId: id,
    name: 'Protective phone case · fixture', productType: 'variable', regularPrice: '399', stockQuantity: 3,
    mainImage: photo('#ddd'), images: [photo('#ddd'), photo('#ccc')], condition: 'new', brand: 'Fixture', sku: 'CASE-BASE', category: 'Phone cases',
    description: '<p>A <strong>protective case</strong> with a clear finish.</p>\n\n<h2>Product features</h2>\n<ul>\n<li><p>Everyday protection</p><ul><li>Reinforced corners</li></ul></li>\n<li>Lightweight finish</li>\n</ul>\n<ol start="3"><li>Fit your device</li><li value="7">Check alignment</li></ol>\n<table><tbody><tr><th>Material</th><td>Silicone</td></tr>'+Array.from({length:30},(_,index)=>`\n<tr><th>Detail ${index}</th><td>Complete product specification retained beyond the former 1,400 character boundary.</td></tr>`).join('')+'</tbody></table>\n<p><img src="/logo.jpg" alt="Product detail photo"></p><script>window.fixtureUnsafe = true</script><a href="javascript:alert(1)">Unsafe link</a><img src="javascript:alert(1)" onerror="window.fixtureUnsafe=true"/>',
    attributes: [{ name: 'Colour', value: 'White' }, { name: 'Size', value: '6.1 inches' }],
    variations: [
      { id: 'red', attributes: { Colour: 'Red' }, regularPrice: '399', salePrice: '299', stockQuantity: 3, sku: 'CASE-RED', condition: 'new', image: photo('#ffaaa0') },
      { id: 'blue', attributes: { Colour: 'Blue' }, regularPrice: '799', stockQuantity: 1, sku: 'CASE-BLUE', condition: 'open box', image: photo('#a0bbff') },
    ],
  }} />
</main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
