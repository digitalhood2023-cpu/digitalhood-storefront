import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAssistantReply,readAssistantResponse,canConfirmAssistantCart} from '../src/lib/shoppingAssistant.ts';
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
