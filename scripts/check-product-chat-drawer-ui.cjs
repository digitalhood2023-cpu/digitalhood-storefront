// Actual storefront routes + thread, isolated fixture APIs. Never contact or
// message a production seller, and never replay production authentication.
const {chromium}=require('playwright')
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const {spawn,execFileSync}=require('node:child_process')
const origin='http://127.0.0.1:4294',id='11111111-1111-4111-8111-111111111111'
const output=path.join(__dirname,'product-chat-drawer-ui')
async function main(){
  execFileSync(process.execPath,['--test','scripts/product-chat-drawer.test.mjs'],{stdio:'inherit'})
  fs.mkdirSync(output,{recursive:true})
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4294','--strictPort'],{stdio:'ignore'})
  let browser
  try{
    for(let n=0;n<40;n++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
    browser=await chromium.launch({headless:true,...(process.env.LOCAL_CHROME==='true'?{channel:'chrome'}:{})})
    const results=[]
    for(const theme of ['light','dark'])for(const width of [390,900,1440]){
      const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,serviceWorkers:'block',reducedMotion:'reduce'})
      const errors=[],requests=[],sends=[],productSends=[],messages=[{messageId:'seller-message-1',sequence:1,messageType:'text',text:'Hello, how can we help with this laptop?',sender:{type:'seller',id:'8',displayName:'Fixture seller'},attachments:[],contexts:[],createdAt:new Date().toISOString()}]
      let failSend=true,holdSend=false,releaseSend,allowDiscard=false,failProduct=true
      const product={id:42,name:'Fixture laptop',slug:'fixture-laptop',type:'simple',price:'299',regular_price:'299',in_stock:true,stock_status:'instock',stock_quantity:5,manage_stock:true,purchasable:true,images:[{src:origin+'/logo.jpg'}],categories:[{id:89,name:'PC/Laptops',slug:'pc-laptops'}],description:'<p>Local fixture description.</p>',sellerStoreName:'Fixture seller',sellerKey:'8',attributes:[],variations:[]}
      await context.addInitScript(theme=>{localStorage.setItem('digitalhood_customer_token','fixture-only');localStorage.setItem('digitalhood-theme-preference-v1',theme);document.cookie=`digitalhood_theme=${theme}; Path=/`},theme)
      await context.routeWebSocket('**/*',socket=>socket.close())
      await context.route('**/*',async route=>{
        const req=route.request(),u=new URL(req.url()),p=u.pathname
        if(p.startsWith('/api/')||p.includes('/wp-json/')){
          requests.push({path:p,method:req.method()})
          let body={success:true,ok:true,products:[],categories:[],notifications:[],items:[],conversations:[],summary:{count:0,averageRating:0},unreadCount:0}
          if(p==='/api/auth/me')body={success:true,customer:{id:7,email:'fixture@example.invalid',firstName:'Fixture',lastName:'Buyer',billing:{},shipping:{}}}
          else if(p==='/api/products/slug/fixture-laptop'||p==='/api/products/42')body={product}
          else if(p==='/api/conversations/product'){assert.equal(req.headers().authorization,'Bearer fixture-only');assert.deepEqual(req.postDataJSON(),{productId:42});body={ok:true,conversation:{id},product:{id:'42',name:product.name,price:'299',imageUrl:''}}}
          else if(p==='/api/conversations')body={ok:true,conversations:[{id,storeId:'8',storeName:'Fixture seller',counterparty:{type:'seller',id:'8',displayName:'Fixture seller',avatarUrl:origin+'/logo.jpg'},latestSequence:messages.at(-1).sequence,unreadCount:0},{id:'other-conversation',storeId:'9',storeName:'New fixture seller',counterparty:{type:'seller',id:'9',displayName:'New fixture seller'},latestSequence:0,unreadCount:0}]}
          else if(p==='/api/public/sellers/8/feedback'){assert.equal(req.headers().authorization,undefined,'public reputation does not forward account credentials');body={success:true,summary:{count:10,positivePercent:97,averageRating:4.8},feedback:[]}}
          else if(p==='/api/public/sellers/9/feedback'){
            if(width===900)return route.fulfill({status:503,json:{success:false}})
            body={success:true,summary:{count:0,positivePercent:100},feedback:[]}
          }
          else if(p===`/api/conversations/${id}/product`&&req.method()==='POST'){
            const payload=req.postDataJSON();productSends.push(payload);assert.equal(payload.productId,'42')
            if(failProduct)return route.fulfill({status:503,json:{error:'TEMPORARILY_UNAVAILABLE'}})
            messages.push({messageId:'shared-'+payload.clientMessageId,clientMessageId:payload.clientMessageId,sequence:messages.length+1,messageType:'product_card',text:'',sender:{type:'buyer',id:'7'},attachments:[],contexts:[{type:'product',externalId:'42',safeSnapshot:{productId:'42',name:product.name,price:'K299.00',imageUrl:origin+'/logo.jpg'}}],createdAt:new Date().toISOString()});body={ok:true}
          }
          else if(p===`/api/conversations/${id}/messages`&&req.method()==='POST'){
            const payload=req.postDataJSON();sends.push(payload)
            if(holdSend)await new Promise(resolve=>{releaseSend=resolve})
            if(failSend)return route.fulfill({status:503,headers:{'access-control-allow-origin':origin},json:{error:'TEMPORARILY_UNAVAILABLE'}})
            messages.push({messageId:'buyer-'+payload.clientMessageId,clientMessageId:payload.clientMessageId,sequence:messages.length+1,messageType:'text',text:payload.text,sender:{type:'buyer',id:'7'},attachments:[],contexts:[],createdAt:new Date().toISOString()});body={ok:true}
          }else if(/\/api\/conversations\/[^/]+\/messages$/.test(p))body={ok:true,messages:p.includes(id)?messages:[],page:{count:messages.length,hasMore:false,firstSequence:1,latestSequence:messages.length},counterpartyReceipt:{readSequence:1,deliveredSequence:1}}
          else if(p==='/api/public/sellers/8')body={success:true,store:{id:'8',storeName:'Fixture seller',status:'approved'},products:[]}
          else if(p==='/api/categories')body={categories:[{id:89,name:'PC/Laptops',slug:'pc-laptops'}]}
          return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,PUT,OPTIONS'},body:JSON.stringify(body)})
        }
        return u.origin===origin||u.protocol==='data:'?route.continue():route.abort()
      })
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.type()==='confirm'&&!allowDiscard?dialog.dismiss():dialog.accept())
      try{
        await page.goto(origin+'/product/fixture-laptop')
        const chat=page.getByRole('button',{name:'Chat',exact:true})
        await chat.waitFor();await page.getByRole('button',{name:'Increase quantity',exact:true}).click()
        await chat.scrollIntoViewIfNeeded();await chat.evaluate(element=>element.addEventListener('click',()=>{window.chatTriggerScroll=scrollY},{once:true}))
        await chat.click()
        const drawer=page.getByRole('dialog',{name:'Message seller',exact:true})
        await drawer.waitFor();await drawer.getByText(messages[0].text,{exact:true}).waitFor()
        await drawer.getByLabel('97% positive seller feedback',{exact:true}).waitFor()
        assert.match(await drawer.locator('.dh-chat-header h2').innerText(),/Fixture seller/)
        assert.equal(await drawer.locator('.dh-chat-header h2').getByLabel('97% positive seller feedback',{exact:true}).count(),1,'percentage is beside the seller name')
        const box=await drawer.boundingBox();assert.ok(box&&Math.abs(box.x+box.width-width)<2);assert.ok(width<768?Math.abs(box.width-width)<2:box.width<=490&&box.width>=450)
        assert.ok((await drawer.locator('.dh-seller-chat-heading').boundingBox()).height<=52,'compact drawer heading must stay one short row')
        assert.equal(await drawer.getByRole('button',{name:'Close seller chat',exact:true}).evaluate(button=>{const r=button.getBoundingClientRect();return button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),true,'drawer controls must sit above the sticky storefront header')
        assert.equal(await page.locator('.product-info').count(),1,'product stays mounted behind chat')
        assert.ok(await page.evaluate(()=>Math.abs(scrollY-window.chatTriggerScroll)<2),'opening must preserve the actual trigger-click scroll, after browser auto-scroll')
        assert.equal(await drawer.locator('.dh-chat-inbox').count(),0)
        assert.equal(await drawer.locator('.dh-chat-drawer-product').getByText('Fixture laptop',{exact:true}).count(),1)
        assert.equal(await drawer.locator('.dh-chat-drawer-product').getByText('K299.00',{exact:true}).count(),1,'reference uses the listing currency format even when chat returns raw metadata')
        assert.equal(await drawer.locator('.dh-chat-drawer-product img').evaluate(img=>img.complete&&img.naturalWidth>0),true,'reference uses the listing photo even when chat supplies no thumbnail')
        assert.equal(await drawer.getByRole('button',{name:'Share product in conversation',exact:true}).count(),1)
        assert.equal(requests.filter(r=>r.path===`/api/conversations/${id}/product`).length,0,'opening never sends a product message')
        assert.equal(sends.length,0)
        const input=drawer.getByPlaceholder('Write a message...',{exact:true})
        const quick=drawer.getByRole('group',{name:'Quick questions, added to your draft only',exact:true})
        const row=await quick.evaluate(e=>({height:e.clientHeight,scrollWidth:e.scrollWidth,width:e.clientWidth,tops:Array.from(e.querySelectorAll('button')).map(b=>b.getBoundingClientRect().top)}))
        assert.ok(row.height<=48&&row.tops.every(y=>Math.abs(y-row.tops[0])<1),'quick questions must occupy only one row')
        if(width===390)assert.ok(row.scrollWidth>row.width,'phone questions must scroll horizontally instead of wrapping')
        await quick.getByRole('button').first().focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab')
        assert.equal(await quick.getByRole('button').last().evaluate(e=>e===document.activeElement),true,'keyboard can reach offscreen quick questions')
        if(width===390)assert.ok(await quick.evaluate(e=>e.scrollLeft)>0)
        const seven=Array.from({length:7},(_,n)=>'Line '+(n+1)).join('\n')
        await input.fill(seven)
        await page.waitForFunction(()=>document.querySelector('.is-embedded .dh-chat-input')?.clientHeight>=150)
        const metrics=await input.evaluate(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight),font:parseFloat(getComputedStyle(e).fontSize)}))
        assert.equal(metrics.font,14,'typing uses a smaller font outside iOS zoom protection')
        assert.ok(metrics.height>=metrics.line*7+16&&metrics.height<=metrics.line*7+19,'seven lines remain visible')
        await input.fill(seven+'\n'+seven)
        assert.equal(await input.evaluate(e=>e.getBoundingClientRect().height),metrics.height)
        assert.equal(await input.evaluate(e=>getComputedStyle(e).overflowY),'auto','longer messages scroll after seven lines')
        await input.fill('Short message')
        assert.ok((await input.boundingBox()).height<=42,'composer shrinks again when content is short')
        await input.fill('A longer message without manual line breaks. '.repeat(12))
        assert.ok((await input.boundingBox()).height>42,'soft-wrapped typing also grows automatically')
        await input.fill('')
        await drawer.getByRole('button',{name:'Can you deliver to my area?',exact:true}).click()
        const questionDraft='Can you deliver to my area?\nItem: Fixture laptop (#42)'
        assert.equal(await input.inputValue(),questionDraft);assert.equal(sends.length,0)
        for(let n=0;n<16;n++){await page.keyboard.press('Tab');assert.equal(await drawer.evaluate(e=>e.contains(document.activeElement)),true,'keyboard stays in the modal')}
        await page.screenshot({path:path.join(output,theme+'-'+width+'.png'),fullPage:false})
        await page.keyboard.press('Escape');await drawer.waitFor({state:'detached'})
        await page.waitForFunction(id=>document.activeElement?.id===id,await chat.getAttribute('id'),{timeout:2000})
        assert.equal(await chat.evaluate(e=>document.activeElement===e),true,'close restores the product Chat trigger')
        await chat.click();await drawer.waitFor();await input.waitFor();assert.equal(await input.inputValue(),questionDraft)
        await page.goBack();await drawer.waitFor({state:'detached'})
        assert.match(page.url(),/\/product\/fixture-laptop$/)
        await chat.click();await drawer.waitFor();await input.waitFor();assert.equal(await input.inputValue(),questionDraft)
        holdSend=true;await drawer.getByRole('button',{name:'Send message',exact:true}).click()
        for(let n=0;n<30&&!releaseSend;n++)await new Promise(r=>setTimeout(r,20))
        assert.ok(releaseSend);assert.equal(await drawer.getByRole('button',{name:'Close seller chat',exact:true}).isDisabled(),true)
        await page.keyboard.press('Escape');assert.equal(await drawer.isVisible(),true)
        holdSend=false;releaseSend();await drawer.getByRole('button',{name:'Not sent — retry',exact:true}).waitFor()
        failSend=false;await drawer.getByRole('button',{name:'Not sent — retry',exact:true}).click()
        await drawer.getByRole('button',{name:'Not sent — retry',exact:true}).waitFor({state:'detached'})
        assert.equal(sends.length,2);assert.equal(sends[0].clientMessageId,sends[1].clientMessageId,'retry reuses its immutable message ID')
        await drawer.getByRole('button',{name:'Share product in conversation',exact:true}).click()
        await drawer.getByRole('alert').waitFor()
        assert.equal(await drawer.locator('.dh-chat-drawer-product').count(),1,'failed product sharing retains its reference')
        failProduct=false;await drawer.getByRole('button',{name:'Share product in conversation',exact:true}).click()
        await drawer.locator('.dh-chat-drawer-product').waitFor({state:'detached'})
        await drawer.getByRole('link',{name:'View Fixture laptop',exact:true}).waitFor()
        assert.equal(productSends.length,2);assert.equal(productSends[0].clientMessageId,productSends[1].clientMessageId)
        await page.screenshot({path:path.join(output,theme+'-'+width+'-shared.png'),fullPage:false})
        await drawer.getByRole('button',{name:'Close seller chat',exact:true}).click();await drawer.waitFor({state:'detached'})
        await chat.click();await drawer.waitFor();await drawer.getByRole('link',{name:'View Fixture laptop',exact:true}).waitFor()
        assert.equal(await drawer.locator('.dh-chat-drawer-product').count(),0,'reopening recognizes the product already shared in history')
        const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=','base64')
        await drawer.getByLabel('Choose an image or video',{exact:true}).setInputFiles({name:'fixture-detail.png',mimeType:'image/png',buffer:image})
        await drawer.getByText('1 attachment ready',{exact:true}).waitFor()
        await drawer.getByRole('button',{name:'Close seller chat',exact:true}).click();assert.equal(await drawer.isVisible(),true,'cancel close keeps the selected photo')
        allowDiscard=true;await drawer.getByRole('button',{name:'Close seller chat',exact:true}).click();await drawer.waitFor({state:'detached'})
        assert.equal(requests.filter(r=>r.path===`/api/conversations/${id}/media`).length,0,'selected photos are never sent implicitly')
        await chat.click();await drawer.waitFor();await input.waitFor()
        await input.fill('A private draft to continue in my inbox.')
        await drawer.getByRole('button',{name:'Open full messages inbox',exact:true}).click()
        await drawer.waitFor({state:'detached'})
        assert.equal(new URL(page.url()).pathname,`/account/messages/${id}`)
        // The existing mobile inbox deliberately hides its page heading when a
        // conversation is selected. Assert the actual full-page thread instead.
        if(width>=768)await page.getByRole('heading',{name:'Messages',exact:true}).waitFor()
        await page.getByPlaceholder('Write a message...',{exact:true}).waitFor()
        assert.equal(await page.getByPlaceholder('Write a message...',{exact:true}).inputValue(),'A private draft to continue in my inbox.')
        await page.goto(origin+'/account/messages/other-conversation')
        await page.getByPlaceholder('Write a message...',{exact:true}).waitFor();assert.equal(await page.getByPlaceholder('Write a message...',{exact:true}).inputValue(),'','drafts must never leak into another conversation')
        await page.getByLabel(width===900?'Seller feedback unavailable':'No seller feedback yet',{exact:true}).waitFor()
        assert.equal(await page.locator('.dh-chat-feedback').innerText(),'—%','unknown/new sellers must not inherit another store rating or a fabricated 100%')
        assert.equal(await page.locator('[data-seller-chat-drawer]').count(),0,'direct message links stay full-page')
        assert.deepEqual(errors,[])
        results.push({theme,width,drawer:true,drafts:true,back:true,focus:true,retry:true,sevenLineComposer:true,compactHeader:true,oneQuestionRow:true,sharedProductDismissed:true,sellerFeedback:true,autoSends:0})
      }catch(error){await page.screenshot({path:path.join(output,theme+'-'+width+'-failure.png'),fullPage:false});console.error(JSON.stringify({errors,requests,body:(await page.locator('body').innerText()).slice(-4500)}));throw error}
      finally{await context.close()}
    }
    console.log(JSON.stringify({success:true,scenarios:results}))
  }finally{await browser?.close();server.kill()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
