import { createHash } from 'node:crypto'

const GOOGLE_NAMESPACE = 'http://base.google.com/ns/1.0'
const DEFAULT_MARKETPLACE_ORIGIN = 'https://store.digitalhood.info'
const DEFAULT_SOURCE_URL =
  'https://digitalhood.info/wp-json/wc/store/v1/products'
const DEFAULT_PAGE_SIZE = 100
const MAX_SOURCE_PAGES = 20
const MAX_ADDITIONAL_IMAGES = 10
const GOOGLE_TITLE_LIMIT = 150
const GOOGLE_DESCRIPTION_LIMIT = 5000

const BRAND_RULES = [
  ['Samsung', /^(?:new\s+)?samsung\b/i],
  ['Apple', /^(?:new\s+)?(?:apple|iphone|ipad|macbook|airpods)\b/i],
  ['HP', /^(?:new\s+)?(?:hp|hewlett[\s-]*packard)\b/i],
  ['Lenovo', /^(?:new\s+)?(?:lenovo|thinkpad|thinkbook|ideapad)\b/i],
  ['Dell', /^(?:new\s+)?dell\b/i],
  ['Tecno', /^(?:new\s+)?tecno\b/i],
  ['Infinix', /^(?:new\s+)?infinix\b/i],
  ['Google', /^(?:new\s+)?(?:google|pixel)\b/i],
  ['Xiaomi', /^(?:new\s+)?(?:xiaomi|redmi|poco)\b/i],
  ['Huawei', /^(?:new\s+)?huawei\b/i],
  ['JBL', /^(?:new\s+)?jbl\b/i],
  ['Sony', /^(?:new\s+)?sony\b/i],
  ['Nokia', /^(?:new\s+)?nokia\b/i],
  ['PlayStation', /^(?:new\s+)?(?:playstation|ps[345])\b/i],
  ['Xbox', /^(?:new\s+)?xbox\b/i],
  ['Asus', /^(?:new\s+)?asus\b/i],
  ['Honor', /^(?:new\s+)?honor\b/i],
  ['OnePlus', /^(?:new\s+)?oneplus\b/i],
  ['Canon', /^(?:new\s+)?canon\b/i],
  ['Epson', /^(?:new\s+)?epson\b/i],
  ['TP-Link', /^(?:new\s+)?tp[\s-]*link\b/i],
  ['Intel', /^(?:new\s+)?intel\b/i],
  ['AMD', /^(?:new\s+)?amd\b/i],
  ['Logitech', /^(?:new\s+)?logitech\b/i],
  ['Anker', /^(?:new\s+)?anker\b/i],
  ['Baseus', /^(?:new\s+)?baseus\b/i],
  ['Oraimo', /^(?:new\s+)?oraimo\b/i],
]

const FIELD_LABELS = {
  brand: new Set(['brand', 'brand name', 'manufacturer', 'manufacturer name']),
  condition: new Set(['condition', 'item condition', 'product condition']),
  gtin: new Set([
    'gtin',
    'ean',
    'upc',
    'isbn',
    'barcode',
    'gtin upc ean or isbn',
  ]),
  mpn: new Set([
    'mpn',
    'manufacturer part number',
    'manufacturer product number',
    'part number',
    'product number',
  ]),
}

function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
      const point = Number.parseInt(code, 16)
      return Number.isFinite(point) && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : ''
    })
    .replace(/&#([0-9]+);/g, (_match, code) => {
      const point = Number.parseInt(code, 10)
      return Number.isFinite(point) && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : ''
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function sanitizeXmlText(value = '') {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const point = character.codePointAt(0)
      return (
        point === 0x09 ||
        point === 0x0a ||
        point === 0x0d ||
        (point >= 0x20 && point <= 0xd7ff) ||
        (point >= 0xe000 && point <= 0xfffd) ||
        (point >= 0x10000 && point <= 0x10ffff)
      )
    })
    .join('')
}

function truncateText(value, maximumLength) {
  const text = String(value || '')
  if (text.length <= maximumLength) return text

  const truncated = text.slice(0, maximumLength)
  return /[\ud800-\udbff]$/.test(truncated) ? truncated.slice(0, -1) : truncated
}

