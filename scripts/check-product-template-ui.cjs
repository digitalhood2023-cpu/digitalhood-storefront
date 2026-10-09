// Local fixture-only test: requests to production hosts are blocked.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const origin = 'http://127.0.0.1:4291'
const output = path.join(__dirname, 'product-template-ui')
async function main() {
  fs.mkdirSync(output, { recursive: true })
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4291', '--strictPort'], { stdio: 'ignore' })
  let browser
  try {
    for (let n = 0; n < 40; n++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(r => setTimeout(r, 250)) }
    browser = await chromium.launch({ headless: true, ...(process.env.LOCAL_CHROME === 'true' ? { channel: 'chrome' } : {}) })
    const results = []
    for (const theme of ['light', 'dark']) for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 }, colorScheme: theme, serviceWorkers: 'block' })
      const errors = [], mutations = []
      await context.addInitScript(theme => {
        const apply = () => { document.documentElement.dataset.theme = theme }
        if (document.documentElement) apply()
        else document.addEventListener('DOMContentLoaded', apply, { once: true })
      }, theme)
      await context.route('**/*', route => {
        const req = route.request(), u = new URL(req.url())
        if (!['GET', 'HEAD'].includes(req.method())) mutations.push(req.url())
        return u.origin === origin || u.protocol === 'data:' ? route.continue() : route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(origin + '/scripts/product-template-fixture.html')
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme)
      await page.getByRole('heading', { name: 'Protective phone case · fixture', exact: true }).waitFor()
      await page.locator('.dh-product-price > strong').getByText('K299.00', { exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Add to Cart', exact: true }).isDisabled(), true)
      assert.equal(await page.evaluate(() => window.fixtureUnsafe === true), false)
      assert.equal(await page.locator('.dh-product-description script,.dh-product-description [href^="javascript"],.dh-product-description [onerror]').count(), 0)
      const descriptionTab = page.getByRole('tab', { name: 'Description', exact: true })
      await descriptionTab.focus(); await page.keyboard.press('ArrowRight')
      assert.equal(await page.getByRole('tab', { name: 'Details', exact: true }).getAttribute('aria-selected'), 'true')
      await page.locator('.dh-product-specs').getByText('Silicone', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('Red', { exact: true }).waitFor()
      await page.getByLabel('Preview variation').selectOption('blue')
      await page.locator('.dh-product-price > strong').getByText('K799.00', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('Blue', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('CASE-BLUE', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('open box', { exact: true }).waitFor()
      await page.getByRole('tab', { name: 'Trust/Feedback', exact: true }).click()
      await page.getByText('Feedback is attached to the published product and seller.', { exact: false }).waitFor()
      const open = page.getByRole('button', { name: 'Open product photo', exact: true })
      await open.click()
      await page.getByRole('dialog', { name: 'Product image viewer' }).waitFor()
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('dialog').count(), 0)
      assert.equal(await open.evaluate(node => node === document.activeElement), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      const contrast = await page.evaluate(() => {
        const luminance = value => value.match(/[0-9.]+/g).slice(0,3).map(Number).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c+.055)/1.055)**2.4).reduce((s,c,i) => s+c*[.2126,.7152,.0722][i],0)
        return ['.dh-product-title h1','.dh-product-price > strong','.dh-product-tabpanel'].map(selector => {
          const element = document.querySelector(selector)
          let ancestor = element, bg = 'rgba(0, 0, 0, 0)'
          while (ancestor && bg === 'rgba(0, 0, 0, 0)') { bg = getComputedStyle(ancestor).backgroundColor; ancestor = ancestor.parentElement }
          if (bg === 'rgba(0, 0, 0, 0)') bg = 'rgb(255, 255, 255)'
          const a = luminance(getComputedStyle(element).color), b = luminance(bg)
          return { selector, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) }
        })
      })
      for (const item of contrast) assert.ok(item.ratio >= 4.5, JSON.stringify({theme,item}))
      await page.screenshot({ path: path.join(output, theme + (mobile ? '-mobile' : '-desktop') + '.png'), fullPage: true })
      assert.deepEqual(errors, []); assert.deepEqual(mutations, [])
      results.push({ theme, mobile, contrast })
      await context.close()
    }
    console.log(JSON.stringify({ success: true, scenarios: results }))
  } finally { await browser?.close(); server.kill() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
