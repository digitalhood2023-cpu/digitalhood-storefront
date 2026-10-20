import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'
import { PUBLIC_POLICIES, SUPPORT_ALIASES, SUPPORT_LINKS, getPublicPolicy, injectPublicSupport, renderPublicSupport } from './supportPages.js'
import { buildServerSeo } from './marketplaceSeo.js'

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const escaped = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

test('every footer Support destination is registered and has useful initial HTML', () => {
  const footer = read('src/sections/Footer.tsx')
  const app = read('src/App.tsx')
  const section = footer.slice(footer.indexOf('const supportLinks'), footer.indexOf('const companyLinks'))
  assert.deepEqual([...section.matchAll(/href: '([^']+)'/g)].map(match => match[1]), SUPPORT_LINKS.map(link => link.href))
  for (const { href } of SUPPORT_LINKS) {
    assert.ok(app.includes(`path="${href}"`), href)
    const html = renderPublicSupport(href)
    assert.ok(html.includes('<main id="main-content">'), href)
    assert.equal((html.match(/<h1>/g) || []).length, 1)
    assert.ok(html.includes('contact@digitalhood.info'))
    assert.ok(!/coming soon|operational foundation|qualified legal professional/i.test(html))
  }
})

test('all public policies are complete, escaped, linked and shared with the client', async () => {
  for (const [slug, policy] of Object.entries(PUBLIC_POLICIES)) {
    assert.equal(policy.slug, slug)
    assert.ok(policy.sections.length >= 3, slug)
    const html = renderPublicSupport(`/${slug}/`)
    for (const section of policy.sections) {
      assert.ok(html.includes(escaped(section.title)))
      for (const paragraph of section.body) assert.ok(html.includes(escaped(paragraph)))
    }
    const seo = await buildServerSeo(`/${slug}`)
    assert.equal(seo.title, policy.title)
    assert.equal(seo.description, policy.subtitle)
    assert.equal(seo.noindex, false)
  }
  const client = read('src/lib/marketplacePolicies.ts')
  assert.ok(client.includes('dh-public-policy'))
  assert.ok(client.includes('/api/public/policies/'))
  assert.ok(!client.includes('config/customer-support.json'), 'Public prose must not inflate shopping JavaScript')
})

test('seven-day guidance preserves legacy rights and never equates approval with payment', () => {
  const copy = JSON.stringify(PUBLIC_POLICIES.returns)
  for (const required of ['7 calendar days', 'day zero', '23:59 Africa/Lusaka', '14-day', 'after publication', 'not a denial cutoff', 'not itself confirm', 'DigitalHood Finance', 'physical', 'no customer processing', 'original payment route', 'return instructions']) {
    assert.ok(copy.includes(required), required)
  }
  assert.ok(!/automatic refund|refund guaranteed|no refunds after|within 24 hours/i.test(copy))
  assert.ok(copy.includes('do not have to accept a partial refund'))
})

test('public and private routes remain distinct and aliases do not accept redirect input', () => {
  for (const route of ['/orders/123', '/account', '/checkout', '/wp-admin', '/__proto__', '/constructor', '/not-a-policy']) assert.equal(renderPublicSupport(route), '')
  assert.equal(getPublicPolicy('/__proto__'), null)
  assert.equal(SUPPORT_ALIASES['/privacy'], '/data-protection')
  assert.equal(SUPPORT_ALIASES['/terms'], '/marketplace-terms')
  assert.equal(SUPPORT_ALIASES['/faqs'], '/help')
  assert.equal(getPublicPolicy('/returns?next=https://example.com'), null)
  for (const route of ['/support', '/support/track', '/contact']) {
    const html = renderPublicSupport(route)
    assert.ok(!html.includes('<form'), 'The static fallback must not fake a secure form')
    assert.ok(html.includes('verification'))
  }
})

test('server insertion preserves startup scripts and unknown pages unchanged', () => {
  const input = '<head></head><div id="dh-app-shell"></div><div id="root"></div><script>boot()</script>'
  const html = injectPublicSupport(input, '/returns')
  assert.ok(html.includes('data-dh-public-support'))
  assert.ok(html.includes('prefers-color-scheme:dark'))
  assert.ok(html.includes('id="dh-app-shell" style="display:none"'))
  assert.ok(html.includes('<script>boot()</script>'))
  assert.ok(html.includes('id="dh-public-policy" type="application/json"'))
  assert.ok(html.includes('<noscript>'))
  assert.equal(injectPublicSupport(input, '/checkout'), input)
})

test('copy and links cannot inject markup or external redirect schemes', () => {
  const policy = PUBLIC_POLICIES.returns
  const priorTitle = policy.title
  const priorHref = policy.actions[0].href
  try {
    policy.title = '<img src=x onerror=alert(1)> & "copy"'
    const html = renderPublicSupport('/returns')
    assert.ok(html.includes(escaped(policy.title)))
    assert.ok(!html.includes('<img src=x'))
    const embedded = injectPublicSupport('<head></head><div id="root"></div>', '/returns')
    assert.ok(embedded.includes('\\u003cimg'))
    assert.ok(!embedded.includes('<img src=x'))
    for (const href of ['javascript:alert(1)', '//example.com', 'https://example.com', '/support" onclick="alert(1)']) {
      policy.actions[0].href = href
      assert.throws(() => renderPublicSupport('/returns'), /Invalid public support link/)
    }
  } finally {
    policy.title = priorTitle
    policy.actions[0].href = priorHref
  }
})

function clientFixture() {
  const scope = { exports: {}, document: { getElementById: () => null }, fetch: null, Date, Map, JSON }
  const source = ts.transpileModule(read('src/lib/marketplacePolicies.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, scope, { timeout: 1000 })
  return scope
}

test('a direct visit reuses its public embedded copy without a private API request', () => {
  const scope = clientFixture()
  scope.document.getElementById = () => ({ textContent: JSON.stringify(PUBLIC_POLICIES.returns) })
  assert.equal(scope.exports.readEmbeddedPolicy('returns').title, PUBLIC_POLICIES.returns.title)
  assert.equal(scope.exports.readEmbeddedPolicy('shipping'), null)
  scope.document.getElementById = () => ({ textContent: '{broken' })
  assert.equal(scope.exports.readEmbeddedPolicy('returns'), null)
})

test('internal navigation loads only allowlisted public text and never forwards credentials', async () => {
  const scope = clientFixture()
  let calls = 0
  scope.fetch = async (url, options) => {
    calls++
    assert.equal(url, '/api/public/policies/returns')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.method, 'GET')
    assert.equal(options.redirect, 'error')
    assert.equal(options.cache, 'no-store')
    return { ok: true, json: async () => PUBLIC_POLICIES.returns }
  }
  const signal = new AbortController().signal
  assert.equal((await scope.exports.loadPublicPolicy('returns', signal)).slug, 'returns')
  assert.equal((await scope.exports.loadPublicPolicy('returns', signal)).slug, 'returns')
  assert.equal(calls, 1, 'Short public cache avoids duplicate reads')
  await assert.rejects(scope.exports.loadPublicPolicy('../orders', signal), /Policy not found/)
  assert.equal(calls, 1)
})

test('malformed, unavailable or unsafe policy responses become actionable errors, not blank pages', async () => {
  const scope = clientFixture()
  const signal = new AbortController().signal
  scope.fetch = async () => ({ ok: false })
  await assert.rejects(scope.exports.loadPublicPolicy('returns', signal), /could not be loaded/)
  for (const value of [null, {}, { ...PUBLIC_POLICIES.returns, actions: [{ name: 'bad', href: 'javascript:alert(1)' }] }]) {
    scope.fetch = async () => ({ ok: true, json: async () => value })
    await assert.rejects(scope.exports.loadPublicPolicy('returns', signal), /incomplete/)
  }
  const page = read('src/pages/MarketplacePolicyPage.tsx')
  assert.ok(page.includes('Open readable web version'))
  assert.ok(page.includes('8000'))
  assert.ok(page.includes('controller.abort()'))
})

test('support integration retains existing secure forms and order-linked intake', () => {
  const support = read('src/pages/SupportPage.tsx')
  for (const required of ['handleCreateCase', 'handleLookupCase', 'TurnstileWidget', 'ACCOUNT_SUPPORT_TYPES', 'type="submit"', 'Support guides', 'Loading secure support']) assert.ok(support.includes(required), required)
  const app = read('src/App.tsx')
  for (const slug of ['help', 'shipping', 'returns', 'warranty']) assert.ok(app.includes(`path="/${slug}" element={<MarketplacePolicyPage`))
  assert.ok(!read('src/pages/InfoPage.tsx').includes("'/returns':"))
  const server = read('server.js')
  assert.ok(server.includes('injectPublicSupport(html, req.path)'))
  assert.ok(server.includes('res.redirect(301, supportAlias)'))
})
