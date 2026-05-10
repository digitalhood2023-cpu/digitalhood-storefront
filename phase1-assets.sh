#!/bin/bash
set -e

cat > public/robots.txt <<'EOF'
User-agent: *
Disallow:

Sitemap: https://store.digitalhood.info/sitemap.xml
EOF

cat > public/sitemap.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://store.digitalhood.info/</loc><priority>1.0</priority></url>
  <url><loc>https://store.digitalhood.info/shop</loc><priority>0.9</priority></url>
  <url><loc>https://store.digitalhood.info/cart</loc><priority>0.5</priority></url>
  <url><loc>https://store.digitalhood.info/about</loc><priority>0.7</priority></url>
  <url><loc>https://store.digitalhood.info/contact</loc><priority>0.7</priority></url>
</urlset>
EOF

cat > public/site.webmanifest <<'EOF'
{
  "name": "DigitalHood Zambia",
  "short_name": "DigitalHood",
  "description": "Zambia online marketplace for phones, laptops, accessories and repairs.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/logo.jpg",
      "sizes": "512x512",
      "type": "image/jpeg"
    }
  ]
}
EOF
