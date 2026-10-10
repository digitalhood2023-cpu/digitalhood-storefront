import { useEffect, useState } from 'react'
import type { PreviewProduct } from './MarketplaceProduct'

export type IndexedVariation = NonNullable<PreviewProduct['variations']>[number] & { wooVariationId?: number }
export type VariationPage = { revision: number; count: number; total: number; page: number; perPage: number; hasMore: boolean; options: Array<{ name: string; values: string[] }>; variants: IndexedVariation[] }
export type VariationQuery = { revision: number; page: number; perPage: number; q: string; attributes: Record<string, string> }

const text = (value: unknown, empty = false) => typeof value === 'string' && value.length <= 240 && (empty || Boolean(value.trim()))
function confirmedPage(value: VariationPage, revision: number, page: number) {
  if (!value || value.revision !== revision || value.page !== page || value.perPage !== 25 ||
      !Number.isSafeInteger(value.total) || value.total < 0 || !Number.isSafeInteger(value.count) || value.count < value.total || value.count > 5000 ||
      !Array.isArray(value.options) || value.options.length > 12 || value.options.some(o => !o || !text(o.name) || !Array.isArray(o.values) || o.values.length > 2000 || o.values.some(v => !text(v)) || new Set(o.values).size !== o.values.length) ||
      new Set(value.options.map(o => o.name)).size !== value.options.length ||
      !Array.isArray(value.variants) || value.variants.length !== Math.min(25, Math.max(0, value.total - (page - 1) * 25)) || value.variants.some(v =>
        !v || !text(v.id) || !v.attributes || typeof v.attributes !== 'object' || Array.isArray(v.attributes) ||
        Object.entries(v.attributes).some(([name, option]) => !text(name) || !text(option, true) || !value.options.some(o => o.name === name && (option === '' || o.values.includes(option)))) ||
        [v.sku, v.regularPrice, v.salePrice, v.condition, v.stockStatus].some(field => field != null && !text(field, true)) ||
        (v.image != null && (typeof v.image !== 'string' || v.image.length > 8192)) ||
        (v.enabled != null && typeof v.enabled !== 'boolean') ||
        (v.manageStock != null && ![true, false, 'parent'].includes(v.manageStock)) ||
        (v.stockQuantity != null && !Number.isSafeInteger(v.stockQuantity))) ||
      new Set(value.variants.map(v => v.id)).size !== value.variants.length || value.hasMore !== (page * 25 < value.total)) throw new Error('The variation page could not be verified. Reload the listing before continuing.')
  return value
}
function price(row: IndexedVariation) {
  const amount = Number(row.salePrice || row.regularPrice)
  return Number.isFinite(amount) && amount > 0 ? 'K' + amount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'No price'
}
function stock(row: IndexedVariation) {
  if (row.enabled === false) return 'Not listed'
  if (row.stockStatus === 'outofstock') return 'Out of stock'
  if (row.manageStock === 'parent') return 'Shared product stock'
  if (row.stockStatus === 'onbackorder') return 'Backorder'
  if (row.stockQuantity == null) return 'Live stock at checkout'
  if (row.stockQuantity <= 0) return 'Out of stock'
  return row.stockQuantity + ' available'
}

// Same bounded read-only browser for seller/admin; transport and auth stay in
// each app. Never generates combinations, saves, submits or changes inventory.
export function MarketplaceVariationBrowser({ revision, load, onSelect, selectedId }: {
  revision: number; load: (query: VariationQuery) => Promise<VariationPage>; onSelect: (row: IndexedVariation) => void; selectedId?: string
}) {
  const [result, setResult] = useState<VariationPage | null>(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setBusy(true); setError('')
      void load({ revision, page, perPage: 25, q: query.trim(), attributes: filters })
        .then(value => { if (!cancelled) setResult(confirmedPage(value, revision, page)) })
        .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load variations.') })
        .finally(() => { if (!cancelled) setBusy(false) })
    }, 180)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [load, revision, page, query, filters, retry])
  const rows = !busy && !error ? result?.variants || [] : []
  return <section className="dh-variation-browser" aria-label="Listing variations" aria-busy={busy}>
    <div className="dh-variation-tools">
      <h2>Variations{result && <small>{result.count} combinations</small>}</h2>
      <label><span className="dh-variation-label">Search SKU or option</span><input aria-label="Search variations" value={query} maxLength={240} placeholder="SKU or option" onChange={e => { setBusy(true); setQuery(e.target.value); setPage(1) }} /></label>
      <button type="button" disabled={busy} onClick={() => { setQuery(''); setFilters({}); setPage(1); setRetry(n => n + 1) }}>Reset</button>
    </div>
    {result && <div className="dh-variation-filters">{result.options.map(option => <label key={option.name}><span>{option.name}</span><select aria-label={'Filter ' + option.name} value={filters[option.name] || ''} onChange={e => {
      setBusy(true); setFilters(current => { const next = { ...current }; if (e.target.value) next[option.name] = e.target.value; else delete next[option.name]; return next }); setPage(1)
    }}><option value="">All</option>{option.values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</div>}
    {busy && <p role="status">Loading variations…</p>}
    {error && <div role="alert">{error}<button type="button" onClick={() => setRetry(n => n + 1)}>Retry</button></div>}
    {!busy && !error && !rows.length && <p role="status">No combinations match these filters.</p>}
    <div className="dh-variation-rows">{rows.map(row => <button type="button" key={row.id} aria-pressed={selectedId === row.id} aria-label={'Preview ' + (Object.entries(row.attributes || {}).map(([name, value]) => name + ': ' + (value || 'Any')).join(' / ') || row.id)} onClick={() => onSelect(row)}>
      <strong>{Object.entries(row.attributes || {}).map(([name, value]) => name + ': ' + (value || 'Any')).join(' / ') || row.id}</strong>
      <span>{row.sku || 'No SKU'}</span><b>{price(row)}</b><span>{stock(row)}</span><small>{row.enabled === false ? 'Not listed' : 'Listed'}</small>
    </button>)}</div>
    <div className="dh-variation-pager"><span>{!busy && !error && result ? result.total + ' matching · page ' + result.page + ' of ' + Math.max(1, Math.ceil(result.total / 25)) : '25 per page'}</span>
      <button type="button" disabled={busy || page <= 1} onClick={() => setPage(n => n - 1)}>Previous</button>
      <button type="button" disabled={busy || Boolean(error) || !result?.hasMore} onClick={() => setPage(n => n + 1)}>Next</button>
    </div>
    <p className="dh-variation-note">Choose a row to preview it. Stock is preserved from WooCommerce; purchase actions stay inactive.</p>
  </section>
}
