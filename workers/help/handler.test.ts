import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
// @ts-ignore JS module
import {handleHelp, DAILY_CAP_MICRO, PRICE_MISS_MICRO, PRICE_OUT_MICRO, MAX_TOKENS, MODEL} from './handler.js';
import {MODEL as AI_MODEL} from '../ai/upstream.ts';
// @ts-ignore JS module
import {SYSTEM_PROMPT} from './prompt.js';
globalThis.fetch=async()=>{assert.fail('Unexpected non-mock network request');};
class D1 {
 sql=new DatabaseSync(':memory:'); writes=0; queue:Promise<any>=Promise.resolve();
 prepare(sql:string) {const db=this;let args:any[]=[];return {bind(...a:any[]){args=a;return this;},async run(){db.writes++;return db.sql.prepare(sql).run(...args);},async first(){return db.sql.prepare(sql).get(...args);},async all(){return {results:db.sql.prepare(sql).all(...args)};}};}
 batch(statements:any[]){const result=this.queue.then(async()=>{this.sql.exec('BEGIN');try{const rows=[];for(const s of statements){this.writes++;rows.push(await s.all());}this.sql.exec('COMMIT');return rows;}catch(e){this.sql.exec('ROLLBACK');throw e;}});this.queue=result.catch(()=>{});return result;}
 amount(){return this.sql.prepare('SELECT * FROM help_spend ORDER BY day').all() as {day:string,micro:number}[];}
}
function req(body:any={v:1,q:'怎么开始练习？'},init:RequestInit={},url='https://www.yanghat.cn/api/help'){return new Request(url,{method:'POST',body:JSON.stringify(body),...init,headers:{Origin:new URL(url).origin,'Content-Type':'application/json',...init.headers}});}
const now=()=>Date.parse('2026-10-29T12:00:00Z');
const usage={prompt_tokens:100,prompt_cache_hit_tokens:50,prompt_cache_miss_tokens:50,completion_tokens:10};
const upstream=()=>Response.json({choices:[{message:{content:'点击开始练习。'}}],usage});
async function call(r:Request,env:any={},fetcher:any=async()=>{assert.fail('unexpected upstream');},extra:any={}){const response=await handleHelp(r,env,{fetch:fetcher,now,...extra});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('set'+'-coo'+'kie'),null);return response;}
async function rejected(r:Request,status:number){const response=await call(r);assert.equal(response.status,status);assert.equal(await response.text(),'');assert.equal(response.headers.get('access-control-allow-origin'),null);return response;}
for(const method of ['GET','PUT','OPTIONS'])test(method,async()=>assert.equal((await rejected(req(null,{method,body:method==='GET'?undefined:'{}'}),405)).headers.get('allow'),'POST'));
for(const headers of [{Origin:''},{Origin:'https://evil.example'},{Origin:'null'},{'Sec-Fetch-Site':'cross-site'},{'Sec-Fetch-Site':'same-site'},{Origin:'null','Sec-Fetch-Site':'none'}])test(JSON.stringify(headers),()=>rejected(req(undefined,{headers:headers as Record<string,string>}),403));
test('missing origin',()=>{const r=req();r.headers.delete('Origin');return rejected(r,403);});
test('host',()=>rejected(req(undefined,{},'https://evil.example/api/help'),403));
test('media',()=>rejected(req(undefined,{headers:{'Content-Type':'text/plain'}}),415));
test('declared bytes',()=>rejected(req(undefined,{headers:{'Content-Length':'8193'}}),413));
test('stream cancels immediately',async()=>{let pulls=0,cancel=false;const body=new ReadableStream({pull(c){pulls++;c.enqueue(new Uint8Array(8193));},cancel(){cancel=true;}},{highWaterMark:0});await rejected(req(null,{body,duplex:'half'} as RequestInit),413);assert.equal(pulls,1);assert.ok(cancel);});
test('broken stream',()=>rejected(req(null,{body:new ReadableStream({start(c){c.error(Error());}}),duplex:'half'} as RequestInit),400));
for(const body of [null,[],{}, {v:1,q:'a',extra:1},{v:2,q:'a'},{v:1,q:2},{v:1,q:' '},{v:1,q:'a'.repeat(301)}])test('invalid '+JSON.stringify(body),()=>rejected(req(body),400));
test('JSON',()=>rejected(req(null,{body:'{'}),400));
for(const host of ['www.yanghat.cn','yanghat.cn','yanghat-cn.pages.dev','abc.yanghat-cn.pages.dev','localhost','127.0.0.1'])test(host,async()=>assert.equal((await (await call(req(undefined,{},`http://${host}/api/help`))).json()).reason,'unconfigured'));
for(const origin of ['null',null])test('opaque '+origin,async()=>{const r=req(undefined,{headers:{Origin:origin??'null','Sec-Fetch-Site':'same-origin'}});if(origin===null)r.headers.delete('Origin');assert.equal((await call(r)).status,200);});
for(const env of [{},{DEEPSEEK_API_KEY:'fake'},{HELP_DB:new D1()}])test('unconfigured',async()=>{assert.equal((await (await call(req(),env)).json()).reason,'unconfigured');if('HELP_DB'in env)assert.equal(env.HELP_DB?.writes,0);});
test('DB failure closed',async()=>assert.equal((await (await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:{batch(){throw Error();},prepare(){return {bind(){return this;}};}}})).json()).reason,'unconfigured'));
test('normal sanitized single round and actual spend',async()=>{const db=new D1();const q='邮箱abc@example.cn 手机13812345678';const response=await call(req({v:1,q}),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async(url:string,init:RequestInit)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal((init.headers as any).Authorization,'Bearer fake');const b=JSON.parse(init.body as string);assert.deepEqual(b,{model:'deepseek-flash',messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:'邮箱[邮箱] 手机[电话]'}],thinking:{type:'disabled'},max_tokens:300,temperature:0.3,stream:false});return upstream();});assert.equal(response.status,200);assert.match(response.headers.get('content-type')! ,/application\/json; charset=utf-8/);const body=await response.text();assert.equal(JSON.parse(body).source,'ai');assert.ok(!body.includes(q));assert.equal(db.amount()[0].micro,182);});
const reservation=(q='怎么开始练习？')=>(new TextEncoder().encode(SYSTEM_PROMPT+q).length+64)*2+2400;
async function seed(db:D1,micro:number){db.sql.exec('CREATE TABLE help_spend(day TEXT PRIMARY KEY,micro INTEGER NOT NULL)');db.sql.prepare('INSERT INTO help_spend VALUES (?,?)').run('2026-10-29',micro);}
test('cap',async()=>{const db=new D1();await seed(db,DAILY_CAP_MICRO-reservation()+1);assert.equal((await (await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db})).json()).reason,'cap');});
test('concurrent atomic reserve',async()=>{const db=new D1();await seed(db,DAILY_CAP_MICRO-reservation());let count=0;let finish:any;const wait=new Promise<Response>(resolve=>finish=resolve);const fetcher=async()=>{count++;return wait;};const one=call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},fetcher);const two=call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},fetcher);await new Promise(r=>setTimeout(r,10));finish(upstream());const values=await Promise.all([one,two]);assert.equal(count,1);const bodies=await Promise.all(values.map((r:Response)=>r.json()));assert.deepEqual(bodies.map((x:any)=>x.source).sort(),['ai','fallback']);assert.equal(bodies.find((x:any)=>x.source==='fallback').reason,'cap');});
test('500 refunds',async()=>{const db=new D1();assert.equal((await (await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>new Response('secret error',{status:500}))).json()).reason,'upstream');assert.equal(db.amount()[0].micro,0);});
test('timeout keeps reserve',async()=>{const db=new D1();const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async(_:any,init:any)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Error()))),{timeoutMs:5});assert.equal((await r.json()).reason,'upstream');assert.equal(db.amount()[0].micro,reservation());});
for(const content of ['',null,'<script>bad()</script>```code``` **你好** https://example.cn'])test('answer '+content,async()=>{const db=new D1();const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>Response.json({choices:[{message:{content}}],usage}));const b=await r.json();assert.equal(b.source,content?'ai':'fallback');if(content)assert.equal(b.answer,'你好');});
test('parse failure',async()=>assert.equal((await (await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1()},async()=>new Response('{'))).json()).reason,'upstream'));
test('fallback pricing and Beijing rollover',async()=>{const db=new D1();for(const time of ['2026-10-29T15:59:00Z','2026-10-29T16:00:00Z'])await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>Response.json({choices:[{message:{content:'好'}}],usage:{prompt_tokens:100,completion_tokens:10}}),{now:()=>Date.parse(time)});assert.deepEqual(db.amount().map(r=>[r.day,r.micro]),[['2026-10-29',280],['2026-10-30',280]]);});
test('8192 boundary and code points',async()=>{assert.equal((await call(req({v:1,q:'😀'.repeat(300)},{body:JSON.stringify({v:1,q:'😀'.repeat(300)}).padEnd(8192-600,' '),headers:{'Content-Type':'application/json; charset=utf-8'}}))).status,200);});
test('source privacy',async()=>{const forbidden=new RegExp(['con'+'sole\\.','cf-connecting'+'-ip','x-forwarded'+'-for','user'+'-agent','coo'+'kie','refe'+'rer','\\.c'+'f'].join('|'),'i');for(const f of [...(await readdir('workers/help')).map(f=>'workers/help/'+f),'site/functions/api/help.js'])assert.doesNotMatch(await readFile(f,'utf8'),forbidden);});

