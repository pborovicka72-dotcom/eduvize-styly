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
  return nativeOpen(url.href,'_blank','noopener,noreferrer');
 }
 function normalizeElement(element){
  if(element.matches('a[href]:not([download])[data-edu-open-output]')){
   if(element.target!=='_blank')element.target='_blank';
   if(!element.relList.contains('noopener'))element.relList.add('noopener');
   if(!element.relList.contains('noreferrer'))element.relList.add('noreferrer');
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
 root.EduvizeAdminNavigation=Object.freeze({internal,normalize,openOutput});
})(window);
