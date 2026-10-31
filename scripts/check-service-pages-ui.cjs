// Real App routes and intake; all APIs and verification are isolated fixtures.
// Never submit a production enquiry, solve a real challenge or contact a seller.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const {spawn}=require('node:child_process'),content=require('../config/services.json')
const origin='http://127.0.0.1:4295',output=path.join(__dirname,'service-pages-ui')
function luminance(rgb){const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722}
async function contrast(locator,background){const colors=await locator.evaluate((e,selector)=>({text:getComputedStyle(e).color,background:getComputedStyle(document.querySelector(selector)).backgroundColor}),background);const v=[luminance(colors.text),luminance(colors.background)].sort((a,b)=>b-a);return(v[0]+.05)/(v[1]+.05)}
async function main(){
 fs.mkdirSync(output,{recursive:true});const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4295','--strictPort'],{stdio:'ignore'});let browser
 try{
  for(let n=0;n<40;n++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
  browser=await chromium.launch({headless:true});const results=[]
  for(const theme of ['light','dark'])for(const width of [390,900,1440]){
   const account=theme==='dark',context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,serviceWorkers:'block',reducedMotion:'reduce'})
   const requests=[],created=[],errors=[];let failCreate=true,failAudio=true
   await context.addInitScript(({theme,account})=>{localStorage.setItem('digitalhood-theme-preference-v1',theme);if(account)localStorage.setItem('digitalhood_customer_token','fixture-only');window.turnstile={render:(_element,options)=>{window.fixtureVerification=options.callback;options.callback('fixture-only-verification');return 'fixture-widget'},reset:()=>window.fixtureVerification?.('fixture-only-verification'),remove:()=>{}}},{theme,account})
   await context.routeWebSocket('**/*',socket=>socket.close())
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),p=u.pathname,headers={'access-control-allow-origin':req.headers().origin||origin,'access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,OPTIONS'}
    if(p.startsWith('/api/')||p.includes('/wp-json/')){
     requests.push({path:p,method:req.method()});let body={success:true,products:[],categories:[],notifications:[],items:[],conversations:[],unreadCount:0}
     if(req.method()==='OPTIONS')return route.fulfill({headers,status:204})
     if(p==='/api/auth/me')body={success:true,customer:{id:7,email:'buyer@example.invalid',firstName:'Fixture',lastName:'Buyer',billing:{},shipping:{}}}
     else if(p==='/api/products'){
      assert.equal(req.method(),'GET');assert.equal(u.searchParams.get('per_page'),'8')
      const q=u.searchParams.get('search')
      if(q==='headphone'&&failAudio)return route.fulfill({status:503,headers,json:{error:'Fixture unavailable'}})
      body={products:q==='cable'?[]:[{id:42,slug:'fixture-accessory',name:'Fixture '+q,price:'199',type:'simple',in_stock:true,purchasable:true,stock_status:'instock',stock_quantity:3,manage_stock:true,images:[{src:origin+'/logo.jpg'}],categories:[]}],total:1,totalPages:1}
     }else if(p==='/api/support/cases'&&req.method()==='POST'){
      const payload=req.postDataJSON();created.push(payload)
      assert.equal(payload.type,'GENERAL_CONTACT');assert.equal(payload['cf-turnstile-response'],'fixture-only-verification')
      assert.equal(payload.caseDetails===undefined||Object.keys(payload.caseDetails).length===0,true)
      if(account){assert.equal(req.headers().authorization,'Bearer fixture-only');for(const key of ['name','email','phone'])assert.equal(Object.hasOwn(payload,key),false,'account identity is server-derived')}
      else {assert.equal(payload.email,'guest@example.invalid');assert.equal(req.headers().authorization,undefined)}
      if(failCreate){failCreate=false;return route.fulfill({status:503,headers,json:{error:'Fixture desk unavailable. Please retry.'}})}
      body={success:true,caseNumber:'DH-CF-20261031-000007',email:{customerSent:false,adminSent:true}}
     }else if(p==='/api/support/cases/lookup')body={success:true,case:{caseNumber:'DH-CF-20261031-000007',status:'OPEN',type:'GENERAL_CONTACT',subject:'Fixture service enquiry',message:'Fixture request details',messages:[{id:'reply1',direction:'admin',message:'Fixture team response',createdAt:new Date().toISOString()}]}}
     else assert.equal(req.method(),'GET','no unexpected mutation from public service pages')
     return route.fulfill({contentType:'application/json',headers,body:JSON.stringify(body)})
    }
    return u.origin===origin?route.continue():route.abort()
   })
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
   try{
    for(const service of content.services){
     const beforePublic=created.length
     await page.goto(origin+service.path);await page.getByRole('heading',{name:service.heading,exact:true,level:1}).waitFor()
     assert.equal(await page.locator('main').count(),1);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'index,follow,max-image-preview:large')
     assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://store.digitalhood.info'+service.path)
     assert.equal(await page.getByRole('navigation',{name:'DigitalHood services',exact:true}).locator('[aria-current="page"]').getAttribute('href'),service.path)
     for(const location of content.locations)assert.equal(await page.locator(`main a[href="${location.map}"]`).count(),1)
     await page.getByText(service.faqs[0].q,{exact:true}).click();await page.getByText(service.faqs[0].a,{exact:true}).waitFor()
     assert.ok(await contrast(page.locator('.dh-service-panel p').first(),'.dh-service-panel')>=4.5,theme+': service copy contrast')
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal page overflow')
     if(service.id==='accessories'){
      await page.getByRole('link',{name:/Fixture charger/}).waitFor()
      await page.getByRole('button',{name:'Cables & adapters',exact:true}).click();await page.getByRole('heading',{name:'No listings found in this selection.',exact:true}).waitFor()
      await page.getByRole('button',{name:'Audio accessories',exact:true}).click();await page.getByRole('button',{name:'Retry catalogue',exact:true}).waitFor()
      failAudio=false;await page.getByRole('button',{name:'Retry catalogue',exact:true}).click();await page.getByRole('link',{name:/Fixture headphone/}).waitFor()
      assert.equal(await page.getByRole('link',{name:'See all audio accessories',exact:true}).getAttribute('href'),'/shop?q=headphone')
     }
     await page.screenshot({path:path.join(output,`${theme}-${width}-${service.id}.png`),fullPage:true})
     assert.equal(created.length,beforePublic,'viewing a service must not submit enquiries')
     await page.locator(`main a[href="${service.path}/request"]`).first().click()
     await page.getByRole('heading',{name:service.action,exact:true,level:1}).waitFor()
     assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/)
     assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://store.digitalhood.info'+service.path+'/request')
     const submit=page.getByRole('button',{name:'Send service enquiry',exact:true}),before=created.length
     await submit.click();assert.equal(created.length,before,'required fields prevent empty requests')
     if(!account){await page.getByLabel('Full name',{exact:true}).fill('Fixture Guest');await page.getByLabel('Email',{exact:true}).fill('guest@example.invalid')}
     for(const field of service.fields){const control=page.getByLabel(field.label,{exact:true});if(field.options)await control.selectOption(field.options[0]);else await control.fill('Fixture model and specification')}
     await page.getByLabel(service.messageLabel,{exact:true}).fill('This is a local fixture enquiry, not a production request.')
     assert.ok(await contrast(page.getByLabel(service.messageLabel,{exact:true}),'form')>=4.5,theme+': intake text contrast')
     await page.screenshot({path:path.join(output,`${theme}-${width}-${service.id}-request.png`),fullPage:true})
     await submit.click()
     if(service.id==='repair'){
      await page.getByText('Fixture desk unavailable. Please retry.',{exact:true}).waitFor()
      assert.equal(await page.getByLabel(service.messageLabel,{exact:true}).inputValue(),'This is a local fixture enquiry, not a production request.')
      assert.equal(created.length,before+1,'failed POST is not retried automatically');await submit.click()
     }
     await page.getByText('Your support case has been created.',{exact:true}).waitFor()
     const payload=created.at(-1);assert.equal(payload.subject,service.requestTitle);assert.ok(payload.message.startsWith('Service enquiry: '+service.title));assert.ok(payload.message.includes('Fixture model and specification'));assert.ok(payload.message.length<=5000)
     assert.ok(!page.url().includes('Fixture'));assert.equal(new URL(payload.pageUrl).pathname,service.path+'/request')
     if(account)assert.equal(await page.getByRole('link',{name:'Open my support cases',exact:true}).getAttribute('href'),'/account/support-cases?case=DH-CF-20261031-000007')
     else {assert.equal(await page.getByText(/confirmation has been emailed/).count(),0,'do not claim email delivery when provider did not confirm it');await page.getByRole('button',{name:'Track support case',exact:true}).click();await page.getByText('Fixture team response',{exact:true}).waitFor()}
    }
    assert.deepEqual(errors,[]);results.push({theme,width,account,services:3,intakes:3,catalogueRecovery:true,caseTracking:true})
   }catch(error){await page.screenshot({path:path.join(output,`${theme}-${width}-failure.png`),fullPage:true});console.error(JSON.stringify({errors,requests,created:created.map(x=>({type:x.type,subject:x.subject})),body:(await page.locator('body').innerText()).slice(-5500)}));throw error}
   finally{await context.close()}
  }
  console.log(JSON.stringify({success:true,scenarios:results}))
 }finally{await browser?.close();server.kill()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