test('network failure keeps reserve',async()=>{const db=new D1();const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>{throw Error('private upstream details');});const text=await r.text();assert.equal(JSON.parse(text).reason,'upstream');assert.ok(!text.includes('private upstream'));assert.equal(db.amount()[0].micro,reservation());});
test('missing usage keeps reserve, answer bounded',async()=>{const db=new D1();const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>Response.json({choices:[{message:{content:'好'.repeat(700)}}]}));assert.equal((await r.json()).answer.length,600);assert.equal(db.amount()[0].micro,reservation());});
test('settlement failure is swallowed',async()=>{const db=new D1();const prepare=db.prepare.bind(db);db.prepare=(sql:string)=>{if(sql.startsWith('UPDATE'))throw Error();return prepare(sql);};const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>upstream());assert.equal((await r.json()).source,'ai');assert.equal(db.amount()[0].micro,reservation());});
test('default dependencies never fetch when unconfigured',async()=>assert.equal((await (await handleHelp(req(),{})).json()).reason,'unconfigured'));
test('default deps call global fetch unbound (workerd rejects method-style fetch calls)',async()=>{
 const saved=globalThis.fetch;let self:unknown='unset';
 globalThis.fetch=function(this:unknown){self=this;return Promise.resolve(upstream());} as typeof fetch;
 try{const response=await handleHelp(req(),{DEEPSEEK_API_KEY:'test-key',HELP_DB:new D1()});assert.equal((await response.json()).source,'ai');assert.equal(self,undefined);}
 finally{globalThis.fetch=saved;}
});

