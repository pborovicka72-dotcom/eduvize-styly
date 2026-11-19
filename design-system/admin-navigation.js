/* Administration stays in one tab; explicitly marked outputs open separately. */
(function(root){
 'use strict';if(root.EduvizeAdminNavigation)return;
 const nativeOpen=root.open.bind(root);
 function internal(value){
  let u;try{u=new URL(String(value),root.location.href);}catch{return false;}
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return false;
  if(u.origin===root.location.origin)return true;
  if(u.hostname==='pborovicka72-dotcom.github.io'&&u.pathname.startsWith('/eduvize-'))return true;
  if(/^eduvize-[a-z0-9-]+\.onrender\.com$/.test(u.hostname))return true;
  return ['localhost','127.0.0.1'].includes(u.hostname)&&['8765','8789','8790'].includes(u.port);
 }
 function openOutput(value){
  const url=new URL(String(value),root.location.href);
  if(!['http:','https:'].includes(url.protocol))throw new Error('Neplatný odkaz na výstup.');
  root.location.assign(url.href);return null;
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
 let departureDialogOpen=false;
 function departureChoice(){
  if(departureDialogOpen)return Promise.resolve('cancel');
  departureDialogOpen=true;
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog'),title=document.createElement('h2'),description=document.createElement('p'),actions=document.createElement('div');
   dialog.className='edu-admin__card';dialog.style.maxWidth='min(32rem, calc(100vw - 32px))';dialog.style.padding='20px';
   title.id='edu-admin-departure-title';title.textContent='Neuložené změny';
   description.id='edu-admin-departure-description';description.className='edu-admin__hint';description.textContent='Máte neuložené změny. Jak chcete pokračovat?';
   dialog.setAttribute('aria-labelledby',title.id);dialog.setAttribute('aria-describedby',description.id);
   actions.className='edu-admin__actions';
   const makeButton=(label,secondary)=>{const button=document.createElement('button');button.type='button';button.className='edu-admin__button'+(secondary?' edu-admin__button--secondary':'');button.textContent=label;return button;};
   const save=makeButton('Uložit a odejít',false),discard=makeButton('Zahodit a odejít',true),stay=makeButton('Zůstat',true),previousFocus=document.activeElement;
   let settled=false;
   const finish=choice=>{if(settled)return;settled=true;departureDialogOpen=false;if(dialog.open)dialog.close();dialog.remove();if(previousFocus?.isConnected)previousFocus.focus();resolve(choice);};
   save.onclick=()=>finish('save');discard.onclick=()=>finish('discard');stay.onclick=()=>finish('cancel');
   dialog.addEventListener('cancel',event=>{event.preventDefault();finish('cancel');});dialog.addEventListener('close',()=>finish('cancel'));
   actions.append(save,discard,stay);dialog.append(title,description,actions);document.body.append(dialog);
   try{if(typeof dialog.showModal!=='function')throw Error('Dialog není dostupný.');dialog.showModal();stay.focus();}catch{finish('cancel');}
  });
 }
 // One route for leaving any editor through the shared administration header.
 // Each editor owns its save decision; navigation owns the click and destination.
 let departurePending=false;
 document.addEventListener('click',async event=>{
  const link=event.target.closest?.('a.edu-page-header__home[href]:not([download])');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const target=new URL(link.href,root.location.href);
  if(target.origin!==root.location.origin||target.pathname===root.location.pathname)return;
  const beforeSwitch=root.EduvizeProfileBeforeSwitch;
  if(typeof beforeSwitch!=='function')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(departurePending)return;
  departurePending=true;
  try{if(await beforeSwitch({navigation:true}))root.location.assign(target.href);}
  catch(error){root.alert(error?.message||'Odchod se nepodařilo připravit.');}
  finally{departurePending=false;}
 },true);
 root.open=function(value,target,features){
  if(value&&internal(value)){root.location.assign(new URL(String(value),root.location.href).href);return null;}
  return nativeOpen(value,target,features);
 };
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]:not([download])');
  if(link)normalizeElement(link);
 },true);
 document.addEventListener('submit',event=>normalizeElement(event.target),true);
 new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')normalizeElement(record.target);else for(const node of record.addedNodes)if(node.nodeType===1)normalize(node);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['target','formtarget','href','data-edu-open-output']});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>normalize(),{once:true});else normalize();
 root.EduvizeAdminNavigation=Object.freeze({internal,normalize,openOutput,departureChoice});
})(window);
