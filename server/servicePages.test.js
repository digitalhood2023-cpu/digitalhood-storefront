import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
import { SERVICE_PAGES, buildServiceSeo, findService, findServiceRequest, injectServiceContent, renderServicePage } from './servicePages.js'
import { buildServerSeo, getSitemapXml, injectSeo } from './marketplaceSeo.js'

test('all three service pages have real public content and private request routes, without remote dependencies',async()=>{
  const original=global.fetch;global.fetch=()=>{throw Error('No remote dependency allowed')}
  try {
    assert.equal(SERVICE_PAGES.length,3)
    for(const service of SERVICE_PAGES){
      assert.equal(findService(service.path+'/').id,service.id)
      assert.equal(findServiceRequest(service.path+'/request').id,service.id)
      const html=renderServicePage(service.path)
      for(const text of [service.heading,'Protea House, Room 11','Senanga Road 46','query=-15.423155%2C28.281279','query=-15.389366%2C28.337760',service.path+'/request','/returns','/warranty'])assert.ok(html.includes(text),text)
      assert.equal((html.match(/<h1>/g)||[]).length,1)
      const seo=await buildServerSeo(service.path);assert.equal(seo.noindex,false);assert.equal(seo.path,service.path)
      const requestSeo=await buildServerSeo(service.path+'/request');assert.equal(requestSeo.noindex,true);assert.deepEqual(requestSeo.graph,[])
      const head=injectSeo('<head></head>',seo);assert.ok(head.includes('https://store.digitalhood.info'+service.path));assert.ok(!head.includes('noindex'))
      const request=renderServicePage(service.path+'/request');assert.ok(request.includes('JavaScript'));assert.ok(request.includes('mailto:contact@digitalhood.info'));assert.ok(!request.includes('<form'))
    }
    const sitemap=await getSitemapXml()
    for(const service of SERVICE_PAGES){assert.ok(sitemap.includes(service.path+'</loc>'));assert.ok(!sitemap.includes(service.path+'/request</loc>'))}
  } finally {global.fetch=original}
})
test('unknown service routes cannot inject request content, scripts or personal data',()=>{
  assert.equal(findService('/services/<script>'),undefined);assert.equal(buildServiceSeo('/services/unknown'),null)
  const html='<head></head><div id="root"></div><div id="dh-app-shell"></div>'
  assert.equal(injectServiceContent(html,'/services/repair?email=private@example.invalid'),html)
  const output=injectServiceContent(html,'/services/repair')
  assert.ok(output.includes('Your device. Back in action.'));assert.ok(output.includes('style="display:none"'))
  assert.ok(!output.includes('action="'));assert.ok(!output.includes('wp-admin'));assert.ok(!output.includes('payment'))
})
test('service intake serializes only bounded release-controlled fields into plain message context',async()=>{
  const content=JSON.parse(await fs.readFile(new URL('../config/services.json',import.meta.url),'utf8'))
  const source=(await fs.readFile(new URL('../src/lib/services.ts',import.meta.url),'utf8')).replace("import content from '../../config/services.json'",'const content = '+JSON.stringify(content))
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
  const {buildServiceMessage,getServiceIntake,isAccessoryListingTitle}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
  for(const [title,group,expected] of [
    ['ASUS ExpertBook P1 15.6 Core 5 512GB SSD','charging',false],
    ['Microsoft Surface Laptop Charger 44W','charging',true],
    ['USB-C to MagSafe 3 Magnetic Charging Cable','charging',true],
    ['Showcase laptop 16GB','protection',false],
    ['MagSafe iPhone 16 Pro Cases','protection',true],
    ['USB-C Hub and HDMI Adapter','cables',true],
    ['Wireless Headphones','audio',true],
    ['Generic laptop with a charger in its description','unknown',false],
  ])assert.equal(isAccessoryListingTitle(title,group),expected,title)
  for(const service of SERVICE_PAGES){
    const fields=Object.fromEntries(service.fields.map(field=>[field.name,'x'.repeat(500)]))
    const message=buildServiceMessage(service,{...fields,role:'administrator',email:'not-forwarded@example.invalid'},'m'.repeat(10000))
    assert.ok(message.length<=5000);assert.ok(message.startsWith('Service enquiry: '+service.title));assert.ok(!message.includes('administrator'));assert.ok(!message.includes('not-forwarded'))
    assert.equal(getServiceIntake(service.path+'/request').id,service.id)
  }
})
test('support requests abort stalled reads without automatically retrying a case creation',async()=>{
  const source=(await fs.readFile(new URL('../src/api/support.ts',import.meta.url),'utf8'))
    .replace("import { getAccountToken } from '@/api/account'","const getAccountToken = () => ''")
    .replace('import.meta.env.VITE_PAYMENTS_API_URL',"''")
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
  const api=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
  const originalFetch=global.fetch,originalWindow=global.window
  let calls=0,signal
  global.window={setTimeout:callback=>setTimeout(callback,10),clearTimeout}
  try {
    for(const stallBody of [false,true]){
      calls=0
      global.fetch=async(_url,options)=>{
        calls++;signal=options.signal
        const stalled=()=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted')),{once:true}))
        return stallBody ? {ok:true,json:stalled} : stalled()
      }
      await assert.rejects(api.createSupportCase({type:'GENERAL_CONTACT',subject:'Fixture',message:'Fixture only'}),/could not confirm/)
      assert.equal(calls,1);assert.equal(signal.aborted,true)
    }
  }finally{global.fetch=originalFetch;global.window=originalWindow}
})
