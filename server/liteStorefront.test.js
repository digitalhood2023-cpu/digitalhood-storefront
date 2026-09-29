import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiteCatalogue, normalizeProduct, renderLiteList, installLiteStorefront } from './liteStorefront.js';

const product = { id: 17, slug: 'test-phone', name: 'Test phone', price: '1200', stock_status: 'instock', seller_store_name: 'Test store' };
const response = (data, options = {}) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' }, ...options });

test('uses the verified public search endpoint, GET only, and twelve products per page', async () => {
  let request;
  const service = createLiteCatalogue({ fetchImpl: async (url, init) => { request = { url, init }; return response({ products: [product], totalPages: 3 }); } });
  const result = await service.list('phones', 2);
  const url = new URL(request.url);
  assert.equal(url.pathname, '/api/search/products');
  assert.equal(url.searchParams.get('per_page'), '12');
  assert.equal(url.searchParams.get('q'), 'phones');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(request.init.method, 'GET');
  assert.equal(request.init.credentials, 'omit');
  assert.equal(request.init.redirect, 'error');
  assert.deepEqual(request.init.headers, { Accept: 'application/json' });
  assert.equal(result.data.products[0].price, 'ZMW 1200.00');
});

test('returned HTML contains catalogue content but no scripts, automatic images, or payment forms', async () => {
  const service = createLiteCatalogue({ fetchImpl: async () => response({ products: [{ ...product, image: 'https://example.com/photo.jpg' }], totalPages: 2 }) });
  const html = renderLiteList(await service.list());
  assert.match(html, /Test phone/);
  assert.match(html, /ZMW 1200\.00/);
  assert.match(html, /\/lite\/product\/test-phone/);
  assert.match(html, /Next page/);
  assert.doesNotMatch(html, /<script|<img|method="post"|type="password"|react|stripe\.com/i);
  assert.match(html, /Catalogue snapshot/);
  assert.ok(Buffer.byteLength(html) < 8000);
});

