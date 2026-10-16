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
    assert.equal(url.searchParams.get('per_page'), '50')
    assert.equal(url.searchParams.get('orderby'), 'id')
    assert.equal(url.searchParams.get('order'), 'asc')
    assert.equal(url.searchParams.get('stock_status'), 'instock')
    assert.ok(url.searchParams.get('_fields').split(',').includes('is_password_protected'))
    assert.ok(url.searchParams.get('_fields').split(',').includes('prices'))
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

test('retries a transient upstream error once without publishing a partial feed', async () => {
  let calls = 0
  let cancelled = false
  const products = await fetchLiveMerchantProducts({
    fetchImpl: async () => {
      calls += 1
      if (calls === 1) {
        return { ok: false, status: 503, body: { async cancel() { cancelled = true } } }
      }
      return new Response(JSON.stringify([product()]), {
        headers: { 'x-wp-totalpages': '1', 'x-wp-total': '1' },
      })
    },
  })
  assert.equal(calls, 2)
  assert.equal(cancelled, true)
  assert.equal(products.length, 1)
})

test('does not retry authentication, rate limit, or permanent upstream failures', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let calls = 0
    await assert.rejects(fetchLiveMerchantProducts({
      fetchImpl: async () => {
        calls += 1
        return new Response('', { status })
      },
    }), new RegExp(`HTTP ${status}`))
    assert.equal(calls, 1)
  }
  let calls = 0
  await assert.rejects(fetchLiveMerchantProducts({
    fetchImpl: async () => { calls += 1; return new Response('', { status: 500 }) },
  }), /HTTP 500/)
  assert.equal(calls, 2)
})

test('retries a network failure but obeys the shared cancellation deadline', async () => {
  let calls = 0
  await fetchLiveMerchantProducts({
    fetchImpl: async () => {
      calls += 1
      if (calls === 1) throw new TypeError('fetch failed')
      return new Response(JSON.stringify([product()]))
    },
  })
  assert.equal(calls, 2)
  let abortCalls = 0
  await assert.rejects(fetchLiveMerchantProducts({
    timeoutMs: 5,
    fetchImpl: async (_url, { signal }) => {
      abortCalls += 1
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    },
  }), /abort/i)
  assert.equal(abortCalls, 1)
})

test('limits concurrent upstream requests to two', async () => {
  let active = 0
  let maximum = 0
  const items = await fetchLiveMerchantProducts({
    fetchImpl: async (input) => {
      active += 1
      maximum = Math.max(maximum, active)
      const page = Number(new URL(input).searchParams.get('page'))
      await new Promise((resolve) => setTimeout(resolve, 2))
      active -= 1
      return new Response(JSON.stringify([product({ id: page })]), {
        headers: { 'x-wp-totalpages': '6', 'x-wp-total': '6' },
      })
    },
  })
  assert.equal(items.length, 6)
  assert.equal(maximum, 2)
})

test('rejects duplicate IDs and a catalogue that changes during pagination', async () => {
  await assert.rejects(fetchLiveMerchantProducts({
    fetchImpl: async () => new Response(JSON.stringify([product()]), {
      headers: { 'x-wp-totalpages': '2', 'x-wp-total': '2' },
    }),
  }), /duplicate product IDs/)
  await assert.rejects(fetchLiveMerchantProducts({
    fetchImpl: async (input) => {
      const page = Number(new URL(input).searchParams.get('page'))
      return new Response(JSON.stringify([product({ id: page })]), {
        headers: { 'x-wp-totalpages': '2', 'x-wp-total': String(page === 1 ? 2 : 3) },
      })
    },
  }), /changed during pagination/)
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
