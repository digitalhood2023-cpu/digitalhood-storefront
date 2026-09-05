import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
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

const STOREFRONT_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://*.stripe.com https://accounts.google.com https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://digitalhood.info https://*.digitalhood.info wss://*.digitalhood.info https://*.stripe.com https://accounts.google.com https://challenges.cloudflare.com https://cloudflareinsights.com",
  "frame-src https://*.stripe.com https://accounts.google.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

function applyStorefrontSecurityHeaders(req, res, next) {
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const secureTransport = req.secure || forwardedProtocol === 'https';
  res.setHeader('Content-Security-Policy', STOREFRONT_CONTENT_SECURITY_POLICY);
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(self), geolocation=(self), gyroscope=(), microphone=(), payment=(self), usb=()'
  );
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production' && secureTransport) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return next();
}

app.disable('x-powered-by');
app.use(applyStorefrontSecurityHeaders);

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

      if (normalizedPath.endsWith('/sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Service-Worker-Allowed', '/');
        return;
      }

      if (normalizedPath.endsWith('/network-cache-policy.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return;
      }

      if (normalizedPath.endsWith('/site.webmanifest')) {
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
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
