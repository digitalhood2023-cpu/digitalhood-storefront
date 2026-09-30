import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const index = fs.readFileSync('index.html', 'utf8');
const boot = index.match(/<script id="digitalhood-bootstrap">([\s\S]*?)<\/script>/)?.[1];
const theme = index.match(/<script id="digitalhood-theme">([\s\S]*?)<\/script>/)?.[1];
assert.ok(boot && theme, 'Both independently executable recovery scripts must exist');

function browser({ legacy = false, storageBlocked = false, connectionType = '', pathname = '/' } = {}) {
  const scheduled = [];
  const listeners = {};
  const appended = [];
  const state = { startupRemoved: false, shellRemoved: false, shellHidden: false, recoveryVisible: false, message: '', redirect: '' };
  const status = { firstChild: null, appendChild(node) { state.message = node.text; } };
  const root = { className: '', style: {}, setAttribute() {} };
  const startup = {
    className: '',
    parentNode: { removeChild() { state.startupRemoved = true; } },
  };
  const shell = {
    style: {},
    parentNode: { removeChild() { state.shellRemoved = true; } },
  };
  Object.defineProperty(startup, 'className', {
    get() { return state.recoveryVisible ? ' dh-startup-visible' : ''; },
    set(value) { state.recoveryVisible = /dh-startup-visible/.test(value); },
  });
  Object.defineProperty(shell.style, 'display', {
    get() { return state.shellHidden ? 'none' : ''; },
    set(value) { state.shellHidden = value === 'none'; },
  });
  const document = {
    cookie: '', documentElement: root,
    head: { appendChild(node) { appended.push(node); } },
    createElement(tag) { return { tagName: tag.toUpperCase(), ...(legacy ? {} : { noModule: false }), setAttribute() {} }; },
    createTextNode(text) { return { text }; },
    getElementById(id) { return id === 'dh-startup' ? startup : id === 'dh-app-shell' ? shell : id === 'dh-startup-status' ? status : null; },
  };
  const window = {
    document,
    Promise, fetch() {}, AbortController,
    localStorage: { getItem() { if (storageBlocked) throw new Error('Storage denied'); return null; } },
    setTimeout(fn, ms) { scheduled.push({ fn, ms, cancelled: false }); return scheduled.length; },
    clearTimeout(id) { if (scheduled[id - 1]) scheduled[id - 1].cancelled = true; },
    addEventListener(type, fn) { listeners[type] = fn; },
    location: { pathname, replace(url) { state.redirect = url; } },
  };
  const context = vm.createContext({ window, document, navigator: { connection: connectionType ? { effectiveType: connectionType } : undefined } });
  return { context, state, window, scheduled, listeners, appended };
}

