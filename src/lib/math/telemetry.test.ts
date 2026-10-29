import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTracker,EVENTS} from '../../../public/metrics.js';
test('默认关闭以及非同源配置不发请求',()=>{
 const send=()=>{throw Error('must not send');};
 for(const endpoint of ['', 'https://outside.example/e','/other'])for(const event of EVENTS)createTracker(endpoint,send)(event,1);
});
test('开启后仅六种白名单事件和最小字段，不带cookie/referrer',()=>{
 const calls: [unknown,unknown][]=[];
 const send: typeof fetch=async(url,options)=>{calls.push([url,options]);return new Response(null,{status:204});};
 const track=createTracker('/e',send);
 for(const event of EVENTS)track(event,3);
 assert.equal(calls.length,6);
 for(const [url,raw]of calls){const o=raw as RequestInit;assert.equal(url,'/e');assert.equal(o.credentials,'omit');assert.equal(o.referrerPolicy,'no-referrer');assert.deepEqual(Object.keys(JSON.parse(o.body as string)),['v','event','grade','count']);}
 track('visit',7);assert.equal(calls.length,6);
});
test('网络失败不抛出、不重试',async()=>{let calls=0;createTracker('/e',async()=>{calls++;throw Error('offline');})('visit');await Promise.resolve();assert.equal(calls,1);});
