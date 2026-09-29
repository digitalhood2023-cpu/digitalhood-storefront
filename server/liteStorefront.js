/* Read-only, server-rendered catalogue. No React, browser JS, tracking, or payment writes. */
const PAGE_SIZE = 12;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const FRESH_MS = 60_000;
const STALE_MS = 10 * 60_000;
const MAX_CACHE_KEYS = 64;

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function plainText(value, maximum = 240) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function safeImage(value) {
  try {
    const parsed = new URL(typeof value === 'string' ? value : value?.src || value?.url || '');
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '';
  } catch { return ''; }
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id);
  if (!Number.isSafeInteger(id) || id < 1 || !raw.name) return null;
  const slug = String(raw.slug || id).slice(0, 240);
  const direct = raw.price;
  const minorUnit = Number(raw.prices?.currency_minor_unit ?? 2);
  const price = direct !== null && direct !== undefined && String(direct).trim() !== ''
    ? Number(direct)
    : raw.prices?.price !== null && raw.prices?.price !== undefined && Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 4
      ? Number(raw.prices.price) / 10 ** minorUnit : NaN;
  const currency = /^[A-Z]{3}$/.test(String(raw.prices?.currency_code || raw.currency || ''))
    ? String(raw.prices?.currency_code || raw.currency) : 'ZMW';
  const status = String(raw.stock_status || raw.stockStatus || '').toLowerCase();
  const stock = status === 'outofstock' || raw.in_stock === false || raw.is_in_stock === false
    ? 'Out of stock' : status === 'instock' || raw.in_stock === true || raw.is_in_stock === true
      ? 'In stock when checked' : 'Availability to be confirmed';
  return {
    id, slug, name: plainText(raw.name, 200),
    price: Number.isFinite(price) && price >= 0 ? `${currency} ${price.toFixed(2)}` : 'Price unavailable',
    stock,
    seller: plainText(raw.sellerStoreName || raw.seller_store_name || raw.seller?.storeName || '', 100),
    description: plainText(raw.shortDescription || raw.short_description || raw.description || '', 900),
    image: safeImage(raw.imageThumb || raw.image_thumb || raw.imageCard || raw.image_card || raw.image || raw.images?.[0]),
    hasOptions: raw.type === 'variable' || raw.hasOptions === true,
  };
}

