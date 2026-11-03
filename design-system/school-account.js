/* School-owned account settings. Never accepts a school ID from form input. */
(function(root){
 'use strict';
 const client=root.EduvizeLicensing,host=document.getElementById('school-account');if(!client||!host)return;
 const {auth,$,request,say}=client;let generation=0,busy=false,mailReady=false;
 function own(){return auth.status().connected&&!!auth.status().schoolId;}
 function buttons(){ $('school-email-submit').disabled=busy||!mailReady;$('school-email-cancel').disabled=busy;}
 async function load(){
  const version=++generation;host.hidden=!own();if(!own()){$('school-email-new').value='';$('school-account-email').textContent='';$('school-email-pending').hidden=true;return;}
  say('school-email-status','Načítám údaje účtu…');buttons();
  try{
   const [info,capability]=await Promise.all([request('/api/account',{},true),request('/api/registration/status')]);
   if(version!==generation||!own())return;
   mailReady=capability.emailConfigured===true;
   $('school-account-identity').textContent=info.school.name;
   $('school-account-email').textContent=info.email||'Přihlašovací e-mail zatím není nastavený.';
   $('school-email-pending').hidden=!info.pending;
   if(info.pending){
    const confirmed=[info.pending.oldConfirmed?'původní adresa potvrzena':'čeká na původní adresu',info.pending.newConfirmed?'nová adresa potvrzena':'čeká na novou adresu'];
    $('school-email-pending-text').textContent='Změna na '+info.pending.newEmail+' · '+confirmed.join(' · ')+'.';
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
 root.addEventListener('eduvize-admin-auth-change',load);root.addEventListener('eduvize-school-account-change',load);auth.ready.then(load);
})(window);
