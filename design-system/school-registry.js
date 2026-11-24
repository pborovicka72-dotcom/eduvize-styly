(function(root){
 'use strict';
 const auth=root.EduvizeAdminAuth,$=id=>document.getElementById(id),items=$('school-items');
 const size=value=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:1}).format(value/1048576)+' MB';
 const date=value=>value?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeZone:'Europe/Prague'}).format(new Date(value*1000)):'—';
 const names={issued:'Čeká na aktivaci',active:'Platná',expiring:'Brzy končí',grace:'Ochranná lhůta',expired:'Skončila',perpetual:'Trvalá'};
 const el=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
 let schools=[],loadId=0;
 function field(grid,label,value){const box=el('div',''),dt=el('dt',label),dd=el('dd',value);box.append(dt,dd);grid.append(box);}
 function render(){
  const q=$('school-filter').value.trim().toLocaleLowerCase('cs-CZ');
  const shown=schools.filter(s=>[s.name,s.accountName,s.email,s.id,s.license?.schoolKey].some(v=>String(v||'').toLocaleLowerCase('cs-CZ').includes(q)));
  items.replaceChildren();$('school-summary').replaceChildren(el('span','Školní účty: '+schools.length),el('span','S licencí: '+schools.filter(s=>s.license).length),el('span','Bez licence: '+schools.filter(s=>!s.license).length));
  for(const school of shown){
   const card=el('article','');card.className='edu-school-card';const header=el('header',''),title=el('div','');title.append(el('h3',school.name),el('p',school.email||'Bez potvrzeného kontaktního e-mailu'));header.append(title);
   const state=el('strong',school.license?(names[school.license.status]||school.license.status):'Bez licence');header.append(state);card.append(header);
   const grid=el('dl','');grid.className='edu-school-card__grid';field(grid,'Licence',school.license?(school.license.expiresAt?'Do '+date(school.license.expiresAt):names[school.license.status]||'Platná'):'Nevydána');field(grid,'Profily',String(school.profiles.length));field(grid,'Úložiště',size(school.storage.usedBytes)+' z '+size(school.storage.limitBytes));field(grid,'Evidované obrazovky',String(school.declaredScreens));field(grid,'Spárovaná zařízení',String(school.pairedDevices));card.append(grid);
   const meter=el('progress','');meter.className='edu-school-meter';meter.max=school.storage.limitBytes;meter.value=Math.min(school.storage.usedBytes,meter.max);meter.setAttribute('aria-label','Využití úložiště');card.append(meter);
   if(school.profiles.length){const profiles=el('div','');profiles.className='edu-school-card__profiles';for(const p of school.profiles)profiles.append(el('span',p.name));card.append(profiles);}
   const footer=el('div','');footer.append(el('small','ID školy: '+school.id+' · Soubory: '+school.storage.fileCount+' · Úložiště: '+(school.storageProvider==='onedrive'?'OneDrive a Eduvize':school.storageProvider)));
   if(school.license){footer.append(el('span',' · '));const link=el('a','Spravovat licenci →');link.href='./licence.html';footer.append(link);}card.append(footer);items.append(card);
  }
  $('school-status').textContent=shown.length?'Zobrazeno škol: '+shown.length+'.':'Žádná škola neodpovídá hledání.';
 }
 async function load(){
  const id=++loadId,state=auth?.status(),token=auth?.getToken('styles');
  if(!state?.connected||state.schoolId||!state.scopes?.includes('styles')||!token){schools=[];items.replaceChildren();$('school-status').textContent='Přístup je povolen pouze správci Eduvize.';return;}
  $('school-status').textContent='Načítám školy…';
  try{const response=await fetch(location.origin+'/api/operator/schools',{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Seznam škol se nepodařilo načíst ('+response.status+').');const result=await response.json();if(id!==loadId||token!==auth.getToken('styles'))return;schools=result.items||[];render();}catch(error){if(id===loadId)$('school-status').textContent=error.message;}
 }
 $('school-filter').addEventListener('input',render);$('school-reload').addEventListener('click',load);root.addEventListener('eduvize-admin-auth-change',load);Promise.resolve(auth?.ready).then(load);
})(window);
