/* School registration, email login and explicit confirmation pages. */
(function(root){
 'use strict';
 const client=root.EduvizeLicensing;if(!client||!document.getElementById('school-registration'))return;
 const {auth,$,names,date,say,request,work,lookup,validIco}=client;
 let selectedRegister='',generation=0,registrationRequested=false,registrationStatusLoaded=false;
 const registrationButton=$('account-registration-request');
 function registrationView(connected){
  if(connected)registrationRequested=false;
  $('school-registration').hidden=connected||!registrationRequested;
  registrationButton.setAttribute('aria-expanded',String(!connected&&registrationRequested));
 }
 registrationButton.onclick=()=>{
  registrationRequested=true;registrationView(auth.status().connected);
  if($('school-registration').hidden)return;
  $('school-registration').scrollIntoView({block:'start'});
  $('register-recipient-type').focus({preventScroll:true});
  if(!registrationStatusLoaded){registrationStatusLoaded=true;request('/api/registration/status').then(data=>{if(!data.emailConfigured)say('register-status','Potvrzovací e-maily čekají na nastavení Microsoft 365. Do té doby nelze dokončit novou registraci.');}).catch(e=>say('register-status',e.message));}
 };
 $('registration-close').onclick=()=>{registrationRequested=false;registrationView(auth.status().connected);registrationButton.focus();};
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
  const copy={register:['Potvrzení registrace školy','Potvrďte registraci a aktivaci licence školního účtu.','Potvrdit registraci'],'email-login':['Přihlášení do Eduvize','Dokončete přihlášení tlačítkem níže. Použijte prohlížeč, ve kterém jste si odkaz vyžádali.','Potvrdit přihlášení'],'microsoft-link':['Propojení účtu Microsoft','Potvrďte propojení účtu Microsoft se stávajícím školním účtem.','Potvrdit propojení'],'email-change-old':['Potvrzení změny e-mailu','Potvrďte požadavek z původní schránky. Pro dokončení bude potřeba potvrdit také novou adresu.','Potvrdit změnu'],'email-change-new':['Potvrzení přihlašovacího e-mailu','Otevření odkazu samo o sobě adresu nepotvrdí. Ověření dokončete tlačítkem níže.','Potvrdit e-mail']}[kind];
  const clean=new URL(location.href);clean.hash='account';history.replaceState(null,'',clean.href);
  document.body.dataset.confirmationActive='true';$('license-confirmation').hidden=false;
  $('license-confirm-title').textContent=copy?.[0]||'Neplatný potvrzovací odkaz';
  $('license-confirm-intro').textContent=copy?.[1]||'Vyžádejte si nový odkaz na stránce účtu.';
  const button=$('license-confirm-button');button.textContent=copy?.[2]||'Potvrdit';button.disabled=!copy;if(!copy)$('license-confirm-continue').hidden=false;
  button.onclick=async()=>{button.disabled=true;try{
   const result=await request('/api/registration/confirm',{method:'POST',body:JSON.stringify({kind,token:confirmation})});
   if(kind==='email-change-old'||kind==='email-change-new'){
    $('license-confirm-title').textContent=result.emailChanged?'Přihlašovací e-mail je potvrzený':'Potvrzení bylo přijato';
    $('license-confirm-intro').textContent=result.emailChanged?'Adresa je uložená u vašeho školního účtu. Při dalším přihlášení ji můžete použít pro zaslání přihlašovacího odkazu.':kind==='email-change-old'?'Pro dokončení změny ještě potvrďte odkaz v nové schránce.':'Pro dokončení změny ještě potvrďte odkaz v původní schránce.';
    button.hidden=true;$('license-confirm-continue').hidden=false;root.dispatchEvent(new Event('eduvize-school-account-change'));return;
   }
   if(result.registered){$('license-confirm-title').textContent='Registrace je dokončená';$('license-confirm-intro').textContent='Školní účet je vytvořený a licence aktivovaná. Nyní se můžete přihlásit.';button.hidden=true;$('license-confirm-continue').hidden=false;}
   else{
    const ticket=result.microsoftTicket||result.emailTicket;
    if(typeof ticket!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(ticket))throw Error('Přihlášení nevrátilo platné potvrzení. Vyžádejte si nový odkaz.');
    // A fragment-only navigation does not rerun admin-auth initialization.
    // Force a document navigation; the credential remains exclusively in the fragment.
    const next=new URL(auth.ACCOUNT);next.searchParams.set('edu-login-return',crypto.randomUUID());
    next.hash=new URLSearchParams(result.microsoftTicket?{'edu-ms-ticket':ticket}:{'edu-email-ticket':ticket}).toString();
    location.replace(next.href);
   }
  }catch(e){say('license-confirm-status',e.message);button.disabled=false;$('license-confirm-continue').hidden=false;}};
 }
 async function state(){
  const s=auth.status(),version=++generation;registrationView(s.connected);$('account-license').hidden=!s.schoolId;
  if(new URL(location.href).searchParams.get('edu-link-pending')==='1')say('account-message','Propojení Microsoft účtu potvrďte odkazem v e-mailu správce školy.');
  if(s.schoolId)say('account-license-status','Načítám licenci školy…');
  else say('account-license-status','');
  if(s.schoolId){try{const data=await request('/api/account/license',{},true);if(version!==generation)return;const license=data.license;
    say('account-license-status',license?(names[license.status]+' · '+(license.expiresAt?'platnost do '+date(license.expiresAt):'bez konce platnosti')):data.legacyAccount?'Tento původní vývojový účet zatím nemá přiřazenou licenci. Doplnění licence řeší správce Eduvize ke stávajícímu účtu školy.':'K tomuto účtu zatím není přiřazená licence. Požádejte správce Eduvize o její přiřazení.');
    if(license&&['expiring','expired'].includes(license.status))$('account-license').dataset.warning='true';else delete $('account-license').dataset.warning;
    if(license&&!$('name')?.value&&root.EduvizeProfileAdapter?.app==='school-identity')root.EduvizeProfileAdapter.apply({schemaVersion:1,data:license.school});
   }catch(e){say('account-license-status',e.message);}}
 }
 root.addEventListener('eduvize-admin-auth-change',state);auth.ready.then(state);

})(window);