for(const content of [undefined,'',null])test('reasoning never becomes answer '+content,async()=>{
 const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1()},async()=>Response.json({choices:[{message:{content,reasoning_content:'private reasoning'}}]}));
 const text=await r.text();assert.equal(JSON.parse(text).reason,'upstream');assert.ok(!text.includes('private reasoning'));
});

test('answer truncates at 600 code points without lone surrogates',async()=>{
 const r=await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1()},async()=>Response.json({choices:[{message:{content:'😀'.repeat(601)}}]}));
 const {answer}=await r.json();assert.equal(Array.from(answer).length,600);assert.equal(answer,'😀'.repeat(600));assert.doesNotMatch(answer,/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u);
});

test('huge usage settles at daily cap',async()=>{
 const db=new D1();await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>Response.json({choices:[{message:{content:'好'}}],usage:{prompt_tokens:100,completion_tokens:1e6}}));
 assert.equal(db.amount()[0].micro,DAILY_CAP_MICRO);
});

for(const concurrent of [false,true])test('minute cap, cleanup and recovery '+concurrent,async()=>{
 const db=new D1();let calls=0;
 const invoke=(extra={})=>call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>{calls++;return upstream();},extra).then(r=>r.json());
 const bodies=concurrent?await Promise.all(Array.from({length:25},()=>invoke())):await (async()=>{const rows=[];for(let i=0;i<25;i++)rows.push(await invoke());return rows;})();
 assert.equal(calls,20);assert.equal(bodies.filter((b:any)=>b.reason==='busy').length,5);
 const spent=db.amount()[0].micro;assert.equal((await invoke()).reason,'busy');assert.equal(db.amount()[0].micro,spent);
 assert.deepEqual(db.sql.prepare('SELECT * FROM help_minute').all().map(r=>({...r})),[{minute:'2026-10-29T20:00',calls:20}]);
 assert.equal((await invoke({now:()=>now()+60000})).source,'ai');assert.equal(calls,21);
 assert.deepEqual(db.sql.prepare('SELECT * FROM help_minute').all().map(r=>({...r})),[{minute:'2026-10-29T20:01',calls:1}]);
});
test('daily refusal still consumes minute slot',async()=>{
 const db=new D1();await seed(db,DAILY_CAP_MICRO);
 assert.equal((await (await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db})).json()).reason,'cap');
 assert.equal(db.sql.prepare('SELECT calls FROM help_minute').get()?.calls,1);
});

