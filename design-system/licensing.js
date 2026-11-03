/* School registration, email login and explicit confirmation pages. */
(function(root){
 'use strict';
 const client=root.EduvizeLicensing;if(!client||!document.getElementById('school-registration'))return;
 const {auth,$,names,date,say,request,work,lookup,validIco}=client;
 let selectedRegister='',loadedToken='',generation=0;
 lookup('register-school-query','register-school-results',key=>{selectedRegister=key;});
 function registerMode(){
  const manual=$('register-recipient-type').value==='organization';
  $('register-school-fields').hidden=manual;$('register-school-query').disabled=manual;
  $('register-org-field').hidden=!manual;$('register-org-ico').disabled=!manual;
 }
 $('register-recipient-type').onchange=registerMode;registerMode();
 $('register-org-ico').addEventListener('input',()=>$('register-org-ico').setCustomValidity(''));
 work($('school-register-form'),'register-status',async()=>{
  const manual=$('register-recipient-type').value==='organization';
  if(!manual&&!selectedRegister)throw Error('Vyberte školu z nabídky rejstříku.');
  const recipient=manual?{organizationIco:validIco($('register-org-ico'))}:{schoolKey:selectedRegister};
  await request('/api/registration',{method:'POST',body:JSON.stringify({...recipient,email:$('register-email').value,code:$('register-license').value})});
  $('register-license').value='';say('register-status','Potvrďte registraci odkazem v e-mailu. Licence se aktivuje až po potvrzení.');
 });
 work($('email-login-form'),'email-login-status',async()=>{
  const verifier=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));const proof=btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const pending=JSON.stringify({verifier,createdAt:Date.now()});sessionStorage.setItem('eduvize-email-login-v1',pending);try{localStorage.setItem('eduvize-email-login-v1',pending);}catch{}
  await request('/auth/email/start',{method:'POST',body:JSON.stringify({email:$('email-login-address').value,proof,remember:$('account-remember').checked})});
  say('email-login-status','Pokud je e-mail registrovaný, obdržíte přihlašovací odkaz. Otevřete ho v tomto prohlížeči.');
 });
 const fragment=new URLSearchParams(location.hash.slice(1)),confirmation=fragment.get('edu-confirm'),kind=fragment.get('edu-confirm-kind');
 if(confirmation){
  const clean=new URL(location.href);clean.hash='account';history.replaceState(null,'',clean.href);$('license-confirmation').hidden=false;
  $('license-confirm-button').onclick=async()=>{const button=$('license-confirm-button');button.disabled=true;try{const result=await request('/api/registration/confirm',{method:'POST',body:JSON.stringify({kind,token:confirmation})});if(kind==='email-change-old'||kind==='email-change-new'){say('license-confirm-status',result.emailChanged?'Přihlašovací e-mail byl změněn. Při dalším přihlášení použijte novou adresu.':'Potvrzení bylo přijato. Pro dokončení změny potvrďte také odkaz ve druhé schránce.');button.hidden=true;root.dispatchEvent(new Event('eduvize-school-account-change'));return;}if(result.registered){say('license-confirm-status','Registrace školy je dokončená a licence aktivovaná. Nyní se můžete přihlásit e-mailem nebo propojit Microsoft účet.');button.hidden=true;}else{location.replace(auth.ACCOUNT+'#'+new URLSearchParams(result.microsoftTicket?{'edu-ms-ticket':result.microsoftTicket}:{'edu-email-ticket':result.emailTicket}));}}catch(e){say('license-confirm-status',e.message);button.disabled=false;}};
 }
 async function state(){
  const s=auth.status(),version=++generation;$('school-registration').hidden=s.connected;$('account-license').hidden=!s.schoolId;
  if(new URL(location.href).searchParams.get('edu-link-pending')==='1')say('account-message','Propojení Microsoft účtu potvrďte odkazem v e-mailu správce školy.');
  const token=auth.getToken();if(token===loadedToken)return;loadedToken=token;
  if(s.schoolId){try{const data=await request('/api/account/license',{},true);if(version!==generation)return;const license=data.license;
    say('account-license-status',license?(names[license.status]+' · '+(license.expiresAt?'platnost do '+date(license.expiresAt):'bez konce platnosti')):'Stávající účet zatím nemá přiřazenou licenci. Kontaktujte správce Eduvize.');
    if(license&&['expiring','expired'].includes(license.status))$('account-license').dataset.warning='true';else delete $('account-license').dataset.warning;
    if(license&&!$('name')?.value&&root.EduvizeProfileAdapter?.app==='school-identity')root.EduvizeProfileAdapter.apply({schemaVersion:1,data:license.school});
   }catch(e){say('account-license-status',e.message);}}
 }
 root.addEventListener('eduvize-admin-auth-change',state);auth.ready.then(state);
 request('/api/registration/status').then(data=>{if(!data.emailConfigured)say('register-status','Potvrzovací e-maily čekají na nastavení Microsoft 365. Do té doby nelze dokončit novou registraci.');}).catch(e=>say('register-status',e.message));
})(window);