function failure(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readBoundedJson(response) {
  if (Number(response.headers.get('content-length') || 0) > MAX_BODY_BYTES) throw failure('Catalogue response was too large.');
  if (!response.body?.getReader) throw failure('Catalogue response had no readable body.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw failure('Catalogue response was too large.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw failure('Catalogue response was not valid JSON.'); }
}

export function createLiteCatalogue({
  apiBase = 'https://payments.digitalhood.info',
  fetchImpl = globalThis.fetch,
  now = Date.now,
  timeoutMs = 6000,
} = {}) {
  const base = new URL(apiBase);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid configured catalogue API origin.');
  const cache = new Map();
  const pending = new Map();

  async function load(pathname, normalize) {
    const saved = cache.get(pathname);
    if (saved && now() - saved.at <= FRESH_MS) return { ...saved, cacheStatus: 'fresh' };
    if (pending.has(pathname)) return pending.get(pathname);
    if (pending.size >= 16) {
      if (saved && now() - saved.at <= STALE_MS) return { ...saved, cacheStatus: 'stale' };
      throw failure('The catalogue is busy. Please try again shortly.');
    }
    const request = (async () => {
      const controller = new AbortController();
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(failure('The catalogue connection timed out. Please try again.'));
          controller.abort();
        }, timeoutMs);
      });
      try {
        const result = await Promise.race([
          (async () => {
            const response = await fetchImpl(new URL(pathname, base).href, {
              method: 'GET', headers: { Accept: 'application/json' },
              credentials: 'omit', redirect: 'error', signal: controller.signal,
            });
            if (!response.ok) throw failure(response.status === 404 ? 'This product is not available.' : 'The catalogue is temporarily unavailable.', response.status);
            const raw = await readBoundedJson(response);
            if (controller.signal.aborted) throw failure('Catalogue request was cancelled.');
            const entry = { data: normalize(raw), at: now() };
            const policy = String(response.headers.get('cache-control') || '').toLowerCase();
            // Only whitelisted public fields enter memory; never forward cookies or auth.
            if (!/(?:private|no-store)/.test(policy) && !response.headers.has('set-cookie')) {
              cache.delete(pathname);
              cache.set(pathname, entry);
              while (cache.size > MAX_CACHE_KEYS) cache.delete(cache.keys().next().value);
            } else cache.delete(pathname);
            return { ...entry, cacheStatus: 'live' };
          })(),
          deadline,
        ]);
        return result;
      } catch (error) {
        const status = Number(error?.status || 503);
        if (status >= 400 && status < 500 && status !== 429) {
          cache.delete(pathname);
          throw error;
        }
        if (saved && now() - saved.at <= STALE_MS) return { ...saved, cacheStatus: 'stale' };
        throw error;
      } finally { clearTimeout(timer); }
    })();
    pending.set(pathname, request);
    try { return await request; }
    finally { if (pending.get(pathname) === request) pending.delete(pathname); }
  }

  return {
    async list(query = '', page = 1) {
      const q = typeof query === 'string' ? query.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 100) : '';
      const p = Math.max(1, Math.min(500, Math.trunc(Number(page) || 1)));
      const params = new URLSearchParams({ q, page: String(p), per_page: String(PAGE_SIZE), sort: 'featured' });
      const result = await load(`/api/search/products?${params}`, (raw) => {
        if (!raw || !Array.isArray(raw.products)) throw failure('Catalogue response was incomplete.');
        return {
          products: raw.products.slice(0, PAGE_SIZE).map(normalizeProduct).filter(Boolean),
          totalPages: Math.max(1, Math.min(500, Math.trunc(Number(raw.totalPages) || 1))),
        };
      });
      return { ...result, query: q, page: p };
    },
    async product(slug) {
      const safeSlug = String(slug || '');
      if (!safeSlug || safeSlug.length > 240 || /[\/\\\x00-\x1f\x7f]/.test(safeSlug)) throw failure('Invalid product link.', 404);
      const path = /^\d+$/.test(safeSlug) ? `/api/products/${safeSlug}?include_variations=0`
        : `/api/products/slug/${encodeURIComponent(safeSlug)}?include_variations=0`;
      return load(path, (raw) => {
        const product = normalizeProduct(raw?.product || raw);
        if (!product) throw failure('This product is not available.', 404);
        return product;
      });
    },
  };
}

function documentHtml(title, body, query = '') {
  return `<!doctype html><html lang="en-ZM"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${escapeHtml(title)} | DigitalHood Lite</title><style>
body{margin:0;background:#fff;color:#172033;font:16px/1.55 Arial,sans-serif}header,main,footer{max-width:850px;margin:0 auto;padding:20px}header{border-bottom:1px solid #ddd}h1{font-size:26px;margin:0 0 12px}h2{font-size:20px;margin:0 0 8px}a{color:#15125f}input,button{box-sizing:border-box;max-width:100%;font:inherit;padding:9px;border:1px solid #777}input{background:#fff;color:#111}button{background:#15125f;color:#fff;border-color:#15125f}article{padding:18px 0;border-bottom:1px solid #ddd}.notice{padding:12px;background:#f3f5fa;border:1px solid #cbd1df}.price{font-size:19px;font-weight:bold}.small{font-size:14px}nav a{display:inline-block;padding:8px 16px 8px 0}footer{font-size:14px}p{margin:8px 0}</style></head><body><header><h1><a href="/lite">DigitalHood Lite</a></h1><p>A low-data catalogue. No app download, animations, or automatic photos.</p><form action="/lite" method="get"><label for="q">Search products</label><br><input id="q" name="q" type="search" maxlength="100" value="${escapeHtml(query)}"> <button type="submit">Search</button></form><p class="small"><a href="/">Open the full marketplace</a></p></header><main>${body}</main><footer>Browsing only. Prices and stock are confirmed again in the full marketplace before purchase. Secure checkout requires a supported, up-to-date browser. We never lower payment or HTTPS security for an old device.</footer></body></html>`;
}