test('预留额使用固定输入输出价格',async()=>{
 const db=new D1(), q='怎么开始练习？';let reserved:number|undefined;
 await call(req({v:1,q}),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async()=>{
  reserved=db.amount()[0].micro;
  throw Error('mock network failure');
 });
 assert.equal(reserved,(new TextEncoder().encode(SYSTEM_PROMPT+q).byteLength+64)*PRICE_MISS_MICRO+MAX_TOKENS*PRICE_OUT_MICRO);
});

const message=(role:string,content='好')=>({role,content});
const v2=(messages:any)=>({v:2,messages});
for(const messages of [null,{},[],[message('system')],[message('invalid')],[message('assistant')],[message('user'),message('assistant')],[message('user'),message('user'),message('user')],Array.from({length:13},(_,i)=>message(i%2?'assistant':'user')),[message('user',' ')],[message('user','😀'.repeat(301))],[message('user'),message('assistant','😀'.repeat(601)),message('user')],[message('user','a'.repeat(300)),message('assistant','b'.repeat(600)),message('user','c'.repeat(300)),message('assistant','d'.repeat(600)),message('user','e'.repeat(201))],[{...message('user'),extra:1}],[{role:'user'}]])test('v2 invalid '+JSON.stringify(messages).slice(0,100),()=>rejected(req(v2(messages)),400));
for(const body of [{v:2,messages:[message('user')],extra:1},{v:1,messages:[message('user')]},{v:2,q:'a',messages:[message('user')]}])test('v2 extra/wrong protocol '+JSON.stringify(body),()=>rejected(req(body),400));
test('v2 forwards all turns with PII redacted and reserves all messages',async()=>{
 const db=new D1();const messages=[message('user',' 邮箱abc@example.cn '),message('assistant','电话13812345678'),message('user','再联系def@example.cn')];
 const clean=[message('user','邮箱[邮箱]'),message('assistant','电话[电话]'),message('user','再联系[邮箱]')];
 const r=await call(req(v2(messages)),{DEEPSEEK_API_KEY:'fake',HELP_DB:db},async(_:any,init:RequestInit)=>{
  const body=JSON.parse(init.body as string);assert.deepEqual(body.messages,[{role:'system',content:SYSTEM_PROMPT},...clean]);assert.equal(body.max_tokens,MAX_TOKENS);
  assert.equal(db.amount()[0].micro,(new TextEncoder().encode(SYSTEM_PROMPT+clean.map(m=>m.content).join('')).byteLength+64*3)*PRICE_MISS_MICRO+MAX_TOKENS*PRICE_OUT_MICRO);
  return upstream();
 });assert.equal((await r.json()).source,'ai');
 assert.deepEqual(db.sql.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name),['help_minute','help_spend']);
});
test('v2 accepts exact content limits and 2000 code points',async()=>{
 const messages=[message('user','😀'.repeat(300)),message('assistant','答'.repeat(600)),message('user','问'.repeat(300)),message('assistant','答'.repeat(600)),message('user','问'.repeat(200))];
 assert.equal((await call(req(v2(messages)))).status,200);
});
test('model names follow current DeepSeek docs',async()=>{
 assert.equal(MODEL,'deepseek-flash');assert.equal(AI_MODEL,MODEL);
 // deepseek-chat/deepseek-reasoner 已停用：只允许出现在 AI 老师的旧配置迁移表里。
 const files:string[]=[];
 async function scan(dir:string){for(const f of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())await scan(p);else if(/\.(js|ts|tsx)$/.test(f.name)&&!/\.test\./.test(f.name))files.push(p);}}
 for(const dir of ['workers','src','site/functions'])await scan(dir);
 assert.ok(files.length>10);
 for(const file of files){const hits=(await readFile(file,'utf8')).match(/['"]deepseek-(chat|reasoner)['"]/g)??[];assert.equal(hits.length,file==='src/lib/lesson/ai.ts'?2:0,file);}
});
// 客服兜底原因写入匿名统计：每次兜底恰好一个数据点，只含原因与环境。
const metrics=()=>{const points:any[]=[];return {points,METRICS:{writeDataPoint(p:unknown){points.push(p);}}};};
const point=(reason:string,tag='prod')=>({indexes:['help_fallback_'+reason],blobs:['help_fallback_'+reason,'none',tag],doubles:[1]});
test('fallback reasons are counted without user content',async()=>{
 const q='邮箱abc@example.cn 我家住在幸福路8号';const headers={['CF-Connecting'+'-IP']:'fake-ip',['User'+'-Agent']:'fake-ua'};
 const db=new D1();await seed(db,DAILY_CAP_MICRO);
 const runs:[string,any,any][]=[
  ['unconfigured',{DEEPSEEK_API_KEY:'fake'},undefined],
  ['unconfigured',{DEEPSEEK_API_KEY:'fake',HELP_DB:{batch(){throw Error();},prepare(){return {bind(){return this;}};}}},undefined],
  ['cap',{DEEPSEEK_API_KEY:'fake',HELP_DB:db},undefined],
  ['upstream',{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1()},async()=>new Response('secret',{status:500})],
  ['upstream',{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1()},async()=>{throw Error('private upstream details');}],
  ['upstream',{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1()},async()=>Response.json({choices:[{message:{content:'',reasoning_content:'private reasoning'}}]})],
 ];
 for(const [reason,env,fetcher] of runs){const m=metrics();const r=await call(req({v:1,q},{headers}),{...env,METRICS:m.METRICS},fetcher);assert.equal((await r.json()).reason,reason);assert.deepEqual(m.points,[point(reason)]);
  const raw=JSON.stringify(m.points);for(const secret of ['abc@example.cn','幸福路','fake-ip','fake-ua','secret','private'])assert.ok(!raw.includes(secret),secret);}
});
test('busy fallback counted once per refused request',async()=>{
 const db=new D1();const m=metrics();
 for(let i=0;i<22;i++)await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:db,METRICS:m.METRICS},async()=>upstream());
 assert.deepEqual(m.points,[point('busy'),point('busy')]);
});
test('fallback metric env tag follows host; success and rejections write nothing',async()=>{
 for(const [host,tag] of [['yanghat-cn.pages.dev','preview'],['localhost','dev']]){const m=metrics();await call(req(undefined,{},`http://${host}/api/help`),{METRICS:m.METRICS});assert.deepEqual(m.points,[point('unconfigured',tag)]);}
 const m=metrics();
 assert.equal((await (await call(req(),{DEEPSEEK_API_KEY:'fake',HELP_DB:new D1(),METRICS:m.METRICS},async()=>upstream())).json()).source,'ai');
 for(const r of [req(null,{body:'{'}),req(undefined,{headers:{Origin:'https://evil.example'}}),req(undefined,{},'https://evil.example/api/help')])assert.ok((await handleHelp(r,{METRICS:m.METRICS},{fetch:async()=>assert.fail('no upstream'),now})).status>=400);
 assert.deepEqual(m.points,[]);
});
test('metrics binding failure never breaks fallback',async()=>{
 for(const METRICS of [{},{writeDataPoint(){throw Error('ae down');}},null]){const r=await call(req(),{METRICS});assert.equal(r.status,200);assert.equal((await r.json()).reason,'unconfigured');}
});
