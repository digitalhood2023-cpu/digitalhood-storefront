import { createRequire } from 'node:module'
import { escapeHtml as esc } from './liteStorefront.js'

const require = createRequire(import.meta.url)
export const PUBLIC_POLICIES = {
  ...require('../config/customer-support.json'),
  ...require('../config/marketplace-policies.json'),
}
export const SUPPORT_ALIASES = Object.freeze({
  '/faqs': '/help', '/terms': '/marketplace-terms', '/privacy': '/data-protection',
})
export const SUPPORT_LINKS = Object.freeze([
  { name: 'Support Center', href: '/support' },
  { name: 'Track Support Case', href: '/support/track' },
  { name: 'Help & FAQs', href: '/help' },
  { name: 'Shipping & delivery', href: '/shipping' },
  { name: 'Returns & refunds', href: '/returns' },
  { name: 'Warranty & repairs', href: '/warranty' },
])

const normalize = pathname => String(pathname || '').replace(/\/+$/, '') || '/'
export function getPublicPolicy(pathname) {
  const path = normalize(pathname)
  const slug = (SUPPORT_ALIASES[path] || path).slice(1)
  return Object.hasOwn(PUBLIC_POLICIES, slug) ? PUBLIC_POLICIES[slug] : null
}

// Only release-controlled, public destinations are permitted. Never interpolate
// request queries, order identifiers, customer data or external redirect targets.
function links(items = []) {
  return items.map(item => {
    if (!/^\/(?!\/)[a-z0-9/?=&%#_-]*$/i.test(item.href)) throw new Error('Invalid public support link')
    return `<a href="${esc(item.href)}">${esc(item.name)}</a>`
  }).join(' ')
}

const styles = `<style data-dh-public-support>
.dh-public-support{color-scheme:light dark;--p-bg:#f8fafc;--p-card:#fff;--p-text:#172033;--p-muted:#475569;--p-border:#dbe1ea;background:var(--p-bg);color:var(--p-text);font:15px/1.7 system-ui,sans-serif;min-height:100svh}.dh-public-support *{box-sizing:border-box}.dh-public-support a{color:inherit;text-decoration:underline;text-underline-offset:3px}.dh-public-support header,.dh-public-support main,.dh-public-support footer{max-width:1100px;margin:auto;padding:16px}.dh-public-support header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--p-border)}.dh-public-support h1{font-size:clamp(24px,4vw,32px);line-height:1.25;margin:8px 0}.dh-public-support h2{font-size:16px;margin:0}.dh-public-support p{margin:8px 0;color:var(--p-muted)}.dh-public-support nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin:12px 0}.dh-public-support nav a{font-size:13px;font-weight:650}.dh-public-support article{background:var(--p-card);border:1px solid var(--p-border);border-radius:16px;padding:18px}.dh-public-support section{padding:16px 0;border-bottom:1px solid var(--p-border);scroll-margin-top:20px}.dh-public-support ul{padding-left:20px}.dh-public-support .summary{background:var(--p-bg);border-radius:12px;padding:12px}.dh-public-support small{color:var(--p-muted)}@media(prefers-color-scheme:dark){.dh-public-support{--p-bg:#0f172a;--p-card:#172033;--p-text:#f1f5f9;--p-muted:#cbd5e1;--p-border:#475569}}
</style>`

export function renderPublicSupport(pathname) {
  const path = normalize(pathname)
  const policy = getPublicPolicy(path)
  const isForm = ['/support', '/support/track', '/contact'].includes(path)
  if (!policy && !isForm) return ''
  const title = policy?.title || (path === '/support/track' ? 'Track a support case' : 'Support Center')
  const content = policy
    ? `<p>${esc(policy.subtitle)}</p><small>Policy updated ${esc(policy.lastUpdated)}</small><article>${policy.actions ? `<nav aria-label="Get help">${links(policy.actions)}</nav>` : ''}${policy.highlights ? `<div class="summary"><h2>At a glance</h2><ul>${policy.highlights.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}<details><summary>Jump to a section</summary><nav aria-label="On this page">${links(policy.sections.map((section, i) => ({ name: section.title, href: `#policy-section-${i + 1}` })).map(item => ({ ...item, href: `/${policy.slug}${item.href}` })))}</nav></details>${policy.sections.map((section, i) => `<section id="policy-section-${i + 1}"><h2>${esc(section.title)}</h2>${section.body.map(text => `<p>${esc(text)}</p>`).join('')}${section.links ? `<nav aria-label="${esc(section.title)}">${links(section.links)}</nav>` : ''}</section>`).join('')}</article>`
    : `<article><h2>Help with an existing purchase</h2><p>Open your order and choose Report an issue to link the request to the correct purchase, seller and payment history. Guests can use the secure support form when the app loads.</p><nav>${links([{ name: 'Open my orders', href: '/orders' }, { name: 'Read Help & FAQs', href: '/help' }])}</nav><h2>Create or track a case</h2><p>The app opens the secure case form or tracking screen here. Keep your case reference and use the verification requested on the form. Never share passwords, OTPs, payment PINs or full card details.</p><p>If the form cannot load or JavaScript is unavailable, contact us by phone or email below with your order or case reference. Do not send a parcel without confirmed return instructions.</p></article>`
  return `<div class="dh-public-support"><header><a href="/">DigitalHood Marketplace</a><a href="/shop">Shop now</a></header><main id="main-content"><h1>${esc(title)}</h1>${content}<section><h2>Contact DigitalHood</h2><p><a href="mailto:contact@digitalhood.info">contact@digitalhood.info</a> · <a href="tel:+260971047570">+260971047570</a></p><p>For an existing request, quote your order or case number.</p></section></main><footer><nav aria-label="Support">${links(SUPPORT_LINKS)}</nav><nav aria-label="Marketplace policies">${links(Object.values(PUBLIC_POLICIES).filter(item => !Object.hasOwn(require('../config/customer-support.json'), item.slug)).map(item => ({ name: item.title, href: `/${item.slug}` })))}</nav></footer><noscript><style>#dh-startup{display:none!important}</style></noscript></div>`
}

export function injectPublicSupport(html, pathname) {
  const content = renderPublicSupport(pathname)
  if (!content) return html
  const policy = getPublicPolicy(pathname)
  const data = policy ? `<script id="dh-public-policy" type="application/json">${JSON.stringify(policy).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')}</script>` : ''
  return html.replace('</head>', `${styles}${data}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`)
    .replace('id="dh-app-shell"', 'id="dh-app-shell" style="display:none"')
}
