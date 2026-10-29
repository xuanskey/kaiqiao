// Local Pages semantics: explicit redirects, real files, then custom 404 (or SPA before 404 exists).
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
export async function homePreview(root = path.resolve('site/www.yanghat.cn')) {
 const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
 const redirects=(await readFile(path.join(root,'_redirects'),'utf8')).split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(l=>l.split(/\s+/));
 const headers=[];
 for(const line of (await readFile(path.join(root,'_headers'),'utf8')).split('\n')) {
  if(!line.trim()||line.trim().startsWith('#'))continue;
  if(!/^\s/.test(line))headers.push({pattern:line.trim(),values:[]});
  else {const at=line.indexOf(':');headers.at(-1).values.push([line.slice(0,at).trim(),line.slice(at+1).trim()]);}
 }
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
  const rule=redirects.find(r=>r[0]===pathname);
  if(rule){res.writeHead(Number(rule[2]),{Location:rule[1]+(url.search?'&'+url.search.slice(1):'')}).end();return;}
  const send=async(file,status=200)=>{
   const data=await readFile(file);res.statusCode=status;res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   for(const h of headers){if(h.pattern.startsWith('https:'))continue;const re=new RegExp('^'+h.pattern.split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');if(re.test(pathname))for(const [k,v]of h.values)res.setHeader(k,v);}
   res.end(data);
  };
  try {
   let file=path.resolve(root,'.'+pathname);const relative=path.relative(root,file);
   if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('path');
   if((await stat(file)).isDirectory()){
    if(!pathname.endsWith('/')){res.writeHead(301,{Location:encodeURI(pathname+'/')+url.search}).end();return;}
    file=path.join(file,'index.html');
   }
   await send(file);
  }catch{
   try{await send(path.join(root,'404.html'),404);}catch{try{await send(path.join(root,'index.html'));}catch{res.writeHead(404).end();}}
  }
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
