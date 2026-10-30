import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const load = async path => import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))
const route = await load('../src/lib/chatDrawerRoute.ts'), drafts = await load('../src/lib/buyerChatDrafts.ts')
test('only a product-origin chat route may render a drawer; external/direct/malformed locations cannot',()=>{
  const background={pathname:'/product/laptop',search:'?colour=white',hash:'',key:'test',state:{ignored:'not-copied'}}
  const state=route.productChatDrawerState(background,{id:'42',name:'Laptop',price:'K299',imageUrl:'/logo.jpg'})
  assert.equal(state.backgroundLocation.state,null)
  const location={pathname:'/account/messages/abc-123',state}
  assert.equal(route.getChatDrawerBackground(location).pathname,'/product/laptop')
  for(const candidate of [{...location,state:null},{...location,pathname:'/account/messages'},{...location,pathname:'/checkout'},{...location,state:{...state,backgroundLocation:{...background,pathname:'https://evil.invalid'}}},{...location,state:{...state,backgroundLocation:{pathname:'/product/laptop'}}}])assert.equal(route.getChatDrawerBackground(candidate),null)
})
test('private drafts are isolated, bounded, expiring and cleared on logout without browser persistence',()=>{
  const a=drafts.buyerChatDraftKey(7,'conversation-a'),b=drafts.buyerChatDraftKey(8,'conversation-a'),c=drafts.buyerChatDraftKey(7,'conversation-b')
  drafts.writeBuyerChatDraft(a,'Private draft',100)
  assert.equal(drafts.readBuyerChatDraft(a,101),'Private draft');assert.equal(drafts.readBuyerChatDraft(b,101),'');assert.equal(drafts.readBuyerChatDraft(c,101),'')
  assert.equal(drafts.readBuyerChatDraft(a,3_600_101),'')
  drafts.writeBuyerChatDraft(a,'x'.repeat(5000));assert.equal(drafts.readBuyerChatDraft(a).length,4000)
  drafts.writeBuyerChatDraft(a,'');assert.equal(drafts.readBuyerChatDraft(a),'')
  for(let n=0;n<21;n++)drafts.writeBuyerChatDraft(drafts.buyerChatDraftKey(7,String(n)),'draft')
  assert.equal(drafts.readBuyerChatDraft(drafts.buyerChatDraftKey(7,'0')),'')
  drafts.clearBuyerChatDrafts();assert.equal(drafts.readBuyerChatDraft(drafts.buyerChatDraftKey(7,'20')),'')
  assert.equal(drafts.buyerChatDraftKey(undefined,'a'),'')
})
