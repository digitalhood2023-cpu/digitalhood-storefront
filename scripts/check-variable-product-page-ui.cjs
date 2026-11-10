// Real ProductPage, synthetic catalogue only. Never create orders or touch stock.
const {chromium}=require('playwright')
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const {spawn}=require('node:child_process')
const origin='http://127.0.0.1:4342',output=path.join(__dirname,'variable-product-page-ui')
const title='Private fixture phones'
const photo=name=>origin+'/fixture-'+name+'.svg'
const product={id:90900,name:title,slug:'fixture-phones',type:'variable',status:'publish',price:'1000',regular_price:'1000',stock_status:'instock',stock_quantity:10,manage_stock:true,in_stock:true,purchasable:true,images:[{src:photo('main')},{src:photo('black')},{src:photo('blue')}],categories:[{id:44,name:'Phones',slug:'phones'}],description:'<p>Isolated test phones.</p>',sellerStoreName:'Fixture seller',sellerKey:'8',attributes:[{id:1,name:'Model',variation:true,options:['Phone A','Phone B']},{id:2,name:'Storage',variation:true,options:['128GB','256GB']},{id:3,name:'Colour',variation:true,options:['Black','Blue']}],variations:[]}
const variants=[{id:90901,price:'1000',regular_price:'1000',stock_quantity:3,image:{src:photo('black')},attributes:[{name:'Model',option:'Phone A'},{name:'Storage',option:'128GB'},{name:'Colour',option:'Black'}]},{id:90902,price:'1500',regular_price:'1500',stock_quantity:4,image:{src:photo('blue')},attributes:[{name:'Model',option:'Phone B'},{name:'Storage',option:'256GB'},{name:'Colour',option:'Blue'}]}].map(v=>({...v,status:'publish',stock_status:'instock',manage_stock:true,purchasable:true,in_stock:true}))
// WooCommerce local/custom attributes all share numeric ID0.
product.attributes.forEach(attribute=>{attribute.id=0})
async function main(){
  fs.mkdirSync(output,{recursive:true})
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4342','--strictPort'],{stdio:'ignore'})
  let browser
  try{
    for(let n=0;n<40;n++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
    browser=await chromium.launch({headless:true})
    const results=[]
    for(const theme of ['light','dark'])for(const width of [390,900,1440]){
      const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,serviceWorkers:'block',reducedMotion:'reduce'})
      const errors=[],mutations=[]
      await context.addInitScript(theme=>{localStorage.setItem('digitalhood-theme-preference-v1',theme);document.cookie=`digitalhood_theme=${theme}; Path=/`},theme)
      await context.routeWebSocket('**/*',socket=>socket.close())
      await context.route('**/*',async route=>{
        const req=route.request(),u=new URL(req.url()),p=u.pathname
        if(p.startsWith('/api/')||p.includes('/wp-json/')){
          if(!['GET','HEAD','OPTIONS'].includes(req.method()))mutations.push({path:p,method:req.method()})
          let body={success:true,ok:true,products:[],categories:[],reviews:[],feedback:[],notifications:[],items:[],conversations:[],summary:{count:0,averageRating:0},unreadCount:0,total:0,totalPages:1}
          if(p==='/api/products/slug/fixture-phones'||p==='/api/products/90900')body={product}
          else if(p==='/api/products/90900/variations')body={variations:variants}
          else if(p==='/api/public/sellers/8')body={success:true,store:{id:'8',storeName:'Fixture seller',status:'approved'},products:[]}
          else if(p==='/api/categories')body={categories:product.categories}
          return route.fulfill({headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,OPTIONS'},json:body})
        }
        if(p.startsWith('/fixture-'))return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="480"><rect width="600" height="480" fill="${p.includes('blue')?'#174bce':p.includes('black')?'#171717':'#dddddd'}"/><text x="60" y="240" fill="white" font-size="36">${p}</text></svg>`})
        return u.origin===origin||u.protocol==='data:'?route.continue():route.abort()
      })
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('same key'))errors.push(m.text())})
      try{
        await page.goto(origin+'/product/fixture-phones')
        await page.getByRole('heading',{name:title,exact:true}).waitFor()
        const add=page.getByTestId('product-add-to-cart'),price=page.locator('.dh-product-price > strong')
        const choose=async name=>page.getByRole('button',{name,exact:true}).click()
        const mainPhoto=page.getByRole('img',{name:title,exact:true}).first()
        await page.getByRole('button',{name:'Phone A',exact:true}).waitFor()
        assert.equal(await add.isDisabled(),true)
        await choose('Phone A');await choose('128GB');assert.equal(await add.isDisabled(),true)
        await choose('Black');await price.getByText('K1,000.00',{exact:true}).waitFor()
        assert.equal(await add.isEnabled(),true);assert.match(await mainPhoto.getAttribute('src'),/fixture-black/)
        await page.getByRole('button',{name:'Show product image 2',exact:true}).click()
        await choose('Phone B')
        assert.equal(await add.isDisabled(),true,'incompatible old options clear, not silently replaced')
        assert.equal(await page.getByRole('button',{name:'128GB',exact:true}).getAttribute('aria-pressed'),'false')
        assert.equal(await page.getByRole('button',{name:'Black',exact:true}).getAttribute('aria-pressed'),'false')
        assert.match(await price.innerText(),/^From /)
        await choose('256GB');await choose('Blue');await price.getByText('K1,500.00',{exact:true}).waitFor()
        assert.match(await mainPhoto.getAttribute('src'),/fixture-blue/,'photo switches to the exact selected combination')
        await add.click()
        const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('digitalhood-cart'))?.state?.items)
        assert.equal(cart.length,1);assert.equal(cart[0].id,90902);assert.equal(cart[0].productId,90900);assert.equal(cart[0].variationId,90902);assert.equal(cart[0].price,1500);assert.match(cart[0].image,/fixture-blue/)
        await choose('Phone A');assert.equal(await add.isDisabled(),true)
        await choose('128GB');await choose('Black');await add.click()
        const items=await page.evaluate(()=>JSON.parse(localStorage.getItem('digitalhood-cart'))?.state?.items)
        assert.equal(items.length,2,'different variants remain different cart lines');assert.equal(items.find(v=>v.variationId===90901).price,1000)
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
        const contrast=await page.locator('.dh-storefront-options p,.dh-storefront-options button,.dh-storefront-variants h3,.dh-storefront-variants > div > button').evaluateAll(elements=>{
          const luminance=value=>value.match(/[0-9.]+/g).slice(0,3).map(Number).map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)
          return elements.map(element=>{let ancestor=element,bg='rgba(0, 0, 0, 0)';while(ancestor&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(ancestor).backgroundColor;ancestor=ancestor.parentElement}const a=luminance(getComputedStyle(element).color),b=luminance(bg==='rgba(0, 0, 0, 0)'?'rgb(255, 255, 255)':bg);return{text:element.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})
        })
        for(const item of contrast)assert.ok(item.ratio>=4.5,JSON.stringify({theme,item}))
        await page.screenshot({path:path.join(output,theme+'-'+width+'.png'),fullPage:true})
        assert.deepEqual(errors,[]);assert.deepEqual(mutations,[],'fixture cart must not place orders or change stock')
        results.push({theme,width,exactPricePhoto:true,incompatibleChoiceCleared:true,distinctCartIdentity:true,commerceMutations:0})
      }catch(error){await page.screenshot({path:path.join(output,theme+'-'+width+'-failure.png'),fullPage:true});console.error(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(-5000)}));throw error}
      finally{await context.close()}
    }
    console.log(JSON.stringify({success:true,scenarios:results}))
  }finally{await browser?.close();server.kill()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
