import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {VERSION,lightCSS,readVisualAsset,loadVisualManifest} from './visual.mjs';

const SOURCE='https://genesis-alpha-ivory.vercel.app';
const LIVE='https://edge-physical-medicine-web-production.up.railway.app';
const ROOT=path.resolve('snapshot');
const sha=b=>createHash('sha256').update(b).digest('hex');
const key=u=>sha(u);
const HERO=/^\/edge\/chapters\/01\/ch01-plate(?:-m)?\.webp$/;
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#38;','&');
const textContent=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const injection=`<link rel="stylesheet" href="/_edge/theme.css?v=${VERSION}"><script defer src="/_edge/enhance.js?v=${VERSION}"></script>`;
function transform(s){return s.replace(/<\/head>/i,injection+'</head>');}
async function save(url,data,type){await mkdir(ROOT,{recursive:true});await writeFile(path.join(ROOT,key(url)),data);await writeFile(path.join(ROOT,key(url)+'.json'),JSON.stringify({type}));}
async function load(url){try{return {data:await readFile(path.join(ROOT,key(url))),...JSON.parse(await readFile(path.join(ROOT,key(url)+'.json'),'utf8'))};}catch{return null;}}
async function fetchSource(url,headers={}){
 const u=new URL(url,SOURCE);if(u.origin!==SOURCE)throw new Error('Unexpected source origin');
 const r=await fetch(u,{signal:AbortSignal.timeout(25000),redirect:'manual',headers:{'user-agent':'EdgeWebsiteVisualCopy/3.0',...headers}});
 if(r.status>=300&&r.status<400){const n=new URL(r.headers.get('location'),u);if(n.origin!==SOURCE)throw new Error('External redirect');return fetchSource(n,headers);}
 if(!r.ok)throw new Error(`Source HTTP ${r.status}: ${u.pathname}`);
 const data=Buffer.from(await r.arrayBuffer());if(data.length>24000000)throw new Error('Source asset exceeds limit');
 return {data,type:r.headers.get('content-type')||'application/octet-stream'};
}
function discover(s,base,type){
 const out=new Set();const add=v=>{try{if(v.startsWith('%23')||v.startsWith('#')||v.startsWith('data:'))return;const u=new URL(decode(v),base);if(u.origin===SOURCE&&!u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/_vercel/')){u.hash='';if(!u.searchParams.has('_rsc'))out.add(u.pathname+u.search);}}catch{}};
 if(type.includes('html')){for(const m of s.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/g))add(m[1]);for(const m of s.matchAll(/\bsrcset=["']([^"']+)["']/g))for(const p of m[1].split(','))add(p.trim().split(/\s+/)[0]);}
 if(type.includes('css'))for(const m of s.matchAll(/url\(["']?([^\s)"']+)["']?\)/g))add(m[1]);
 if(type.includes('javascript')||type.includes('html'))for(const m of s.matchAll(/["'](\/(?:edge|images|_next\/static)\/[^"'\s<>]+\.(?:webp|png|jpg|jpeg|svg|woff2|js|css))["']/g))add(m[1]);
 return [...out];
}
async function makeSnapshot(){
 await mkdir(ROOT,{recursive:true});
 let image;try{image=await readFile(path.join(ROOT,'corolla.webp'));}catch{}
 if(!image){const r=await fetch(LIVE+'/_edge/corolla.webp',{signal:AbortSignal.timeout(30000)});if(r.ok&&(r.headers.get('content-type')||'').startsWith('image/'))image=Buffer.from(await r.arrayBuffer());}
 if(!image||image.length<4000)throw new Error('Approved Corolla image could not be bundled');await writeFile(path.join(ROOT,'corolla.webp'),image);
 let todo=['/'],seen=new Set(),pages=[],failures=[],css=[],sections=[];
 while(todo.length){const batch=todo.splice(0,6).filter(u=>!seen.has(u));batch.forEach(u=>seen.add(u));if(seen.size>600)throw new Error('Unexpectedly large crawl');
  await Promise.all(batch.map(async u=>{if(HERO.test(new URL(u,SOURCE).pathname))return;try{const item=await fetchSource(u);await save(u,item.data,item.type);const s=item.data.toString('utf8');if(item.type.includes('html')){
    if(u==='/'&&!s.includes('The collision'))throw new Error('Original homepage did not contain expected content');
    const output=transform(s),before=sha(textContent(s)),after=sha(textContent(output));if(before!==after)throw new Error('Content preservation validation failed');pages.push({path:u,bytes:item.data.length,textSHA256:before,copyTextSHA256:after,contentPreserved:before===after});
    if(u==='/')sections=[...s.matchAll(/<(?:body|main|header|section|h1|h2|img|svg)\b[^>]*>/g)].map(m=>m[0]).slice(0,180);
   }if(item.type.includes('css'))css.push({path:u,bytes:item.data.length,variables:[...new Set(s.match(/--[\w-]+\s*:[^;}]+/g)||[])].slice(0,180),sample:s.slice(-10000)});
   for(const v of discover(s,new URL(u,SOURCE),item.type))if(!seen.has(v)&&!todo.includes(v))todo.push(v);
  }catch(e){failures.push({path:u,error:e.message});console.error(e.message);}}));}
 if(!pages.some(p=>p.path==='/'&&p.contentPreserved))throw new Error('Homepage not copied');
 const audit={source:SOURCE,createdAt:new Date().toISOString(),pages,assetCount:seen.size-pages.length,failures,image:{path:'/_edge/corolla.webp',bytes:image.length,sha256:sha(image)},textPreservation:pages.every(p=>p.contentPreserved)};
 await writeFile(path.join(ROOT,'audit.json'),JSON.stringify(audit,null,2));await writeFile(path.join(ROOT,'inspect.json'),JSON.stringify({sections,css},null,2));
 console.log('EDGE_SNAPSHOT',JSON.stringify({pages:pages.length,textPreservation:audit.textPreservation,failures}));
}
async function start(){
 const audit=JSON.parse(await readFile(path.join(ROOT,'audit.json'),'utf8'));
 const image=await readFile(path.join(ROOT,'corolla.webp'));const theme=await readFile('theme.css');const enhanced=await readFile('enhance.js');
 const manifest=await loadVisualManifest();const replacementPaths=new Set(manifest.assets.filter(a=>a.route).map(a=>a.route));const inFlight=new Map();const styleCache=new Map();
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');const name=url.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Edge-Visual-Version',VERSION);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Content-Type':'text/plain','Allow':'GET, HEAD'});res.end('This independent visual preview does not submit patient information.');return;}
  const send=(data,type,status=200)=>{const noCache=type.includes('html')||type.includes('css')||type.includes('javascript')||type.includes('json');res.writeHead(status,{'Content-Type':type,'Cache-Control':noCache?'no-store':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:data);};
  if(name==='/health'){send(JSON.stringify({status:'ok',version:VERSION,pages:audit.pages.length,contentPreserved:audit.textPreservation,newPhotographs:manifest.assets.filter(a=>a.id).length,replacedImageRoutes:replacementPaths.size}),'application/json');return;}
  if(name==='/_edge/theme.css'){send(theme,'text/css; charset=utf-8');return;}
  if(name==='/_edge/enhance.js'){send(enhanced,'application/javascript; charset=utf-8');return;}
  if(name==='/_edge/corolla.webp'||HERO.test(name)){send(image,'image/webp');return;}
  if(replacementPaths.has(name)){const b=await readVisualAsset(name);if(!b)throw new Error('Bundled visual missing');send(b,'image/webp');return;}
  if(['/health','/_edge/audit.json','/_edge/inspect.json','/_edge/browser-check.json','/_edge/visual-manifest.json'].includes(name)){const f=name.split('/').pop();const value=await readFile(path.join(ROOT,f),'utf8');send(f==='inspect.json'?value.replaceAll('<','[LT]').replaceAll('>','[GT]'):value,'application/json');return;}
  if(/^\/_edge\/preview-(desktop|mobile|chapter-\d\d|services)\.jpg$/.test(name)){send(await readFile(path.join(ROOT,name.split('/').pop())),'image/jpeg');return;}
  if(name.startsWith('/api/')||name.startsWith('/_vercel/')){send('Not available in the independent visual preview','text/plain',404);return;}
  if(name==='/_next/image'){const original=url.searchParams.get('url');if(original&&HERO.test(original)){send(image,'image/webp');return;}if(original&&replacementPaths.has(original)){send(await readVisualAsset(original),'image/webp');return;}}
  const route=name+url.search;
  let data=await load(route);if(!data&&url.search&&!url.searchParams.has('_rsc'))data=await load(name);
  if(!data){if(inFlight.size>40){send('Please retry','text/plain',503);return;}
   if(!inFlight.has(route))inFlight.set(route,(async()=>{const headers={};for(const h of ['rsc','next-router-state-tree','next-router-prefetch','next-url'])if(req.headers[h])headers[h]=req.headers[h];const x=await fetchSource(route,headers);if(!url.searchParams.has('_rsc'))await save(route,x.data,x.type);return x;})().finally(()=>inFlight.delete(route)));
   data=await inFlight.get(route);
  }
  if(data.type.includes('css')){if(!styleCache.has(route))styleCache.set(route,lightCSS(data.data.toString('utf8')));send(styleCache.get(route),data.type);return;}
  send(data.type.includes('html')?transform(data.data.toString('utf8')):data.data,data.type);
 }catch(e){console.error('REQUEST_FAILED',e.message);if(!res.headersSent)res.writeHead(502,{'Content-Type':'text/plain'});res.end('This resource is temporarily unavailable. Please return to the homepage.');}});
 server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('EDGE_READY',VERSION,audit.pages.length,'pages; original English text preserved;',replacementPaths.size,'new or restyled images'));
}
if(process.argv.includes('--snapshot'))await makeSnapshot();else await start();
