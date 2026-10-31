/* Bootstrap shared controls for all consumers of the design system. */
(function(){
 if(document.querySelector('script[data-edu-form-fields]'))return;
 const base=new URL('.',document.currentScript.src);
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('form-fields.css?v=3',base);document.head.append(css);
 const script=document.createElement('script');script.src=new URL('form-fields.js?v=2',base);script.dataset.eduFormFields='';document.head.append(script);
 const typographyCss=document.createElement('link');typographyCss.rel='stylesheet';typographyCss.href=new URL('typography.css?v=1',base);document.head.append(typographyCss);
 const typography=document.createElement('script');typography.src=new URL('typography.js?v=3',base);document.head.append(typography);
 const fit=document.createElement('script');fit.src=new URL('fit-panel.js?v=2',base);document.head.append(fit);
})();
/* Shared Eduvize active theme loader. No local theme definitions. */
(function(){ // The theme editor keeps the default shell; selections affect its preview only.
 if(document.documentElement.dataset.eduTheme==='standard')return;
 const endpoint='https://eduvize-design-system-api.onrender.com/api/design-system/themes';
 const cacheKey='eduvize-active-theme-v1';
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
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached)apply(cached)}catch(_){}
 async function refresh(){
  try{
   const response=await fetch(endpoint,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const themes=await response.json();
   if(!Array.isArray(themes))throw Error('Neplatné styly');
   const theme=(themes.find(x=>x.active)||themes.find(x=>x.id==='standard'))?.config;
   if(!theme?.colors)return;
   if(apply(theme)){try{localStorage.setItem(cacheKey,JSON.stringify(theme))}catch(_){}}
  }catch(error){console.warn('Eduvize: aktivní styl se nepodařilo načíst',error)}
  finally{document.documentElement.classList.remove('ev-theme-pending')}
 }
 refresh();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.setInterval(()=>{if(!document.hidden)refresh()},60000);
})();