function snapshot(result) {
  const time = new Date(result.at).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  return `<p class="notice small">${result.cacheStatus === 'stale' ? 'Live catalogue unavailable. Showing a saved public catalogue snapshot' : 'Catalogue snapshot'} from ${escapeHtml(time)}. Price and availability may change.</p>`;
}

function productBody(product, detail = false) {
  const publicPath = `/product/${encodeURIComponent(product.slug)}`;
  const name = escapeHtml(product.name);
  return `<article><h2>${detail ? name : `<a href="/lite${publicPath}">${name}</a>`}</h2><p class="price">${escapeHtml(product.price)}${product.hasOptions ? ' (options available)' : ''}</p><p>${escapeHtml(product.stock)}</p>${product.seller ? `<p class="small">Sold by ${escapeHtml(product.seller)}</p>` : ''}${detail && product.description ? `<p>${escapeHtml(product.description)}</p>` : ''}${product.image ? `<p><a href="${escapeHtml(product.image)}" rel="noreferrer">Open product photo (uses more data)</a></p>` : ''}${detail ? `<p><a href="${publicPath}">Open this product in the full marketplace</a></p><p class="small">To buy, open that product link on a supported browser. This catalogue does not collect payment details or place orders.</p>` : ''}</article>`;
}

export function renderLiteList(result) {
  const products = result.data.products;
  const href = (page) => `/lite?q=${encodeURIComponent(result.query)}&amp;page=${page}`;
  return documentHtml(result.query ? `Search: ${result.query}` : 'Catalogue',
    snapshot(result) + (products.length ? products.map((product) => productBody(product)).join('') : '<p>No matching products were returned. Try another search.</p>') +
    `<nav aria-label="Catalogue pages">${result.page > 1 ? `<a href="${href(result.page - 1)}">Previous page</a>` : ''}<span>Page ${result.page} of ${result.data.totalPages}</span> ${result.page < result.data.totalPages ? `<a href="${href(result.page + 1)}">Next page</a>` : ''}</nav>`, result.query);
}

export function installLiteStorefront(app, options = {}) {
  const catalogue = createLiteCatalogue(options);
  function headers(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    res.type('html');
  }
  function showError(res, error, query = '') {
    const status = Number(error?.status) === 404 ? 404 : 503;
    if (status === 503) res.setHeader('Retry-After', '10');
    const message = status === 404 ? 'This product is not available.' : 'The catalogue could not be reached. Please use the search form to try again.';
    return res.status(status).send(documentHtml('Catalogue unavailable', `<p class="notice" role="alert">${message}</p><p><a href="/lite">Try the catalogue again</a></p>`, query));
  }
  app.get(['/lite', '/lite/'], async (req, res) => {
    headers(res);
    try {
      const result = await catalogue.list(req.query.q, req.query.page);
      res.setHeader('X-DigitalHood-Lite-Cache', result.cacheStatus);
      return res.send(renderLiteList(result));
    } catch (error) { return showError(res, error, typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : ''); }
  });
  app.get('/lite/product/:slug', async (req, res) => {
    headers(res);
    try {
      const result = await catalogue.product(req.params.slug);
      res.setHeader('X-DigitalHood-Lite-Cache', result.cacheStatus);
      return res.send(documentHtml(result.data.name, snapshot(result) + productBody(result.data, true)));
    } catch (error) { return showError(res, error); }
  });
}
