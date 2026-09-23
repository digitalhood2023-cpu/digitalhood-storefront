import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildGoogleMerchantFeed,
  createGoogleMerchantFeedService,
  fetchLiveMerchantProducts,
  normalizeMerchantProduct,
} from './googleMerchantFeed.js'

function product(overrides = {}) {
  return {
    id: 42,
    name: 'HP &lt;Laptop&gt; &amp; Workstation',
    slug: 'hp-laptop-workstation',
    type: 'simple',
    status: 'publish',
    short_description: '<p>Fast &amp; dependable for work.</p>',
    description: `
      <table>
        <tr><th>Brand</th><td>HP</td></tr>
        <tr><th>Product Number</th><td>C92MFEA</td></tr>
        <tr><th>Condition</th><td>Brand new</td></tr>
        <tr><th>GTIN</th><td>4006381333931</td></tr>
      </table>
    `,
    prices: {
      price: '1299900',
      currency_code: 'ZMW',
      currency_minor_unit: 2,
    },
    images: [
      { src: 'https://digitalhood.info/uploads/laptop?a=1&b=2' },
      { src: 'https://digitalhood.info/uploads/laptop-side' },
    ],
    categories: [{ name: 'PC & Laptops' }],
    is_in_stock: true,
    is_purchasable: true,
    is_password_protected: false,
    ...overrides,
  }
}

test('normalizes a valid product without inventing identifiers', () => {
  const result = normalizeMerchantProduct(product())

  assert.equal(result.reason, '')
  assert.equal(result.product.title, 'HP <Laptop> & Workstation')
  assert.equal(result.product.price, '12999.00 ZMW')
  assert.equal(result.product.condition, 'new')
  assert.equal(result.product.brand, 'HP')
  assert.equal(result.product.gtin, '4006381333931')
  assert.equal(result.product.mpn, 'C92MFEA')
  assert.equal(result.product.link, 'https://store.digitalhood.info/product/hp-laptop-workstation')
})

test('escapes XML and excludes invalid or unpublished products', () => {
  const feed = buildGoogleMerchantFeed([
    product(),
    product({ id: 43, status: 'draft' }),
    product({ id: 44, images: [] }),
    product({ id: 45, prices: { price: '0', currency_code: 'ZMW', currency_minor_unit: 2 } }),
  ])

  assert.equal(feed.productCount, 1)
  assert.equal(feed.excludedCount, 3)
  assert.deepEqual(feed.excludedByReason, {
    unpublished: 1,
    image: 1,
    price: 1,
  })
  assert.match(feed.xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/)
  assert.match(feed.xml, /<g:title>HP &lt;Laptop&gt; &amp; Workstation<\/g:title>/)
  assert.match(feed.xml, /<g:image_link>[^<]*a=1&amp;b=2<\/g:image_link>/)
  assert.match(feed.xml, /<g:gtin>4006381333931<\/g:gtin>/)
  assert.match(feed.xml, /<g:mpn>C92MFEA<\/g:mpn>/)
})

test('loads every declared Store API page', async () => {
  const requestedPages = []
  const fakeFetch = async (input) => {
    const url = new URL(input)
    const page = Number(url.searchParams.get('page'))
    requestedPages.push(page)

    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-wp-totalpages': '3', 'x-wp-total': '3' }),
      async json() {
        return [product({ id: page })]
      },
    }
  }

  const products = await fetchLiveMerchantProducts({ fetchImpl: fakeFetch })
  assert.deepEqual(requestedPages.sort(), [1, 2, 3])
  assert.deepEqual(products.map((item) => item.id), [1, 2, 3])
})

test('rejects an incomplete paginated catalogue', async () => {
  const fakeFetch = async (input) => {
    const page = Number(new URL(input).searchParams.get('page'))
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-wp-totalpages': '2', 'x-wp-total': '2' }),
      async json() {
        return page === 1 ? [product()] : []
      },
    }
  }

  await assert.rejects(
    fetchLiveMerchantProducts({ fetchImpl: fakeFetch }),
    /incomplete catalogue/
  )
})

test('serves the last good feed when a refresh fails', async () => {
  let fail = false
  const fakeFetch = async () => {
    if (fail) throw new Error('upstream unavailable')
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-wp-totalpages': '1' }),
      async json() {
        return [product()]
      },
    }
  }
  const service = createGoogleMerchantFeedService({
    fetchImpl: fakeFetch,
    cacheTtlMs: -1,
    staleTtlMs: 60_000,
  })

  const first = await service.getFeed()
  fail = true
  const stale = await service.getFeed()

  assert.equal(first.cacheStatus, 'MISS')
  assert.equal(stale.cacheStatus, 'STALE')
  assert.equal(stale.xml, first.xml)
})
