import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  '/api/wc/store',
  createProxyMiddleware({
    target: 'https://digitalhood.info',
    changeOrigin: true,
    secure: true,
    pathRewrite: (path) => {
      return `/wp-json/wc/store${path}`;
    },
    onProxyReq(proxyReq) {
      proxyReq.setHeader('Origin', 'https://digitalhood.info');
    },
  })
);

app.use(
  '/api/wc/store',
  createProxyMiddleware({
    target: 'https://digitalhood.info',
    changeOrigin: true,
    secure: true,
    pathRewrite: (path) => {
      return `/wp-json/wc/store${path}`;
    },
    onProxyReq(proxyReq) {
      proxyReq.setHeader('Origin', 'https://digitalhood.info');
    },
  })
);


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

app.use(express.static(path.join(__dirname, 'dist')));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DigitalHood storefront running on port ${PORT}`);
});
