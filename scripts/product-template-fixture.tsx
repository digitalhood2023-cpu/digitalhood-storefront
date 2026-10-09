import { createRoot } from 'react-dom/client'
import { MarketplaceProductPreview } from '../src/components/product/MarketplaceProductPreview'
import '../src/index.css'

const photo = (color: string) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="720"><rect width="900" height="720" fill="'+color+'"/><rect x="320" y="100" width="260" height="520" rx="42" fill="white"/><text x="450" y="400" text-anchor="middle" font-size="32">CASE</text></svg>')
createRoot(document.getElementById('root')!).render(<main style={{ maxWidth: 1200, margin: 'auto', padding: 12 }}>
  <MarketplaceProductPreview sellerName="Fixture Store" product={{
    name: 'Protective phone case · fixture', productType: 'variable', regularPrice: '399', stockQuantity: 3,
    mainImage: photo('#ddd'), images: [photo('#ddd'), photo('#ccc')], condition: 'new', brand: 'Fixture', sku: 'CASE-BASE', category: 'Phone cases',
    description: '<p>A <strong>protective case</strong> with a clear finish.</p><table><tbody><tr><th>Material</th><td>Silicone</td></tr></tbody></table><script>window.fixtureUnsafe = true</script><a href="javascript:alert(1)">Unsafe link</a><img src="javascript:alert(1)" onerror="window.fixtureUnsafe=true"/>',
    attributes: [{ name: 'Colour', value: 'White' }, { name: 'Size', value: '6.1 inches' }],
    variations: [
      { id: 'red', attributes: { Colour: 'Red' }, regularPrice: '399', salePrice: '299', stockQuantity: 3, sku: 'CASE-RED', condition: 'new', image: photo('#ffaaa0') },
      { id: 'blue', attributes: { Colour: 'Blue' }, regularPrice: '799', stockQuantity: 1, sku: 'CASE-BLUE', condition: 'open box', image: photo('#a0bbff') },
    ],
  }} />
</main>)
