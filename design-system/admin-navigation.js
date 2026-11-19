/* Administration stays in one tab; explicitly marked outputs open separately. */
(function(root){
 'use strict';if(root.EduvizeAdminNavigation)return;
 const nativeOpen=root.open.bind(root);
 const exitGuards=new Set();
 let approvedDeparture=false,confirmation=null;
 function registerExitGuard(guard){
  if(typeof guard!=='function')throw new TypeError('Exit guard must be a function');
  exitGuards.add(guard);
  return ()=>exitGuards.delete(guard);
 }
 function needsConfirmation(){
  for(const guard of exitGuards)if(guard())return true;
  return false;
 }
 function confirmDeparture(){
  if(confirmation)return confirmation;
  confirmation=new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='edu-admin-dialog';
   const title=document.createElement('h2');title.textContent='Opustit aplikaci?';
   const description=document.createElement('p');description.textContent='Máte neuložené změny. Pokud odejdete, můžete o ně přijít.';
   const actions=document.createElement('div');actions.className='edu-admin__actions';
   const stay=document.createElement('button');stay.type='button';stay.className='edu-admin__button';stay.textContent='Zůstat v aplikaci';
   const leave=document.createElement('button');leave.type='button';leave.className='edu-admin__button edu-admin__button--secondary';leave.textContent='Opustit bez uložení';
   actions.append(stay,leave);dialog.append(title,description,actions);document.body.append(dialog);
   let done=false;
   function finish(value){if(done)return;done=true;dialog.close();dialog.remove();confirmation=null;resolve(value);}
   stay.addEventListener('click',()=>finish(false));leave.addEventListener('click',()=>finish(true));
   dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
   dialog.showModal();stay.focus();
  });
  return confirmation;
 }
 function depart(action){approvedDeparture=true;try{action();}finally{setTimeout(()=>{approvedDeparture=false;},1000);}}
 function navigate(value){
  const go=()=>depart(()=>root.location.assign(new URL(String(value),root.location.href).href));
  if(sameDocument(value)||!needsConfirmation()){go();return Promise.resolve(true);}
  return confirmDeparture().then(allowed=>{if(allowed)go();return allowed;});
 }
 function internal(value){
  let u;try{u=new URL(String(value),root.location.href);}catch{return false;}
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return false;
  if(u.origin===root.location.origin)return true;
  if(u.hostname==='pborovicka72-dotcom.github.io'&&u.pathname.startsWith('/eduvize-'))return true;
  if(/^eduvize-[a-z0-9-]+\.onrender\.com$/.test(u.hostname))return true;
  return ['localhost','127.0.0.1'].includes(u.hostname)&&['8765','8789','8790'].includes(u.port);
 }
 function sameDocument(value){
  const destination=new URL(String(value),root.location.href),current=new URL(root.location.href);
  return destination.origin===current.origin&&destination.pathname===current.pathname&&destination.search===current.search;
 }
 function openOutput(value){
  const url=new URL(String(value),root.location.href);
  if(!['http:','https:'].includes(url.protocol))throw new Error('Neplatný odkaz na výstup.');
  return navigate(url.href);
 }
 function normalizeElement(element){
  if(element.matches('a[href]:not([download])[data-edu-open-output]')){
   if(element.target!=='_self')element.target='_self';
   return;
  }
  if(element.matches('a[href]:not([download]),form')&&element.target&&element.target!=='_self')element.target='_self';
  if(element.matches('base[target]')&&element.target!=='_self')element.target='_self';
  if(element.hasAttribute('formtarget')&&element.getAttribute('formtarget')!=='_self')element.setAttribute('formtarget','_self');
 }
 function normalize(scope=document){
  if(scope.nodeType===1)normalizeElement(scope);
  scope.querySelectorAll?.('a[href]:not([download]),form,base[target],[formtarget]').forEach(normalizeElement);
 }
 root.open=function(value,target,features){
  if(value&&internal(value)){void navigate(value);return null;}
  return nativeOpen(value,target,features);
 };
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]:not([download])');
  if(!link)return;
  normalizeElement(link);
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.hasAttribute('data-edu-open-output')||link.target==='_blank'||!internal(link.href)||sameDocument(link.href)||!needsConfirmation())return;
  event.preventDefault();event.stopImmediatePropagation();void navigate(link.href);
 },true);
 document.addEventListener('submit',event=>normalizeElement(event.target),true);
 new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')normalizeElement(record.target);else for(const node of record.addedNodes)if(node.nodeType===1)normalize(node);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['target','formtarget','href','data-edu-open-output']});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>normalize(),{once:true});else normalize();
 root.EduvizeAdminNavigation=Object.freeze({internal,normalize,openOutput,navigate,registerExitGuard,isApprovedDeparture:()=>approvedDeparture});
})(window);

