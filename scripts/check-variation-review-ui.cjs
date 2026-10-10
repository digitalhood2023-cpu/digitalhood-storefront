// Fixture-only real browser acceptance. No production requests or mutations.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const origin = 'http://127.0.0.1:4293'
async function main() {
  const output = path.join(__dirname, 'variation-review-ui')
  fs.mkdirSync(output, { recursive: true })
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4293', '--strictPort'], { stdio: 'ignore' })
  let browser
  try {
    for (let n = 0; n < 40; n++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(r => setTimeout(r, 250)) }
    browser = await chromium.launch({ headless: true, ...(process.env.LOCAL_CHROME === 'true' ? { channel: 'chrome' } : {}) })
    const results = []
    for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, serviceWorkers: 'block' })
      await context.addInitScript(theme => {
        const apply = () => { document.documentElement.dataset.theme = theme }
        if (document.documentElement) apply()
        else document.addEventListener('DOMContentLoaded', apply, { once: true })
      }, theme)
      const mutations = [], errors = []
      await context.route('**/*', route => {
        const req = route.request(), u = new URL(req.url())
        if (!['GET', 'HEAD'].includes(req.method())) mutations.push(req.url())
        return u.origin === origin || u.protocol === 'data:' ? route.continue() : route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', e => errors.push(e.message))
      await page.goto(origin + '/scripts/variation-review-fixture.html')
      const section = page.getByRole('region', { name: 'Listing variations' })
      const rows = section.locator('.dh-variation-rows > button')
      await page.getByText('108 matching · page 1 of 5', { exact: true }).waitFor()
      assert.equal(await rows.count(), 25)
      await page.locator('.dh-product-price > strong').getByText('Select for price', { exact: true }).waitFor()
      const ids = new Set()
      for (let p = 1; p <= 5; p++) {
        await page.getByText('108 matching · page ' + p + ' of 5', { exact: true }).waitFor()
        const names = await rows.allTextContents()
        assert.equal(names.length, p === 5 ? 8 : 25)
        for (const name of names) { assert.equal(ids.has(name), false); ids.add(name) }
        if (p < 5) await section.getByRole('button', { name: 'Next', exact: true }).click()
      }
      assert.equal(ids.size, 108)
      assert.equal(await section.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true)
      await page.getByRole('button', { name: 'Preview Model: Model 107', exact: true }).click()
      await page.locator('.dh-product-price > strong').getByText('K117.00', { exact: true }).waitFor()
      await page.getByText('7 in stock', { exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Add to Cart', exact: true }).isDisabled(), true)
      await page.getByLabel('Filter Model', { exact: true }).selectOption('Model 106')
      await page.getByText('1 matching · page 1 of 1', { exact: true }).waitFor()
      assert.equal(await rows.count(), 1)
      await section.getByRole('button', { name: 'Reset', exact: true }).click()
      await page.getByText('108 matching · page 1 of 5', { exact: true }).waitFor()
      // The first slow request must never replace the newer search result.
      await page.getByLabel('Search variations', { exact: true }).fill('SKU-0')
      await page.waitForTimeout(220)
      await page.getByLabel('Search variations', { exact: true }).fill('SKU-107')
      await page.getByRole('button', { name: 'Preview Model: Model 107', exact: true }).waitFor()
      await page.waitForTimeout(600)
      assert.equal(await rows.count(), 1)
      assert.equal(await rows.first().getAttribute('aria-label'), 'Preview Model: Model 107')
      await page.getByRole('button', { name: 'Simulate unavailable snapshot', exact: true }).click()
      await page.getByRole('alert').getByText('The variation page could not be verified.', { exact: false }).waitFor()
      assert.equal(await rows.count(), 0)
      await page.getByRole('button', { name: 'Restore snapshot', exact: true }).click()
      await page.getByRole('button', { name: 'Preview Model: Model 107', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Simulate malformed attributes', exact: true }).click()
      await page.getByRole('alert').getByText('The variation page could not be verified.', { exact: false }).waitFor()
      assert.equal(await rows.count(), 0)
      await page.getByRole('button', { name: 'Restore snapshot', exact: true }).click()
      await page.getByRole('button', { name: 'Preview Model: Model 107', exact: true }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      const contrast = await section.evaluate(element => {
        const c = getComputedStyle(element)
        const lum = rgb => rgb.match(/[0-9.]+/g).slice(0,3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4).reduce((sum,x,i) => sum+x*[.2126,.7152,.0722][i],0)
        const a = lum(c.color), b = lum(c.backgroundColor)
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)
      })
      assert.ok(contrast >= 4.5, theme + ': ' + contrast)
      if (width === 390) assert.ok(await page.getByLabel('Search variations').evaluate(e => parseFloat(getComputedStyle(e).fontSize)) >= 16)
      await page.screenshot({ path: path.join(output, theme + '-' + width + '.png'), fullPage: true })
      assert.deepEqual(errors, []); assert.deepEqual(mutations, [])
      results.push({ theme, width, combinations: ids.size, contrast })
      await context.close()
    }
    console.log(JSON.stringify({ success: true, scenarios: results }))
  } finally { await browser?.close(); server.kill() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
