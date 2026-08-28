export type ProductSpecificationRow = {
  label: string
  value: string
}

function decodeBasicHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function cleanText(value = '', maximumLength = 600) {
  return decodeBasicHtmlEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength)
}

function normalizeLabel(value = '') {
  return cleanText(value, 100)
    .replace(/^_+/, '')
    .replace(/^(?:pa_|attribute_)/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function extractDescriptionSpecificationRows(descriptionHtml = '') {
  if (!descriptionHtml) return []

  const rows: ProductSpecificationRow[] = []
  const addRow = (rawLabel = '', rawValue = '') => {
    const label = normalizeLabel(rawLabel)
    const value = cleanText(rawValue)

    if (!label || !value || label.length > 100) return
    rows.push({ label, value })
  }

  const tableRowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let tableMatch: RegExpExecArray | null

  while ((tableMatch = tableRowPattern.exec(descriptionHtml)) && rows.length < 80) {
    const cells = Array.from(
      tableMatch[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)
    ).map((match) => match[1])

    if (cells.length >= 2) addRow(cells[0], cells.slice(1).join(', '))
  }

  const definitionPattern = /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi
  let definitionMatch: RegExpExecArray | null

  while ((definitionMatch = definitionPattern.exec(descriptionHtml)) && rows.length < 80) {
    addRow(definitionMatch[1], definitionMatch[2])
  }

  const listItemPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi
  let listItemMatch: RegExpExecArray | null

  while ((listItemMatch = listItemPattern.exec(descriptionHtml)) && rows.length < 80) {
    const text = cleanText(listItemMatch[1])
    const separatorIndex = text.indexOf(':')

    if (separatorIndex > 0 && separatorIndex < 100) {
      addRow(text.slice(0, separatorIndex), text.slice(separatorIndex + 1))
    }
  }

  return rows
}

export function mergeProductSpecificationRows(
  ...collections: ProductSpecificationRow[][]
) {
  const merged: ProductSpecificationRow[] = []
  const byLabel = new Map<string, ProductSpecificationRow>()

  collections.flat().forEach((row) => {
    const label = normalizeLabel(row?.label)
    const value = cleanText(row?.value)
    const key = label.toLowerCase()

    if (!label || !value) return

    const existing = byLabel.get(key)

    if (existing) {
      const values = new Set(existing.value.split(/\s*,\s*/).filter(Boolean))
      values.add(value)
      existing.value = Array.from(values).join(', ').slice(0, 600)
      return
    }

    const normalized = { label, value }
    merged.push(normalized)
    byLabel.set(key, normalized)
  })

  return merged.slice(0, 80)
}
