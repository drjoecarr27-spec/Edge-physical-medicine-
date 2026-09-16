import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'8080'},stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:8080/health');if(r.ok){ready=true;break;}}catch{}await sleep(250);}if(!ready)throw new Error('Preview server did not start');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results={checkedAt:new Date().toISOString(),viewports:[],imageResponses:[],contentPreservation:JSON.parse(await readFile('snapshot/audit.json','utf8')).textPreservation};
 for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/',{waitUntil:'networkidle',timeout:60000});
  await page.waitForSelector('#edge-toolbar');await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`snapshot/preview-${label}.jpg`,type:'jpeg',quality:78});
  const item=await page.evaluate(()=>({title:document.title,toolbar:!!document.getElementById('edge-toolbar'),languages:[...document.querySelectorAll('#edge-toolbar option')].map(o=>o.textContent),h1:[...document.querySelectorAll('h1')].slice(0,3).map(e=>({text:e.textContent,color:getComputedStyle(e).color,rect:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}})),headerBackground:getComputedStyle(document.querySelector('header')).backgroundColor,bodyBackground:getComputedStyle(document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+2,corolla:[...document.images].filter(i=>/ch01-plate/.test(i.src)).map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight,alt:i.alt,visible:i.getClientRects().length>0})),brokenVisibleImages:[...document.images].filter(i=>i.getClientRects().length&&i.complete&&i.naturalWidth===0).map(i=>i.src),sectionClasses:[...document.querySelectorAll('section')].slice(0,4).map(s=>({id:s.id,class:s.className})),heroWash:document.querySelectorAll('.edge-hero-wash').length}));
  item.name=label;item.errors=errors;results.viewports.push(item);
  if(!item.toolbar||item.overflow||item.brokenVisibleImages.length)throw new Error('Browser smoke check failed: '+JSON.stringify(item));
  if(!item.corolla.some(i=>i.visible&&i.width>0))throw new Error('Corolla not visible in '+label);
  if(label==='desktop'){
   await page.goto('http://127.0.0.1:8080/faqs',{waitUntil:'networkidle'});
   const details=page.locator('details');results.faqDetails=await details.count();
   if(results.faqDetails){await details.first().locator('summary').click();results.faqExpands=await details.first().getAttribute('open')!==null;}
   await page.goto('http://127.0.0.1:8080/services',{waitUntil:'networkidle'});results.servicesPage=await page.title();
  }
  await context.close();
 }
 for(const p of ['/edge/chapters/01/ch01-plate.webp','/edge/chapters/01/ch01-plate-m.webp','/_edge/corolla.webp']){const r=await fetch('http://127.0.0.1:8080'+p);const b=await r.arrayBuffer();results.imageResponses.push({path:p,status:r.status,type:r.headers.get('content-type'),bytes:b.byteLength});if(!r.ok||b.byteLength<4000)throw new Error('Image response failed');}
 await writeFile('snapshot/browser-check.json',JSON.stringify(results,null,2));console.log('EDGE_BROWSER_CHECK',JSON.stringify(results));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
