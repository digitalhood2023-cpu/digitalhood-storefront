import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import {
  buildServerSeo,
  getIndexHtml,
  getSitemapXml,
  injectSeo,
} from './server/marketplaceSeo.js';
import {
  parseSellerDomainHostname,
  resolveSellerDomainHostname,
} from './server/sellerDomains.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SELLER_STOREFRONT_SUFFIX =
  process.env.SELLER_STOREFRONT_SUFFIX ||
  process.env.VITE_SELLER_STOREFRONT_SUFFIX ||
  'store.digitalhood.info';
const MARKETPLACE_ORIGIN = String(
  process.env.MARKETPLACE_ORIGIN || 'https://store.digitalhood.info'
).replace(/\/+$/, '');
const PAYMENTS_API_URL =
  process.env.PAYMENTS_API_URL || 'https://payments.digitalhood.info';

function getSellerDomainRequest(req) {
  return parseSellerDomainHostname(req.hostname, SELLER_STOREFRONT_SUFFIX);
}

app.use((req, res, next) => {
  const sellerDomain = getSellerDomainRequest(req);
  if (!sellerDomain) return next();

  res.setHeader('Vary', 'Host');

  if (req.path.startsWith('/api/')) {
    return res.status(421).json({
      error: 'Marketplace transactions use the secure DigitalHood origin.',
      marketplaceUrl: `${MARKETPLACE_ORIGIN}${req.originalUrl}`,
    });
  }

  const isStaticAsset =
    req.path.startsWith('/assets/') ||
    req.path === '/logo.jpg' ||
    req.path === '/favicon.ico' ||
    /\.(?:css|js|map|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(req.path);

  if (req.path !== '/' && !isStaticAsset) {
    if (!['GET', 'HEAD'].includes(req.method)) {
      return res.status(421).json({
        error: 'Marketplace transactions use the secure DigitalHood origin.',
      });
    }

    return res.redirect(308, `${MARKETPLACE_ORIGIN}${req.originalUrl}`);
  }

  return next();
});

/**
 * IMPORTANT:
 * WooCommerce Store API proxy must come BEFORE express.json().
 * Otherwise POST bodies for add-to-cart, update-cart, remove-cart,
 * and checkout get consumed before reaching WooCommerce.
 */
app.use(
  '/api/wc/store',
  createProxyMiddleware({
    target: 'https://digitalhood.info',
    changeOrigin: true,
    secure: true,
    pathRewrite: (proxyPath) => `/wp-json/wc/store${proxyPath}`,
    onProxyReq(proxyReq) {
      proxyReq.setHeader('Origin', 'https://digitalhood.info');
    },
  })
);

/**
 * JSON parser only for our custom backend routes.
 */
app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.post('/api/lenco/mobile-money', async (req, res) => {
  try {
    const { amount, phone, operator, reference } = req.body;

    if (!amount || !phone || !operator || !reference) {
      return res.status(400).json({
        status: false,
        message: 'amount, phone, operator, and reference are required',
      });
    }

    if (!process.env.LENCO_SECRET_KEY) {
      return res.status(500).json({
        status: false,
        message: 'LENCO_SECRET_KEY is not configured on the server',
      });
    }

    const response = await axios.post(
      'https://api.lenco.co/access/v2/collections/mobile-money',
      {
        amount,
        phone,
        operator,
        reference,
        country: 'zm',
        bearer: 'merchant',
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LENCO_SECRET_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;

    return res.status(status).json({
      status: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'Lenco mobile money request failed',
      details: error.response?.data || null,
    });
  }
});

app.post('/api/woocommerce/orders/:orderId/mark-paid', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        status: false,
        message: 'Order ID is required',
      });
    }

    if (!process.env.WC_CONSUMER_KEY || !process.env.WC_CONSUMER_SECRET) {
      return res.status(500).json({
        status: false,
        message: 'WooCommerce API credentials are not configured',
      });
    }

    const response = await axios.put(
      `https://digitalhood.info/wp-json/wc/v3/orders/${orderId}`,
      {
        set_paid: true,
        status: 'processing',
      },
      {
        auth: {
          username: process.env.WC_CONSUMER_KEY,
          password: process.env.WC_CONSUMER_SECRET,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;

    return res.status(status).json({
      status: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'Could not mark WooCommerce order as paid',
      details: error.response?.data || null,
    });
  }
});

app.post('/api/woocommerce/orders/:orderId/apply-shipping', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shippingFee, shippingTitle } = req.body;

    if (!orderId) {
      return res.status(400).json({
        status: false,
        message: 'Order ID is required',
      });
    }

    if (!process.env.WC_CONSUMER_KEY || !process.env.WC_CONSUMER_SECRET) {
      return res.status(500).json({
        status: false,
        message: 'WC_CONSUMER_KEY and WC_CONSUMER_SECRET are not configured',
      });
    }

    const response = await axios.put(
      `https://digitalhood.info/wp-json/wc/v3/orders/${orderId}`,
      {
        shipping_lines:
          Number(shippingFee) > 0
            ? [
                {
                  method_id: 'digitalhood_delivery',
                  method_title: shippingTitle || 'DigitalHood Delivery',
                  total: Number(shippingFee).toFixed(2),
                },
              ]
            : [
                {
                  method_id: 'free_shipping',
                  method_title: shippingTitle || 'Free Shipping',
                  total: '0.00',
                },
              ],
      },
      {
        auth: {
          username: process.env.WC_CONSUMER_KEY,
          password: process.env.WC_CONSUMER_SECRET,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;

    return res.status(status).json({
      status: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'Could not apply shipping to WooCommerce order',
      details: error.response?.data || null,
    });
  }
});

app.get('/sitemap.xml', async (_req, res) => {
  res.type('application/xml');
  res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
  return res.send(await getSitemapXml());
});

const distDir = path.join(__dirname, 'dist');

app.use(
  express.static(distDir, {
    index: false,
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const normalizedPath = filePath.replace(/\\/g, '/');

      if (normalizedPath.endsWith('/index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return;
      }

      if (normalizedPath.endsWith('/build-version.txt')) {
        res.setHeader('Cache-Control', 'no-store');
        return;
      }

      if (normalizedPath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      if (
        /\\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(normalizedPath)
      ) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  })
);

app.use(async (req, res) => {
  try {
    const sellerDomain = getSellerDomainRequest(req);

    if (sellerDomain && req.path === '/') {
      const resolution = await resolveSellerDomainHostname(
        sellerDomain.hostname,
        {
          apiBase: PAYMENTS_API_URL,
          suffix: SELLER_STOREFRONT_SUFFIX,
        }
      );

      if (resolution?.redirect && resolution?.domain?.canonicalUrl) {
        const destination = new URL(resolution.domain.canonicalUrl);
        destination.search = req.url.includes('?')
          ? req.url.slice(req.url.indexOf('?'))
          : '';
        return res.redirect(308, destination.toString());
      }

      const seo = resolution?.seller?.key
        ? await buildServerSeo(
            `/seller/${encodeURIComponent(resolution.seller.key)}`,
            {
              canonicalUrl: resolution.domain.canonicalUrl,
              canonicalPath: '/',
            }
          )
        : {
            ...(await buildServerSeo('/')),
            title: 'Store unavailable',
            description: 'This DigitalHood seller storefront is not currently available.',
            canonicalUrl: `https://${sellerDomain.hostname}/`,
            noindex: true,
          };
      const html = injectSeo(await getIndexHtml(distDir), seo);

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      if (seo.noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.type('html').send(html);
    }

    const seo = await buildServerSeo(req.path);
    const html = injectSeo(await getIndexHtml(distDir), seo);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (seo.noindex) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    return res.type('html').send(html);
  } catch (error) {
    console.error('HTML SEO rendering failed:', error?.message || error);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (getSellerDomainRequest(req)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.status(503);
    }
    return res.sendFile(path.join(distDir, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`DigitalHood storefront running on port ${PORT}`);
});