function cleanText(value = '', maximumLength = GOOGLE_DESCRIPTION_LIMIT) {
  const text = sanitizeXmlText(
    decodeHtmlEntities(
      String(value || '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
    )
  )
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return truncateText(text, maximumLength)
}

function xmlEscape(value = '') {
  return sanitizeXmlText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeLabel(value = '') {
  return cleanText(value, 100)
    .toLowerCase()
    .replace(/^(?:pa_|attribute_)/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function addStructuredValue(target, label, value) {
  const normalizedLabel = normalizeLabel(label)
  const normalizedValue = cleanText(value, 180)

  if (!normalizedLabel || !normalizedValue || target.has(normalizedLabel)) return
  target.set(normalizedLabel, normalizedValue)
}

function collectStructuredValues(product = {}) {
  const values = new Map()

  for (const attribute of Array.isArray(product.attributes)
    ? product.attributes
    : []) {
    const options = Array.isArray(attribute?.terms)
      ? attribute.terms.map((term) => term?.name || term?.value || term)
      : Array.isArray(attribute?.options)
        ? attribute.options
        : [attribute?.value || attribute?.option]
    addStructuredValue(
      values,
      attribute?.name || attribute?.taxonomy || attribute?.label,
      options.filter(Boolean).join(', ')
    )
  }

  const specifications = Array.isArray(product.specifications)
    ? product.specifications
    : []
  for (const specification of specifications) {
    addStructuredValue(
      values,
      specification?.label || specification?.name || specification?.key,
      specification?.value || specification?.option
    )
  }

  const html = `${product.short_description || ''}\n${product.description || ''}`
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  const cellPattern = /<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi

  for (const rowMatch of html.matchAll(rowPattern)) {
    const cells = Array.from(rowMatch[1].matchAll(cellPattern))
      .map((match) => cleanText(match[1], 180))
      .filter(Boolean)
    if (cells.length >= 2) addStructuredValue(values, cells[0], cells.slice(1).join(' '))
  }

  const lines = decodeHtmlEntities(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|dt|dd|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^([^:]{1,80})\s*:\s*(.{1,180})$/)
    if (match) addStructuredValue(values, match[1], match[2])
  }

  return values
}

function findStructuredValue(values, field) {
  const labels = FIELD_LABELS[field]
  if (!labels) return ''

  for (const [label, value] of values.entries()) {
    if (labels.has(label)) return value
  }

  return ''
}

function inferBrand(product, values) {
  const directBrand = cleanText(product.brand || '', 70)
  if (directBrand) return directBrand

  const collectionBrand = Array.isArray(product.brands)
    ? cleanText(product.brands[0]?.name || product.brands[0] || '', 70)
    : ''
  if (collectionBrand) return collectionBrand

  const structuredBrand = findStructuredValue(values, 'brand')
  if (structuredBrand) return structuredBrand.slice(0, 70)

  const title = cleanText(product.name || product.title || '', GOOGLE_TITLE_LIMIT)
  const match = BRAND_RULES.find(([, pattern]) => pattern.test(title))
  return match?.[0] || ''
}

function normalizeCondition(product, values) {
  const candidate = cleanText(
    product.condition ||
      product.item_condition ||
      product.product_condition ||
      findStructuredValue(values, 'condition'),
    60
  ).toLowerCase()

  if (/refurb|renewed|remanufactured/.test(candidate)) return 'refurbished'
  if (/used|pre[\s-]*owned|second[\s-]*hand|open[\s-]*box/.test(candidate)) {
    return 'used'
  }

  return 'new'
}

function isValidGtin(candidate = '') {
  const digits = String(candidate || '').replace(/[\s-]+/g, '')
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return false

  const checkDigit = Number(digits.at(-1))
  const body = digits.slice(0, -1)
  let sum = 0

  for (let index = body.length - 1, weight = 3; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight
    weight = weight === 3 ? 1 : 3
  }

  return (10 - (sum % 10)) % 10 === checkDigit
}

function normalizeGtin(product, values) {
  const candidates = [
    product.gtin,
    product.global_unique_id,
    product.upc,
    product.ean,
    product.isbn,
    findStructuredValue(values, 'gtin'),
  ]

  for (const candidate of candidates) {
    const groups = String(candidate || '').match(/\d[\d\s-]{6,20}\d/g) || []
    const valid = groups
      .map((group) => group.replace(/[\s-]+/g, ''))
      .find(isValidGtin)
    if (valid) return valid
  }

  return ''
}

function normalizeMpn(product, values) {
  const candidate = cleanText(
    product.mpn ||
      product.manufacturer_part_number ||
      product.manufacturer_product_number ||
      findStructuredValue(values, 'mpn'),
    70
  )

  if (!candidate || /^(?:n\/?a|none|unknown|not applicable)$/i.test(candidate)) {
    return ''
  }

  return candidate
}

function normalizeHttpsUrl(value, baseUrl) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''

  try {
    const url = new URL(decodeHtmlEntities(rawValue), baseUrl)
    if (url.protocol !== 'https:') return ''
    url.username = ''
    url.password = ''
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

function getProductPrice(product = {}) {
  const pricePayload = product.prices || {}
  const rawPrice = Number(pricePayload.price ?? product.price)
  const minorUnit = Number(pricePayload.currency_minor_unit ?? 0)
  const currency = String(pricePayload.currency_code || product.currency || '')
    .trim()
    .toUpperCase()

  if (
    !Number.isFinite(rawPrice) ||
    rawPrice <= 0 ||
    !Number.isInteger(minorUnit) ||
    minorUnit < 0 ||
    minorUnit > 4 ||
    currency !== 'ZMW'
  ) {
    return null
  }

  const amount = rawPrice / 10 ** minorUnit
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function buildDescription(product, title) {
  const shortDescription = cleanText(
    product.short_description || product.shortDescription || '',
    GOOGLE_DESCRIPTION_LIMIT
  )
  const description = cleanText(
    product.description || product.descriptionHtml || '',
    GOOGLE_DESCRIPTION_LIMIT
  )
  const source = shortDescription.length >= 20 ? shortDescription : description

  return truncateText(
    source || `${title} available from DigitalHood Marketplace in Zambia.`,
    GOOGLE_DESCRIPTION_LIMIT
  )
}

function buildProductType(product = {}) {
  const productType = (Array.isArray(product.categories) ? product.categories : [])
    .map((category) => cleanText(category?.name || category, 100))
    .filter(Boolean)
    .slice(0, 5)
    .join(' > ')

  return truncateText(productType, 750)
}

export function normalizeMerchantProduct(
  product = {},
  { marketplaceOrigin = DEFAULT_MARKETPLACE_ORIGIN } = {}
) {
  const status = String(product.status || 'publish').trim().toLowerCase()
  const id = cleanText(product.id, 50)
  const title = cleanText(
    product.name || product.title || '',
    GOOGLE_TITLE_LIMIT
  )
  const slug = cleanText(product.slug || '', 200)
  const price = getProductPrice(product)
  const imageInputs = Array.isArray(product.images) ? product.images : []
  const images = imageInputs
    .map((image) => normalizeHttpsUrl(image?.src || image?.url || image, marketplaceOrigin))
    .filter(Boolean)
  const primaryImage = images[0] || normalizeHttpsUrl(product.image || '', marketplaceOrigin)
  const isInStock =
    product.is_in_stock !== false &&
    String(product.stock_status || 'instock').toLowerCase() !== 'outofstock'

  if (status !== 'publish') return { product: null, reason: 'unpublished' }
  if (!id || !title || !slug) return { product: null, reason: 'identity' }
  if (product.is_password_protected === true) {
    return { product: null, reason: 'password_protected' }
  }
  if (product.is_purchasable === false || product.purchasable === false) {
    return { product: null, reason: 'not_purchasable' }
  }
  if (!isInStock) return { product: null, reason: 'out_of_stock' }
  if (!price) return { product: null, reason: 'price' }
  if (!primaryImage) return { product: null, reason: 'image' }

  const values = collectStructuredValues(product)
  const brand = inferBrand(product, values)
  const gtin = normalizeGtin(product, values)
  const mpn = normalizeMpn(product, values)
  const link = new URL(
    `/product/${encodeURIComponent(slug)}`,
    `${marketplaceOrigin.replace(/\/+$/, '')}/`
  ).toString()

  return {
    product: {
      id,
      title,
      description: buildDescription(product, title),
      link,
      imageLink: primaryImage,
      additionalImageLinks: images
        .filter((image) => image !== primaryImage)
        .slice(0, MAX_ADDITIONAL_IMAGES),
      availability: 'in_stock',
      price: `${price.toFixed(2)} ZMW`,
      condition: normalizeCondition(product, values),
      brand,
      gtin,
      mpn,
      productType: buildProductType(product),
      identifierExists:
        product.identifier_exists === false ||
        String(product.identifier_exists || '').toLowerCase() === 'no'
          ? 'no'
          : '',
    },
    reason: '',
  }
}

function renderMerchantItem(product) {
  const lines = [
    '    <item>',
    `      <g:id>${xmlEscape(product.id)}</g:id>`,
    `      <g:title>${xmlEscape(product.title)}</g:title>`,
    `      <g:description>${xmlEscape(product.description)}</g:description>`,
    `      <g:link>${xmlEscape(product.link)}</g:link>`,
    `      <g:image_link>${xmlEscape(product.imageLink)}</g:image_link>`,
    `      <g:availability>${product.availability}</g:availability>`,
    `      <g:price>${product.price}</g:price>`,
    `      <g:condition>${product.condition}</g:condition>`,
  ]

  for (const image of product.additionalImageLinks) {
    lines.push(`      <g:additional_image_link>${xmlEscape(image)}</g:additional_image_link>`)
  }
  if (product.brand) lines.push(`      <g:brand>${xmlEscape(product.brand)}</g:brand>`)
  if (product.gtin) lines.push(`      <g:gtin>${product.gtin}</g:gtin>`)
  if (product.mpn) lines.push(`      <g:mpn>${xmlEscape(product.mpn)}</g:mpn>`)
  if (product.productType) {
    lines.push(`      <g:product_type>${xmlEscape(product.productType)}</g:product_type>`)
  }
  if (product.identifierExists) {
    lines.push(`      <g:identifier_exists>${product.identifierExists}</g:identifier_exists>`)
  }

  lines.push('    </item>')
  return lines.join('\n')
}

export function buildGoogleMerchantFeed(
  products = [],
  { marketplaceOrigin = DEFAULT_MARKETPLACE_ORIGIN } = {}
) {
  const normalized = []
  const excludedByReason = {}
  const seenIds = new Set()

  for (const rawProduct of Array.isArray(products) ? products : []) {
    const result = normalizeMerchantProduct(rawProduct, { marketplaceOrigin })
    if (!result.product) {
      excludedByReason[result.reason] = (excludedByReason[result.reason] || 0) + 1
      continue
    }
    if (seenIds.has(result.product.id)) {
      excludedByReason.duplicate = (excludedByReason.duplicate || 0) + 1
      continue
    }
    seenIds.add(result.product.id)
    normalized.push(result.product)
  }

  normalized.sort((left, right) => left.id.localeCompare(right.id, 'en', { numeric: true }))

  const origin = marketplaceOrigin.replace(/\/+$/, '')
  const items = normalized.map(renderMerchantItem).join('\n')
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rss version="2.0" xmlns:g="${GOOGLE_NAMESPACE}">`,
    '  <channel>',
    '    <title>DigitalHood Marketplace Zambia</title>',
    `    <link>${xmlEscape(origin)}</link>`,
    '    <description>Live products available from DigitalHood Marketplace in Zambia.</description>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')

  return {
    xml,
    productCount: normalized.length,
    excludedCount: Object.values(excludedByReason).reduce(
      (total, count) => total + count,
      0
    ),
    excludedByReason,
  }
}

async function fetchProductPage(fetchImpl, sourceUrl, page, signal) {
  const url = new URL(sourceUrl)
  url.searchParams.set('per_page', String(DEFAULT_PAGE_SIZE))
  url.searchParams.set('page', String(page))
  url.searchParams.set('stock_status', 'instock')

  const response = await fetchImpl(url, {
    signal,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DigitalHood-Google-Merchant-Feed/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Merchant feed source returned HTTP ${response.status}.`)
  }

  const products = await response.json()
  if (!Array.isArray(products)) {
    throw new Error('Merchant feed source returned an invalid product document.')
  }

  const totalPages = Number(response.headers.get('x-wp-totalpages') || 1)
  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > MAX_SOURCE_PAGES) {
    throw new Error('Merchant feed source returned an unsafe page count.')
  }

  const totalHeader = response.headers.get('x-wp-total')
  const totalProducts = totalHeader === null ? null : Number(totalHeader)
  if (
    totalProducts !== null &&
    (!Number.isInteger(totalProducts) || totalProducts < 0)
  ) {
    throw new Error('Merchant feed source returned an invalid product count.')
  }

  return { products, totalPages, totalProducts }
}

export async function fetchLiveMerchantProducts({
  fetchImpl = globalThis.fetch,
  sourceUrl = DEFAULT_SOURCE_URL,
  timeoutMs = 25_000,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const firstPage = await fetchProductPage(
      fetchImpl,
      sourceUrl,
      1,
      controller.signal
    )
    const products = [...firstPage.products]

    for (let page = 2; page <= firstPage.totalPages; page += 4) {
      const pageNumbers = Array.from(
        { length: Math.min(4, firstPage.totalPages - page + 1) },
        (_value, index) => page + index
      )
      const pages = await Promise.all(
        pageNumbers.map((pageNumber) =>
          fetchProductPage(fetchImpl, sourceUrl, pageNumber, controller.signal)
        )
      )
      for (const result of pages) products.push(...result.products)
    }

    if (
      firstPage.totalProducts !== null &&
      products.length < firstPage.totalProducts
    ) {
      throw new Error('Merchant feed source returned an incomplete catalogue.')
    }

    return products
  } finally {
    clearTimeout(timeout)
  }
}

export function createGoogleMerchantFeedService({
  fetchImpl = globalThis.fetch,
  sourceUrl = DEFAULT_SOURCE_URL,
  marketplaceOrigin = DEFAULT_MARKETPLACE_ORIGIN,
  cacheTtlMs = 15 * 60 * 1000,
  staleTtlMs = 48 * 60 * 60 * 1000,
  timeoutMs = 25_000,
} = {}) {
  let cache = null
  let refreshPromise = null

  async function refresh() {
    const rawProducts = await fetchLiveMerchantProducts({
      fetchImpl,
      sourceUrl,
      timeoutMs,
    })
    const feed = buildGoogleMerchantFeed(rawProducts, { marketplaceOrigin })

    if (feed.productCount < 1) {
      throw new Error('Merchant feed refresh produced no valid products.')
    }

    if (feed.productCount < Math.max(1, Math.floor(rawProducts.length / 2))) {
      throw new Error('Merchant feed refresh rejected too many source products.')
    }

    if (
      cache?.productCount &&
      feed.productCount < Math.max(1, Math.floor(cache.productCount / 2))
    ) {
      throw new Error('Merchant feed refresh was rejected after a suspicious catalogue shrink.')
    }

    const generatedAt = new Date()
    cache = {
      ...feed,
      generatedAt,
      etag: `"${createHash('sha256').update(feed.xml).digest('base64url')}"`,
    }
    return { ...cache, cacheStatus: 'MISS' }
  }

  return {
    async getFeed() {
      const ageMs = cache ? Date.now() - cache.generatedAt.getTime() : Infinity
      if (cache && ageMs <= cacheTtlMs) {
        return { ...cache, cacheStatus: 'HIT' }
      }

      if (!refreshPromise) {
        refreshPromise = refresh().finally(() => {
          refreshPromise = null
        })
      }

      try {
        return await refreshPromise
      } catch (error) {
        const staleAgeMs = cache ? Date.now() - cache.generatedAt.getTime() : Infinity
        if (cache && staleAgeMs <= staleTtlMs) {
          return { ...cache, cacheStatus: 'STALE', refreshError: error }
        }
        throw error
      }
    },
  }
}
