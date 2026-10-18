import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { buildSellPageSeo, injectSellLandingContent, renderSellLandingPage } from './sellLandingPage.js'
import { buildServerSeo, injectSeo, getSitemapXml } from './marketplaceSeo.js'

const content = createRequire(import.meta.url)('../config/sell-page.json')

test('seller landing metadata is public and independent of remote services', async () => {
  const seo = await buildServerSeo('/sell/')
  assert.deepEqual(seo, buildSellPageSeo())
  assert.equal(seo.noindex, false)
  assert.equal(seo.path, '/sell')
  const html = injectSeo('<html><head></head><body></body></html>', seo)
  assert.ok(html.includes('<title>Sell on DigitalHood Zambia | Start Your Online Store</title>'))
  assert.ok(html.includes('rel="canonical" href="https://store.digitalhood.info/sell"'))
  assert.ok(html.includes('content="index,follow,max-image-preview:large"'))
  assert.ok(html.includes('property="og:url" content="https://store.digitalhood.info/sell"'))
  assert.deepEqual(seo.graph.map(item => item['@type']), ['WebPage', 'BreadcrumbList'])
  for (const type of ['SearchAction', 'FAQPage', 'AggregateRating']) assert.ok(!html.includes(type))
})

test('no-JavaScript HTML contains real copy, application links, guidance and native FAQs', () => {
  const html = renderSellLandingPage()
  assert.ok(html.includes('<main id="main-content"'))
  assert.equal(html.split('<h1 ').length - 1, 1)
  for (const item of content.benefits) assert.ok(html.includes(item.title))
  for (const step of content.steps) assert.ok(html.includes(step.title))
  assert.ok(html.includes('href="' + content.registerUrl + '"'))
  assert.ok(html.includes('href="' + content.loginUrl + '"'))
  assert.equal(html.split('<details>').length - 1, content.faqs.length)
  for (const path of ['/seller-terms', '/prohibited-products']) assert.ok(html.includes('href="' + path + '"'))
  assert.ok(html.includes('href="' + content.supportUrl.replace(/&/g, '&amp;') + '"'))
  assert.ok(html.includes(content.applicationNote))
  assert.ok(!html.includes('/register?type='), 'Seller type is chosen in the authenticated application only')
  for (const unsafe of ['<script', '<form', '/wp-admin', 'free selling', 'instant payouts', 'largest marketplace']) assert.ok(!html.includes(unsafe))
})

test('prerendering replaces the root and preserves JS failure recovery', () => {
  const template = '<head></head><div id="dh-app-shell"></div><div id="dh-startup"></div><div id="root"></div><script>boot()</script>'
  const html = injectSellLandingContent(template)
  assert.ok(html.includes('id="dh-app-shell" style="display:none"'))
  assert.ok(html.includes('<div id="root"><div class="dh-sell-page">'))
  assert.ok(html.includes('<noscript><style>#dh-startup{display:none!important}</style></noscript>'))
  assert.ok(html.includes('<script>boot()</script>'))
})

test('copied text is escaped before insertion in server HTML and JSON-LD', () => {
  const prior = content.heading
  try {
    content.heading = '<img src=x onerror=alert(1)> & "test"'
    const html = renderSellLandingPage()
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;test&quot;'))
    assert.ok(!html.includes('<img src=x'))
    assert.ok(!injectSeo('<head></head>', buildSellPageSeo()).includes('<img src=x'))
  } finally { content.heading = prior }
})

test('sitemap keeps the seller page even when catalogue requests fail', async () => {
  const previousFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => { throw new Error('offline fixture') }
    const sitemap = await getSitemapXml()
    assert.ok(sitemap.includes('<loc>https://store.digitalhood.info/sell</loc>'))
    for (const privatePath of ['seller.digitalhood.info/apply', '/checkout</loc>', '/account</loc>']) assert.ok(!sitemap.includes(privatePath))
  } finally { globalThis.fetch = previousFetch }
})
