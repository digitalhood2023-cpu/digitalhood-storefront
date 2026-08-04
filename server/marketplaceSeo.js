import fs from 'fs/promises'
import path from 'path'

const SITE = 'https://store.digitalhood.info'
const API = process.env.PAYMENTS_API_URL || 'https://payments.digitalhood.info'
const NAME = 'DigitalHood'
const DEFAULT_TITLE = 'DigitalHood Zambia | Phones, Laptops, Accessories & Repairs'
const DEFAULT_DESCRIPTION =
  "Shop phones, laptops, accessories, repairs and trusted tech services in Zambia. DigitalHood is building Zambia's most reliable online marketplace."
const IMAGE = `${SITE}/logo.jpg`
const START = '<!-- DIGITALHOOD_SEO_START -->'
const END = '<!-- DIGITALHOOD_SEO_END -->'
const MAX_SITEMAP_PAGES = 100
const PAGE_SIZE = 100

const PUBLIC_ROUTES = [
  '/', '/shop', '/shops', '/categories', '/phone-accessories-zambia', '/iphone-zambia',
  '/samsung-phones-zambia', '/laptops-zambia', '/headphones-zambia',
  '/power-banks-zambia', '/screen-repair-zambia', '/about', '/contact',
  '/support', '/help', '/faqs', '/shipping', '/returns', '/warranty', '/terms',
  '/privacy', '/cookies', '/marketplace-terms', '/seller-terms',
  '/prohibited-products', '/dispute-resolution', '/data-protection',
  '/incident-response',
]

const STATIC = {
  '/shop': ['Shop Phones, Laptops & Tech in Zambia', 'Browse verified phones, laptops, accessories and technology products from DigitalHood Marketplace sellers in Zambia.'],
  '/shops': ['Marketplace Shops & Verified Sellers', 'Search and browse verified technology shops and sellers on DigitalHood Marketplace Zambia.'],
  '/categories': ['Technology Product Categories', 'Browse DigitalHood Marketplace categories for phones, laptops, accessories, repairs and trusted technology services in Zambia.'],
  '/about': ['About DigitalHood Marketplace Zambia', 'Learn about DigitalHood Creations Limited and our mission to build a trusted, secure and scalable online marketplace in Zambia.'],
  '/contact': ['Contact DigitalHood Zambia', 'Contact DigitalHood Marketplace for sales, customer service and marketplace support in Zambia.'],
  '/support': ['DigitalHood Marketplace Support', 'Get help with DigitalHood Marketplace orders, products, payments and account questions.'],
  '/privacy': ['DigitalHood Privacy Policy', 'Read how DigitalHood handles personal information and protects marketplace users.'],
  '/marketplace-terms': ['DigitalHood Marketplace Terms', 'Read the rules and responsibilities that apply to DigitalHood Marketplace users.'],
}

const ALIASES = {
  '/buy-iphone-zambia': '/iphone-zambia',
  '/buy-samsung-zambia': '/samsung-phones-zambia',
  '/buy-laptop-zambia': '/laptops-zambia',
  '/phone-repair-lusaka': '/screen-repair-zambia',
}

const NOINDEX = [
  '/cart', '/checkout', '/wishlist', '/recently-viewed', '/track-order',
  '/account', '/login', '/register', '/orders', '/support/track', '/sitemap', '/blog',
]

const esc = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const xml = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const text = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const absolute = (value, fallback = SITE) => {
  try { return new URL(value || fallback, SITE).toString() } catch { return fallback }
}
const normalize = (pathname = '/') => pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/'
const decode = (value) => {
  try {
    const decoded = decodeURIComponent(value)
    return decoded && decoded.length <= 200 && !/[\u0000-\u001f\u007f]/.test(decoded) ? decoded : ''
  } catch { return '' }
}
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null
const json = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')

async function fetchJson(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    return await response.json()
  } catch { return null } finally { clearTimeout(timeout) }
}

function base(pathname = '/') {
  const path = normalize(ALIASES[pathname] || pathname)
  const [title, description] = STATIC[path] || [DEFAULT_TITLE, DEFAULT_DESCRIPTION]
  const noindex = NOINDEX.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  return { title, description, path, image: IMAGE, type: 'website', noindex, graph: [] }
}

