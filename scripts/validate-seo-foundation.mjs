import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(`SEO validation failed: ${message}`)
}

const app = read('src/App.tsx')
const seo = read('src/components/SEO.tsx')
const marketplaceSeo = read('src/components/MarketplaceSEO.tsx')
const structuredData = read('src/lib/structuredData.ts')
const indexHtml = read('index.html')
const sitemap = read('public/sitemap.xml')

assert(app.includes('<MarketplaceSEO />'), 'MarketplaceSEO must be mounted globally')
assert(seo.includes('application/ld+json'), 'SEO component must manage JSON-LD')
assert(seo.includes(".replace(/</g, '\\\\u003c')"), 'JSON-LD must escape HTML opening brackets')
assert(seo.includes('noindex,nofollow'), 'SEO component must support noindex pages')
assert(marketplaceSeo.includes("'/checkout'"), 'checkout must be classified as noindex')
assert(marketplaceSeo.includes("'/account'"), 'account routes must be classified as noindex')
assert(marketplaceSeo.includes('buildProductSchema'), 'product schema must be route-aware')
assert(structuredData.includes("'@type': 'OnlineStore'"), 'homepage must identify the online store')
assert(structuredData.includes("'@type': 'Product'"), 'product schema builder is missing')
assert(structuredData.includes("priceCurrency: SITE.currency"), 'product offers must use configured currency')
assert(structuredData.includes('ratingCount > 0'), 'ratings must only be emitted when genuine ratings exist')
assert(!structuredData.includes('SearchAction'), 'retired sitelinks SearchAction must not be emitted')
assert(indexHtml.includes('<html lang="en-ZM">'), 'document language must be en-ZM')
assert(indexHtml.includes('max-image-preview:large'), 'public pages should allow large image previews')
assert(sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'sitemap namespace is invalid')

for (const privatePath of ['/cart', '/checkout', '/wishlist', '/account', '/orders', '/login']) {
  assert(!sitemap.includes(`${privatePath}</loc>`), `${privatePath} must not appear in sitemap`)
}

for (const publicPath of ['/shop', '/categories', '/about', '/contact', '/privacy']) {
  assert(sitemap.includes(`${publicPath}</loc>`), `${publicPath} is missing from sitemap`)
}

console.log('SEO foundation validation passed')
