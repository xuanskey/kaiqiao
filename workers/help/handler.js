import {redactPII} from './pii.js';
import {SYSTEM_PROMPT} from './prompt.js';
export const MINUTE_CAP = 20;
export const DAILY_CAP_MICRO = 1_000_000;
// https://api-docs.deepseek.com/zh-cn/quick_start/pricing (微元/token，高峰价)
export const PRICE_MISS_MICRO = 2, PRICE_HIT_MICRO = 0.04, PRICE_OUT_MICRO = 8;
export const MAX_TOKENS = 300;
export const FALLBACK_TEXT = '小助手暂时休息啦。你可以回首页点「开始练习」，也可以发邮件到 hello@yanghat.cn 寻求帮助。';
const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply = (status, extra = {}) => new Response(null,{status,headers:{...headers,...extra}});
const json = (data) => new Response(JSON.stringify({v:1,...data}),{headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
const fallback = (reason) => json({source:'fallback',reason,answer:FALLBACK_TEXT});
/** @param {unknown} text */
function sanitize(text) {
  if(typeof text !== 'string') return '';
  const s = text.replace(/```[\s\S]*?```/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,'').replace(/\bhttps?:\/\/\S+/gi,'').replace(/[*#<>`]/g,'').replace(/\s+/g,' ').trim();
  return Array.from(s).slice(0,600).join('');
}
/** @param {Request} request @param {any} env @param {{fetch: typeof globalThis.fetch, now: () => number, timeoutMs?: number}} deps */
// workerd throws "Illegal invocation" if its fetch is called as a method of another object, so the default wraps it.
export async function handleHelp(request, env, deps = {fetch:(input,init)=>fetch(input,init),now:()=>Date.now()}) {
  if(request.method !== 'POST') return reply(405,{Allow:'POST'});
  const url = new URL(request.url);
  const host = url.hostname;
  const prod = host === 'www.yanghat.cn' || host === 'yanghat.cn';
  const preview = host === 'yanghat-cn.pages.dev' || host.endsWith('.yanghat-cn.pages.dev');
  const dev = host === 'localhost' || host === '127.0.0.1';
  // fetch() defaults to mode "cors". Current Fetch still sends the real Origin for that
  // mode, even with referrerPolicy "no-referrer" (this client, confirmed in Chromium).
  // The literal Origin value "null" applies to non-cors non-GET requests such as form posts.
  // Accept that opaque value only when Sec-Fetch-Site is same-origin.
  const origin = request.headers.get('Origin');
  const site = request.headers.get('Sec-Fetch-Site');
  const opaque = origin === null || origin === 'null';
  if ((site !== null && site !== 'same-origin') ||
      (opaque ? site !== 'same-origin' : origin !== url.origin) ||
      !(prod || preview || dev)) return reply(403);
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415);
  if(Number(request.headers.get('Content-Length')) > 8192) return reply(413);
  const chunks=[]; let size=0;
  const reader=request.body?.getReader();
  if(reader) {
    try { while(true) {
      const {done,value}=await reader.read(); if(done) break;
      size+=value.byteLength;
      if(size>8192) {void reader.cancel().catch(()=>{});return reply(413);}
      chunks.push(value);
    }} catch {return reply(400);} finally {reader.releaseLock();}
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let data;
  try {data=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400);}
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  if(!plain(data)) return reply(400);
  const keys=Object.keys(data).sort().join(',');
  let input;
  if(keys==='q,v' && data.v===1) input=[{role:'user',content:data.q}];
  else if(keys==='messages,v' && data.v===2) input=data.messages;
  else return reply(400);
  if(!Array.isArray(input) || input.length<1 || input.length>12 || input.length%2!==1) return reply(400);
  const messages=[];let total=0;
  for(let i=0;i<input.length;i++) {
    const item=input[i];
    if(!plain(item) || Object.keys(item).sort().join(',')!=='content,role' || item.role!==(i%2===0?'user':'assistant') || typeof item.content!=='string') return reply(400);
    const content=item.content.trim(), length=Array.from(content).length;
    if(length<1 || length>(item.role==='user'?300:600)) return reply(400);
    total+=length;if(total>2000) return reply(400);
    messages.push({role:item.role,content:redactPII(content)});
  }
  if(!env?.DEEPSEEK_API_KEY || !env?.HELP_DB) return fallback('unconfigured');
  const reserve=(new TextEncoder().encode(SYSTEM_PROMPT+messages.map(item=>item.content).join('')).byteLength+64*messages.length)*PRICE_MISS_MICRO+MAX_TOKENS*PRICE_OUT_MICRO;
  const beijing=new Date(deps.now()+8*3600000).toISOString();
  const day=beijing.slice(0,10), minute=beijing.slice(0,16);
  const db=env.HELP_DB;
  try {
    // 分钟名额在日额度拒绝时也被消耗，采用保守限流。
    const minutes=await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS help_minute (minute TEXT PRIMARY KEY, calls INTEGER NOT NULL)'),
      db.prepare('DELETE FROM help_minute WHERE minute < ?1').bind(minute),
      db.prepare('INSERT INTO help_minute(minute, calls) VALUES (?1, 1) ON CONFLICT(minute) DO UPDATE SET calls = calls + 1 WHERE calls + 1 <= ?2 RETURNING calls').bind(minute,MINUTE_CAP)
    ]);
    if(!minutes[2]?.results?.length) return fallback('busy');
    const results=await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS help_spend (day TEXT PRIMARY KEY, micro INTEGER NOT NULL)'),
      db.prepare('INSERT INTO help_spend(day, micro) SELECT ?1, ?2 WHERE ?2 <= ?3 ON CONFLICT(day) DO UPDATE SET micro = micro + ?2 WHERE micro + ?2 <= ?3 RETURNING micro').bind(day,reserve,DAILY_CAP_MICRO)
    ]);
    if(!results[1]?.results?.length) return fallback('cap');
  } catch {return fallback('unconfigured');}
  const settle=async(delta)=>{try{await db.prepare('UPDATE help_spend SET micro = MIN(?3, MAX(0, micro + ?2)) WHERE day = ?1').bind(day,delta,DAILY_CAP_MICRO).run();}catch{}};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),deps.timeoutMs ?? 15000);
  try {
    const response=await deps.fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.DEEPSEEK_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-flash',messages:[{role:'system',content:SYSTEM_PROMPT},...messages],thinking:{type:'disabled'},max_tokens:MAX_TOKENS,temperature:0.3,stream:false}),signal:controller.signal});
    if(!response.ok){await settle(-reserve);return fallback('upstream');}
    const result=await response.json();
    const u=result.usage;
    if(u && Number.isFinite(u.prompt_tokens) && Number.isFinite(u.completion_tokens) && u.prompt_tokens>=0 && u.completion_tokens>=0) {
      const cached=Number.isFinite(u.prompt_cache_hit_tokens)&&Number.isFinite(u.prompt_cache_miss_tokens)&&u.prompt_cache_hit_tokens>=0&&u.prompt_cache_miss_tokens>=0;
      const actual=Math.ceil(cached ? u.prompt_cache_miss_tokens*PRICE_MISS_MICRO+u.prompt_cache_hit_tokens*PRICE_HIT_MICRO+u.completion_tokens*PRICE_OUT_MICRO : u.prompt_tokens*PRICE_MISS_MICRO+u.completion_tokens*PRICE_OUT_MICRO);
      await settle(actual-reserve);
    }
    const answer=sanitize(result.choices?.[0]?.message?.content);
    return answer ? json({source:'ai',answer}) : fallback('upstream');
  }catch{return fallback('upstream');}finally{clearTimeout(timer);}
}