function availability(product) {
  const status = String(product?.stockStatus || product?.stock_status || '').toLowerCase()
  if (status === 'outofstock' || product?.canAddToCart === false || product?.can_add_to_cart === false) return 'https://schema.org/OutOfStock'
  if (status === 'onbackorder') return 'https://schema.org/BackOrder'
  if (status === 'preorder') return 'https://schema.org/PreOrder'
  return 'https://schema.org/InStock'
}

function condition(product) {
  const value = String(product?.condition || product?.item_condition || product?.product_condition || '').toLowerCase().replace(/[^a-z]/g, '')
  if (value.includes('refurb')) return 'https://schema.org/RefurbishedCondition'
  if (value.includes('used') || value.includes('preowned')) return 'https://schema.org/UsedCondition'
  if (value.includes('damaged')) return 'https://schema.org/DamagedCondition'
  if (value.includes('new')) return 'https://schema.org/NewCondition'
  return undefined
}

function productGraph(product, path) {
  const url = absolute(path)
  const price = finite(product?.price)
  const rating = finite(product?.averageRating || product?.average_rating)
  const count = finite(product?.ratingCount || product?.rating_count || product?.reviewCount || product?.review_count)
  const sellerName = text(product?.sellerStoreName || product?.seller_store_name || product?.seller?.storeName || NAME)
  const sellerKey = text(product?.sellerKey || product?.seller_key || product?.seller?.key || 'digitalhood')
  const sellerUrl = absolute(`/seller/${encodeURIComponent(sellerKey)}`)
  const images = Array.from(new Set([
    product?.imageOriginal, product?.imageLarge, product?.image,
    ...(Array.isArray(product?.images) ? product.images.map((item) => typeof item === 'string' ? item : item?.src || item?.url) : []),
  ].filter(Boolean).map((item) => absolute(item))))
  const schema = {
    '@type': 'Product', '@id': `${url}#product`, url,
    name: text(product?.name),
    description: text(product?.shortDescription || product?.short_description || product?.description || product?.name),
    image: images, productID: `woocommerce:${product?.id}`,
    ...(product?.sku ? { sku: product.sku } : {}),
    ...(product?.gtin || product?.ean ? { gtin: product.gtin || product.ean } : {}),
    ...(product?.mpn ? { mpn: product.mpn } : {}),
    ...(rating && count && rating > 0 && count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating, ratingCount: count, bestRating: 5, worstRating: 1 } } : {}),
  }
  if (price !== null && price >= 0) {
    schema.offers = {
      '@type': 'Offer', '@id': `${url}#offer`, url, price: price.toFixed(2),
      priceCurrency: 'ZMW', availability: availability(product),
      ...(condition(product) ? { itemCondition: condition(product) } : {}),
      seller: { '@type': 'Organization', '@id': `${sellerUrl}#seller`, name: sellerName, url: sellerUrl },
    }
  }
  return [schema, {
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}/shop` },
      { '@type': 'ListItem', position: 3, name: text(product?.name) },
    ],
  }]
}

async function productSeo(slug) {
  const lookup = await fetchJson(`${API}/api/products?slug=${encodeURIComponent(slug)}&per_page=1`)
  const listed = Array.isArray(lookup?.products) ? lookup.products[0] : null
  const id = Number(slug) || Number(listed?.id)
  if (!id) return null
  const detail = await fetchJson(`${API}/api/products/${id}`)
  const product = detail?.product || detail
  if (!product?.id) return null
  const canonicalSlug = product.slug || slug
  const path = `/product/${encodeURIComponent(canonicalSlug)}`
  return {
    title: text(product.name),
    description: text(product.shortDescription || product.short_description || product.description || `Buy ${product.name} on DigitalHood Marketplace Zambia.`),
    path, image: absolute(product.imageOriginal || product.imageLarge || product.image, IMAGE),
    type: 'product', noindex: false, graph: productGraph(product, path),
  }
}

async function sellerSeo(key) {
  const data = await fetchJson(`${API}/api/public/sellers/${encodeURIComponent(key)}`)
  const seller = data?.seller
  if (!seller?.key) return null
  const path = `/seller/${encodeURIComponent(seller.key)}`
  const url = absolute(path)
  const description = text(seller.tagline || seller.description || `Shop products from ${seller.storeName} on DigitalHood Marketplace Zambia.`)
  const graph = [
    { '@type': 'ProfilePage', '@id': `${url}#profile`, url, name: `${text(seller.storeName)} on DigitalHood`, description, mainEntity: { '@id': `${url}#seller` } },
    { '@type': 'Organization', '@id': `${url}#seller`, name: text(seller.storeName), url, description, ...(seller.profilePhotoUrl ? { image: absolute(seller.profilePhotoUrl) } : {}) },
  ]
  return { title: text(seller.storeName), description, path, image: absolute(seller.profilePhotoUrl, IMAGE), type: 'profile', noindex: false, graph }
}

