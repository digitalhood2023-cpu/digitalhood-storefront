// Actual App, isolated fixture APIs. No production model/account/commerce writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const origin='http://127.0.0.1:4273',output=path.join(__dirname,'ai-chat-ui')
async function main(){fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true}),results=[];try{
 for(const theme of ['light','dark'])for(const width of [390,900,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,serviceWorkers:'block',reducedMotion:'reduce'}),requests=[],errors=[];let failPage=true
  await context.addInitScript(theme=>localStorage.setItem('digitalhood-theme-preference-v1',theme),theme)
  await context.routeWebSocket('**/*',socket=>socket.close())
  await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),p=u.pathname,headers={'access-control-allow-origin':req.headers().origin||origin,'access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,OPTIONS'}
   if(p.startsWith('/api/')||p.includes('/wp-json/')){requests.push({path:p,method:req.method()});if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});let body={success:true,products:[],categories:[],notifications:[],items:[],conversations:[],unreadCount:0}
    if(p==='/api/assistant/chat'){
     const payload=req.postDataJSON(),message=payload.message
     const shopping=message==='laptops available',purpose=message==='what is it used for?',named=message==='Dell Pro Plus Wireless Speakerphone SL525'
     if(purpose||named)assert.deepEqual(payload.productIds,[525],'photo/name product context was not carried to the text request')
     if(message==='Explain RAM')assert.deepEqual(payload.productIds,[],'general explanation inherited stale product focus')
     const paging=Boolean(payload.pageToken),start=paging?Number(payload.pageToken[0])*4:0,end=Math.min(13,start+4),hasMore=end<13
     if(paging&&failPage){failPage=false;return route.fulfill({status:503,headers,contentType:'application/json',body:'{}'})}
     body={answer:shopping?'Here are verified laptop options.':paging?'More matching options.':message==='Explain RAM'?'RAM is temporary working memory. Storage keeps files.':'More RAM can help when several applications are open.',route:shopping||paging?'catalogue':'conversation',responseMode:shopping||paging?'results':'answer',products:shopping||paging?Array.from({length:end-start},(_,i)=>({id:start+i+1,name:'Lenovo laptop '+(start+i+1),price:4999+i,url:'https://store.digitalhood.info/product/lenovo-laptop-'+(start+i+1),image:'/product-placeholder.svg',specifications:[],canAddToCart:false,whyPicked:'Listing evidence: redundant title',totalSales:2})):[],pagination:shopping||paging?{shown:end,matchedCount:13,complete:true,hasMore,token:hasMore?String(end/4).repeat(48):undefined}:undefined,contextToken:'b'.repeat(48),feedbackToken:'a'.repeat(48),aiUsed:!paging,followups:shopping?['Compare top two','Browse the shop','Show specifications']:['Change my search','Browse the shop','Talk to support']}
     if(purpose||named)body={...body,answer:'This speakerphone is used for hands-free calls and online meetings.',route:'catalogue',products:[{id:525,name:'Dell Pro Plus Wireless Speakerphone SL525',price:4999,url:'https://store.digitalhood.info/product/dell-sl525',image:'/product-placeholder.svg',specifications:[]}]}
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
   await page.getByRole('button',{name:'New conversation',exact:true}).click()
   await page.locator('input[type="file"]').setInputFiles({name:'speakerphone.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP3sAAAAASUVORK5CYII=','base64')})
   await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Visual product match found.',{exact:true}).waitFor()
   for(const q of ['what is it used for?','Dell Pro Plus Wireless Speakerphone SL525','what is it used for?']){
    await input.fill(q);await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByRole('button',{name:'Send',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.ai-send')?.disabled)
    assert.match(await page.locator('.ai-turn').last().innerText(),/hands-free calls and online meetings/)
   }
   await page.screenshot({path:path.join(output,`${theme}-${width}-photo-followthrough.png`),fullPage:true})
   results.push({theme,width,conversationFirst:true,noAmbientCatalogueQueries:true,discoveryOptIn:true,latestOptionsOnly:true,feedbackHiddenUntilRequested:true,relevantFollowups:true,fourCompactCards:true,realPagination:true,retryKeepsResults:true,noDuplicates:true,sentMessageVisible:true,photoFollowThrough:true})
  }catch(error){await page.screenshot({path:path.join(output,`${theme}-${width}-failure.png`),fullPage:true});console.error((await page.locator('body').innerText()).slice(-3000),errors);throw error}finally{await context.close()}
 }fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results))
 }finally{await browser.close()}}
main().catch(e=>{console.error(e);process.exitCode=1})
