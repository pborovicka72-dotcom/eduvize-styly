/* Link schema is independent of application releases and cache-busting v. */
(function(root){
 'use strict';
 const version=1;
 const apps={weather:'pocasi',transport:'jizdni-rady',news:'aktuality',menu:'jidelnicek',documents:'dokumenty',kiosk:'kiosek',wisdom:'moudrost-dne',holidays:'svatky','school-systems':'skolni-systemy','day-progress':'prubeh-dne'};
 function identify(u){
  if(u.protocol!=='https:'&&u.protocol!=='http:')return null;
  if(u.username||u.password)return null;
  for(const [app,slug] of Object.entries(apps)){
   const hosts=['eduvize-'+slug+'.onrender.com'];if(app==='weather')hosts.push('eduvize-weather.onrender.com');if(app==='documents')hosts.push('eduvize-dokumenty-api.onrender.com');
   if(hosts.includes(u.hostname))return app;
   if(u.hostname==='pborovicka72-dotcom.github.io'&&u.pathname.startsWith('/eduvize-'+slug+'/'))return app;
  }
  return null;
 }
 function inspect(value,{layouts}={}){
  let u;try{u=new URL(value);}catch{return {status:'unknown',app:null,issues:['Neplatná úplná adresa.']};}
  const app=identify(u),issues=[];if(!app)return {status:'unknown',app:null,issues:['Adresa nepatří mezi podporované adresy aplikací Eduvize.']};
  if(!/\/(?:index\.html|signage\.html|display)?$/.test(u.pathname))return {status:'unknown',app,issues:['Tato cesta není evidována jako výstup aplikace.']};
  const p=u.searchParams,raw=p.get('edu-link'),legacy=raw===null;
  if(!legacy&&(!/^\d+$/.test(raw)||Number(raw)!==version))issues.push('Formát odkazu tato verze kontroly nezná. Odkaz neměňte automaticky; ověřte jej v aktuální administraci.');
  for(const key of ['edu-link','viewMode','output','layout','segment_orientation','segment_style','segment_block','orientation','style','block','interaction','kiosk_layout'])if(p.getAll(key).length>1)issues.push('Parametr '+key+' je uveden vícekrát.');
  const selected=p.get('viewMode'),output=p.get('output'),layout=p.get('layout');
  if(selected&&!['web','web-all','web-pages','nsp','kiosk'].includes(selected))issues.push('Neznámý režim viewMode.');
  if(output&&!['web','nsp','kiosk'].includes(output))issues.push('Neznámý režim output.');
  if(selected&&output&&((selected.startsWith('web')?'web':selected)!==output))issues.push('Parametry režimu si odporují.');
  for(const [key,allowed] of [['interaction',['interactive','display']],['kiosk_layout',['menu','tiles']]])if(p.has(key)&&!allowed.includes(p.get(key)))issues.push('Neznámá volba '+key+'.');
  const o=p.get('segment_orientation')||p.get('orientation')||'landscape',s=p.get('segment_style')||p.get('style')||(/^\d+$/.test(layout||'')?layout:'1'),b=p.get('segment_block')||p.get('block')||'1';
  const hasSegment=['segment_orientation','segment_style','segment_block','orientation','style','block'].some(k=>p.has(k))||/^\d+$/.test(layout||'');
  if(hasSegment){
   if(!['landscape','portrait'].includes(o)||!/^\d+$/.test(s)||!/^\d+$/.test(b)||Number(s)<1||Number(b)<1)issues.push('Neplatné nastavení segmentu.');
   else if(layouts&&!layouts[o]?.[Number(s)]?.[Number(b)-1])issues.push('Segment neexistuje v evidované geometrii Newline.');
   else if(!layouts)issues.push('Geometrie segmentu není dostupná pro kontrolu.');
  }
  return {app,status:issues.length?'review':legacy?'legacy':'current',schema:legacy?0:Number(raw),issues};
 }
 function stamp(value){const u=new URL(value,root.location?.href);if(identify(u)&&!u.searchParams.has('edu-link'))u.searchParams.set('edu-link',String(version));return u;}
 root.EduvizeLinkContract=Object.freeze({version,identify,inspect,stamp});
})(typeof window==='undefined'?globalThis:window);

