import { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MarketplaceProductPreview } from '../src/components/product/MarketplaceProductPreview'
import { MarketplaceVariationBrowser, type IndexedVariation, type VariationQuery, type VariationPage } from '../src/components/product/MarketplaceVariationBrowser'
const rows: IndexedVariation[] = Array.from({ length: 108 }, (_, i) => ({ id: 'v' + i, wooVariationId: 800+i, enabled: true, attributes: { Model: 'Model ' + i }, sku: 'SKU-' + i, regularPrice: String(10+i), salePrice: '', stockQuantity: null, manageStock: 'parent', stockStatus: 'instock', image: '/logo.jpg' }))
function Fixture() {
  const [selected, setSelected] = useState<IndexedVariation | null>(null)
  const [broken, setBroken] = useState(false)
  const [malformed, setMalformed] = useState(false)
  const load = useCallback(async (query: VariationQuery): Promise<VariationPage> => {
    await new Promise(resolve => setTimeout(resolve, query.q === 'SKU-0' ? 450 : 20))
    if (broken) return { variants: null } as unknown as VariationPage
    const filtered = rows.filter(row => (!query.q || row.sku === query.q) && Object.entries(query.attributes).every(([name, value]) => row.attributes?.[name] === value))
    const variants = filtered.slice((query.page-1)*25,query.page*25)
    if (malformed && variants.length) variants[0] = { ...variants[0], attributes: { Model: {} } } as unknown as IndexedVariation
    return { revision: 1, count: 108, options: [{ name: 'Model', values: rows.map(row => row.attributes!.Model) }], total: filtered.length, page: query.page, perPage: 25, hasMore: query.page*25 < filtered.length, variants }
  }, [broken, malformed])
  return <main style={{ maxWidth: 1200, margin: '0 auto', padding: 12 }}>
    <button onClick={() => setBroken(true)}>Simulate unavailable snapshot</button><button onClick={() => setMalformed(true)}>Simulate malformed attributes</button><button onClick={() => { setBroken(false); setMalformed(false) }}>Restore snapshot</button>
    <MarketplaceProductPreview product={{ name: 'Indexed product fixture', mainImage: '/logo.jpg', productType: 'variable', stockQuantity: 7, description: '<p>Fixture product</p>' }} selectedVariation={selected} variationControl={<small>Preview a row below</small>} />
    <MarketplaceVariationBrowser revision={1} load={load} onSelect={setSelected} selectedId={selected?.id} />
  </main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