test('normal startup paints a branded shell while recovery remains hidden', () => {
  assert.match(index, /action="\/lite"/);
  assert.match(index, /id="dh-app-shell"/);
  assert.match(index, /id="dh-startup"/);
  assert.match(index, /#dh-startup \{ display:none/);
  assert.match(index, /<noscript>[\s\S]*#dh-startup \{ display:block; \}/);
  assert.doesNotMatch(index, /id="app-loader"/);
  assert.doesNotMatch(index, /<script[^>]+src="https:\/\/(?:www\.googletagmanager|www\.gstatic|static\.cloudflareinsights)/);
});

test('theme and boot code tolerate blocked storage and missing matchMedia', () => {
  const b = browser({ storageBlocked: true });
  vm.runInContext(theme, b.context);
  vm.runInContext(boot, b.context);
  assert.equal(typeof b.window.__digitalhoodBootReady, 'function');
});

test('a React-ready signal reveals the app without any window.load event', () => {
  const b = browser();
  vm.runInContext(boot, b.context);
  assert.equal(b.appended.length, 0);
  b.window.__digitalhoodBootReady();
  assert.equal(b.state.startupRemoved, true);
  assert.equal(b.state.shellRemoved, true);
  assert.equal(b.scheduled[0].cancelled, true);
  assert.equal(b.listeners.load, undefined);
});

test('the recovery UI appears only after the meaningful startup timeout', () => {
  const b = browser();
  vm.runInContext(boot, b.context);
  assert.equal(b.state.recoveryVisible, false);
  b.scheduled.find((item) => item.ms === 8000).fn();
  assert.match(b.state.message, /taking longer/);
  assert.equal(b.state.recoveryVisible, true);
  assert.equal(b.state.shellHidden, true);
  assert.equal(b.state.startupRemoved, false);
});

test('slow connections do not load optional tracking or the merchant widget', () => {
  const b = browser({ connectionType: '2g' });
  vm.runInContext(boot, b.context);
  b.window.__digitalhoodBootReady();
  b.scheduled.find((item) => item.ms === 6000).fn();
  assert.equal(b.appended.length, 0);
});

test('a normal 3g estimate does not force low-data mode', () => {
  const b = browser({ connectionType: '3g' });
  vm.runInContext(boot, b.context);
  b.window.__digitalhoodBootReady();
  b.scheduled.find((item) => item.ms === 6000).fn();
  assert.equal(b.appended.length, 3);
});

test('healthy connections load optional integrations only after startup', () => {
  const b = browser();
  vm.runInContext(boot, b.context);
  assert.equal(b.appended.length, 0);
  b.window.__digitalhoodBootReady();
  b.scheduled.find((item) => item.ms === 6000).fn();
  assert.equal(b.appended.length, 3);
});

test('a non-module browser is sent to real HTML for public browsing, never payment or account pages', () => {
  for (const pathname of ['/', '/product/test-phone', '/checkout', '/account', '/orders/123/pay']) {
    const b = browser({ legacy: true, pathname });
    vm.runInContext(boot, b.context);
    assert.equal(b.state.recoveryVisible, true);
    assert.equal(b.state.redirect, pathname === '/' ? '/lite' : pathname.startsWith('/product/') ? '/lite/product/test-phone' : '');
  }
});

test('script download failures produce recovery text without automatic refresh loops', () => {
  const b = browser();
  vm.runInContext(boot, b.context);
  b.listeners.error({ target: { tagName: 'SCRIPT' } });
  assert.match(b.state.message, /could not start/);
  assert.equal(b.state.recoveryVisible, true);
  b.listeners['vite:preloadError']();
  assert.match(b.state.message, /could not download/);
  assert.equal(b.state.redirect, '');
});

test('browser recovery scripts contain no modern syntax in their TypeScript parser tree', () => {
  const forbidden = new Set([
    ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.ClassDeclaration, ts.SyntaxKind.TemplateExpression,
    ts.SyntaxKind.NoSubstitutionTemplateLiteral, ts.SyntaxKind.AwaitExpression, ts.SyntaxKind.SpreadElement,
  ]);
  for (const code of [boot, theme]) {
    const source = ts.createSourceFile('boot.js', code, ts.ScriptTarget.ES5, true, ts.ScriptKind.JS);
    assert.equal(source.parseDiagnostics.length, 0);
    function visit(node) {
      assert.ok(!forbidden.has(node.kind), `Modern syntax kind ${node.kind}`);
      if (ts.isVariableDeclarationList(node)) assert.equal(node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const), 0);
      if (ts.isPropertyAccessExpression(node) || ts.isCallExpression(node)) assert.equal(node.questionDotToken, undefined);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

const source = fs.readFileSync('src/lib/catalogueRequest.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { requestCatalogueJson } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('catalogue GET helper returns parsed data and never forwards credentials', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => { assert.equal(init.credentials, 'omit'); return new Response('{"products":[]}'); };
    assert.deepEqual(await requestCatalogueJson('https://example.test', (res) => res.json()), { products: [] });
  } finally { globalThis.fetch = old; }
});

test('catalogue deadline covers an API that never responds', async () => {
  const old = globalThis.fetch;
  let signal;
  try {
    globalThis.fetch = (_url, init) => { signal = init.signal; return new Promise(() => {}); };
    await assert.rejects(requestCatalogueJson('https://example.test', (res) => res.json(), {}, 15), /low-data catalogue/);
    assert.equal(signal.aborted, true);
  } finally { globalThis.fetch = old; }
});

test('catalogue deadline covers a body/parser that never completes', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}');
    await assert.rejects(requestCatalogueJson('https://example.test', () => new Promise(() => {}), {}, 15), /low-data catalogue/);
  } finally { globalThis.fetch = old; }
});

test('catalogue helper cannot be used for payment writes', async () => {
  await assert.rejects(requestCatalogueJson('https://example.test', (res) => res.json(), { method: 'POST' }), /read-only GET/);
});

test('new TSX source is syntactically valid; complete project type-check is still part of npm run build', () => {
  const input = fs.readFileSync('src/components/StartupBoundary.tsx', 'utf8');
  const result = ts.transpileModule(input, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } });
  assert.deepEqual(result.diagnostics.filter((item) => item.category === ts.DiagnosticCategory.Error), []);
});

test('network policy does not classify 3g as Data Saver or rewrite all image loading', () => {
  const network = fs.readFileSync('src/lib/networkResilience.ts', 'utf8');
  assert.match(network, /\['slow-2g', '2g'\]/);
  assert.doesNotMatch(network, /'3g'\]/);
  assert.doesNotMatch(network, /querySelectorAll<HTMLImageElement>/);
});

test('visible homepage product rows opt into eager loading without making every shelf eager', () => {
  const home = fs.readFileSync('src/pages/Home.tsx', 'utf8');
  const hero = fs.readFileSync('src/sections/Hero.tsx', 'utf8');
  const showcase = fs.readFileSync('src/sections/ProductShowcase.tsx', 'utf8');
  const recent = fs.readFileSync('src/sections/RecentlyViewed.tsx', 'utf8');
  assert.match(home, /priorityImageCount=\{4\}/);
  assert.equal((home.match(/priorityImageCount=/g) || []).length, 1);
  assert.match(hero, /loading="eager"[\s\S]{0,100}fetchPriority="auto"/);
  assert.match(showcase, /loading=\{index < priorityImageCount \? 'eager' : 'lazy'\}/);
  assert.match(recent, /loading=\{index < 2 \? 'eager' : 'lazy'\}/);
});

test('homepage discovery waits for personalization hydration and does not reload when interests change', () => {
  const home = fs.readFileSync('src/pages/Home.tsx', 'utf8');
  const marketplaceState = fs.readFileSync('src/context/MarketplaceStateContext.tsx', 'utf8');
  const recentlyViewed = fs.readFileSync('src/context/RecentlyViewedContext.tsx', 'utf8');
  const woocommerce = fs.readFileSync('src/lib/woocommerce.ts', 'utf8');

  assert.match(home, /isReady: isRecentlyViewedReady/);
  assert.match(home, /useMarketplaceStateReady\(\)/);
  assert.match(home, /if \(!personalizationReady\) return/);
  assert.match(home, /const requestInterests = interestsRef\.current/);
  assert.match(home, /\}, \[personalizationReady, loadAttempt\]\)/);
  assert.doesNotMatch(home, /\}, \[interests, loadAttempt\]\)/);
  assert.match(marketplaceState, /MarketplaceStateReadyContext\.Provider value=\{isReady\}/);
  assert.match(recentlyViewed, /isReady: boolean/);
  assert.match(woocommerce, /homeDiscoveryRequests\.get\(requestUrl\)/);
  assert.match(woocommerce, /homeDiscoveryRequests\.set\(requestUrl, request\)/);
});
