(() => {
 'use strict';
 function lightColor(s){let r,g,b,a=1;if(s[0]==='#'){let h=s.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');if(h.length!==6&&h.length!==8)return s;r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);if(h.length===8)a=parseInt(h.slice(6,8),16)/255;}else{const v=s.match(/[\d.]+%?/g);if(!v||v.length<3)return s;[r,g,b]=v.slice(0,3).map(x=>x.includes('%')?parseFloat(x)*2.55:Number(x));if(v.length>3)a=v[3].includes('%')?parseFloat(v[3])/100:Number(v[3]);}if(a===0)return s;const lum=.2126*r+.7152*g+.0722*b;let o;if(Math.max(r,g,b)<105)o=[248,251,255];else if(g>r*1.14&&g>b*1.04)o=[30,111,167];else if(r>150&&g>90&&r>b*1.3&&g>b*1.1)o=[34,104,157];else if(lum>205)o=[23,53,76];else if(lum>130)o=[66,96,119];else if(lum<110)o=[231,241,250];else o=[81,123,154];return `rgba(${o.join(',')},${Math.round(a*1000)/1000})`;}
 const lightValues=s=>s.replace(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|rgba?\([^)]*\)/gi,lightColor);
 let activeObserver;
 const init=()=>{
  if(document.getElementById('edge-toolbar'))return;
  activeObserver?.disconnect();
  const root=document.getElementById('site-root')||document.querySelector('main');if(!root)return;
  const before=root.textContent;const seen=new WeakMap();const pending=new Set();let frame=0;
  const paint=el=>{if(!(el instanceof Element)||!el.style)return;let record=seen.get(el);if(!record){record={};seen.set(el,record);}
   for(const prop of ['color','background-color','background-image','border-color','outline-color','fill','stroke','text-shadow','box-shadow']){
    const current=el.style.getPropertyValue(prop);if(!current||record[prop]===current)continue;
    const next=prop==='text-shadow'?'none':prop==='box-shadow'?'0 7px 24px rgba(24,61,92,0.10)':lightValues(current);
    if(next!==current)el.style.setProperty(prop,next,'important');record[prop]=el.style.getPropertyValue(prop);
   }
   if(el instanceof SVGElement)for(const attr of ['fill','stroke','stop-color']){const c=el.getAttribute(attr);const k='attr-'+attr;if(!c||record[k]===c)continue;const n=lightValues(c);if(n!==c)el.setAttribute(attr,n);record[k]=el.getAttribute(attr);}
  };
  paint(root);root.querySelectorAll('*').forEach(paint);
  const altFor=src=>{if(/chapters\/01\/ch01-plate/.test(src))return 'Illustration of a Toyota Corolla with minor front-left collision damage on a Cincinnati street in daylight.';if(/chapters\/03\/ch03-plate/.test(src))return 'Illustrative stock photograph of a woman holding her neck in daylight.';if(/chapters\/06\/ch06-plate/.test(src))return 'Illustrative stock photographs of a clinical welcome, consultation, neck assessment and walking outdoors.';if(/chapters\/08\/ch08-plate/.test(src))return 'Illustrative stock photographs of a couple walking and a parent lifting a child outdoors.';if(/chapters\/09\/ch09-plate/.test(src))return 'Illustrative stock photographs of clinical documentation, examination and recovery activities.';if(/chapters\/10\/ch10-(?:architectural-bg|plate-m)/.test(src))return 'Illustrative stock photograph of a bright healthcare corridor.';if(/chapters\/11\/ch11-plate/.test(src))return 'Daytime photograph of Cincinnati and the Roebling Suspension Bridge.';if(/ch05-evidence-exam/.test(src))return 'Illustrative stock photograph of a clinician assessing neck movement.';return null;};
  const patchImage=img=>{if(!(img instanceof HTMLImageElement))return;const src=img.getAttribute('src')||'';const alt=altFor(src);if(alt&&img.getAttribute('alt'))img.alt=alt;if(/chapters\/01\/ch01-plate/.test(src)){img.dataset.edgePhoto='';img.setAttribute('fetchpriority','high');const section=img.closest('section');if(section)section.dataset.edgeFirst='';}};
  document.querySelectorAll('img').forEach(patchImage);
  activeObserver=new MutationObserver(records=>{for(const m of records){if(m.type==='attributes')pending.add(m.target);else for(const node of m.addedNodes)if(node instanceof Element){pending.add(node);node.querySelectorAll('*').forEach(n=>pending.add(n));}}if(!frame)frame=requestAnimationFrame(()=>{frame=0;const nodes=[...pending];pending.clear();for(const n of nodes){paint(n);patchImage(n);}});});
  activeObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['style','fill','stroke','stop-color']});
  document.documentElement.dataset.edgeVisual='clinic-daylight-v3';window.edgeVisualCheck={version:'clinic-daylight-v3',initialTextUnchanged:before===root.textContent};
  const bar=document.createElement('div');bar.id='edge-toolbar';bar.setAttribute('aria-label','Page tools');bar.setAttribute('role','region');
  const top=document.createElement('button');top.type='button';top.textContent='↑';top.setAttribute('aria-label','Back to top');top.onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  const lang=document.createElement('select');lang.setAttribute('aria-label','Language — automatic translation');
  for(const [code,label] of [['en','English'],['es','Español'],['fr','Français'],['ar','العربية'],['zh-CN','中文'],['pt','Português']]){const o=document.createElement('option');o.value=code;o.textContent=label;lang.append(o);}
  lang.onchange=()=>{if(lang.value==='en')return;const code=lang.value;lang.value='en';const modal=document.createElement('dialog');modal.id='edge-preview-note';const p=document.createElement('p');p.textContent='Automatic translation opens Google Translate. English is the original version. Do not enter personal or medical information on a translated copy.';const go=document.createElement('button');go.type='button';go.textContent='Continue';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';go.onclick=()=>{const u=new URL('https://translate.google.com/translate');u.searchParams.set('sl','en');u.searchParams.set('tl',code);u.searchParams.set('u',location.origin+location.pathname);location.assign(u.href);};cancel.onclick=()=>modal.close();modal.addEventListener('close',()=>modal.remove());modal.append(p,go,cancel);document.body.append(modal);modal.showModal();};
  bar.append(lang,top);document.body.append(bar);
  document.getElementById('edge-progress')?.remove();const progress=document.createElement('div');progress.id='edge-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);let queued=false;const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';queued=false;};addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();
  if(!window.edgeNavigationInstalled){window.edgeNavigationInstalled=true;document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank'||a.hasAttribute('download'))return;const u=new URL(a.href,location.href);if(u.origin===location.origin&&u.pathname!==location.pathname){event.preventDefault();event.stopPropagation();location.assign(u.href);}},true);}
 };
 const schedule=()=>setTimeout(init,700);
 if(document.readyState==='complete')schedule();else window.addEventListener('load',schedule,{once:true});
 let attempts=0;const recover=setInterval(()=>{if(document.readyState==='complete'&&!document.getElementById('edge-toolbar'))init();if(++attempts>=15)clearInterval(recover);},1500);
})();
