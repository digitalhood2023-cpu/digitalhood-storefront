import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

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
    pathRewrite: {
      '^/api/wc/store': '/wp-json/wc/store',
    },
  })
);

app.use(
  '/api/digitalhood',
  createProxyMiddleware({
    target: 'https://digitalhood.info',
    changeOrigin: true,
    secure: true,
    pathRewrite: {
      '^/api/digitalhood': '/wp-json/digitalhood',
    },
  })
);

app.use(express.static(path.join(__dirname, 'dist')));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DigitalHood storefront running on port ${PORT}`);
});
