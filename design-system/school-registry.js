(function(root){
 'use strict';
 const auth=root.EduvizeAdminAuth,$=id=>document.getElementById(id),items=$('school-items');
 const size=value=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:1}).format(value/1048576)+' MB';
 const date=value=>value?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeZone:'Europe/Prague'}).format(new Date(value*1000)):'—';
 const names={issued:'Čeká na aktivaci',active:'Platná',expiring:'Brzy končí',grace:'Ochranná lhůta',expired:'Skončila',perpetual:'Trvalá'};
 const apps={news:'Aktuality',documents:'Dokumenty',menu:'Jídelníček',gallery:'Fotogalerie',transport:'Doprava',kiosk:'Kiosek',wisdom:'Myšlenky',weather:'Počasí','day-progress':'Průběh dne','school-calendar':'Kalendář','school-systems':'Školní systémy',holidays:'Svátky'};
 const providers={microsoft:'Microsoft',google:'Google',eduvize:'E-mail Eduvize'};
 const el=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
 let schools=[],loadId=0;
 function field(grid,label,value){const box=el('div',''),dt=el('dt',label),dd=el('dd',value);box.append(dt,dd);grid.append(box);}
 function line(parent,label,value){const p=el('p','');p.append(el('strong',label+': '),el('span',value));parent.append(p);}
 function render(){
  const q=$('school-filter').value.trim().toLocaleLowerCase('cs-CZ');
  const shown=schools.filter(s=>[s.name,s.accountName,s.email,s.id,s.license?.schoolKey].some(v=>String(v||'').toLocaleLowerCase('cs-CZ').includes(q)));
  items.replaceChildren();$('school-summary').replaceChildren(el('span','Školní účty: '+schools.length),el('span','S licencí: '+schools.filter(s=>s.license).length),el('span','Bez licence: '+schools.filter(s=>!s.license).length));
  for(const school of shown){
   const card=el('article','');card.className='edu-school-card';const header=el('header',''),title=el('div','');title.append(el('h3',school.name),el('p',school.email||'Bez potvrzeného kontaktního e-mailu'));header.append(title);
   const state=el('strong',school.license?(names[school.license.status]||school.license.status):'Bez licence');header.append(state);card.append(header);
   const grid=el('dl','');grid.className='edu-school-card__grid';field(grid,'Licence',school.license?(school.license.expiresAt?'Do '+date(school.license.expiresAt):names[school.license.status]||'Platná'):'Nevydána');field(grid,'Profily',String(school.profiles.length));field(grid,'Veřejné výstupy',String(school.outputs?.published||0));field(grid,'Úložiště',size(school.storage.usedBytes)+' z '+size(school.storage.limitBytes));field(grid,'Evidované obrazovky',String(school.declaredScreens));field(grid,'Spárovaná zařízení',String(school.pairedDevices));card.append(grid);
   const meter=el('progress','');meter.className='edu-school-meter';meter.max=school.storage.limitBytes;meter.value=Math.min(school.storage.usedBytes,meter.max);meter.setAttribute('aria-label','Využití úložiště');card.append(meter);
   const details=el('details','');details.className='edu-school-details';details.append(el('summary','Podrobnosti školy'));
   const columns=el('div','');columns.className='edu-school-details__grid';
   const identity=el('section','');identity.append(el('h4','Škola a účet'));
   line(identity,'Kontaktní e-mail',school.email||'Není potvrzen');
   line(identity,'Přihlášení',(school.identityProviders||[]).map(x=>providers[x]||x).join(', ')||'Není evidováno');
   line(identity,'RED IZO',school.license?.school?.red_izo||school.license?.schoolKey||'Není evidováno');
   line(identity,'IČO',school.license?.school?.ico||'Není evidováno');
   line(identity,'Adresa',[school.license?.school?.address,school.license?.school?.municipality].filter(Boolean).join(', ')||'Není evidována');columns.append(identity);
   const licensing=el('section','');licensing.append(el('h4','Licence a rozsah'));
   line(licensing,'Stav',school.license?(names[school.license.status]||school.license.status):'Nevydána');
   if(school.license){line(licensing,'Aktivace',date(school.license.activatedAt));line(licensing,'Platnost',school.license.expiresAt?'Do '+date(school.license.expiresAt):school.license.months===null?'Trvalá':'Od aktivace');line(licensing,'Přiřazené balíčky',school.license.packages?.join(', ')||'Bez balíčku');}
   line(licensing,'Připojení školního systému','Zde nelze ověřit. Licence k integraci nepotvrzuje funkční připojení.');columns.append(licensing);
   const publishing=el('section','');publishing.append(el('h4','Profily a výstupy'));
   for(const p of school.profiles)line(publishing,p.name,(p.archived?'Archivovaný':'Aktivní')+' · publikované výstupy '+p.publishedOutputs);
   line(publishing,'Veřejné výstupy',String(school.outputs?.published||0));line(publishing,'Rozpracované',String(school.outputs?.draft||0));
   const byApp=Object.entries(school.outputs?.byApp||{}).sort((a,b)=>(apps[a[0]]||a[0]).localeCompare(apps[b[0]]||b[0],'cs')).map(([app,count])=>(apps[app]||app)+' '+count).join(' · ');
   line(publishing,'Podle aplikace',byApp||'Žádné');columns.append(publishing);
   const operations=el('section','');operations.append(el('h4','Úložiště a provoz'));
   line(operations,'Soubory',String(school.storage.fileCount));line(operations,'Převod úložiště',({pending:'Nezahájen',copying:'Probíhá',verified:'Ověřen',archived:'Archivován',failed:'Chyba'}[school.storage.migrationState]||school.storage.migrationState));
   line(operations,'Obrazovky',school.declaredScreens+' evidovaných · '+school.pairedDevices+' spárovaných instalací');
   line(operations,'Dostupnost a chyby','Centrálně se zatím nemonitorují.');columns.append(operations);
   details.append(columns);card.append(details);
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