test('escapes search queries, names, prices, seller names and image attributes', async () => {
  const service = createLiteCatalogue({ fetchImpl: async () => response({ products: [{ ...product, name: '\"><script>alert(1)</script>&', seller_store_name: '" & <b>Seller</b>', image: 'javascript:alert(1)' }], totalPages: 1 }) });
  const html = renderLiteList(await service.list('\"><img src=x onerror=alert(1)>'));
  assert.doesNotMatch(html, /<script|<img|href="javascript:/i);
  assert.match(html, /&lt;img/);
});

test('unknown prices are not displayed as free and Woo Store minor units are supported', () => {
  assert.equal(normalizeProduct({ id: 1, name: 'Missing' }).price, 'Price unavailable');
  assert.equal(normalizeProduct({ id: 1, name: 'Minor', prices: { price: '12345', currency_minor_unit: 2, currency_code: 'ZMW' } }).price, 'ZMW 123.45');
  assert.equal(normalizeProduct({ id: 1, name: 'Zero', price: 0 }).price, 'ZMW 0.00');
  assert.equal(normalizeProduct({ id: 1, name: 'Unknown', price: 'invalid' }).price, 'Price unavailable');
  assert.equal(normalizeProduct({ id: 0, name: 'Invalid' }), null);
});

test('only public whitelisted fields survive normalization', () => {
  const normalized = normalizeProduct({ ...product, customerEmail: 'private@example.com', token: 'secret', order: { id: 99 } });
  assert.equal(normalized.customerEmail, undefined);
  assert.equal(normalized.token, undefined);
  assert.equal(normalized.order, undefined);
});

test('fresh public results are cached without a second upstream request', async () => {
  let calls = 0;
  const service = createLiteCatalogue({ fetchImpl: async () => { calls++; return response({ products: [product], totalPages: 1 }); } });
  await service.list();
  assert.equal((await service.list()).cacheStatus, 'fresh');
  assert.equal(calls, 1);
});

test('an unavailable API may use a bounded, visibly labelled stale snapshot', async () => {
  let clock = 0;
  let fail = false;
  const service = createLiteCatalogue({ now: () => clock, fetchImpl: async () => {
    if (fail) throw new Error('offline');
    return response({ products: [product], totalPages: 1 });
  } });
  await service.list();
  clock = 70_000;
  fail = true;
  const stale = await service.list();
  assert.equal(stale.cacheStatus, 'stale');
  assert.match(renderLiteList(stale), /Live catalogue unavailable/);
  clock = 601_000;
  await assert.rejects(service.list(), /offline/);
});

test('private, no-store, and Set-Cookie responses do not enter the public cache', async () => {
  for (const headers of [{ 'cache-control': 'private' }, { 'cache-control': 'no-store' }, { 'set-cookie': 'session=test' }]) {
    let calls = 0;
    const service = createLiteCatalogue({ fetchImpl: async () => { calls++; return response({ products: [product], totalPages: 1 }, { headers }); } });
    await service.list();
    await service.list();
    assert.equal(calls, 2);
  }
});

test('concurrent identical requests are deduplicated', async () => {
  let calls = 0;
  const service = createLiteCatalogue({ fetchImpl: async () => { calls++; await new Promise((r) => setTimeout(r, 5)); return response({ products: [product], totalPages: 1 }); } });
  await Promise.all([service.list(), service.list(), service.list()]);
  assert.equal(calls, 1);
});

test('a never-resolving API times out and is aborted rather than holding the page forever', async () => {
  let signal;
  const service = createLiteCatalogue({ timeoutMs: 15, fetchImpl: (_url, init) => { signal = init.signal; return new Promise(() => {}); } });
  await assert.rejects(service.list(), /timed out/);
  assert.equal(signal.aborted, true);
});

test('the timeout covers a stalled response body, not only response headers', async () => {
  const service = createLiteCatalogue({ timeoutMs: 15, fetchImpl: async () => new Response(new ReadableStream({ start() {} })) });
  await assert.rejects(service.list(), /timed out/);
});

test('malformed and oversized API responses fail instead of showing an empty catalogue', async () => {
  const malformed = createLiteCatalogue({ fetchImpl: async () => response({ unexpected: [] }) });
  await assert.rejects(malformed.list(), /incomplete/);
  const oversized = createLiteCatalogue({ fetchImpl: async () => response({ products: [] }, { headers: { 'content-length': '3000000' } }) });
  await assert.rejects(oversized.list(), /too large/);
});

test('a 404 removes a cached product instead of serving a deleted product as current', async () => {
  let clock = 0;
  let deleted = false;
  const service = createLiteCatalogue({ now: () => clock, fetchImpl: async () => deleted ? response({}, { status: 404 }) : response({ product }) });
  await service.product('test-phone');
  clock = 70_000;
  deleted = true;
  await assert.rejects(service.product('test-phone'), /not available/);
});

test('valid slug and numeric product URLs use the existing lean product-detail API', async () => {
  const urls = [];
  const service = createLiteCatalogue({ fetchImpl: async (url) => { urls.push(url); return response({ product }); } });
  await service.product('test-phone');
  await service.product('17');
  assert.match(urls[0], /\/api\/products\/slug\/test-phone\?include_variations=0$/);
  assert.match(urls[1], /\/api\/products\/17\?include_variations=0$/);
  await assert.rejects(service.product('../private'), /Invalid product/);
});

test('query and pagination inputs are bounded', async () => {
  let url;
  const service = createLiteCatalogue({ fetchImpl: async (input) => { url = new URL(input); return response({ products: [], totalPages: 1 }); } });
  await service.list('x'.repeat(1000), Infinity);
  assert.equal(url.searchParams.get('q').length, 100);
  assert.equal(url.searchParams.get('page'), '500');
});

test('routes return usable error HTML with 503, Retry-After and no-store', async () => {
  const routes = [];
  installLiteStorefront({ get(path, handler) { routes.push({ path, handler }); } }, { fetchImpl: async () => { throw new Error('private internal error'); } });
  const res = {
    headers: {}, statusCode: 200, body: '',
    setHeader(k, v) { this.headers[k] = v; return this; },
    type() { return this; }, status(code) { this.statusCode = code; return this; }, send(body) { this.body = body; return this; },
  };
  await routes[0].handler({ query: { q: 'phone' } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['Retry-After'], '10');
  assert.match(res.body, /Search products/);
  assert.doesNotMatch(res.body, /private internal error/);
});
