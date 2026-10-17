// Isolated CI acceptance: no production accounts, uploads or mutation requests.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const content = require('../config/sell-page.json');
const output = path.join(__dirname, 'sell-landing-ui');

function luminance(rgb) {
  const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => {
    const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const theme of ['light', 'dark']) for (const width of [390, 1600]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme === 'light' ? 'dark' : 'light', serviceWorkers: 'block' });
      await context.addInitScript(theme => {
        localStorage.setItem('digitalhood-theme-preference-v1', theme);
        document.cookie = 'digitalhood_theme=' + theme + '; Path=/';
      }, theme);
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.pathname.startsWith('/api/') || url.pathname.includes('/wp-json/')) {
          assert.ok(['GET', 'OPTIONS'].includes(request.method()), 'Public seller page must not mutate production state');
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': request.headers().origin || 'http://127.0.0.1:4273', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'content-type' }, body: JSON.stringify({ success: true, products: [], categories: [], sellers: [], stores: [], conversations: [], notifications: [], unreadCount: 0, items: [] }) });
        }
        return url.origin === 'http://127.0.0.1:4273' ? route.continue() : route.abort();
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4273/sell');
      await page.getByRole('heading', { level: 1, name: content.heading, exact: true }).waitFor();
      assert.equal(await page.title(), content.title);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://store.digitalhood.info/sell');
      assert.ok(!(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      const main = page.locator('main.dh-sell-wrap');
      for (const link of await main.getByRole('link', { name: 'Start selling' }).all()) assert.equal(await link.getAttribute('href'), content.registerUrl);
      assert.equal(await main.getByRole('link', { name: 'Seller sign in', exact: true }).getAttribute('href'), content.loginUrl);
      for (const type of content.sellerTypes) assert.equal(await main.getByRole('link', { name: type.name, exact: false }).getAttribute('href'), type.href);
      assert.equal(await main.getByRole('link', { name: 'Ask seller support', exact: true }).getAttribute('href'), content.supportUrl);
      await main.getByText(content.faqs[1].question, { exact: true }).click();
      await main.getByText(content.faqs[1].answer, { exact: true }).waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal overflow');
      const colors = await page.locator('.dh-sell-copy').evaluate(el => ({ foreground: getComputedStyle(el).color, background: getComputedStyle(document.querySelector('.dh-sell-page')).backgroundColor }));
      const values = [luminance(colors.foreground), luminance(colors.background)].sort((a, b) => b - a);
      const contrast = (values[0] + .05) / (values[1] + .05);
      assert.ok(contrast >= 4.5, theme + ': seller text contrast');
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(output, theme + '-' + width + '.png'), fullPage: true });
      results.push({ theme, width, contrast });
      for (const slug of ['seller-terms', 'prohibited-products', 'marketplace-terms', 'dispute-resolution', 'data-protection', 'incident-response']) {
        await page.goto('http://127.0.0.1:4273/' + slug);
        await page.locator('main.dh-policy-wrap h1').waitFor();
        assert.equal(await page.getByText('operational foundation for DigitalHood', { exact: false }).count(), 0);
        assert.equal(await page.locator('main').count(), 1);
        assert.equal(await page.getByRole('navigation', { name: 'Marketplace policies', exact: true }).locator('[aria-current="page"]').getAttribute('href'), '/' + slug);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, slug + ': no horizontal overflow');
        const colors = await page.locator('.dh-policy-section p').first().evaluate(el => ({ text: getComputedStyle(el).color, background: getComputedStyle(document.querySelector('.dh-policy-body')).backgroundColor }));
        const values = [luminance(colors.text), luminance(colors.background)].sort((a, b) => b - a);
        assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5, slug + ': readable policy contrast');
        if (['seller-terms', 'prohibited-products'].includes(slug)) {
          assert.equal(await page.getByRole('link', { name: 'Ask seller support', exact: true }).getAttribute('href'), content.supportUrl);
          await page.screenshot({ path: path.join(output, `${slug}-${theme}-${width}.png`), fullPage: false });
        }
        assert.deepEqual(errors, []);
      }
      await context.close();
    }
    const staticContext = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, serviceWorkers: 'block' });
    await staticContext.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4276' ? route.continue() : route.abort());
    const staticPage = await staticContext.newPage();
    await staticPage.goto('http://127.0.0.1:4276/sell');
    await staticPage.getByRole('heading', { level: 1, name: content.heading, exact: true }).waitFor({ state: 'visible' });
    await staticPage.getByRole('link', { name: 'Start selling' }).first().waitFor({ state: 'visible' });
    await staticPage.getByText(content.faqs[0].question, { exact: true }).click();
    await staticPage.getByText(content.faqs[0].answer, { exact: true }).waitFor({ state: 'visible' });
    await staticPage.screenshot({ path: path.join(output, 'no-javascript-mobile.png'), fullPage: true });
    results.push({ javaScript: false, width: 390, nativeFaq: true });
    await staticContext.close();
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.length, results }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
