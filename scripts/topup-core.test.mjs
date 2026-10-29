import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { MAX_YUAN, ORDER_ALPHABET, createOrder, validateYuan, encodeBase32, decodeBase32, encodePayload, beijingDay, redeem, emptyState, readState, projectCreate, projectDelete, projectRedeem, reconcileRedeem, transact, STORAGE_KEY } from '../site/www.yanghat.cn/topup-core.js';
const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const publicKey=await webcrypto.subtle.exportKey('jwk',pair.publicKey);
async function sign(id,points,version=1){const payload=encodePayload(id,points,beijingDay(),version),sig=new Uint8Array(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,payload)),bytes=new Uint8Array(79);bytes.set(payload);bytes.set(sig,15);return encodeBase32(bytes);}
const order=createOrder(10),state={...emptyState(),orders:[order]};
test('amount accepts only positive integer yuan up to MAX_YUAN',()=>{assert.equal(MAX_YUAN,50);for(const n of [1,'10',50])assert.equal(validateYuan(n),Number(n));for(const n of [0,-1,1.1,'1.0','01','1e2',' 1','',null,51,200,Infinity])assert.throws(()=>validateYuan(n));});
test('orders have unbiased safe alphabet, six chars, unique candidates and 1–9 fen',()=>{const orders=Array.from({length:3000},()=>createOrder(10));assert.ok(new Set(orders.map(o=>o.id)).size>2900);assert.equal(new Set(orders.map(o=>o.payableFen%100)).size,9);for(const o of orders){assert.match(o.id,/^KQ[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);assert.equal(o.id.length,6);assert.equal(o.points,1000);assert.ok(o.payableFen>=1001&&o.payableFen<=1009);}assert.doesNotMatch(ORDER_ALPHABET,/[01ILO]/);});
test('Crockford Base32 roundtrip, aliases, case, spaces, canonical tail',()=>{for(let n=1;n<100;n++){const b=webcrypto.getRandomValues(new Uint8Array(n)),encoded=encodeBase32(b);assert.deepEqual(decodeBase32(encoded.toLowerCase().replace(/-/g,' - ')),b);}assert.deepEqual(decodeBase32('OO'),new Uint8Array([0]));assert.deepEqual(decodeBase32('IO'),decodeBase32('L0'));assert.throws(()=>decodeBase32('!'));assert.throws(()=>decodeBase32('01'));});
test('Beijing day boundary',()=>{assert.equal(beijingDay(Date.parse('2026-10-28T16:00:00Z')),beijingDay(Date.parse('2026-10-28T15:59:59Z'))+1);});
test('signed code roundtrip credits once',async()=>{const code=await sign(order.id,order.points),next=await redeem(state,code,publicKey);assert.equal(next.balance,1000);assert.equal(next.orders[0].redeemed,true);assert.equal(state.balance,0);await assert.rejects(redeem(next,code,publicKey),/已经兑换/);});
test('every byte tamper fails verification',async()=>{const bytes=decodeBase32(await sign(order.id,order.points));for(let i=0;i<bytes.length;i++){const bad=bytes.slice();bad[i]^=1;await assert.rejects(redeem(state,encodeBase32(bad),publicKey));}});
test('each encoded character tamper fails',async()=>{const code=(await sign(order.id,order.points)).replace(/-/g,'');for(let i=0;i<code.length;i++){const bad=code.slice(0,i)+(code[i]==='0'?'2':'0')+code.slice(i+1);await assert.rejects(redeem(state,bad,publicKey));}});
test('different order, points, version and key rejected',async()=>{await assert.rejects(redeem(state,await sign(order.id==='KQ7F3A'?'KQ7F3B':'KQ7F3A',1000),publicKey),/不在本机/);await assert.rejects(redeem(state,await sign(order.id,1100),publicKey),/不一致/);await assert.rejects(redeem(state,await sign(order.id,1000,2),publicKey));const other=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);await assert.rejects(redeem(state,await sign(order.id,1000),await webcrypto.subtle.exportKey('jwk',other.publicKey)));});
test('storage validation preserves paid orders and rejects corruption',()=>{assert.deepEqual(readState(null),emptyState());assert.deepEqual(readState(JSON.stringify(state)),state);for(const raw of ['{', '{}',JSON.stringify({...state,balance:-1}),JSON.stringify({...state,orders:[order,order]})])assert.throws(()=>readState(raw));});
function byteRng(n){return {getRandomValues(buf){buf[0]=n;return buf;}};}
function memoryIo(initial){let raw=JSON.stringify(initial);let notify;return {load:()=>readState(raw),save(next){raw=JSON.stringify(next);notify?.(STORAGE_KEY);},listen(cb){notify=cb;return ()=>{notify=null;};},locks:null,raw:()=>raw};}
test('alternating tab writes keep balance, reject a second credit, and do not delete a redeemed order',async()=>{
  const first=createOrder(10,[],byteRng(1),1_000);
  const payload={id:first.id,points:first.points,day:1};
  const io=memoryIo({balance:0,orders:[first]});
  const redeemPlan=latest=>{const produced=projectRedeem(latest,payload);return {...produced,reconcile:after=>reconcileRedeem(after,produced.order,produced.expected)};};
  await transact(io,({commit})=>commit(redeemPlan));
  const extra=createOrder(20,[],byteRng(2),2_000);
  await transact(io,({commit})=>commit(latest=>{const produced=projectCreate(latest,extra);return {...produced,reconcile:after=>after.orders.some(item=>item.id===extra.id)?null:{state:projectCreate(after,extra).state}};}));
  const afterCreate=io.load();
  assert.equal(afterCreate.balance,1000);
  assert.equal(afterCreate.orders.find(item=>item.id===first.id).redeemed,true);
  assert.ok(afterCreate.orders.some(item=>item.id===extra.id));
  const deleted=await transact(io,({commit})=>commit(latest=>projectDelete(latest,first.id)));
  assert.equal(deleted.status,'redeemed');
  assert.equal(io.load().balance,1000);
  assert.equal(io.load().orders.find(item=>item.id===first.id).redeemed,true);
  await assert.rejects(transact(io,({commit})=>commit(redeemPlan)),/已经兑换/);
  assert.equal(io.load().balance,1000);
  const doubled={...io.load(),balance:io.load().balance+first.points};
  const rolled=reconcileRedeem(doubled,{...first,redeemed:true},1000);
  assert.equal(rolled.state.balance,1000);
  assert.match(rolled.error.message,/已经兑换/);
  const wiped={balance:0,orders:[]};
  const restored=reconcileRedeem(wiped,{...first,redeemed:true},1000);
  assert.equal(restored.state.balance,1000);
  assert.equal(restored.state.orders.find(item=>item.id===first.id).redeemed,true);
});
test('serialized locks let only one of two overlapping redeems credit',async()=>{
  const first=createOrder(10,[],byteRng(3),3_000);
  const payload={id:first.id,points:first.points,day:1};
  const io=memoryIo({balance:0,orders:[first]});
  let chain=Promise.resolve();
  io.locks={request(_name,callback){const run=chain.then(()=>callback());chain=run.then(()=>{},()=>{});return run;}};
  let gate;const openGate=new Promise(resolve=>{gate=resolve;});
  const once=()=>transact(io,async({commit})=>{await openGate;await commit(latest=>{const produced=projectRedeem(latest,payload);return {...produced,reconcile:after=>reconcileRedeem(after,produced.order,produced.expected)};});});
  const both=Promise.allSettled([once(),once()]);
  gate();
  const settled=await both;
  assert.equal(settled.filter(item=>item.status==='fulfilled').length,1);
  assert.match(settled.find(item=>item.status==='rejected').reason.message,/已经兑换/);
  assert.equal(io.load().balance,1000);
  assert.equal(io.load().orders.filter(item=>item.redeemed).length,1);
});
test('without locks commit reloads and replays after a foreign write',async()=>{
  const kept=createOrder(10,[],byteRng(4),4_000);
  const added=createOrder(20,[kept],byteRng(5),5_000);
  const mine=createOrder(30,[kept,added],byteRng(6),6_000);
  let raw=JSON.stringify({balance:0,orders:[kept]});
  let notify;let stale=true;
  const io={
    load(){if(stale){stale=false;const previous=readState(raw);raw=JSON.stringify({balance:80,orders:[kept,added]});notify?.(STORAGE_KEY);return previous;}return readState(raw);},
    save(next){raw=JSON.stringify(next);},
    listen(cb){notify=cb;return()=>{notify=null;};},
    locks:null,
  };
  await transact(io,({commit})=>commit(latest=>projectCreate(latest,mine)));
  const final=io.load();
  assert.equal(final.balance,80);
  assert.deepEqual(final.orders.map(item=>item.id).sort(),[kept.id,added.id,mine.id].sort());
});
