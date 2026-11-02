/* One contract for application output links. Kiosk uses the actual iframe viewport. */
(function(root){
 'use strict';
 const modes=Object.freeze([{id:'web',label:'Běžná stránka'},{id:'nsp',label:'Newline Signage Pro'},{id:'kiosk',label:'Kiosek'}]);
 const defaultMode='nsp';
 let interactionPicker=null,outputSelect=null,chosen=null;
 const preferenceKey='eduvize-output-interaction:'+root.location.pathname;
 function kioskApp(){return document.documentElement.dataset?.kioskApp==='kiosk'||!!document.getElementById?.('kiosk-output-type');}
 function interaction(value=root.location.href){const u=value instanceof URL?value:new URL(value,root.location.href);if(mode(u)==='kiosk'||kioskApp())return 'interactive';const v=u.searchParams.get('interaction');return ['interactive','display'].includes(v)?v:mode(u)==='web'?'interactive':'display';}
 function isInteractive(value=root.location.href){return interaction(value)==='interactive';}
 function selection(){if(kioskApp()||outputSelect?.value==='kiosk')return 'interactive';return interactionPicker?.value||chosen||interaction();}
 function setInteraction(value,{notify=true}={}){if(!['interactive','display'].includes(value))return;chosen=value;try{localStorage.setItem(preferenceKey,value);}catch{}syncInteraction();if(notify&&outputSelect)outputSelect.dispatchEvent(new Event('change',{bubbles:true}));}
 function syncInteraction(){if(!interactionPicker)return;const locked=kioskApp()||outputSelect.value==='kiosk';interactionPicker.value=locked?'interactive':chosen||(outputSelect.value==='web'||outputSelect.value==='off'||outputSelect.value==='normal'?'interactive':'display');interactionPicker.disabled=locked;for(const id of ['seconds','pageSeconds','setting-page-seconds']){const control=document.getElementById(id);if(control)control.closest('label').hidden=interactionPicker.value==='interactive';}const oldPaging=document.getElementById('paging');if(oldPaging)oldPaging.closest('label').hidden=true;document.getElementById('edu-output-interaction-hint').textContent=locked?'Kiosek je vždy interaktivní.':'Volba se uloží do odkazu. Zařízení se nerozpoznává.';}
 function installInteraction(select){if(outputSelect)return;outputSelect=select;const fromUrl=new URL(root.location.href).searchParams.get('interaction');let saved;try{saved=localStorage.getItem(preferenceKey);}catch{}chosen=['interactive','display'].includes(fromUrl)?fromUrl:['interactive','display'].includes(saved)?saved:null;const label=document.createElement('label');label.className='edu-output-interaction edu-admin__field';label.append(document.createTextNode('Ovládání obrazovky'));interactionPicker=document.createElement('select');interactionPicker.id='edu-output-interaction';interactionPicker.setAttribute('aria-describedby','edu-output-interaction-hint');for(const [id,text] of [['interactive','Interaktivní'],['display','Pouze zobrazování']])interactionPicker.add(new Option(text,id));const hint=document.createElement('small');hint.id='edu-output-interaction-hint';label.append(interactionPicker,hint);const anchor=select.closest('label')||select;anchor.after(label);interactionPicker.addEventListener('change',()=>setInteraction(interactionPicker.value));select.addEventListener('change',syncInteraction);syncInteraction();}
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
 }else if(mode==='web'){
  for(const key of segmentKeys)u.searchParams.delete(key);
  u.searchParams.delete('layout');u.searchParams.delete('output');u.searchParams.set('viewMode','web');u.searchParams.set('paging','off');
 }
 const policy=kioskApp()||mode==='kiosk'?'interactive':interactionPicker?(interactionPicker.disabled?'interactive':interactionPicker.value):interaction(u);u.searchParams.set('interaction',policy);u.searchParams.set('paging',policy==='display'?'auto':'off');
 return u;
 }
 function install(select){if(!select||select.dataset.eduOutputMode!==undefined)return;select.dataset.eduOutputMode='';if(!Array.from(select.options).some(o=>o.value==='kiosk'))select.add(new Option('Kiosek','kiosk'));const initial=initialMode();const option=Array.from(select.options).find(o=>o.value===initial||(initial==='nsp'&&/Newline Signage Pro/.test(o.text)));if(option&&select.value!==option.value){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));}installInteraction(select);}
 root.EduvizeOutputModes=Object.freeze({modes,mode,isKiosk,url,install,segmentKeys,defaultMode,initialMode,interaction,isInteractive,selection,setInteraction,autoplay,pager});
 if(isKiosk())document.documentElement.classList.add('kiosk-output');
 const policy=interaction();document.documentElement.dataset.eduInteraction=policy;
 const policyStyle=document.createElement('style');policyStyle.textContent=`html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) button,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) input,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) select,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) textarea,html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) summary,html[data-edu-interaction=display][data-edu-output-surface] [data-edu-interactive-only]{display:none!important}html[data-edu-interaction=display][data-edu-output-surface] body:not(.ev-admin):not(.edu-admin) a{pointer-events:none!important;cursor:default!important}html[data-edu-interaction=interactive] .edu-auto-pagination button:not([hidden]),html[data-edu-interaction=interactive] .menu-auto-pagination button:not([hidden]){display:inline-flex!important}.edu-output-interaction{display:flex;flex-direction:column;gap:8px}.edu-output-interaction small{font-weight:400;color:var(--ev-muted,#52677b);font-size:.85em;line-height:1.4}`;document.head.append(policyStyle);
 function start(){document.querySelectorAll('#setting-output,#viewMode,#layout,#outputType,#kiosk-output-type').forEach(s=>{if(s.tagName==='SELECT'&&Array.from(s.options).some(o=>/Newline Signage Pro/.test(o.text)))install(s);});if(outputSelect||document.body.matches('.ev-admin,.edu-admin')||/\/(config(?:\.html)?|editor\.html|ucet\.html)(\/|$)/.test(location.pathname))return;document.documentElement.dataset.eduOutputSurface='output';if(isInteractive())return;
 function disableLinks(){for(const a of document.querySelectorAll('a[href]')){a.tabIndex=-1;a.dataset.eduReadonlyHref=a.getAttribute('href');a.removeAttribute('href');a.removeAttribute('target');a.setAttribute('aria-disabled','true');}for(const detail of document.querySelectorAll('details'))if(!detail.open)detail.open=true;for(const media of document.querySelectorAll('video,audio'))media.controls=false;}
 let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;disableLinks();});}}).observe(document.body,{subtree:true,childList:true});disableLinks();document.addEventListener('click',e=>{if(e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('keydown',e=>{if(e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},true);
 if(mode()==='web')autoplay(document.body,()=>{const bottom=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)-innerHeight;if(bottom>8)root.scrollTo({top:scrollY>=bottom-4?0:Math.min(bottom,scrollY+innerHeight*.85),behavior:'smooth'});},12);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);

