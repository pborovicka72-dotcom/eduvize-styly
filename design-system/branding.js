/* Shared Eduvize identity. School-specific logos keep their own source. */
(function(root){
 'use strict';if(root.EduvizeBranding)return;
 const endpoint='https://eduvize-design-system-api.onrender.com/api/design-system/branding';
 const fallback='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/assets/eduvize-logo-compact-animated.svg?v=20261104-vector-1';
 const key='eduvize-branding-v1';let current=fallback,refreshing=false;
 function valid(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
 function stock(value){try{const u=new URL(value,location.href);return u.hostname==='pborovicka72-dotcom.github.io'&&/^\/eduvize-styly\/design-system\/assets\/eduvize-logo(?:-compact)?(?:-animated)?\.svg$/.test(u.pathname);}catch{return false;}}
 function image(img){
  if(img.hasAttribute('data-edu-brand-preview'))return;
  const src=img.getAttribute('src')||'';
  if(!stock(src)&&(!img.dataset.eduBrandApplied||img.dataset.eduBrandApplied!==src))return;
  if(src!==current){img.dataset.eduBrandApplied=current;img.src=current;}
  if(!img.dataset.eduBrandError){img.dataset.eduBrandError='1';img.addEventListener('error',()=>{if(img.src===img.dataset.eduBrandApplied&&img.src!==fallback){img.dataset.eduBrandApplied=fallback;img.src=fallback;}});}
 }
 function scan(node=document){if(node.matches?.('img'))image(node);node.querySelectorAll?.('img').forEach(image);}
 function apply(value){current=valid(value?.logoUrl)?value.logoUrl:fallback;scan();root.dispatchEvent(new CustomEvent('eduvize-branding-change',{detail:{logoUrl:current}}));}
 async function refresh(){if(refreshing)return;refreshing=true;try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)return;const data=await response.json();apply(data);try{localStorage.setItem(key,JSON.stringify(data));}catch{}}catch{}finally{refreshing=false;}}
 try{const cached=JSON.parse(localStorage.getItem(key)||'null');if(cached)current=valid(cached.logoUrl)?cached.logoUrl:fallback;}catch{}
 root.EduvizeBranding=Object.freeze({refresh,apply,source:()=>current,defaultSource:fallback});
 function start(){scan();new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')image(record.target);else record.addedNodes.forEach(scan);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});refresh();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 root.addEventListener('storage',e=>{if(e.key===key)try{apply(JSON.parse(e.newValue||'null'));}catch{}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},60000);
})(window);
