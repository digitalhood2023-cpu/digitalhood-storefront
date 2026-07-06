import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    pathRewrite: (path) => `/wp-json/wc/store${path}`,
    onProxyReq(proxyReq) {
      proxyReq.setHeader('Origin', 'https://digitalhood.info');
    },
  })
);

/**
 * JSON parser only for our custom backend routes.
 */
app.use(express.json());

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
        message: 'WooCommerce API credentials are not configured',
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
        /\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(normalizedPath)
      ) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  })
);

app.use((_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DigitalHood storefront running on port ${PORT}`);
});
