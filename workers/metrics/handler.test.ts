import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// @ts-ignore Pure JavaScript runtime module.
import {handleEvent} from './handler.js';
const events = ['visit','enter','grade_select','lesson_start','quiz_complete','backup_export_click'];
const valid = {v:1,event:'visit',grade:null,count:1};
function request(body: unknown = valid, options: RequestInit = {}, url = 'https://www.yanghat.cn/e') {
  return new Request(url, {method:'POST',body:JSON.stringify(body),...options,headers:{Origin:new URL(url).origin,'Content-Type':'application/json',...options.headers}});
}
async function check(req: Request, status: number, env: any = {METRICS:{writeDataPoint(){}}}) {
  const response = await handleEvent(req,env);
  assert.equal(response.status,status);
  assert.equal(await response.text(),'');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(response.headers.get('access-control-allow-origin'),null);
  return response;
}
for (const event of events) test(`event ${event}`, async()=>{
  const points: unknown[]=[];
  await check(request({...valid,event},{headers:{'CF-Connecting-IP':'fake-ip','X-Forwarded-For':'fake-forward','User-Agent':'fake-ua',Cookie:'fake-cookie',Referer:'fake-referer'}}),204,{METRICS:{writeDataPoint(p: unknown){points.push(p);}}});
  assert.deepEqual(points,[{indexes:[event],blobs:[event,'none','prod'],doubles:[1]}]);
  for(const value of ['fake-ip','fake-forward','fake-ua','fake-cookie','fake-referer']) assert.ok(!JSON.stringify(points).includes(value));
});
for(const grade of [null,1,6]) test(`grade ${grade}`,async()=>{
  const points: unknown[]=[];
  await check(request({...valid,grade}),204,{METRICS:{writeDataPoint(p: unknown){points.push(p);}}});
  assert.deepEqual(points,[{indexes:['visit'],blobs:['visit',grade===null?'none':String(grade),'prod'],doubles:[1]}]);
});
for(const [key,values] of Object.entries({grade:[0,7,1.5,'3'],count:[0,2,'1'],v:[2],event:['unknown']})) for(const value of values) test(`reject ${key} ${value}`,()=>check(request({...valid,[key]:value}),400));
for(const body of [{...valid,extra:1},{v:1,event:'visit',count:1},[],null]) test(`shape ${JSON.stringify(body)}`,()=>check(request(body),400));
for(const method of ['GET','PUT','OPTIONS']) test(method,async()=>assert.equal((await check(request(valid,{method,body:method==='GET'?undefined:JSON.stringify(valid)}),405)).headers.get('allow'),'POST'));
for(const headers of ([{Origin:''},{Origin:'https://other.example'},{'Sec-Fetch-Site':'cross-site'}] as Record<string,string>[])) test(`origin ${JSON.stringify(headers)}`,()=>check(request(valid,{headers}),403));
test('null origin with same-origin fetch metadata',()=>check(request(valid,{headers:{Origin:'null','Sec-Fetch-Site':'same-origin'}}),204));
test('missing origin with same-origin fetch metadata',()=>{const r=request(valid,{headers:{'Sec-Fetch-Site':'same-origin'}});r.headers.delete('Origin');return check(r,204);});
for(const headers of ([{Origin:'null'},{Origin:'null','Sec-Fetch-Site':'cross-site'},{Origin:'null','Sec-Fetch-Site':'same-site'},{Origin:'null','Sec-Fetch-Site':'none'},{Origin:'https://other.example','Sec-Fetch-Site':'same-origin'}] as Record<string,string>[])) test(`opaque/forged origin ${JSON.stringify(headers)}`,()=>check(request(valid,{headers}),403));
test('missing origin',()=>{const r=request();r.headers.delete('Origin');return check(r,403);});
test('host rejected',()=>check(request(valid,{},'https://evil.example/e'),403));
test('media',()=>check(request(valid,{headers:{'Content-Type':'text/plain'}}),415));
test('declared size',()=>check(request(valid,{headers:{'Content-Length':'600'}}),413));
test('bounded stream',async()=>{
  let cancelled=false;
  let pulls=0;
  const long=new ReadableStream({pull(c){pulls++;c.enqueue(new Uint8Array(pulls===1?520:80));if(pulls===2)c.close();},cancel(){cancelled=true;}},{highWaterMark:0});
  await check(request(valid,{body:long,duplex:'half'} as RequestInit),413);
  assert.equal(pulls,1);assert.ok(cancelled);
});
test('512 byte boundary',()=>check(request(valid,{body:JSON.stringify(valid).padEnd(512,' '),headers:{'Content-Type':'application/json; charset=utf-8'}}),204));
test('bad JSON',()=>check(request(valid,{body:'{'}),400));
test('missing binding',()=>check(request(),503,{}));
test('bad binding',()=>check(request(),503,{METRICS:{}}));
test('write throws',()=>check(request(),204,{METRICS:{writeDataPoint(){throw Error('failed');}}}));
for(const [host,tag] of [['yanghat.cn','prod'],['yanghat-cn.pages.dev','preview'],['abc.yanghat-cn.pages.dev','preview'],['localhost','dev'],['127.0.0.1','dev']]) test(host,async()=>{
  await check(request(valid,{},`http://${host}/e`),204,{METRICS:{writeDataPoint(p: any){assert.deepEqual(p,{indexes:['visit'],blobs:['visit','none',tag],doubles:[1]});}}});
});
test('source privacy guard',async()=>{
  for(const path of ['workers/metrics/handler.js','site/functions/e.js']) {
    assert.doesNotMatch(await readFile(path,'utf8'),/console\.|CF-Connecting-IP|x-forwarded-for|user-agent|cookie|referer|\.cf/i);
  }
});
