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
   if(['skola.eduvize.cz','test.skola.eduvize.cz'].includes(u.hostname)&&(u.pathname.startsWith('/'+slug+'/')||u.pathname.startsWith('/eduvize-'+slug+'/')))return app;
   if(hosts.includes(u.hostname))return app;
   if(u.hostname==='pborovicka72-dotcom.github.io'&&u.pathname.startsWith('/eduvize-'+slug+'/'))return app;
  }
  return null;
 }
 function inspect(value,{layouts}={}){
  let u;try{u=new URL(value);}catch{return {status:'unknown',app:null,issues:['Neplatná úplná adresa.']};}
  const app=identify(u),issues=[];if(!app)return {status:'unknown',app:null,issues:['Adresa nepatří mezi podporované adresy aplikací Eduvize.']};
  if(!(app==='menu'&&/\/output\.html$/.test(u.pathname))&&!/\/(?:index\.html|signage\.html|display)?$/.test(u.pathname))return {status:'unknown',app,issues:['Tato cesta není evidována jako výstup aplikace.']};
  const p=u.searchParams,raw=p.get('edu-link'),legacy=raw===null;
  if(app==='menu'&&/\/output\.html$/.test(u.pathname)&&!(/^[a-f0-9]{32}$/.test(p.get('edu-menu')||'')))issues.push('Chybí identifikátor publikovaného jídelníčku.');
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
