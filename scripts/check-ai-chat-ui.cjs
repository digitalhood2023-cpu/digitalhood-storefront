// Actual App, isolated fixture APIs. No production model/account/commerce writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const origin='http://127.0.0.1:4273',output=path.join(__dirname,'ai-chat-ui')
async function main(){fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true}),results=[];try{
 for(const theme of ['light','dark'])for(const width of [390,900,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,timezoneId:'Africa/Lusaka',serviceWorkers:'block',reducedMotion:'reduce'}),requests=[],errors=[];let failPage=true,expectBrowsing=false
  await context.addInitScript(theme=>{localStorage.setItem('digitalhood-theme-preference-v1',theme);localStorage.setItem('digitalhood-shop-searches',JSON.stringify(['laptops','person@example.com laptop','https://example.com/phone']))},theme)
  await context.routeWebSocket('**/*',socket=>socket.close())
  await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname,headers={'access-control-allow-origin':req.headers().origin||origin,'access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,OPTIONS'}
   if(p.startsWith('/api/')||p.includes('/wp-json/')){requests.push({path:p,method:req.method()});if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});let body={success:true,products:[],categories:[],notifications:[],items:[],conversations:[],unreadCount:0}
    if(p==='/api/assistant/chat'){
     const payload=req.postDataJSON(),message=payload.message
     const shopping=message==='laptops available',purpose=message==='what is it used for?',named=message==='Dell Pro Plus Wireless Speakerphone SL525'
     if(purpose||named)assert.deepEqual(payload.productIds,[525],'photo/name product context was not carried to the text request')
     if(message==='Explain RAM')assert.deepEqual(payload.productIds,[],'general explanation inherited stale product focus')
     const discovery=message==='are there any interesting deals today?'||message==='any recommendation for me today'
     if(discovery)assert.deepEqual(payload.discoveryInterests,expectBrowsing?['laptop']:[],'coarse history opt-in was not honoured')
     if(!payload.pageToken){assert.equal(typeof payload.timeZone,'string');assert.equal(payload.timeZone.includes('Africa/'),true)}
     const paging=Boolean(payload.pageToken),start=paging?Number(payload.pageToken[0])*4:0,end=Math.min(13,start+4),hasMore=end<13
     if(paging&&failPage){failPage=false;return route.fulfill({status:503,headers,contentType:'application/json',body:'{}'})}
     body={answer:shopping?'Here are verified laptop options.':paging?'More matching options.':message==='Explain RAM'?'RAM is temporary working memory. Storage keeps files.':'More RAM can help when several applications are open.',route:shopping||paging?'catalogue':'conversation',responseMode:shopping||paging?'results':'answer',products:shopping||paging?Array.from({length:end-start},(_,i)=>({id:start+i+1,name:'Lenovo laptop '+(start+i+1),price:4999+i,url:'https://store.digitalhood.info/product/lenovo-laptop-'+(start+i+1),image:'/product-placeholder.svg',specifications:[],canAddToCart:false,whyPicked:'Listing evidence: redundant title',totalSales:2})):[],pagination:shopping||paging?{shown:end,matchedCount:13,complete:true,hasMore,token:hasMore?String(end/4).repeat(48):undefined}:undefined,contextToken:'b'.repeat(48),feedbackToken:'a'.repeat(48),aiUsed:!paging,followups:shopping?['Compare top two','Browse the shop','Show specifications']:['Change my search','Browse the shop','Talk to support']}
     if(purpose||named)body={...body,answer:'This speakerphone is used for hands-free calls and online meetings.',route:'catalogue',products:[{id:525,name:'Dell Pro Plus Wireless Speakerphone SL525',price:4999,url:'https://store.digitalhood.info/product/dell-sl525',image:'/product-placeholder.svg',specifications:[]}]}
     if(message==='whats the time and date?')body={...body,answer:'In Africa/Lusaka, it’s Tuesday, 3 November 2026 at 12:34 GMT+2.',products:[]}
     if(message==='whats your name?')body={...body,answer:'I’m DigitalHood AI, your AI assistant for shopping and everyday questions.',products:[]}
     if(discovery)body={...body,answer:message.includes('deals')?'Here are current listings with verified sale prices.':expectBrowsing?'Here are current marketplace picks matching your enabled DigitalHood browsing interests.':'Here are current marketplace picks from the marketplace.',route:'catalogue',responseMode:'results',discovery:{kind:message.includes('deals')?'deals':'recommendations',basis:expectBrowsing?'browsing':'general',saleFallback:false},products:Array.from({length:4},(_,i)=>({id:601+i,name:'Lenovo IdeaPad '+i,price:4999+i,regularPrice:5999+i,onSale:message.includes('deals'),url:'https://store.digitalhood.info/product/lenovo-'+i,image:'/product-placeholder.svg',specifications:[]})),pagination:{shown:4,matchedCount:4,complete:true,hasMore:false},followups:[]}
     await new Promise(resolve=>setTimeout(resolve,400))
    }else if(p==='/api/search/image')body={success:true,message:'Visual product match found.',suggestions:[{id:525,name:'Dell Pro Plus Wireless Speakerphone SL525',price:'4999',slug:'dell-sl525',image:'/product-placeholder.svg',stock_status:'instock'}]}
    else if(p==='/api/assistant/feedback')body={accepted:true}
    else assert.equal(req.method(),'GET','unexpected mutation '+p)
    return route.fulfill({headers,contentType:'application/json',body:JSON.stringify(body)})
   }return u.origin===origin?route.continue():route.abort()
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  try{
   await page.goto(origin+'/assistant');const input=page.locator('#shopping-question');await input.waitFor()
   assert.equal(await page.locator('.ai-discovery').count(),0)
   const before=requests.filter(r=>/suggest|search/.test(r.path)).length
   await input.fill('Explain RAM');await page.waitForTimeout(350)
   assert.equal(requests.filter(r=>/suggest|search/.test(r.path)).length,before)
   await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Thinking…',{exact:true}).waitFor();await page.getByText('RAM is temporary working memory. Storage keeps files.',{exact:true}).waitFor()
   await input.fill('Why does more memory help?');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('More RAM can help when several applications are open.',{exact:true}).waitFor()
   assert.equal(await page.locator('.ai-turn').count(),2);assert.equal(await page.locator('.ai-answer-options').count(),1)
   assert.equal(await page.getByRole('button',{name:'Helpful answer',exact:true}).count(),0)
   assert.equal(await page.locator('.ai-next-actions').count(),0);assert.equal(await page.locator('.ai-products').count(),0)
   assert.equal(await page.getByRole('button',{name:'Task complete',exact:true}).count(),0)
   await page.screenshot({path:path.join(output,`${theme}-${width}-conversation.png`),fullPage:true})
   await page.getByRole('button',{name:'Browse products',exact:true}).click();await page.locator('.ai-discovery').waitFor();await page.getByRole('button',{name:'Back to chat',exact:true}).click();await input.waitFor();assert.equal(await page.locator('.ai-discovery').count(),0)
   await page.locator('.ai-scroll').evaluate(e=>{e.scrollTop=0});await input.fill('laptops available');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByRole('link',{name:'Lenovo laptop 1',exact:true}).waitFor()
   assert.equal(await page.locator('.ai-product').count(),4)
   const anchor=await page.locator('.ai-turn').last().locator('.ai-user').boundingBox(),panel=await page.locator('.ai-scroll').boundingBox();assert.ok(anchor.y>=panel.y-2&&anchor.y+anchor.height<=panel.y+panel.height,'sent message was not brought into view')
   assert.equal(await page.getByText(/Listing evidence:/).count(),0);assert.equal(await page.getByText('Delivery & fees: check at checkout',{exact:true}).count(),0)
   const card=await page.locator('.ai-product').first().boundingBox();assert.ok(card.height<230,'product card is not compact')
   await page.screenshot({path:path.join(output,`${theme}-${width}-four-results.png`),fullPage:true})
   await page.getByRole('button',{name:'Load more',exact:true}).click();await page.getByText('More products could not load. Please retry.',{exact:true}).waitFor();assert.equal(await page.locator('.ai-product').count(),4)
   await page.getByRole('button',{name:'Load more',exact:true}).click();await page.getByRole('link',{name:'Lenovo laptop 8',exact:true}).waitFor();assert.equal(await page.locator('.ai-product').count(),8)
   await page.getByRole('button',{name:'Load more',exact:true}).click();await page.getByRole('link',{name:'Lenovo laptop 12',exact:true}).waitFor()
   await page.getByRole('button',{name:'Load more',exact:true}).click();await page.getByRole('link',{name:'Lenovo laptop 13',exact:true}).waitFor();assert.equal(await page.locator('.ai-product').count(),13);assert.equal(await page.getByRole('button',{name:'Load more',exact:true}).count(),0)
   assert.equal(new Set(await page.locator('.ai-product').evaluateAll(es=>es.map(e=>e.dataset.productId))).size,13)
   assert.equal(await page.locator('.ai-answer-options').count(),1);assert.equal(await page.locator('.ai-next-actions').count(),1)
   assert.ok(await page.locator('.ai-next-actions button').count()<=2)
   assert.equal(await page.getByRole('button',{name:'Change my search',exact:true}).count(),0)
   await page.locator('.ai-answer-options summary').click();await page.getByRole('button',{name:'Helpful answer',exact:true}).click();await page.getByText('Thank you. Your feedback was recorded without sending your conversation.',{exact:true}).waitFor()
   await page.locator('.ai-answer-options summary').press('Escape');assert.equal(await page.getByRole('button',{name:'Helpful answer',exact:true}).count(),0)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
   const bounds=await page.locator('.ai-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1)
   await page.screenshot({path:path.join(output,`${theme}-${width}-shopping.png`),fullPage:true});assert.deepEqual(errors,[])
   const newChat=page.getByRole('button',{name:'New conversation',exact:true});if(await newChat.isVisible())await newChat.click();else await page.getByRole('button',{name:'New chat',exact:true}).click()
   await page.locator('input[type="file"]').setInputFiles({name:'speakerphone.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP3sAAAAASUVORK5CYII=','base64')})
   await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Visual product match found.',{exact:true}).waitFor()
   for(const q of ['what is it used for?','Dell Pro Plus Wireless Speakerphone SL525','what is it used for?']){
    await input.fill(q);await page.getByRole('button',{name:'Send',exact:true}).click();await page.locator('.ai-turn[role="status"]').waitFor({state:'hidden'})
    assert.match(await page.locator('.ai-turn').last().innerText(),/hands-free calls and online meetings/)
   }
   await page.screenshot({path:path.join(output,`${theme}-${width}-photo-followthrough.png`),fullPage:true})
   for(const q of ['whats the time and date?','whats your name?','are there any interesting deals today?','any recommendation for me today']){
    await input.fill(q);await page.getByRole('button',{name:'Send',exact:true}).click();await page.locator('.ai-turn[role="status"]').waitFor({state:'hidden'})
    assert.doesNotMatch(await page.locator('.ai-turn').last().innerText(),/intent planner|not available to me|did not find a verified match/)
    if(q.includes('deals')){assert.equal(await page.locator('.ai-turn').last().locator('.ai-product').count(),4);assert.equal(await page.locator('.ai-turn').last().locator('s').count(),4)}
   }
   await page.getByRole('button',{name:'Personalise with my DigitalHood browsing',exact:true}).click();await page.getByRole('checkbox',{name:'Use my DigitalHood browsing interests',exact:true}).check();expectBrowsing=true
   await page.getByRole('button',{name:'Save preferences',exact:true}).click();await input.fill('any recommendation for me today');await page.getByRole('button',{name:'Send',exact:true}).click();await page.locator('.ai-turn[role="status"]').waitFor({state:'hidden'});assert.match(await page.locator('.ai-turn').last().innerText(),/enabled DigitalHood browsing interests/)
   await page.screenshot({path:path.join(output,`${theme}-${width}-contextual-picks.png`),fullPage:true})
   const prefs=page.getByRole('button',{name:'Edit preferences',exact:true});if(await prefs.isVisible())await prefs.click();else await page.getByRole('button',{name:'Preferences',exact:true}).click()
   await page.getByRole('checkbox',{name:'Use my DigitalHood browsing interests',exact:true}).uncheck();expectBrowsing=false;await page.getByRole('button',{name:'Save preferences',exact:true}).click()
   await input.fill('any recommendation for me today');await page.getByRole('button',{name:'Send',exact:true}).click();await page.locator('.ai-turn[role="status"]').waitFor({state:'hidden'});assert.doesNotMatch(await page.locator('.ai-turn').last().innerText(),/enabled DigitalHood browsing/)
   await page.getByRole('button',{name:'Personalise with my DigitalHood browsing',exact:true}).click();await page.getByRole('checkbox',{name:'Use my DigitalHood browsing interests',exact:true}).check();await page.getByRole('button',{name:'Save preferences',exact:true}).click()
   await page.evaluate(()=>window.dispatchEvent(new Event('digitalhood:account-state-cleared')));assert.equal(await page.locator('.ai-turn').count(),0);await input.fill('any recommendation for me today');await page.getByRole('button',{name:'Send',exact:true}).click();await page.locator('.ai-turn[role="status"]').waitFor({state:'hidden'})
   results.push({theme,width,conversationFirst:true,noAmbientCatalogueQueries:true,discoveryOptIn:true,latestOptionsOnly:true,feedbackHiddenUntilRequested:true,relevantFollowups:true,fourCompactCards:true,realPagination:true,retryKeepsResults:true,noDuplicates:true,sentMessageVisible:true,photoFollowThrough:true,everydayAnswers:true,verifiedDealCards:true,consentTopicsOnly:true,withdrawal:true,logoutClearsConsent:true})
  }catch(error){await page.screenshot({path:path.join(output,`${theme}-${width}-failure.png`),fullPage:true});console.error((await page.locator('body').innerText()).slice(-3000),errors);throw error}finally{await context.close()}
 }fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results))
 }finally{await browser.close()}}
main().catch(e=>{console.error(e);process.exitCode=1})