/* One contract for application output links. Kiosk uses the actual iframe viewport. */
(function(root){
 'use strict';
 const modes=Object.freeze([{id:'web',label:'Běžná stránka'},{id:'nsp',label:'Newline Signage Pro'},{id:'kiosk',label:'Kiosek'}]);
 const defaultMode='nsp';
 let interactionPicker=null,outputSelect=null,chosen=null,layoutPicker=null,layoutField=null,layoutChosen=null;
 const layoutPreferenceKey='eduvize-output-kiosk-layout:'+root.location.pathname;
 const preferenceKey='eduvize-output-interaction:'+root.location.pathname;
 function kioskApp(){return document.documentElement.dataset?.kioskApp==='kiosk'||!!document.getElementById?.('kiosk-output-type');}
 function interaction(value=root.location.href){const u=value instanceof URL?value:new URL(value,root.location.href);if(mode(u)==='kiosk'||kioskApp())return 'interactive';const v=u.searchParams.get('interaction');return ['interactive','display'].includes(v)?v:mode(u)==='web'?'interactive':'display';}
 function isInteractive(value=root.location.href){return interaction(value)==='interactive';}
 function selection(){if(kioskApp()||outputSelect?.value==='kiosk')return 'interactive';return interactionPicker?.value||chosen||interaction();}
 function setInteraction(value,{notify=true}={}){if(!['interactive','display'].includes(value))return;chosen=value;try{localStorage.setItem(preferenceKey,value);}catch{}syncInteraction();if(notify&&outputSelect)outputSelect.dispatchEvent(new Event('change',{bubbles:true}));}
 function kioskLayout(value=root.location.href){const u=value instanceof URL?value:new URL(value,root.location.href),layout=u.searchParams.get('kiosk_layout');return ['menu','tiles'].includes(layout)?layout:u.searchParams.get('kiosk_header')==='light'?'menu':'tiles';}
 function layoutSelection(){const native=kioskApp()&&document.getElementById('menuLayout');return native?(native.value==='tiles'?'tiles':'menu'):layoutPicker?.value||layoutChosen||kioskLayout();}
 function setKioskLayout(value,{notify=true}={}){if(!['menu','tiles'].includes(value))return;layoutChosen=value;try{localStorage.setItem(layoutPreferenceKey,value);}catch{}if(layoutPicker)layoutPicker.value=value;if(notify&&outputSelect)outputSelect.dispatchEvent(new Event('change',{bubbles:true}));}
 function syncInteraction(){if(!interactionPicker)return;const locked=kioskApp()||outputSelect.value==='kiosk';const policy=locked?'interactive':chosen||(['web','off','normal'].includes(outputSelect.value)?'interactive':'display');interactionPicker.value=policy;interactionPicker.checked=policy==='interactive';interactionPicker.disabled=locked;for(const id of ['seconds','pageSeconds','setting-page-seconds']){const control=document.getElementById(id);if(control)control.closest('label').hidden=interactionPicker.checked;}const oldPaging=document.getElementById('paging');if(oldPaging)oldPaging.closest('label').hidden=true;document.getElementById('edu-output-interaction-hint').textContent=locked?'V kiosku je ovládání vždy zapnuté.':interactionPicker.checked?'Zapnuto: návštěvník může stránku ovládat.':'Vypnuto: obsah se pouze zobrazuje a automaticky střídá.';if(layoutField)layoutField.hidden=outputSelect.value!=='kiosk';}
 function installInteraction(select){
  if(outputSelect)return;outputSelect=select;
  const spacing=document.createElement('style');spacing.textContent='.edu-output-section .edu-output-interaction.edu-admin__field,.edu-output-section .edu-output-kiosk-layout.edu-admin__field{display:grid;gap:12px;margin-block:20px;min-width:0}.edu-output-interaction>small{margin:0}.edu-output-interaction .edu-switch{margin:0}';document.head.append(spacing);
  const params=new URL(root.location.href).searchParams;const fromUrl=params.get('interaction');let saved;try{saved=localStorage.getItem(preferenceKey);}catch{}chosen=['interactive','display'].includes(fromUrl)?fromUrl:['interactive','display'].includes(saved)?saved:null;
  const label=document.createElement('label');label.className='edu-output-interaction edu-admin__field';label.append(document.createTextNode('Ovládání obrazovky'));
  const toggle=document.createElement('span');toggle.className='edu-switch';interactionPicker=document.createElement('input');interactionPicker.type='checkbox';interactionPicker.id='edu-output-interaction';interactionPicker.setAttribute('role','switch');interactionPicker.setAttribute('aria-label','Interaktivní ovládání obrazovky');interactionPicker.setAttribute('aria-describedby','edu-output-interaction-hint');
  const track=document.createElement('span');track.className='edu-switch__track';track.setAttribute('aria-hidden','true');const caption=document.createElement('span');caption.className='edu-switch__label';caption.textContent='Interaktivní ovládání';toggle.append(interactionPicker,track,caption);
  const hint=document.createElement('small');hint.id='edu-output-interaction-hint';label.append(toggle,hint);const anchor=select.closest('label')||select;anchor.after(label);
  interactionPicker.addEventListener('change',()=>setInteraction(interactionPicker.checked?'interactive':'display'));
  if(!kioskApp()){
   let stored;try{stored=localStorage.getItem(layoutPreferenceKey);}catch{}layoutChosen=params.has('kiosk_layout')||params.has('kiosk_header')?kioskLayout():['menu','tiles'].includes(stored)?stored:'menu';
   layoutField=document.createElement('label');layoutField.className='edu-output-kiosk-layout edu-admin__field';layoutField.append(document.createTextNode('Rozložení kiosku'));
   layoutPicker=document.createElement('select');layoutPicker.id='edu-output-kiosk-layout';for(const [value,text] of [['menu','Menu + obsahová plocha · světlá hlavička'],['tiles','Dlaždice po celé ploše · tmavá hlavička']])layoutPicker.add(new Option(text,value));layoutPicker.value=layoutChosen;layoutField.append(layoutPicker);label.after(layoutField);
   layoutPicker.addEventListener('change',()=>setKioskLayout(layoutPicker.value));
  }
  select.addEventListener('change',syncInteraction);syncInteraction();
 }
 const playbacks=new WeakMap();
 function autoplay(host,advance,seconds=12){playbacks.get(host)?.();if(!host||isInteractive())return()=>{};const interval=setInterval(()=>{if(!host.isConnected){stop();return;}if(!document.hidden)advance();},Math.max(3,Math.min(120,Number(seconds)||12))*1000);function stop(){clearInterval(interval);if(playbacks.get(host)===stop)playbacks.delete(host);}playbacks.set(host,stop);return stop;}
 function pager(nav,seconds=12){if(mode()==='web'||!nav)return()=>{};return autoplay(nav,()=>{const b=nav.querySelectorAll('button');if(b.length<2||nav.hidden)return;if(!b[b.length-1].disabled)b[b.length-1].click();else{let limit=500;while(!b[0].disabled&&limit--)b[0].click();}},seconds);}
 function initialMode(value=root.location.href){const u=value instanceof URL?value:new URL(value,root.location.href);return ['viewMode','output','layout','segment_style','segment_block'].some(key=>u.searchParams.has(key))?mode(u):defaultMode;}
 const segmentKeys=['segment_orientation','segment_style','segment_block','orientation','style','block','ev_inner'];
 function isKiosk(value=root.location.search){const p=value instanceof URL?value.searchParams:new URLSearchParams(value);return p.get('viewMode')==='kiosk'||p.get('output')==='kiosk';}
 function mode(value=root.location.href){
  const u=value instanceof URL?value:new URL(value,root.location.href),p=u.searchParams;
  if(isKiosk(u))return 'kiosk';
  if(['web','web-all','web-pages'].includes(p.get('viewMode')))return 'web';
  if(p.get('viewMode')==='nsp'||p.get('layout')==='signage'||/\/signage\.html$/.test(u.pathname))return 'nsp';
  if(p.has('segment_style')||p.has('segment_block')||(p.has('orientation')&&p.has('style')))return 'nsp';
  if(document.documentElement.dataset?.kioskApp==='kiosk')return 'kiosk';
  return 'web';
 }
 function url(value,mode){const u=new URL(value,root.location.href);const pid=root.EduvizeAdminAuth?.status().profileId||new URL(root.location.href).searchParams.get('edu-profile');if(/^[a-f0-9]{32}$/.test(pid||'')&&(u.hostname.endsWith('.onrender.com')&&u.hostname.startsWith('eduvize-')||u.hostname==='pborovicka72-dotcom.github.io'&&u.pathname.startsWith('/eduvize-')))u.searchParams.set('edu-profile',pid);if(mode==='kiosk'){
  for(const key of segmentKeys)u.searchParams.delete(key);
  // layout can also be a numeric legacy NSP template.
  u.searchParams.delete('layout');u.searchParams.set('viewMode','kiosk');u.searchParams.set('output','kiosk');if(!['0','1'].includes(u.searchParams.get('paging')))u.searchParams.set('paging','auto');
  if(outputSelect||u.searchParams.has('kiosk_layout')||u.searchParams.has('kiosk_header')){const layout=outputSelect?layoutSelection():kioskLayout(u);u.searchParams.set('kiosk_layout',layout);u.searchParams.set('kiosk_header',layout==='menu'?'light':'dark');}
 }else if(mode==='web'){
  for(const key of segmentKeys)u.searchParams.delete(key);
  u.searchParams.delete('layout');u.searchParams.delete('output');u.searchParams.set('viewMode','web');u.searchParams.set('paging','off');
 }
 if(mode!=='kiosk'){u.searchParams.delete('kiosk_layout');u.searchParams.delete('kiosk_header');}
 const policy=kioskApp()||mode==='kiosk'?'interactive':interactionPicker?(interactionPicker.disabled?'interactive':interactionPicker.value):interaction(u);u.searchParams.set('interaction',policy);u.searchParams.set('paging',policy==='display'?'auto':'off');
 return root.EduvizeLinkContract.stamp(u);
 }
 function install(select){if(!select||select.dataset.eduOutputMode!==undefined)return;select.dataset.eduOutputMode='';if(!Array.from(select.options).some(o=>o.value==='kiosk'))select.add(new Option('Kiosek','kiosk'));const initial=initialMode();const option=Array.from(select.options).find(o=>o.value===initial||(initial==='nsp'&&/Newline Signage Pro/.test(o.text)));if(option&&select.value!==option.value){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));}installInteraction(select);}
 root.EduvizeOutputModes=Object.freeze({modes,mode,isKiosk,url,install,segmentKeys,defaultMode,initialMode,interaction,isInteractive,selection,setInteraction,kioskLayout,layoutSelection,setKioskLayout,autoplay,pager});
 if(isKiosk())document.documentElement.classList.add('kiosk-output');
 const policy=interaction();document.documentElement.dataset.eduInteraction=policy;
 const controlsStyle=document.createElement('link');controlsStyle.rel='stylesheet';controlsStyle.href=new URL('output-controls.css?v=20261103-output-controls-1',document.currentScript?.src||new URL('design-system/output-modes.js',root.location.href)).href;document.head.append(controlsStyle);
 const policyStyle=document.createElement('style');policyStyle.textContent=`html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) button,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) input,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) select,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) textarea,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) summary,html[data-edu-interaction=display][data-edu-output-surface] [data-edu-interactive-only]{display:none!important}html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) a{pointer-events:none!important;cursor:default!important}html[data-edu-interaction=interactive] .edu-auto-pagination button:not([hidden]),html[data-edu-interaction=interactive] .menu-auto-pagination button:not([hidden]){display:inline-flex!important}`;document.head.append(policyStyle);
 function start(){document.querySelectorAll('#setting-output,#viewMode,#layout,#outputType,#kiosk-output-type').forEach(s=>{if(s.tagName==='SELECT'&&Array.from(s.options).some(o=>/Newline Signage Pro/.test(o.text)))install(s);});if(outputSelect||document.body.matches('.ev-admin,.edu-admin')||/\/(config(?:\.html)?|editor\.html|ucet\.html)(\/|$)/.test(location.pathname))return;document.documentElement.dataset.eduOutputSurface='output';if(isInteractive())return;
 function disableLinks(){for(const a of document.querySelectorAll('a[href]')){a.tabIndex=-1;a.dataset.eduReadonlyHref=a.getAttribute('href');a.removeAttribute('href');a.removeAttribute('target');a.setAttribute('aria-disabled','true');}for(const detail of document.querySelectorAll('details'))if(!detail.open)detail.open=true;for(const media of document.querySelectorAll('video,audio'))media.controls=false;}
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;disableLinks();});}}).observe(document.body,{subtree:true,childList:true});disableLinks();document.addEventListener('click',e=>{if(e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('keydown',e=>{if(e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true);
 if(mode()==='web')autoplay(document.body,()=>{if(document.body.dataset.eduScrollManaged==='true')return;const bottom=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight;if(bottom>8)root.scrollTo({top:scrollY>=bottom-4?0:Math.min(bottom,scrollY+innerHeight*.85),behavior:'smooth'});},12);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);


/* Only slow periodic callbacks are configurable; clocks and page rotation keep their cadence. */
(function(root){
 if(root.EduvizeRefreshClock)return;
 const start=root.setInterval.bind(root),stop=root.clearInterval.bind(root),timers=new Map();
 let seconds=null,lastTriggered=null;
 function emit(){const detail=status();root.dispatchEvent(new CustomEvent('eduvize-refresh-state',{detail}));if(root.parent!==root)root.parent.postMessage({type:'eduvize-refresh-state',...detail},'*');}
 function status(){const due=[...timers.values()].map(t=>t.next).filter(Boolean);return {seconds,scheduled:due.length>0,nextRun:due.length?new Date(Math.min(...due)).toISOString():null,lastTriggered};}
 function arm(t){if(t.actual)stop(t.actual);t.actual=null;t.next=null;if(seconds===0)return;
  const delay=seconds===null?t.original:seconds*1000;
  t.next=Date.now()+delay;t.actual=start(()=>{lastTriggered=new Date().toISOString();t.next=Date.now()+delay;emit();t.callback(...t.args);},delay);
 }
 root.setInterval=function(callback,delay,...args){
  if(typeof callback!=='function'||Number(delay)<30000||/^(updateClock|clock|fit|render)$/i.test(callback.name||'')||/pageIndex|pageSeconds|nextPage|previousPage|currentPage|rotate|pagination|slideIndex|advance\s*\(/i.test(String(callback)))return start(callback,delay,...args);
  const t={callback,args,original:Number(delay),actual:null,next:null};arm(t);
  // Keep a stable handle even after changing the underlying native interval.
  const handle=t.actual||start(()=>{},2147483647);if(!t.actual)stop(handle);timers.set(handle,t);emit();return handle;
 };
 root.clearInterval=function(handle){const t=timers.get(handle);if(t){if(t.actual)stop(t.actual);timers.delete(handle);emit();}else stop(handle);};
 function configure(value){if(value!==null&&(!Number.isInteger(value)||![0,30,60,120,300,600,900,1800,3600].includes(value)))throw Error('Neplatný interval');if(value===seconds)return;seconds=value;for(const t of timers.values())arm(t);emit();}
 root.EduvizeRefreshClock=Object.freeze({configure,status,nativeInterval:start});
 const script=document.createElement('script');script.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/update-runtime.js?v=20261103-1';script.async=true;document.head.append(script);
})(window);