export async function buildServerSeo(pathname) {
  const path = normalize(pathname)
  const product = path.match(/^\/product\/([^/]+)$/)
  if (product) {
    const slug = decode(product[1])
    return slug ? (await productSeo(slug)) || { ...base(path), noindex: true } : { ...base(path), noindex: true }
  }
  const seller = path.match(/^\/(?:seller|stores)\/([^/]+)$/)
  if (seller) {
    const key = decode(seller[1])
    return key ? (await sellerSeo(key)) || { ...base(path), noindex: true } : { ...base(path), noindex: true }
  }
  if (path === '/') {
    const graph = [
      { '@type': 'OnlineStore', '@id': `${SITE}/#organization`, name: NAME, legalName: 'DigitalHood Creations Limited', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: IMAGE }, description: DEFAULT_DESCRIPTION, email: 'contact@digitalhood.info', telephone: '+260 971 047 570', address: { '@type': 'PostalAddress', addressLocality: 'Lusaka', addressRegion: 'Lusaka', addressCountry: 'ZM' } },
      { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'DigitalHood Marketplace', alternateName: ['DigitalHood', 'DigitalHood Zambia'], inLanguage: 'en-ZM', publisher: { '@id': `${SITE}/#organization` } },
    ]
    return { ...base('/'), graph }
  }
  return base(path)
}

function head(seo) {
  const title = seo.title.toLowerCase().includes(NAME.toLowerCase()) ? seo.title : `${seo.title} | ${NAME}`
  const canonical = absolute(seo.path)
  const robots = seo.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'
  const ld = seo.noindex || !seo.graph?.length ? '' : `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': seo.graph })}</script>`
  return `${START}\n<title>${esc(title)}</title>\n<meta name="description" content="${esc(seo.description)}" />\n<meta name="robots" content="${robots}" />\n<meta name="googlebot" content="${robots}" />\n<link rel="canonical" href="${esc(canonical)}" />\n<meta property="og:title" content="${esc(title)}" />\n<meta property="og:description" content="${esc(seo.description)}" />\n<meta property="og:type" content="${esc(seo.type || 'website')}" />\n<meta property="og:url" content="${esc(canonical)}" />\n<meta property="og:image" content="${esc(seo.image || IMAGE)}" />\n<meta property="og:locale" content="en_ZM" />\n<meta property="og:site_name" content="DigitalHood" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${esc(title)}" />\n<meta name="twitter:description" content="${esc(seo.description)}" />\n<meta name="twitter:image" content="${esc(seo.image || IMAGE)}" />\n${ld}\n${END}`
}

export function injectSeo(html, seo) {
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`)
  return pattern.test(html) ? html.replace(pattern, head(seo)) : html.replace('</head>', `${head(seo)}\n</head>`)
}

let cachedIndex = null
export async function getIndexHtml(distDir) {
  if (cachedIndex) return cachedIndex
  cachedIndex = await fs.readFile(path.join(distDir, 'index.html'), 'utf8')
  return cachedIndex
}

export async function getSitemapXml() {
  const paths = new Set(PUBLIC_ROUTES)
  for (let page = 1; page <= MAX_SITEMAP_PAGES; page += 1) {
    const data = await fetchJson(`${API}/api/products?per_page=${PAGE_SIZE}&page=${page}`)
    const products = Array.isArray(data?.products) ? data.products : []
    for (const product of products) {
      if (product?.id) paths.add(`/product/${encodeURIComponent(product.slug || product.id)}`)
      const sellerKey = product?.sellerKey || product?.seller_key || product?.seller?.key
      if (sellerKey) paths.add(`/seller/${encodeURIComponent(sellerKey)}`)
    }
    const totalPages = Number(data?.totalPages || data?.total_pages || 1)
    if (!products.length || page >= totalPages) break
  }
  const urls = Array.from(paths).sort().map((item) => `  <url><loc>${xml(absolute(item))}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
