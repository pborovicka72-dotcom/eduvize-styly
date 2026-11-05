/* Idempotent even when a legacy page includes the theme runtime twice. */
(function(){if(window.EduvizeSharedThemeLoaded)return;window.EduvizeSharedThemeLoaded=true;
/* A page refresh starts at the top; explicit section links still work on navigation. */
(function(root){
 if(root.EduvizePageStart)return;root.EduvizePageStart=true;
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 const reload=performance.getEntriesByType('navigation')[0]?.type==='reload';
 function top(){if(reload||!location.hash)requestAnimationFrame(()=>root.scrollTo({top:0,left:0,behavior:'instant'}));}
 root.addEventListener('pageshow',top);root.addEventListener('load',top,{once:true});top();
})(window);
/* Load shared components once; output-only screens do not need form observers. */
(function(){
 const base=new URL('.',document.currentScript.src);
 function exists(tag,attribute,url){return [...document.querySelectorAll(tag+'['+attribute+']')].some(node=>{try{const value=new URL(node.getAttribute(attribute),location.href);return value.origin===url.origin&&value.pathname===url.pathname;}catch{return false;}});}
 function asset(file,script=false){
  const url=new URL(file,base),tag=script?'script':'link',attribute=script?'src':'href';
  if(exists(tag,attribute,url))return;
  const node=document.createElement(tag);
  if(script){node.src=url.href;node.async=false;}else{node.rel='stylesheet';node.href=url.href;}
  document.head.append(node);
 }
 asset('card-layout.css?v=20261104-design-audit-1');
 asset('card-layout.js?v=20261104-design-audit-1',true);
 asset('typography.css?v=20261104-design-audit-1');
 asset('typography.js?v=20261104-design-audit-1',true);
 asset('fit-panel.js?v=20261104-design-audit-1',true);
 function forms(){if(!document.querySelector('.ev-admin,.edu-admin-page,.edu-admin,input,textarea,select'))return;asset('form-fields.css?v=20261104-design-audit-1');asset('form-fields.js?v=20261104-design-audit-1',true);return true;}
 function start(){
  if(forms())return;
  const observer=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches('input,textarea,select,form')||node.querySelector('input,textarea,select'))))&&forms())observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
/* Shared Eduvize active theme loader. No local theme definitions. */
(function(){ // The theme editor keeps the default shell; selections affect its preview only.
 if(document.documentElement.dataset.eduTheme==='standard')return;
 const endpoint='https://eduvize-design-system-api.onrender.com/api/design-system/themes';
 const cacheKey='eduvize-active-theme-v1';
 function themeProfile(){let selected='';try{selected=localStorage.getItem('eduvize-profile-selection-v1')||'';}catch{}const value=new URL(location.href).searchParams.get('edu-profile')||window.EduvizeAdminAuth?.status().profileId||selected;return /^[a-f0-9]{32}$/.test(value||'')?value:'';}
 const scopedCache=profile=>cacheKey+':'+(profile||'global');
 const inFlight=new Map();
 const names={background:'--ev-bg',text:'--ev-text',surface:'--ev-surface',muted:'--ev-muted',primary:'--ev-primary',primaryText:'--ev-primary-text',secondary:'--ev-secondary',secondaryText:'--ev-secondary-text',accent:'--ev-accent',border:'--ev-border'};
 function apply(theme){
  if(!theme?.colors)return false;
  const root=document.documentElement.style;
  for(const [key,variable] of Object.entries(names)){const value=theme.colors[key];if(typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value))root.setProperty(variable,value)}
  if(theme.controls){if(Number.isFinite(theme.controls.heightPx))root.setProperty('--ev-control-height',theme.controls.heightPx+'px');if(Number.isFinite(theme.controls.radiusPx))root.setProperty('--ev-control-radius',theme.controls.radiusPx+'px')}
  if(Number.isFinite(theme.cards?.radiusPx))root.setProperty('--ev-card-radius',theme.cards.radiusPx+'px');
  const iconRadius=theme.icons?.radiusPx;root.setProperty('--ev-icon-radius',(Number.isFinite(iconRadius)?Math.max(0,Math.min(24,iconRadius)):10)+'px');
  const legacy={background:'bg',text:'ink',muted:'muted',surface:'surface',primary:'primary',primaryText:'primary-text',secondary:'secondary',secondaryText:'secondary-text',accent:'accent',border:'border'};
  for(const [key,suffix] of Object.entries(legacy)){const value=theme.colors[key];if(typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value))root.setProperty('--edu-admin-'+suffix,value)}
  if(typeof theme.colors.border==='string')root.setProperty('--edu-admin-input-border',theme.colors.border);
  if(theme.controls){if(Number.isFinite(theme.controls.heightPx))root.setProperty('--edu-admin-control-height',theme.controls.heightPx+'px');if(Number.isFinite(theme.controls.radiusPx))root.setProperty('--edu-admin-control-radius',theme.controls.radiusPx+'px')}
  if(Number.isFinite(theme.cards?.radiusPx))root.setProperty('--edu-admin-card-radius',theme.cards.radiusPx+'px');
  document.documentElement.dataset.eduvizeTheme='active';return true;
 }
 try{const cached=JSON.parse(localStorage.getItem(scopedCache(themeProfile()))||'null');if(cached)apply(cached)}catch(_){}
 async function refresh(){
  const profile=themeProfile();if(inFlight.has(profile))return inFlight.get(profile);
  const operation=(async()=>{try{
   const url=new URL(endpoint);if(profile)url.searchParams.set('profileId',profile);
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const themes=await response.json();
   if(!Array.isArray(themes))throw Error('Neplatné styly');
   const theme=(themes.find(x=>x.active)||themes.find(x=>x.id==='standard'))?.config;
   if(!theme?.colors||profile!==themeProfile())return;
   if(apply(theme)){try{localStorage.setItem(scopedCache(profile),JSON.stringify(theme))}catch(_){}}
  }catch(error){console.warn('Eduvize: aktivní styl se nepodařilo načíst',error)}
  finally{document.documentElement.classList.remove('ev-theme-pending')}
  })();inFlight.set(profile,operation);try{return await operation;}finally{inFlight.delete(profile);}
 }
 refresh();
 window.addEventListener('eduvize-admin-auth-change',refresh);
 window.addEventListener('eduvize-profile-selected',refresh);
 window.addEventListener('storage',event=>{if(event.key==='eduvize-profile-selection-v1')refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.setInterval(()=>{if(!document.hidden)refresh()},60000);
})();

/* Shared configuration controls load only in administrations. Output pages stay untouched. */
(function(){
 const base=new URL('.',document.currentScript.src);
 function start(){
  if(!document.querySelector('.edu-admin-page')||(!window.EduvizeProfileAdapter&&!document.getElementById('configurations')))return;
  if(document.querySelector('script[data-edu-profiles],script[src*="configuration-profiles.js"]'))return;
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('configuration-profiles.css?v=20261105-cloud-1',base);document.head.append(css);
  const load=()=>{const script=document.createElement('script');script.src=new URL('configuration-profiles.js?v=20261105-cloud-1',base);script.dataset.eduProfiles='';document.head.append(script);};
  if(window.EduvizeAdminAuth)load();else{const auth=document.createElement('script');auth.src=new URL('admin-auth.js?v=20261105-cloud-1',base);auth.onload=load;document.head.append(auth);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('eduvize-profile-adapter-ready',start);
})();


/* Visible release numbers belong in diagnostics, not application surfaces. */
(function(){
 const version=/\bv\d{4}\.\d{1,2}\.\d{1,2}(?:\.\d+)*\b/g;
 function clean(node){
  if(node.nodeType===3){if(node.parentElement?.closest('script,style,textarea,input,code,pre'))return;const old=node.nodeValue;if(!/\bv\d{4}\./.test(old))return;const next=old.replace(version,'').replace(/\s*·\s*·/g,' · ').replace(/\s*·\s*$/,'').trim();if(next!==old)node.nodeValue=next;return;}
  if(node.nodeType!==1)return;
  if(node.matches('.edu-build-marker,#version')){node.hidden=true;node.style.display='none';return;}
  for(const child of [...node.childNodes])clean(child);
 }
 function start(){clean(document.body);new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')clean(record.target);else for(const node of record.addedNodes)clean(node);}}).observe(document.body,{subtree:true,childList:true,characterData:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Load centrally managed vector branding in every shared-style consumer. */
(function(){if(window.EduvizeBranding||document.querySelector('script[data-edu-branding]'))return;const script=document.createElement('script');script.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/branding.js?v=20261104-vector-1';script.dataset.eduBranding='';document.head.append(script);})();

})();
