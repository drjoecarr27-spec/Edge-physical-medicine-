import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'8080'},stdio:'inherit'});
let browser;
async function openPage(page,pathname){
 const response=await page.goto('http://127.0.0.1:8080'+pathname,{waitUntil:'domcontentloaded',timeout:60000});
 if(!response?.ok())throw new Error('Page HTTP check failed: '+pathname);
 await page.waitForFunction(()=>document.documentElement.dataset.edgeVisual==='clinic-daylight-v3'&&!!document.getElementById('edge-toolbar'),{},{timeout:30000});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0),{},{timeout:30000});
 await sleep(600);
}
try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:8080/health');if(r.ok){ready=true;break;}}catch{}await sleep(250);}if(!ready)throw new Error('Preview server did not start');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const audit=JSON.parse(await readFile('snapshot/audit.json','utf8'));const visuals=JSON.parse(await readFile('snapshot/visual-manifest.json','utf8'));
 const results={version:'clinic-daylight-v3',checkedAt:new Date().toISOString(),viewports:[],chapters:[],imageResponses:[],contentPreservation:audit.textPreservation,pagesVerified:audit.pages.length,newPhotographs:visuals.assets.filter(a=>a.id).length};
 if(!audit.textPreservation||audit.failures.some(f=>!f.path.startsWith('/_next/')))throw new Error('Original content audit failed');
 for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openPage(page,'/');
  const screenshot=`snapshot/preview-${label}.jpg`;await page.screenshot({path:screenshot,type:'jpeg',quality:82});const imageStats=await sharp(screenshot).stats();
  const item=await page.evaluate(()=>{const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none';};return {title:document.title,visualVersion:document.documentElement.dataset.edgeVisual,initialTextUnchanged:window.edgeVisualCheck?.initialTextUnchanged,toolbar:!!document.getElementById('edge-toolbar'),languages:[...document.querySelectorAll('#edge-toolbar option')].map(o=>o.textContent),headerBackground:getComputedStyle(document.querySelector('header')).backgroundColor,bodyBackground:getComputedStyle(document.body).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+2,headings:[...document.querySelectorAll('#chapter-01 h1,#chapter-01 h2')].filter(visible).map(e=>({text:e.textContent,color:getComputedStyle(e).color})),corolla:[...document.images].filter(i=>/ch01-plate/.test(i.src)).map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight,alt:i.alt,visible:visible(i)})),brokenVisibleImages:[...document.images].filter(i=>visible(i)&&i.complete&&i.naturalWidth===0).map(i=>i.src),chapterCount:document.querySelectorAll('section.chapter[id]').length};});
  item.name=label;item.errors=errors;item.meanRGB=imageStats.channels.slice(0,3).map(c=>Math.round(c.mean));results.viewports.push(item);
  if(!item.toolbar||item.overflow||item.brokenVisibleImages.length||item.visualVersion!=='clinic-daylight-v3'||!item.initialTextUnchanged)throw new Error('Browser smoke check failed: '+JSON.stringify(item));
  if(!item.corolla.some(i=>i.visible&&i.width>0))throw new Error('Corolla not visible in '+label);
  if(item.meanRGB.reduce((a,b)=>a+b,0)/3<120)throw new Error('Visual preview is still too dark: '+label);
  if(item.chapterCount!==11)throw new Error('Original chapters missing');
  console.log('EDGE_VIEWPORT_OK',label,JSON.stringify({background:item.bodyBackground,meanRGB:item.meanRGB,toolbar:item.toolbar,originalTextUnchanged:item.initialTextUnchanged}));
  if(label==='desktop'){
   for(const number of ['02','03','04','05','06','07','08','09','10','11']){const sel='#chapter-'+number;await page.locator(sel).scrollIntoViewIfNeeded();await sleep(280);const entry=await page.locator(sel).evaluate(el=>({id:el.id,textLength:el.textContent.length,background:getComputedStyle(el).backgroundColor,images:[...el.querySelectorAll('img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt})).filter(i=>i.alt)}));const file=`snapshot/preview-chapter-${number}.jpg`;await page.screenshot({path:file,type:'jpeg',quality:78});entry.meanRGB=(await sharp(file).stats()).channels.slice(0,3).map(c=>Math.round(c.mean));results.chapters.push(entry);}
   await openPage(page,'/faqs');const details=page.locator('details');results.faqDetails=await details.count();if(results.faqDetails){await details.first().locator('summary').click();results.faqExpands=await details.first().getAttribute('open')!==null;}
   await openPage(page,'/services');results.servicesPage=await page.title();await page.screenshot({path:'snapshot/preview-services.jpg',type:'jpeg',quality:82});
  }else{
   const menu=page.locator('header button[aria-haspopup="dialog"]');if(await menu.count()){await menu.first().click();await sleep(150);results.mobileMenuOpens=(await page.locator('[role="dialog"]').count())>0||await menu.first().getAttribute('aria-expanded')==='true';await page.keyboard.press('Escape');}
  }
  await context.close();
 }
 for(const a of visuals.assets.filter(a=>a.route)){const r=await fetch('http://127.0.0.1:8080'+a.route);const b=await r.arrayBuffer();results.imageResponses.push({path:a.route,status:r.status,kind:a.kind,bytes:b.byteLength});if(!r.ok||b.byteLength<1000)throw new Error('Image response failed: '+a.route);}
 await writeFile('snapshot/browser-check.json',JSON.stringify(results,null,2));console.log('EDGE_BROWSER_CHECK',JSON.stringify({version:results.version,pages:results.pagesVerified,textPreserved:results.contentPreservation,newPhotographs:results.newPhotographs,viewports:results.viewports,chapters:results.chapters.map(c=>({id:c.id,meanRGB:c.meanRGB})),mobileMenuOpens:results.mobileMenuOpens,imageResponses:results.imageResponses.length}));
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
