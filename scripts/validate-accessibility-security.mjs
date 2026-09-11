import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(`Accessibility/security gate failed: ${message}`)
}

const hexToRgb = (hex) => {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
}

const relativeLuminance = (hex) => {
  const channels = hexToRgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const contrastRatio = (foreground, background) => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

const themeTokenValues = (name) =>
  [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))].map((match) => match[1])

const assertThemeContrast = (foregroundToken, backgroundToken, label) => {
  const foregrounds = themeTokenValues(foregroundToken)
  const backgrounds = themeTokenValues(backgroundToken)
  assert(foregrounds.length >= 2 && backgrounds.length >= 2, `${label} tokens must define light and dark values`)
  assert(contrastRatio(foregrounds[0], backgrounds[0]) >= 4.5, `${label} light contrast must meet WCAG AA`)
  assert(contrastRatio(foregrounds.at(-1), backgrounds.at(-1)) >= 4.5, `${label} dark contrast must meet WCAG AA`)
}

const app = read('src/App.tsx')
const accessibility = read('src/components/AccessibilityFoundation.tsx')
const css = read('src/index.css')
const html = read('index.html')
const server = read('server.js')
const networkBanner = read('src/components/NetworkStatusBanner.tsx')
const product = read('src/pages/ProductPage.tsx')

assert(app.includes('<AccessibilityFoundation />'), 'the accessibility foundation must be mounted globally')
assert(accessibility.includes('Skip to main content'), 'a keyboard skip link is required')
assert(accessibility.includes("main, [role=\"main\"]"), 'route content must resolve a semantic main landmark')
assert(accessibility.includes("main.focus({ preventScroll: true })"), 'SPA route changes must move focus without jumping the viewport')
assert(accessibility.includes('MutationObserver'), 'lazy route landmarks must be discovered after rendering')
assert(css.includes(':focus-visible'), 'interactive controls need a visible keyboard focus indicator')
assert(css.includes('prefers-reduced-motion: reduce'), 'reduced-motion preferences must be honoured')
assert(html.includes('maximum-scale=5.0') && html.includes('user-scalable=yes'), 'browser text and page zoom must remain available')
assert(networkBanner.includes('role="status"') && networkBanner.includes('aria-live="polite"'), 'network state must be announced accessibly')
assert(product.includes("event.key === 'ArrowLeft'") && product.includes("event.key === 'Escape'"), 'product gallery keyboard controls are required')
assertThemeContrast('dh-ui-text', 'dh-ui-surface', 'primary marketplace text')
assertThemeContrast('dh-ui-text-muted', 'dh-ui-surface', 'secondary marketplace text')
assertThemeContrast('dh-ui-text-subtle', 'dh-ui-surface', 'compact marketplace text')
assertThemeContrast('dh-chat-incoming-text', 'dh-chat-incoming', 'incoming chat bubbles')
assertThemeContrast('dh-chat-outgoing-text', 'dh-chat-outgoing', 'outgoing chat bubbles')

for (const marker of [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
  'Cross-Origin-Resource-Policy',
  'X-Content-Type-Options',
  'Referrer-Policy',
]) assert(server.includes(marker), `missing ${marker} response policy`)

assert(server.includes("app.disable('x-powered-by')"), 'framework disclosure must be disabled')
assert(server.includes("forwardedProtocol === 'https'"), 'HSTS must be proxy-aware')
assert(server.indexOf('applyStorefrontSecurityHeaders') < server.indexOf("'/api/wc/store'"), 'headers must cover proxied responses')
assert(!server.includes('LENCO_SECRET_KEY'), 'the storefront must never call Lenco with a provider secret')
assert(!server.includes('WC_CONSUMER_SECRET'), 'the storefront must never hold privileged WooCommerce credentials')
assert(!server.includes("app.post('/api/woocommerce/orders/"), 'the storefront must not expose privileged order mutation routes')
assert(!server.includes("app.post('/api/lenco/mobile-money'"), 'Mobile Money initiation belongs only to the hardened payments API')

console.log('Accessibility and security validation passed')
