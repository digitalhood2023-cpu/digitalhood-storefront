import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'

const content = createRequire(import.meta.url)('../config/sell-page.json')
const SITE = 'https://store.digitalhood.info'
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function buildSellPageSeo() {
  const url = `${SITE}${content.path}`
  return {
    title: content.title, description: content.description, path: content.path,
    type: 'website', noindex: false,
    graph: [
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: content.heading, description: content.description, inLanguage: 'en-ZM', isPartOf: { '@id': `${SITE}/#website` } },
      { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: content.heading, item: url }] },
    ],
  }
}

// Public static content: no catalogue/auth/payment API dependency. React
// replaces this on startup; without JS the same copy and real links work.
export function renderSellLandingPage() {
  const actions = `<div class="dh-sell-actions"><a class="dh-sell-primary" href="${esc(content.registerUrl)}">Start selling →</a><a class="dh-sell-secondary" href="${esc(content.loginUrl)}">Seller sign in</a></div>`
  return `<div class="dh-sell-page"><header class="dh-sell-static-header"><a href="/"><img src="/favicon.svg" alt="" width="30" height="30">DigitalHood Marketplace</a><a href="/shop">Shop now</a></header><main id="main-content" class="dh-sell-wrap">
    <nav aria-label="Breadcrumb" class="dh-sell-breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${esc(content.heading)}</span></nav>
    <section class="dh-sell-hero" aria-labelledby="sell-title"><div><p class="dh-sell-eyebrow">${esc(content.eyebrow)}</p><h1 id="sell-title">${esc(content.heading)}</h1><p class="dh-sell-tagline">${esc(content.tagline)}</p><p class="dh-sell-copy">${esc(content.intro)}</p>${actions}<p class="dh-sell-note">Seller and product approval required. Already selling? Sign in to your existing account.</p></div><aside class="dh-sell-start" aria-label="Your seller journey"><h2>Choose your starting point</h2><p>Same marketplace. A setup that fits your business.</p><div class="dh-sell-paths">${content.sellerTypes.map(type => `<a href="${esc(type.href)}"><strong>${esc(type.name)} →</strong><span>${esc(type.text)}</span></a>`).join('')}</div><a href="/shops">Explore marketplace stores →</a></aside></section>
    <section class="dh-sell-section" aria-labelledby="sell-benefits-title"><div class="dh-sell-section-heading"><h2 id="sell-benefits-title">Made for your day-to-day business</h2><span>Connected from listing to order</span></div><div class="dh-sell-benefits">${content.benefits.map(item => `<article class="dh-sell-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('')}</div></section>
    <div class="dh-sell-details-grid"><section class="dh-sell-panel" aria-labelledby="sell-steps-title"><h2 id="sell-steps-title">From application to your first listing</h2><ol class="dh-sell-steps">${content.steps.map((item, i) => `<li><span class="dh-sell-step-number" aria-hidden="true">${i + 1}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></li>`).join('')}</ol></section><section class="dh-sell-panel" aria-labelledby="sell-ready-title"><h2 id="sell-ready-title">Before you apply</h2><ul class="dh-sell-checklist">${content.requirements.map(item => `<li><span aria-hidden="true">✓</span><span>${esc(item)}</span></li>`).join('')}</ul><nav class="dh-sell-policy-links" aria-label="Seller guidance"><a href="/seller-terms">Seller terms</a><a href="/prohibited-products">Restricted products</a><a href="${esc(content.supportUrl)}">Ask seller support</a></nav></section></div>
    <section class="dh-sell-panel dh-sell-faq" aria-labelledby="sell-faq-title"><h2 id="sell-faq-title">A few things worth knowing</h2>${content.faqs.map(item => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</section><section class="dh-sell-finish"><div><h2>Let’s build your next chapter.</h2><p>Bring your business to DigitalHood. Start with your seller application.</p></div><a class="dh-sell-primary" href="${esc(content.registerUrl)}">Start selling →</a></section>
    <noscript><style>#dh-startup{display:none!important}</style></noscript></main></div>`
}

let stylesPromise
export function getSellLandingStyles(distDir) {
  if (!stylesPromise) {
    stylesPromise = fs.readFile(path.join(distDir, '.vite', 'manifest.json'), 'utf8')
      .then(source => {
        const files = JSON.parse(source)?.['src/pages/SellPage.tsx']?.css || []
        return files.filter(file => typeof file === 'string' && /^assets\/[a-zA-Z0-9_.-]+\.css$/.test(file))
          .map(file => '<link rel="stylesheet" href="/' + file + '">').join('\n')
      }).catch(() => '')
  }
  return stylesPromise
}

export function injectSellLandingContent(html, styleTags = '') {
  return html.replace('</head>', styleTags + '\n</head>')
    .replace('<div id="root"></div>', `<div id="root">${renderSellLandingPage()}</div>`)
    .replace('id="dh-app-shell"', 'id="dh-app-shell" style="display:none"')
}
