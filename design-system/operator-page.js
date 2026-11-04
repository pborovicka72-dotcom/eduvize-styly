/* Operator page bodies are returned only after server-side authorization. */
(function(root){
 'use strict';
 const name=document.documentElement.dataset.eduOperatorPage,auth=root.EduvizeAdminAuth;
 const message=document.getElementById('operator-access-message'),login=document.getElementById('operator-access-login');
 let loading=false,opened=false;
 const allowed=()=>{const state=auth?.status();return state?.connected===true&&!state.schoolId&&state.scopes?.includes('styles')===true;};
 async function open(){
  if(loading||opened)return;
  login.href=auth?.loginUrl(location.href)||'https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html#account';
  if(!allowed()){message.textContent='Přístup je povolen pouze administrátorovi Eduvize.';login.hidden=false;return;}
  loading=true;login.hidden=true;message.textContent='Ověřuji přístup správce…';
  try{
   const response=await auth.fetch('https://eduvize-design-system-api.onrender.com/api/design-system/operator-pages/'+name,{method:'GET'},'styles');
   if(!response.ok)throw Error('Přístup ke správě je zamítnut.');
   const html=await response.text();if(!allowed())throw Error('Přihlášení správce již není platné.');
   opened=true;
   document.open();document.write(html);document.close();
   // document.open clears window/document listeners; restore session monitoring.
   root.addEventListener('eduvize-admin-auth-change',()=>{if(!allowed())location.reload();});
   root.addEventListener('storage',event=>{if(event.key==='eduvize-admin-session-v1')auth.refresh();});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)auth.refresh();});
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>auth.refresh(),{once:true});else auth.refresh();
  }catch(error){message.textContent=error.message;login.hidden=false;}finally{loading=false;}
 }
 if(!['styles','licenses'].includes(name))return;
 root.addEventListener('eduvize-admin-auth-change',open);
 Promise.resolve(auth?.ready).then(open,()=>{message.textContent='Přihlášení nelze ověřit. Zkuste stránku obnovit.';login.hidden=false;});
})(window);
