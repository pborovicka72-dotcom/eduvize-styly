/* Shared Eduvize active theme loader. No local theme definitions. */
(function(){
 const endpoint='https://eduvize-dokumenty-api.onrender.com/api/design-system/themes';
 const names={background:'--ev-bg',text:'--ev-text',surface:'--ev-surface',muted:'--ev-muted',primary:'--ev-primary',primaryText:'--ev-primary-text',secondary:'--ev-secondary',secondaryText:'--ev-secondary-text',accent:'--ev-accent',border:'--ev-border'};
 async function refresh(){
  try{
   const response=await fetch(endpoint,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const themes=await response.json();
   if(!Array.isArray(themes))throw Error('Neplatné styly');
   const theme=(themes.find(x=>x.active)||themes.find(x=>x.id==='standard'))?.config;
   if(!theme?.colors)return;
   const root=document.documentElement.style;
   for(const [key,variable] of Object.entries(names)){
    const value=theme.colors[key];
    if(typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value))root.setProperty(variable,value);
   }
   if(theme.controls){
    if(Number.isFinite(theme.controls.heightPx))root.setProperty('--ev-control-height',theme.controls.heightPx+'px');
    if(Number.isFinite(theme.controls.radiusPx))root.setProperty('--ev-control-radius',theme.controls.radiusPx+'px');
   }
   if(Number.isFinite(theme.cards?.radiusPx))root.setProperty('--ev-card-radius',theme.cards.radiusPx+'px');
   document.documentElement.dataset.eduvizeTheme='active';
  }catch(error){console.warn('Eduvize: aktivní styl se nepodařilo načíst',error)}
 }
 refresh();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 window.setInterval(()=>{if(!document.hidden)refresh()},60000);
})();
