(() => {
 'use strict';
 const init=()=>{
  if(document.getElementById('edge-toolbar'))return;
  const patchImages=()=>{document.querySelectorAll('img').forEach(img=>{
   if(/\/edge\/chapters\/01\/ch01-plate(?:-m)?\.webp/.test((img.getAttribute('src')||'')+' '+(img.getAttribute('srcset')||''))){
    img.alt='Illustration of a Toyota Corolla with minor front-left collision damage on a Cincinnati street in daylight.';
    img.dataset.edgePhoto='';img.setAttribute('fetchpriority','high');
    const section=img.closest('section');if(section)section.dataset.edgeFirst='';
    if(img.classList.contains('stage-plate')&&!img.parentElement.querySelector(':scope > .edge-hero-wash')){const wash=document.createElement('div');wash.className='edge-hero-wash';wash.setAttribute('aria-hidden','true');img.after(wash);}
   }
  });};patchImages();new MutationObserver(patchImages).observe(document.body,{childList:true,subtree:true});
  const bar=document.createElement('div');bar.id='edge-toolbar';bar.setAttribute('aria-label','Page tools');bar.setAttribute('role','region');
  const top=document.createElement('button');top.type='button';top.textContent='↑';top.setAttribute('aria-label','Back to top');top.onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  const lang=document.createElement('select');lang.setAttribute('aria-label','Language — automatic translation');
  for(const [code,label] of [['en','English'],['es','Español'],['fr','Français'],['ar','العربية'],['zh-CN','中文'],['pt','Português']]){const o=document.createElement('option');o.value=code;o.textContent=label;lang.append(o);}
  lang.onchange=()=>{if(lang.value==='en')return;const code=lang.value;lang.value='en';const modal=document.createElement('dialog');modal.id='edge-preview-note';const p=document.createElement('p');p.textContent='Automatic translation opens Google Translate. English is the original version. Do not enter personal or medical information on a translated copy.';const go=document.createElement('button');go.type='button';go.textContent='Continue';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';go.onclick=()=>{const u=new URL('https://translate.google.com/translate');u.searchParams.set('sl','en');u.searchParams.set('tl',code);u.searchParams.set('u',location.origin+location.pathname);location.assign(u.href);};cancel.onclick=()=>modal.close();modal.addEventListener('close',()=>modal.remove());modal.append(p,go,cancel);document.body.append(modal);modal.showModal();};
  bar.append(lang,top);document.body.append(bar);
  const progress=document.createElement('div');progress.id='edge-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);let queued=false;const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';queued=false;};addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();
  document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank'||a.hasAttribute('download'))return;const u=new URL(a.href,location.href);if(u.origin===location.origin&&u.pathname!==location.pathname){event.preventDefault();event.stopPropagation();location.assign(u.href);}},true);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
