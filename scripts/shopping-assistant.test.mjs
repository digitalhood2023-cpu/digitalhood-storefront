import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
// Node 22.11 (Coolify) cannot import TypeScript directly. Use the existing
// compiler to load this standalone helper without relying on type stripping.
const source=await readFile(new URL('../src/lib/shoppingAssistant.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {normalizeAssistantReply,readAssistantResponse,canConfirmAssistantCart,resolveAssistantContext}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const product={id:1,name:'Phone',price:50,url:'https://store.digitalhood.info/product/phone',image:'https://digitalhood.info/phone.jpg',specifications:[]};
test('rejects hostile links, invalid prices and duplicate results',()=>{
 const result=normalizeAssistantReply({answer:'hello',products:[product,product,{...product,id:2,url:'https://attacker.test/product/a'},{...product,id:3,price:-1},{...product,id:4,image:'javascript:alert(1)'}]});
 assert.deepEqual(result.products.map(p=>p.id),[1,4]);assert.equal(result.products[1].image,'/product-placeholder.svg');
});
test('SSE split across UTF-8 and frame boundaries publishes cards only on complete result',async()=>{
 const encoder=new TextEncoder();const encoded=encoder.encode('event: text\ndata: {"text":"Kwacha ✨"}\n\nevent: result\ndata: '+JSON.stringify({answer:'Kwacha ✨',products:[product]})+'\n\n');
 const previews=[];const body=new ReadableStream({start(c){for(let i=0;i<encoded.length;i+=3)c.enqueue(encoded.slice(i,i+3));c.close()}});
 const result=await readAssistantResponse(new Response(body,{headers:{'Content-Type':'text/event-stream'}}),t=>previews.push(t));assert.deepEqual(previews,['Kwacha ✨']);assert.equal(result.products.length,1);
});
test('incomplete stream fails instead of accepting partially emitted cards',async()=>{
 await assert.rejects(readAssistantResponse(new Response('event: text\ndata: {"text":"Hello"}\n\n',{headers:{'Content-Type':'text/event-stream'}}),()=>{}),/interrupted/);
});
test('cart confirmation fails closed for stale ID, stock, variable products or missing seller',()=>{
 const p={id:1,price:50,type:'simple',hasOptions:false,purchasable:true,canAddToCart:true,stockStatus:'instock',sellerKey:'seller-a'};
 assert.equal(canConfirmAssistantCart(p,1),true);
 for(const change of [{id:2},{stockStatus:'outofstock'},{type:'variable'},{hasOptions:true},{sellerKey:''},{price:NaN}])assert.equal(canConfirmAssistantCart({...p,...change},1),false);
});

const interestSource=await readFile(new URL('../src/lib/homeDiscovery.ts',import.meta.url),'utf8');
const interestCompiled=ts.transpileModule(interestSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {deriveHomeDiscoveryInterests}=await import('data:text/javascript;base64,'+Buffer.from(interestCompiled).toString('base64'));
test('discovery derives bounded catalogue interests from searches and viewed categories without contact details',()=>{
 const interests=deriveHomeDiscoveryInterests({searches:['Laptops','laptops','person@example.com','+260971047570'],recentlyViewed:[{name:'Laptop',category:'Accessories'}]});
 assert.deepEqual(interests,['laptops','accessories']);
 assert.equal(deriveHomeDiscoveryInterests({searches:['one','two','three','four','five','six']}).length,5);
});

const shuffleSource=await readFile(new URL('../src/lib/assistantDiscovery.ts',import.meta.url),'utf8');
const shuffleJS=ts.transpileModule(shuffleSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {shuffleDiscovery,nextDiscoveryStep}=await import('data:text/javascript;base64,'+Buffer.from(shuffleJS).toString('base64'));
test('discovery excludes search products, deduplicates and refresh changes first product even with identical random order',()=>{
 const pool=[{id:1},{id:2},{id:2},{id:3},{id:4}];
 const first=shuffleDiscovery(pool,[1],undefined,()=>0.99);
 const next=shuffleDiscovery(pool,[1],first[0].id,()=>0.99);
 assert.deepEqual(first.map(p=>p.id),[2,3,4]);assert.notEqual(first[0].id,next[0].id);assert.equal(pool.length,5);
 assert.deepEqual(shuffleDiscovery([{id:1}],[1]),[]);
});

test('typed followups use selected or last listing IDs instead of unrelated search',()=>{
 assert.deepEqual(resolveAssistantContext('compare these selected products which one is better',[],[21,22],[99]),[21,22]);
 assert.deepEqual(resolveAssistantContext('is it a phone or a tablet?',[],[],[21]),[21]);
 assert.deepEqual(resolveAssistantContext('hello, how are you?',[],[],[21]),[]);
 assert.deepEqual(resolveAssistantContext('find a gaming mouse',[],[],[21]),[]);
 assert.deepEqual(resolveAssistantContext('compare these',[],[],[1,2,3,4,5]),[]);
});

test('discovery completes every group and catalogue page before starting the next cycle',()=>{
 let step={page:0,sourcePage:1,cycleComplete:false};const visited=[];
 for(let i=0;i<6;i++){visited.push([step.sourcePage,step.page]);step=nextDiscoveryStep(step.page,3,step.sourcePage,2)}
 assert.deepEqual(visited,[[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]]);assert.deepEqual(step,{page:0,sourcePage:1,cycleComplete:true});
});
