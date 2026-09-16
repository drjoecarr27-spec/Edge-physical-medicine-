import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const VERSION='clinic-daylight-v3';
const ROOT='snapshot';
const hash=s=>createHash('sha256').update(s).digest('hex');
const ORIGIN='https://genesis-alpha-ivory.vercel.app';
export function lightColor(s){
 let r,g,b,a=1;
 if(s[0]==='#'){
  let h=s.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');
  if(h.length!==6&&h.length!==8)return s;
  r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);if(h.length===8)a=parseInt(h.slice(6,8),16)/255;
 }else{const v=s.match(/[\d.]+%?/g);if(!v||v.length<3)return s;[r,g,b]=v.slice(0,3).map(x=>x.includes('%')?parseFloat(x)*2.55:Number(x));if(v.length>3)a=v[3].includes('%')?parseFloat(v[3])/100:Number(v[3]);}
 if(a===0)return s;
 const lum=.2126*r+.7152*g+.0722*b;let out;
 if(Math.max(r,g,b)<105)out=[248,251,255];
 else if(g>r*1.14&&g>b*1.04)out=[30,111,167];
 else if(r>150&&g>90&&r>b*1.3&&g>b*1.1)out=[34,104,157];
 else if(lum>205)out=[23,53,76];
 else if(lum>130)out=[66,96,119];
 else if(lum<110)out=[231,241,250];
 else out=[81,123,154];
 return `rgba(${out.join(',')},${Math.round(a*1000)/1000})`;
}
export function lightValues(s){return s.replace(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|rgba?\([^)]*\)/gi,lightColor);}
export function lightCSS(css){return css.replace(/((?:^|[;{])\s*(?:--edge-[\w-]+|color|background(?:-[\w-]+)?|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|fill|stroke|box-shadow|text-shadow)\s*:)([^;{}]+)/g,(m,p,v)=>p+(p.includes('text-shadow:')?'none':lightValues(v)));}
const PHOTO_IDS={consult:7579831,exam:20860589,walking:8972498,notes:6129043,corridor:37036967,symptoms:7298634,welcome:8313224,family:6849404,city:29201416};
const PHOTO_ALT={consult:'Illustrative stock photograph of a clinician consulting with a patient in a bright room.',exam:'Illustrative stock photograph of a clinician assessing neck movement.',walking:'Illustrative stock photograph of a couple walking outdoors.',notes:'Illustrative stock photograph of clinical documentation on a clipboard.',corridor:'Illustrative stock photograph of a bright healthcare corridor.',symptoms:'Illustrative stock photograph of a woman holding her neck outdoors.',welcome:'Illustrative stock photograph of a patient and clinician greeting each other.',family:'Illustrative stock photograph of a parent lifting a child outdoors.',city:'Daytime photograph of Cincinnati and the Roebling Suspension Bridge.'};
const manifest={version:VERSION,license:'https://www.pexels.com/license/',note:'Stock photographs are illustrative, not identified as EDGE staff or patients. Original anatomical illustrations are retained with a high-key color treatment.',assets:[]};
async function download(url){const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'EdgeClinicalVisualPreview/3.0'}});if(!r.ok)throw new Error(`Image fetch ${r.status}: ${url}`);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<2000||bytes.length>20000000)throw new Error('Invalid image size: '+url);return bytes;}
async function original(route){try{return await readFile(`${ROOT}/${hash(route)}`);}catch{return download(ORIGIN+route);}}
export async function buildVisualAssets(){
 const sharp=(await import('sharp')).default;await mkdir(`${ROOT}/visual`,{recursive:true});const photos={};
 await Promise.all(Object.entries(PHOTO_IDS).map(async([key,id])=>{const url=`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1800`;photos[key]=await download(url);await sharp(photos[key]).metadata();manifest.assets.push({key,kind:'new-stock-photograph',id,source:url,alt:PHOTO_ALT[key]});}));
 const write=async(route,bytes,kind,alt)=>{await writeFile(`${ROOT}/visual/${hash(route)}.webp`,bytes);manifest.assets.push({route,kind,alt,bytes:bytes.length,sha256:hash(bytes)});};
 const size=async(route)=>{const m=await sharp(await original(route)).metadata();return {w:Math.min(m.width||1586,2000),h:Math.round((Math.min(m.width||1586,2000)/(m.width||1586))*(m.height||992))};};
 async function photoPlate(route,key){const {w,h}=await size(route);const out=await sharp(photos[key]).rotate().resize(w,h,{fit:'cover',position:'attention'}).modulate({brightness:1.06,saturation:.82}).webp({quality:84}).toBuffer();await write(route,out,'new-stock-photograph',PHOTO_ALT[key]);}
 async function collage(route,keys){const {w,h}=await size(route);const gap=Math.max(8,Math.round(w*.009));const n=keys.length;const width=Math.floor((w-gap*(n-1))/n);const layers=[];for(let i=0;i<n;i++){layers.push({input:await sharp(photos[keys[i]]).rotate().resize(width,h,{fit:'cover',position:'attention'}).modulate({brightness:1.08,saturation:.8}).toBuffer(),left:i*(width+gap),top:0});}const out=await sharp({create:{width:w,height:h,channels:3,background:'#f5f9fd'}}).composite(layers).webp({quality:84}).toBuffer();await write(route,out,'new-contextual-photo-collage','Illustrative stock collage: '+keys.map(k=>PHOTO_ALT[k]).join(' '));}
 const jobs=[];
 for(const mobile of ['', '-m']){
  jobs.push(photoPlate(`/edge/chapters/03/ch03-plate${mobile}.webp`,'symptoms'));
  jobs.push(collage(`/edge/chapters/06/ch06-plate${mobile}.webp`,['welcome','consult','exam','walking']));
  jobs.push(collage(`/edge/chapters/08/ch08-plate${mobile}.webp`,['walking','family']));
  jobs.push(collage(`/edge/chapters/09/ch09-plate${mobile}.webp`,['notes','exam','walking']));
  jobs.push(photoPlate(`/edge/chapters/11/ch11-plate${mobile}.webp`,'city'));
 }
 jobs.push(photoPlate('/edge/chapters/10/ch10-architectural-bg.webp','corridor'));
 jobs.push(photoPlate('/edge/chapters/10/ch10-plate-m.webp','corridor'));
 jobs.push(photoPlate('/edge/chapters/05/ch05-evidence-exam.webp','exam'));
 for(let i=0;i<jobs.length;i+=4)await Promise.all(jobs.slice(i,i+4));
 const diagrams=['/edge/chapters/02/ch02-plate.webp','/edge/chapters/02/ch02-plate-m.webp','/edge/chapters/04/ch04-plate.webp','/edge/chapters/04/ch04-plate-m.webp','/edge/chapters/04/ch04-mini-scan.png','/edge/chapters/05/ch05-plate.webp','/edge/chapters/05/ch05-plate-diagnostic.webp','/edge/chapters/05/ch05-evidence-symptoms.webp','/edge/chapters/05/ch05-evidence-imaging.webp','/edge/chapters/07/ch07-plate.webp','/edge/chapters/07/ch07-plate-m.webp','/edge/chapters/10/ch10-glass-gate.png','/edge/chapters/10/ch10-privacy-seal-base.png'];
 for(const route of diagrams){const input=await original(route);const out=await sharp(input).negate({alpha:false}).grayscale().linear(.82,40).webp({quality:90}).toBuffer();await write(route,out,'original-diagram-high-key-treatment',null);}
 const external='/edge/chapters/05/ch05-plate-external.webp';await write(external,await sharp(await original(external)).modulate({brightness:1.28,saturation:.55}).linear(.8,35).webp({quality:87}).toBuffer(),'original-context-light-treatment',null);
 await writeFile(`${ROOT}/visual-manifest.json`,JSON.stringify(manifest,null,2));console.log('EDGE_DAYLIGHT_ASSETS',JSON.stringify({version:VERSION,newPhotos:Object.keys(photos).length,replacedRoutes:manifest.assets.filter(a=>a.route).length}));
}
export async function loadVisualManifest(){return JSON.parse(await readFile(`${ROOT}/visual-manifest.json`,'utf8'));}
export async function readVisualAsset(route){try{return await readFile(`${ROOT}/visual/${hash(route)}.webp`);}catch{return null;}}
if(process.argv.includes('--build-visuals'))await buildVisualAssets();
