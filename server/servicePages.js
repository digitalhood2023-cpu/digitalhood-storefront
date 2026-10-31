import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'
const content = createRequire(import.meta.url)('../config/services.json')
export const SERVICE_PAGES = content.services
const SITE = 'https://store.digitalhood.info'
const esc = value => String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const normalize = value => String(value || '').replace(/\/+$/,'')
export function findService(pathname) { return SERVICE_PAGES.find(item => item.path === normalize(pathname)) }
export function findServiceRequest(pathname) { return SERVICE_PAGES.find(item => `${item.path}/request` === normalize(pathname)) }
export function buildServiceSeo(pathname) {
  const service = findService(pathname) || findServiceRequest(pathname)
  if (!service) return null
  const request = Boolean(findServiceRequest(pathname)), route = request ? `${service.path}/request` : service.path, url = SITE + route
  return { title:request ? service.requestTitle : `${service.title} in Zambia`,description:request ? service.requestIntro : service.description,path:route,type:'website',noindex:request,graph:request ? [] : [
    {'@type':'WebPage','@id':url+'#webpage',url,name:service.title,description:service.description,inLanguage:'en-ZM'},
    {'@type':'Service','@id':url+'#service',url,name:service.title,serviceType:service.title,areaServed:{'@type':'Country',name:'Zambia'},provider:{'@type':'Organization',name:'DigitalHood Creations Limited',url:SITE}},
    {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},{'@type':'ListItem',position:2,name:service.title,item:url}]},
  ] }
}
// Release-controlled content only. Never serialize request queries, contact
// details, device identifiers or account data into public/cacheable HTML.
export function renderServicePage(pathname) {
  const service = findService(pathname) || findServiceRequest(pathname)
  if (!service) return ''
  const request = Boolean(findServiceRequest(pathname))
  const actions = `<div class="dh-service-actions"><a class="dh-service-primary" href="${esc(service.path)}/request">${esc(service.action)} →</a><a class="dh-service-secondary" href="/support/track">Track a support case</a></div>`
  const body = request
    ? `<section class="dh-service-panel"><h1>${esc(service.action)}</h1><p>${esc(service.requestIntro)}</p><p>The secure enquiry form opens when the app loads. If JavaScript or verification is unavailable, call <a href="tel:+260971047570">+260971047570</a> or email <a href="mailto:contact@digitalhood.info">contact@digitalhood.info</a>. Do not send passwords, PINs or identity documents.</p><a href="${esc(service.path)}">Back to ${esc(service.title)}</a></section>`
    : `<section class="dh-service-hero"><div><p class="dh-service-eyebrow">${esc(service.eyebrow)}</p><h1>${esc(service.heading)}</h1><p>${esc(service.intro)}</p>${actions}</div><aside class="dh-service-hero-note"><strong>Clear next steps. No guesswork.</strong><p>${esc(service.requestIntro)}</p></aside></section>${service.id === 'accessories' ? `<section class="dh-service-panel"><h2>Browse current accessories</h2><p>Open the live catalogue to check current prices, stock and specifications. Compatibility depends on the exact model.</p><nav class="dh-service-tabs">${content.accessoryGroups.map(group => `<a href="/shop?q=${encodeURIComponent(group.query)}">${esc(group.label)}</a>`).join('')}</nav></section>` : ''}<section class="dh-service-panel-grid">${service.panels.map(panel => `<article class="dh-service-panel"><h2>${esc(panel.title)}</h2><p>${esc(panel.text)}</p></article>`).join('')}</section><div class="dh-service-detail-grid"><div class="dh-service-main-stack"><section class="dh-service-panel"><h2>How it works</h2><ol class="dh-service-steps">${service.steps.map((step,i) => `<li><span>${i+1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></div></li>`).join('')}</ol></section><section class="dh-service-panel"><h2>Before you start</h2><ul>${service.checklist.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section><section class="dh-service-panel dh-service-faq"><h2>Good questions. Clear answers.</h2>${service.faqs.map(faq => `<details><summary>${esc(faq.q)}</summary><p>${esc(faq.a)}</p></details>`).join('')}</section></div><aside class="dh-service-side-stack"><section class="dh-service-panel"><h2>Find DigitalHood in Lusaka</h2><p>Contact us to confirm assessment arrangements before visiting.</p>${content.locations.map(location => `<div class="dh-service-location"><h3>${esc(location.name)}</h3><address>${esc(location.address)}</address><a href="${esc(location.map)}" target="_blank" rel="noopener noreferrer">Open exact map pin ↗</a></div>`).join('')}</section><section class="dh-service-panel"><h2>Ready for the next step?</h2>${actions}<nav class="dh-service-policy-links"><a href="/orders">Help with an existing order</a><a href="/returns">7-day returns & refunds</a><a href="/warranty">Warranty & repairs</a></nav></section></aside></div>`
  return `<div class="dh-services-page"><header class="dh-services-wrap dh-service-static-header"><a href="/">DigitalHood Marketplace</a><a href="/shop">Shop now →</a></header><main class="dh-services-wrap" id="main-content"><nav class="dh-service-tabs" aria-label="DigitalHood services">${SERVICE_PAGES.map(item => `<a href="${esc(item.path)}"${item.id===service.id?' aria-current="page"':''}>${esc(item.title)}</a>`).join('')}</nav>${body}<p>Contact DigitalHood: <a href="tel:+260971047570">+260971047570</a> · <a href="mailto:contact@digitalhood.info">contact@digitalhood.info</a></p><noscript><style>#dh-startup{display:none!important}</style></noscript></main></div>`
}
let stylesPromise
export function getServiceStyles(distDir) {
  if (!stylesPromise) stylesPromise = fs.readFile(path.join(distDir,'.vite','manifest.json'),'utf8').then(source => (JSON.parse(source)?.['src/pages/ServicePage.tsx']?.css || []).filter(file => /^assets\/[a-zA-Z0-9_.-]+\.css$/.test(file)).map(file => `<link rel="stylesheet" href="/${file}">`).join('\n')).catch(() => '')
  return stylesPromise
}
export function injectServiceContent(html,pathname,styles='') {
  const body = renderServicePage(pathname)
  if (!body) return html
  return html.replace('</head>',styles+'\n</head>').replace('<div id="root"></div>',`<div id="root">${body}</div>`).replace('id="dh-app-shell"','id="dh-app-shell" style="display:none"')
}
