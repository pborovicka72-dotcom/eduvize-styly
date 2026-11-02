/* The hub only launches apps; all account and profile editing lives on ucet.html. */
(function(root){
 'use strict';
 const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
 function legacyAccount(){const current=new URL(location.href);if(!['#account','#edu-account-panel','#configurations'].includes(current.hash)&&!['returnTo','manage','onedrive'].some(key=>current.searchParams.has(key)))return false;const target=new URL(ACCOUNT);target.search=current.search;target.hash=current.hash==='#edu-account-panel'?'#account':current.hash||'#account';location.replace(target.href);return true;}
 if(legacyAccount())return;
 root.addEventListener('hashchange',legacyAccount);
 document.addEventListener('click',async event=>{
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
  const link=event.target.closest('a[href]'),auth=root.EduvizeAdminAuth;if(!link||!auth?.status().connected)return;
  const u=new URL(link.href),admin=(u.origin===auth.CENTRAL&&['/','/design-system','/design-system/'].includes(u.pathname))||(/\/config(?:\.html)?$/.test(u.pathname)&&['https://pborovicka72-dotcom.github.io',auth.DOCS,'https://eduvize-weather.onrender.com','https://eduvize-aktuality.onrender.com','https://eduvize-prubeh-dne.onrender.com','https://eduvize-skolni-systemy.onrender.com','http://127.0.0.1:8789','https://eduvize-jidelnicek.onrender.com','http://127.0.0.1:8790'].includes(u.origin));
  if(!admin)return;event.preventDefault();
  try{location.assign(await auth.handoff(u.href));}catch(error){const status=document.getElementById('application-launch-status');if(status)status.textContent=error.message;}
 });
})(window);
