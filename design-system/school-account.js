/* School-owned account settings. Never accepts a school ID from form input. */
(function(root){
 'use strict';
 const client=root.EduvizeLicensing,host=document.getElementById('school-account');if(!client||!host)return;
 const {auth,$,request,say}=client;let generation=0,busy=false,mailReady=false;
 const resendButtons=['old','new'].map(side=>{
  const button=document.createElement('button');button.type='button';
  button.className='edu-admin__button edu-admin__button--secondary';
  button.textContent=side==='old'?'Znovu poslat na původní adresu':'Znovu poslat na novou adresu';
  button.hidden=true;button.dataset.confirmationKind='email-change-'+side;
  $('school-email-cancel').before(button);return button;
 });
 function own(){return auth.status().connected&&!!auth.status().schoolId;}
 function buttons(){ $('school-email-submit').disabled=busy||!mailReady;$('school-email-cancel').disabled=busy;for(const button of resendButtons)button.disabled=busy||!mailReady;}
 async function load(){
  const version=++generation;host.hidden=!own();if(!own()){$('school-email-new').value='';$('school-account-email').textContent='';$('school-email-pending').hidden=true;return;}
  say('school-email-status','Načítám údaje účtu…');buttons();
  try{
   const [info,capability]=await Promise.all([request('/api/account',{},true),request('/api/registration/status')]);
   if(version!==generation||!own())return;
   mailReady=capability.emailConfigured===true;
   $('school-account-identity').textContent=info.school.name==='Profil školy'?'':info.school.name;
   $('school-account-identity').hidden=!$('school-account-identity').textContent;
   root.dispatchEvent(new CustomEvent('eduvize-school-account-loaded',{detail:{schoolId:info.school.id,microsoftLinked:info.microsoftLinked===true}}));
   $('school-email-label').textContent=info.email?'Nový přihlašovací e-mail':'Přihlašovací e-mail školy';
   $('school-email-submit').textContent=info.email?'Poslat potvrzení změny':'Poslat potvrzení e-mailu';
   $('school-email-help').textContent=info.email?'Změnu potvrďte odkazem v původní i nové schránce. Do dokončení platí současná adresa.':'Přidejte první přihlašovací e-mail ke stávajícímu účtu školy. Stačí potvrdit odkaz v této schránce.';
   $('school-account-email').textContent=info.email||'Přihlašovací e-mail zatím není nastavený.';
   $('school-email-pending').hidden=!info.pending;
   resendButtons[0].hidden=!info.pending||info.pending.requiresPreviousConfirmation===false||info.pending.oldConfirmed;
   resendButtons[1].hidden=!info.pending||info.pending.newConfirmed;
   if(info.pending){
    const first=info.pending.requiresPreviousConfirmation===false;
    const confirmed=first?['Čekáme na potvrzení této adresy.']:[info.pending.oldConfirmed?'Původní adresa je potvrzená.':'Čekáme na potvrzení původní adresy.',info.pending.newConfirmed?'Nová adresa je potvrzená.':'Čekáme na potvrzení nové adresy.'];
    $('school-email-pending-text').textContent=(first?'Nastavení přihlašovacího e-mailu: ':'Změna přihlašovacího e-mailu na ')+info.pending.newEmail+'. '+confirmed.join(' ');
   }
   say('school-email-status',mailReady?'':'Změna e-mailu čeká na nastavení potvrzovacích e-mailů. Současné přihlášení zůstává dostupné.');
  }catch(error){if(version===generation)say('school-email-status',error.message);}
  finally{if(version===generation)buttons();}
 }
 $('school-email-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!own())return;busy=true;buttons();say('school-email-status','Odesílám potvrzení změny…');
  try{
   const result=await request('/api/account/email-change',{method:'POST',body:JSON.stringify({email:$('school-email-new').value})},true);
   if(!own())return;$('school-email-new').value='';await load();
   say('school-email-status',result.requiresPreviousConfirmation?'Potvrďte změnu odkazem v původní i nové e-mailové schránce. Odkazy platí jednu hodinu.':'Potvrďte první přihlašovací e-mail odkazem v nové schránce. Odkaz platí jednu hodinu.');
  }catch(error){if(own())say('school-email-status',error.message);}
  finally{busy=false;buttons();}
 });
 $('school-email-cancel').onclick=async()=>{
  if(busy||!own())return;busy=true;buttons();say('school-email-status','Ruším rozpracovanou změnu…');
  try{await request('/api/account/email-change',{method:'DELETE'},true);await load();say('school-email-status','Rozpracovaná změna byla zrušena. Přihlašovací e-mail se nezměnil.');}
  catch(error){if(own())say('school-email-status',error.message);}
  finally{busy=false;buttons();}
 };
 for(const button of resendButtons)button.onclick=async()=>{
  if(busy||!own())return;const version=generation;busy=true;buttons();say('school-email-status','Znovu odesílám chybějící potvrzení…');
  try{
   const result=await request('/api/account/email-change/resend',{method:'POST',body:JSON.stringify({kind:button.dataset.confirmationKind})},true);
   if(version!==generation||!own())return;
   say('school-email-status','Potvrzení bylo předáno k odeslání. Již provedená potvrzení zůstávají zachovaná. Odkaz platí do '+new Intl.DateTimeFormat('cs-CZ',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Prague'}).format(new Date(result.expiresAt*1000))+'.');
  }catch(error){if(version===generation&&own())say('school-email-status',error.message);}
  finally{busy=false;buttons();}
 };
 root.addEventListener('eduvize-admin-auth-change',load);root.addEventListener('eduvize-school-account-change',load);auth.ready.then(load);
})(window);
