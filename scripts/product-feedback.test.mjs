import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/product/productFeedback.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { publishedProductId, parseProductFeedback, requestProductFeedback } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const row = { id: 'one', verified: true, reviewer: 'Buyer A.', rating: 5, review: 'Great quality' }
const response = { success: true, productId: 6317, reviews: [row], source: 'digitalhood-verified-delivery', summary: { count: 21, averageRating: 4.75 }, pagination: { page: 1, pages: 2 } }

test('only canonical positive Woo IDs can trigger a feedback request', () => {
  for (const value of [null, undefined, '', 0, -1, 'seller_product_6317', '1/feedback', '1e3', '2.5', true, {}, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(publishedProductId(value), null)
  assert.equal(publishedProductId('6317'), 6317)
  assert.equal(publishedProductId(6317), 6317)
})
test('published aggregate and pagination are preserved, not confused with first-page length', () => {
  assert.deepEqual(parseProductFeedback(response, 6317), { reviews: [{ ...row, title: '', dateCreated: '', response: '', media: [] }].map(({verified, ...item}) => { void verified; return item }), count: 21, averageRating: 4.75, page: 1, pages: 2 })
})
test('unverified, held and malformed review rows never render as verified purchases', () => {
  const result = parseProductFeedback({ ...response, reviews: [row, { ...row, id: 'held', moderationStatus: 'held' }, { ...row, id: 'unverified', verified: false }, { ...row, id: 'bad', rating: 7 }, null] }, 6317)
  assert.deepEqual(result.reviews.map(item => item.id), ['one'])
})
test('legacy fallback computes its summary only from verified reviews and does not repeat pages', () => {
  const result = parseProductFeedback({ ...response, source: 'woocommerce-legacy', reviews: [row, { ...row, id: 'two', rating: 1, verified: false }] }, 6317)
  assert.equal(result.count, 1); assert.equal(result.averageRating, 5); assert.equal(result.pages, 1)
})
test('null, missing, failed and wrong-product payloads are errors, not empty reviews', () => {
  for (const value of [null, {}, { ...response, success: false }, { ...response, productId: 999 }, { ...response, reviews: null }]) assert.throws(() => parseProductFeedback(value, 6317))
  assert.equal(parseProductFeedback({ ...response, reviews: [], summary: { count: 0, averageRating: 0 } }, 6317).count, 0)
})
test('media permits HTTPS only and text remains data for the safe renderer', () => {
  const result = parseProductFeedback({ ...response, reviews: [{ ...row, review: '<script>bad()</script>', media: [{ type: 'image', url: 'javascript:bad()' }, { type: 'image', url: 'https://user:password@example.com/x' }, { type: 'image', url: 'https://example.com/review.jpg' }] }] }, 6317)
  assert.deepEqual(result.reviews[0].media, [{ url: 'https://example.com/review.jpg', type: 'image' }])
})
test('public read omits credentials, revalidates the cache and propagates cancellation', async () => {
  const original = globalThis.fetch, controller = new AbortController()
  let call
  globalThis.fetch = async (...args) => { call = args; return new Response(JSON.stringify(response)) }
  try {
    await requestProductFeedback('https://payments.example/', 6317, 2, controller.signal)
    assert.equal(call[0], 'https://payments.example/api/products/6317/reviews?per_page=20&page=2')
    assert.deepEqual(call[1], { signal: controller.signal, credentials: 'omit', cache: 'no-cache' })
    globalThis.fetch = async () => new Response('bad gateway', { status: 503 })
    await assert.rejects(requestProductFeedback('https://payments.example', 6317, 1, controller.signal))
  } finally { globalThis.fetch = original }
})
