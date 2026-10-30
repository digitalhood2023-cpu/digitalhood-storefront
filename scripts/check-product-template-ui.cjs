// Local fixture-only test: requests to production hosts are blocked.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const { spawn, execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const origin = 'http://127.0.0.1:4291'
const output = path.join(__dirname, 'product-template-ui')
async function main() {
  execFileSync(process.execPath, ['--test', 'scripts/product-feedback.test.mjs'], { stdio:'inherit' })
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
      let feedbackMode = 'initial', releaseStale, pendingStarted, releaseTimeout, pendingTimeout
      const staleStarted = new Promise(resolve => { pendingStarted = resolve })
      const timeoutStarted = new Promise(resolve => { pendingTimeout = resolve })
      await context.route('**/*', async route => {
        const req = route.request(), u = new URL(req.url())
        if (!['GET', 'HEAD'].includes(req.method())) mutations.push(req.url())
        if (/\/api\/products\/\d+\/reviews$/.test(u.pathname)) {
          assert.equal(req.headers().authorization, undefined)
          const productId = Number(u.pathname.split('/')[3]), page = Number(u.searchParams.get('page'))
          const mode = feedbackMode
          if (mode === 'fail') return route.fulfill({ status:503, headers:{'access-control-allow-origin':'*'}, body:'Unavailable' })
          if (mode === 'null') return route.fulfill({ headers:{'access-control-allow-origin':'*'}, json:null })
          if (mode === 'timeout') { pendingTimeout(); await new Promise(resolve => { releaseTimeout = resolve }) }
          if (mode === 'stale' && productId === 6317) { pendingStarted(); await new Promise(resolve => { releaseStale = resolve }) }
          const reviewer = productId === 6318 ? 'Other listing buyer' : mode === 'updated' ? 'Updated buyer' : mode === 'stale' ? 'Stale buyer' : page > 1 ? 'Next page buyer' : 'Verified buyer'
          return route.fulfill({ headers:{'access-control-allow-origin':'*'}, json: { success:true, productId, source:'digitalhood-verified-delivery', reviews:[{id: reviewer, reviewer, rating:5, verified:true, review:'Accurate product and quick service.'},{id:'unverified', reviewer:'Unverified buyer', rating:5, verified:false}], summary:{count:21, averageRating:4.75}, pagination:{page, pages:2} } }).catch(() => {})
        }
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
      assert.deepEqual(await page.getByRole('tab').allTextContents(), ['Details','Description','Trust/Feedback'])
      await descriptionTab.click()
      const description=page.locator('.dh-product-description')
      assert.equal(await description.evaluate(element=>getComputedStyle(element).whiteSpace),'normal','HTML indentation is not visible paragraph spacing')
      assert.equal(await description.locator('ul').first().evaluate(element=>getComputedStyle(element).listStyleType),'disc')
      assert.equal(await description.locator('ol').getAttribute('start'),'3')
      assert.equal(await description.locator('ol li').last().getAttribute('value'),'7')
      assert.equal(await description.locator('table tr').count(),31)
      await description.getByText('Detail 29',{exact:true}).waitFor()
      assert.equal(await description.getByRole('img',{name:'Product detail photo',exact:true}).count(),1)
      await page.screenshot({path:path.join(output,theme+(mobile?'-mobile':'-desktop')+'-description.png'),fullPage:true})
      await descriptionTab.focus(); await page.keyboard.press('ArrowLeft')
      assert.equal(await page.getByRole('tab', { name: 'Details', exact: true }).getAttribute('aria-selected'), 'true')
      await page.locator('.dh-product-specs').getByText('Silicone', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('Red', { exact: true }).waitFor()
      await page.getByLabel('Preview variation').selectOption('blue')
      await page.locator('.dh-product-price > strong').getByText('K799.00', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('Blue', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('CASE-BLUE', { exact: true }).waitFor()
      await page.locator('.dh-product-specs').getByText('open box', { exact: true }).waitFor()
      await page.getByRole('tab', { name: 'Trust/Feedback', exact: true }).click()
      await page.getByText('Buyer feedback will appear here after this listing is published', { exact: false }).waitFor()
      const open = page.getByRole('button', { name: 'Open product photo', exact: true })
      await open.click()
      await page.getByRole('dialog', { name: 'Product image viewer' }).waitFor()
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('dialog').count(), 0)
      assert.equal(await open.evaluate(node => node === document.activeElement), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await page.goto(origin + '/scripts/product-template-fixture.html?live=1')
      await page.getByText('4.8 (21)', { exact:true }).waitFor()
      await page.getByRole('tab', { name:'Trust/Feedback', exact:true }).click()
      await page.getByText('Verified buyer', { exact:true }).waitFor()
      assert.equal(await page.getByText('Unverified buyer', {exact:true}).count(), 0)
      await page.getByRole('button', {name:'Load more feedback',exact:true}).click()
      await page.getByText('Next page buyer', {exact:true}).waitFor()
      feedbackMode = 'updated'
      await page.getByRole('button', {name:'Refresh feedback',exact:true}).click()
      await page.getByText('Updated buyer', {exact:true}).waitFor()
      assert.equal(await page.getByText('Next page buyer', {exact:true}).count(), 0)
      feedbackMode = 'fail'
      await page.getByRole('button', {name:'Refresh feedback',exact:true}).click()
      await page.getByRole('alert').getByText('Previously loaded feedback', {exact:false}).waitFor()
      feedbackMode = 'null'
      await page.getByRole('button', {name:'Retry feedback',exact:true}).click()
      await page.getByRole('alert').waitFor()
      feedbackMode = 'updated'
      await page.getByRole('button', {name:'Retry feedback',exact:true}).click()
      await page.getByRole('alert').waitFor({state:'detached'})
      feedbackMode = 'stale'
      await page.getByRole('button', {name:'Refresh feedback',exact:true}).click()
      await staleStarted
      await page.getByRole('button', {name:'Switch product',exact:true}).click()
      await page.getByText('Other listing buyer', {exact:true}).waitFor()
      releaseStale()
      assert.equal(await page.getByText('Updated buyer', {exact:true}).count(), 0)
      assert.equal(await page.getByText('Stale buyer', {exact:true}).count(), 0)
      await page.clock.install()
      feedbackMode = 'timeout'
      await page.getByRole('button', {name:'Refresh feedback',exact:true}).click()
      await timeoutStarted
      await page.clock.fastForward(12_001)
      await page.getByRole('alert').waitFor()
      releaseTimeout()
      feedbackMode = 'updated'
      await page.getByRole('button', {name:'Retry feedback',exact:true}).click()
      await page.getByRole('alert').waitFor({state:'detached'})
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      const contrast = await page.evaluate(() => {
        const luminance = value => value.match(/[0-9.]+/g).slice(0,3).map(Number).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c+.055)/1.055)**2.4).reduce((s,c,i) => s+c*[.2126,.7152,.0722][i],0)
        return ['.dh-product-title h1','.dh-product-price > strong','.dh-product-tabpanel','.dh-product-signal--rating','.dh-product-signal--sold','.dh-product-signal--delivery','.dh-product-signal--cutoff','.dh-product-verified'].map(selector => {
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
