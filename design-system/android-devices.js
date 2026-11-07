/* School-authorized test installation management. No credentials in URLs. */
(function(root){
 'use strict';
 const c=root.EduvizeLicensing,host=document.getElementById('android-devices');
 if(!c||!host||location.origin!=='https://test.skola.eduvize.cz')return;
 const {auth,$,request,text,say}=c,form=$('device-pair-form');let generation=0,ready=false,busy=false;
 const own=()=>auth.status().connected&&!!auth.status().schoolId;
 function buttons(){for(const control of form.querySelectorAll('input,select,button'))control.disabled=!ready||busy;}
 function failure(error,kind){
  if(error.status===401)return 'Přihlášení vypršelo. Přihlaste se znovu.';
  if(error.status===403)return kind==='screens'?'Nemáte oprávnění zobrazit evidenci obrazovek.':'Nemáte oprávnění spravovat Android obrazovky.';
  if(error.status===404&&kind==='devices')return 'Párování Android obrazovek zatím není v testovacím prostředí dostupné.';
  return kind==='screens'?'Evidenci obrazovek se nyní nepodařilo načíst. Zkuste to později.':'Služba Android obrazovek nyní není dostupná. Zkuste to později.';
 }
 async function load(){
  const version=++generation;ready=false;buttons();host.hidden=!own();$('device-list').replaceChildren();$('device-screen').replaceChildren();
  if(!own()){say('device-status','');return;}
  say('device-status','Ověřuji dostupnost Android obrazovek…');
  const [screens,devices]=await Promise.allSettled([request('/api/account/screens',{},true),request('/api/account/devices',{},true)]);
  if(version!==generation||!own())return;
  const messages=[];
  const screensOk=screens.status==='fulfilled'&&Array.isArray(screens.value.items);
  const devicesOk=devices.status==='fulfilled'&&Array.isArray(devices.value.items);
  if(!screensOk)messages.push(failure(screens.reason||{},'screens'));
  if(!devicesOk)messages.push(failure(devices.reason||{},'devices'));
  const places=screensOk?screens.value.items.filter(s=>s.state==='declared'):[];
  $('device-screen').replaceChildren(...places.map(s=>{const option=text('option',s.name);option.value=s.id;return option;}));
  if(devicesOk)$('device-list').replaceChildren(...devices.value.items.map(d=>{
   const row=document.createElement('p');row.append(text('span',d.id+' · '+d.state+' '));
   if(d.state==='active'){const button=text('button','Odvolat instalaci');button.type='button';button.onclick=async()=>{button.disabled=true;try{await request('/api/account/devices/'+encodeURIComponent(d.id)+'/revoke',{method:'POST',body:'{}'},true);await load();}catch(e){say('device-status',failure(e,'devices'));button.disabled=false;}};row.append(button);}return row;
  }));
  if(screensOk&&devicesOk&&!places.length)messages.push('Pro párování není k dispozici žádné aktivní evidované místo.');
  ready=screensOk&&devicesOk&&places.length>0;buttons();say('device-status',[...new Set(messages)].join(' '));
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!ready||busy)return;
  const version=generation;busy=true;buttons();say('device-status','Zpracovávám…');
  try{
   await request('/api/account/device-pairings/approve',{method:'POST',body:JSON.stringify({code:$('device-code').value.trim().toUpperCase(),fingerprint:$('device-fingerprint').value.trim(),screenId:$('device-screen').value,outputId:$('device-output').value.trim()})},true);
   if(version!==generation||!own())return;
   form.reset();await load();if(ready)say('device-status','Instalace schválena. Přehrávač převezme výstup při dalším spojení.');
  }catch(e){if(version===generation&&own()){ready=false;say('device-status',failure(e,'devices'));}}
  finally{busy=false;buttons();}
 });
 buttons();root.addEventListener('eduvize-admin-auth-change',load);auth.ready.then(load);
})(window);
