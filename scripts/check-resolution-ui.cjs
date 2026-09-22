// Isolated browser acceptance. All API traffic is intercepted with fixtures;
// no production credentials, customer records or mutation requests are used.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const id = '11111111-1111-4111-8111-111111111111';
const now = '2026-09-21T09:00:00Z';
const base = {resolution_id: id, order_id: '123', kind: 'refund', reason: 'damaged', status: 'under_review', version: 4, created_at: now, updated_at: now};
const lines = [{line_id: '1', seller_id: '8', name: 'USB-C laptop charger 65W', unit_numbers: [1], amount_minor: '35000'}, {line_id: '2', seller_id: '9', name: 'Protective phone case', unit_numbers: [1], amount_minor: '8000'}];
const publicEvents = [{version: 1, event_type: 'resolution.requested', created_at: now, data: {}}, {version: 2, event_type: 'resolution.message', created_at: now, data: {role: 'admin', audience: 'buyer', message: 'We are reviewing the affected items. Please keep the original packaging.'}}];
const sellerEvents = [{version: 3, event_type: 'resolution.message', created_at: now, data: {role: 'admin', audience: 'seller', sellerId: '8', message: 'Please confirm dispatch and packaging details for your charger.'}}];
const buyer = {...base, description: 'The charger arrived damaged and the case was the wrong model.', currency: 'ZMW', lines, events: publicEvents, refund: null};
const admin = {...buyer, customer_id: '7', events: [...publicEvents, ...sellerEvents]};
const seller = {...base, currency: 'ZMW', lines: lines.slice(0, 1), events: sellerEvents};
const order = {id: 123, number: '123', status: 'completed', currency: 'ZMW', total: '430.00', items: [{id: '1', name: lines[0].name, quantity: 1, total: '350.00'}, {id: '2', name: lines[1].name, quantity: 1, total: '80.00'}]};
const output = path.join(__dirname, 'order-resolution-ui'); fs.mkdirSync(output, {recursive: true});

async function main() {
  const browser = await chromium.launch({headless: true, ...(process.env.LOCAL_CHROME === 'true' ? {channel: 'chrome'} : {})});
  const results = [];
  try {
    const roles = process.env.RESOLUTION_UI_ROLE ? [process.env.RESOLUTION_UI_ROLE] : ['admin', 'seller', 'buyer'];
    assert.ok(roles.every(role => ['admin', 'seller', 'buyer'].includes(role)));
    for (const role of roles) for (const theme of ['light', 'dark']) for (const mobile of [true, false]) {
      const port = {admin: 4274, seller: 4275, buyer: 4273}[role], origin = `http://127.0.0.1:${port}`;
      // Opposite OS mode validates the saved explicit theme, not just media queries.
      const context = await browser.newContext({viewport: {width: mobile ? 390 : 1440, height: mobile ? 844 : 1000}, colorScheme: theme === 'dark' ? 'light' : 'dark', serviceWorkers: 'block'});
      const posts = [], errors = [];
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.addInitScript(({theme}) => {
        localStorage.setItem('digitalhood-theme-preference-v1', theme);
        document.cookie = `digitalhood_theme=${theme}; Path=/`;
        for (const key of ['digitalhood_admin_token', 'digitalhood_seller_token', 'digitalhood_customer_token']) localStorage.setItem(key, 'local-fixture-only');
        localStorage.setItem('digitalhood_seller_email', 'fixture@example.invalid');
      }, {theme});
      await context.route('**/*', async route => {
        const req = route.request(), u = new URL(req.url()), p = u.pathname;
        if (p.startsWith('/api/') || p.includes('/wp-json/')) {
          if (req.method() === 'POST') posts.push({path: p, body: req.postDataJSON(), key: req.headers()['x-idempotency-key']});
          let body = {success: true, items: [], notifications: [], conversations: [], products: [], categories: [], unreadCount: 0};
          if (p === '/api/auth/me') body = {success: true, customer: {id: 7, email: 'fixture@example.invalid', firstName: 'Test', lastName: 'Buyer', billing: {}, shipping: {}}};
          else if (p === '/api/seller/profile') body = {success: true, hasSellerProfile: true, seller: {id: 8, customerId: 8, status: 'approved', storeName: 'Fixture store'}};
          else if (p.includes('/resolutions')) {
            if (p.endsWith('/messages')) body = {success: true, version: 5};
            else if (p.endsWith('/actions')) body = {success: true, resolution: {...buyer, status: req.postDataJSON().status, version: 5}};
            else if (p.endsWith(id)) body = {success: true, resolution: {admin, seller, buyer}[role]};
            else body = {success: true, items: [base], nextCursor: null};
          } else if (p === '/api/account/orders/123') body = {success: true, order};
          return route.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': req.headers().origin || origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization,x-idempotency-key,x-digitalhood-admin-token,x-digitalhood-seller-email'}, body: JSON.stringify(body)});
        }
        if (u.origin === origin) return route.continue();
        return route.abort(); // No production requests, pixels, fonts or sockets.
      });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      const routePath = {admin: `/order-resolutions?case=${id}`, seller: `/resolutions?case=${id}`, buyer: `/account/resolutions/${id}`}[role];
      await page.goto(origin + routePath);
      try {await page.getByText(lines[0].name, {exact: true}).waitFor();}
      catch (error) {await page.screenshot({path: path.join(output, `${role}-${theme}-failure.png`), fullPage: true}); console.error(await page.locator('body').innerText(), errors); throw error;}
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      if (role === 'seller') {
        assert.equal(await page.getByText(lines[1].name, {exact: true}).count(), 0);
        await page.getByText('Only your store and DigitalHood Support can read this conversation.', {exact: false}).waitFor();
        await page.getByLabel('Reply to support').fill('The charger was packed securely before dispatch.');
        await page.getByRole('button', {name: 'Send reply', exact: true}).click();
      } else if (role === 'admin') {
        await page.getByLabel('Send to', {exact: true}).selectOption('8');
        await page.getByLabel('Private question for this seller').fill('Please provide dispatch details for your own items.');
        await page.getByRole('button', {name: 'Send update', exact: true}).click();
      } else {
        assert.equal(await page.getByText(sellerEvents[0].data.message, {exact: true}).count(), 0);
        await page.getByLabel('Add information').fill('I still have the packaging and can provide more information.');
        await page.getByRole('button', {name: 'Send reply', exact: true}).click();
      }
      await page.waitForFunction(() => !document.querySelector('textarea')?.disabled);
      assert.equal(posts.filter(p => p.path.endsWith('/messages')).length, 1);
      const sent = posts.find(p => p.path.endsWith('/messages')); assert.ok(sent.key);
      if (role === 'admin') assert.equal(sent.body.audienceSellerId, '8');
      else assert.equal(sent.body.audienceSellerId, undefined);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${role}: horizontal overflow`);
      const label = `${role}-${theme}-${mobile ? 'mobile' : 'desktop'}`;
      await page.screenshot({path: path.join(output, `${label}.png`), fullPage: true});
      const colors = await page.locator('textarea').evaluate(el => ({text: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor, fontSize: getComputedStyle(el).fontSize}));
      assert.ok(parseFloat(colors.fontSize) >= 16, `${label}: mobile input zoom risk`);
      assert.deepEqual(errors, [], `${label}: runtime errors`);
      results.push({label, ...colors, sent: true});
      await context.close();
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({passed: results.length, output}));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
