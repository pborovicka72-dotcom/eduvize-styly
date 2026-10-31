/* One contract for application output links. Kiosk uses the actual iframe viewport. */
(function(root){
 'use strict';
 const modes=Object.freeze([{id:'web',label:'Běžná stránka'},{id:'nsp',label:'Newline Signage Pro'},{id:'kiosk',label:'Kiosek'}]);
 const segmentKeys=['segment_orientation','segment_style','segment_block','orientation','style','block','ev_inner'];
 function isKiosk(value=root.location.search){const p=value instanceof URL?value.searchParams:new URLSearchParams(value);return p.get('viewMode')==='kiosk'||p.get('output')==='kiosk';}
 function url(value,mode){const u=new URL(value,root.location.href);if(mode==='kiosk'){
  for(const key of segmentKeys)u.searchParams.delete(key);
  // layout can also be a numeric legacy NSP template.
  u.searchParams.delete('layout');u.searchParams.set('viewMode','kiosk');u.searchParams.set('output','kiosk');u.searchParams.set('paging','auto');
 }else if(mode==='web'){
  for(const key of segmentKeys)u.searchParams.delete(key);
  u.searchParams.delete('layout');u.searchParams.delete('output');u.searchParams.set('viewMode','web');
 }
 return u;
 }
 function install(select){if(!select)return;select.dataset.eduOutputMode='';if(!Array.from(select.options).some(o=>o.value==='kiosk'))select.add(new Option('Kiosek','kiosk'));if(isKiosk()&&select.value!=='kiosk'){select.value='kiosk';select.dispatchEvent(new Event('change',{bubbles:true}));}}
 root.EduvizeOutputModes=Object.freeze({modes,isKiosk,url,install,segmentKeys});
 if(isKiosk())document.documentElement.classList.add('kiosk-output');
 function start(){document.querySelectorAll('#setting-output,#viewMode,#layout,#outputType,#kiosk-output-type').forEach(s=>{if(s.tagName==='SELECT'&&Array.from(s.options).some(o=>/Newline Signage Pro/.test(o.text)))install(s);});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
