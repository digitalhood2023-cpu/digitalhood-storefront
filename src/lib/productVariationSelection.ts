type Options = Array<{ name: string; options: string[]; variation?: boolean }>
type Variant = { id: number; attributes: Record<string, string> }

export function purchaseOptions<T extends Options[number]>(options: T[]) {
  return options.filter(option => option.variation !== false)
}
// Woo's blank/missing option means "Any", not an empty required selection.
// Prefer a uniquely more-specific combination; ambiguous rows fail closed.
export function selectMatchingVariation<T extends Variant>(rows: T[], options: Options, selected: Record<string, string>): T | null {
  const required = purchaseOptions(options)
  if (!required.length || !required.every(o => Boolean(selected[o.name]) && o.options.includes(selected[o.name]))) return null
  const candidates = rows.filter(row => required.every(o => !row.attributes[o.name] || row.attributes[o.name] === selected[o.name]))
    .map(row => ({ row, score: required.filter(o => Boolean(row.attributes[o.name])).length }))
    .sort((a,b) => b.score-a.score)
  if (!candidates.length || candidates[1]?.score === candidates[0].score) return null
  return candidates[0].row
}
export function selectionForVariation(row: Variant, options: Options, previous: Record<string, string>) {
  return Object.fromEntries(purchaseOptions(options).map(o => [o.name,
    row.attributes[o.name] || (o.options.includes(previous[o.name]) ? previous[o.name] : o.options[0] || '')]))
}
type Stock = { stockManagedByParent?: boolean; stockQuantity?: number | null; stockStatus?: string; stockLabel?: string; stockTone?: string; canAddToCart?: boolean;
  stock_quantity?: number | null; stock_status?: string; stock_label?: string; stock_tone?: string; can_add_to_cart?: boolean }
export function effectiveVariationStock<T extends Stock>(parent: Stock, row: T): T {
  if (!row.stockManagedByParent) return row
  const status = parent.stockStatus ?? parent.stock_status
  const quantity = parent.stockQuantity ?? parent.stock_quantity ?? null
  const available = status !== 'outofstock' && (status === 'onbackorder' || quantity == null || quantity > 0) && row.canAddToCart !== false && row.can_add_to_cart !== false
  return { ...row, stockQuantity: quantity, stock_quantity: quantity, stockStatus: status, stock_status: status,
    stockLabel: parent.stockLabel, stock_label: parent.stockLabel ?? parent.stock_label, stockTone: parent.stockTone, stock_tone: parent.stockTone ?? parent.stock_tone,
    canAddToCart: available, can_add_to_cart: available }
}
