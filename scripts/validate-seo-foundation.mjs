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
const server = read('server.js')
const serverSeo = read('server/marketplaceSeo.js')
const sellerDomainServer = read('server/sellerDomains.js')

assert(app.includes('<MarketplaceSEO />'), 'MarketplaceSEO must be mounted globally')
assert(seo.includes('application/ld+json'), 'SEO component must manage JSON-LD')
assert(seo.includes(".replace(/</g, '\\\\u003c')"), 'JSON-LD must escape HTML opening brackets')
assert(seo.includes('noindex,nofollow'), 'SEO component must support noindex pages')
assert(marketplaceSeo.includes("'/checkout'"), 'checkout must be classified as noindex')
assert(marketplaceSeo.includes("'/account'"), 'account routes must be classified as noindex')
assert(marketplaceSeo.includes('buildProductSchema'), 'product schema must be route-aware')
assert(structuredData.includes("'@type': 'OnlineStore'"), 'homepage must identify the online store')
assert(structuredData.includes("'@type': 'Product'"), 'product schema builder is missing')
assert(structuredData.includes('priceCurrency: SITE.currency'), 'product offers must use configured currency')
assert(structuredData.includes('ratingCount > 0'), 'ratings must only be emitted when genuine ratings exist')
assert(!structuredData.includes('SearchAction'), 'retired sitelinks SearchAction must not be emitted')
assert(indexHtml.includes('<html lang="en-ZM">'), 'document language must be en-ZM')
assert(indexHtml.includes('max-image-preview:large'), 'public pages should allow large image previews')
assert(sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'sitemap namespace is invalid')

assert(server.includes('buildServerSeo'), 'server must render route-specific SEO')
assert(server.includes('getIndexHtml(distDir)'), 'server must render the built index template')
assert(server.includes("X-Robots-Tag"), 'server must protect noindex routes at HTTP level')
assert(server.includes("X-Content-Type-Options"), 'server must set basic security headers')
assert(serverSeo.includes('AbortController'), 'remote SEO fetches must have a timeout')
assert(serverSeo.includes('MAX_SITEMAP_PAGES'), 'dynamic sitemap generation must be bounded')
assert(serverSeo.includes("'@type': 'Product'"), 'server-rendered product JSON-LD is missing')
assert(serverSeo.includes("'@type': 'OnlineStore'"), 'server-rendered store JSON-LD is missing')
assert(serverSeo.includes(".replace(/</g, '\\\\u003c')"), 'server JSON-LD must escape HTML opening brackets')
assert(!serverSeo.includes('SearchAction'), 'server must not emit retired SearchAction markup')
assert(server.includes('resolveSellerDomainForKey'), 'seller paths must redirect to their canonical marketplace domains')
assert(serverSeo.includes('seo.canonicalUrl || absolute'), 'server SEO must support branded seller canonical URLs')
assert(sellerDomainServer.includes('isSafeSellerDomainUrl'), 'seller canonical redirects must validate the marketplace suffix')

for (const privatePath of ['/cart', '/checkout', '/wishlist', '/account', '/orders', '/login']) {
  assert(!sitemap.includes(`${privatePath}</loc>`), `${privatePath} must not appear in sitemap`)
}

for (const publicPath of ['/shop', '/categories', '/about', '/contact', '/privacy']) {
  assert(sitemap.includes(`${publicPath}</loc>`), `${publicPath} is missing from sitemap`)
}

console.log('SEO foundation validation passed')
