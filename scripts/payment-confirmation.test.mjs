import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import ts from 'typescript'
const source = await fs.readFile(new URL('../src/lib/paymentConfirmationWatch.ts', import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {startPaymentConfirmationWatch}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
function clock(){let time=0,id=0;const jobs=new Map();return {now:()=>time,schedule:(f,delay)=>{jobs.set(++id,{f,at:time+delay});return id},cancel:id=>jobs.delete(id),async tick(ms){await Promise.resolve();await Promise.resolve();const end=time+ms;while(true){const entry=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;time=entry[1].at;jobs.delete(entry[0]);entry[1].f();await Promise.resolve();await Promise.resolve()}time=end;await Promise.resolve();await Promise.resolve()},jobs}}
test('checks immediately and detects authoritative success within a one-second poll interval',async()=>{
 const c=clock();let calls=0,paid=false;const observed=[];
 startPaymentConfirmationWatch({...c,check:async()=>{calls++;return {paid}},onResult:r=>observed.push(r),onError:e=>{throw e}})
 assert.equal(calls,1);await c.tick(999);assert.equal(calls,1);paid=true;await c.tick(1);assert.equal(calls,2);assert.equal(observed.at(-1).paid,true);assert.equal(c.jobs.size,0)
})
test('slow network does not overlap requests or delay the non-blocking pending screen',async()=>{
 const c=clock();let resolve;let calls=0,delayed=0;const pending=new Promise(r=>resolve=r);
 const watch=startPaymentConfirmationWatch({...c,check:()=>{calls++;return pending},onResult(){},onError(){},onDelayed(){delayed++}})
 watch.refresh();watch.refresh();await c.tick(10000);assert.equal(calls,1);assert.equal(delayed,1);
 watch.stop();resolve({paid:true});await c.tick(1);assert.equal(c.jobs.size,0)
})
test('stale in-flight results cannot show success after checkout is stopped or replaced',async()=>{
 const c=clock();let resolve,signal;let updates=0;const pending=new Promise(r=>resolve=r);
 const watch=startPaymentConfirmationWatch({...c,check:s=>{signal=s;return pending},onResult(){updates++},onError(){updates++}})
 watch.stop();assert.equal(signal.aborted,true);resolve({paid:true});await c.tick(1);assert.equal(updates,0)
})
test('pending and transient network errors never become successful payments',async()=>{
 const c=clock();const results=[];let n=0,errors=0;
 const watch=startPaymentConfirmationWatch({...c,check:async()=>{if(n++===0)throw Error('offline');return {pending:true,paid:false}},onResult:r=>results.push(r),onError(){errors++}})
 await c.tick(2100);assert.equal(errors,1);assert.ok(results.length>0);assert.ok(results.every(r=>r.paid===false));watch.stop()
})
test('foreground return refreshes now, and the five-minute watch ends without inventing success',async()=>{
 const c=clock();let calls=0,timeouts=0;const watch=startPaymentConfirmationWatch({...c,check:async()=>{calls++;return {pending:true}},onResult(){},onError(){},onTimeout(){timeouts++}})
 await c.tick(100);watch.refresh();await c.tick(0);assert.equal(calls,2);await c.tick(300000);assert.equal(timeouts,1);assert.equal(c.jobs.size,0)
})
