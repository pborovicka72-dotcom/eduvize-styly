/* Explicit authenticated migration runs on the server; the page only polls progress. */
(function(root){function start(){
 if(document.getElementById('cloud-storage'))return;
 const auth=root.EduvizeAdminAuth;if(!auth||!document.getElementById('edu-account-panel'))return;
 const card=document.createElement('section');card.className='edu-admin__card edu-admin__flow';card.hidden=true;card.dataset.accountPrivate='';card.id='cloud-storage';
 const title=document.createElement('h2');title.textContent='Cloudové úložiště Eduvize';
 const info=document.createElement('p');info.textContent='Nastavení, dokumenty a fotografie se ukládají přímo do Eduvize. OneDrive je volitelný zdroj importu a záloh.';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const row=document.createElement('div');row.className='edu-admin__actions';
 const move=document.createElement('button');move.type='button';move.className='edu-admin__button';
 const refresh=document.createElement('button');refresh.type='button';refresh.className='edu-admin__button edu-admin__button--secondary';refresh.textContent='Ověřit stav';row.append(move,refresh);card.append(title,info,status,row);document.getElementById('edu-account-panel').after(card);
 let busy=false,running=false,timer,completionAnnounced=false;
 async function request(path='',options={}){const response=await auth.fetch(auth.DOCS+'/api/admin/cloud-storage'+path,options,'documents');const data=await response.json();if(!response.ok)throw Error(data.detail||'Úložiště nyní není dostupné.');return data.migration;}
 function show(data){
  clearTimeout(timer);running=!!data.running||(data.state==='copying'&&Date.now()-Date.parse(data.updatedAt)<120000);
  move.hidden=data.state==='archived'||(data.state==='verified'&&!data.archiveRequired);move.disabled=busy||running;
  move.textContent=data.state==='verified'?'Dokončit přesun původních souborů do archivu':data.state==='failed'||data.state==='copying'?'Pokračovat v převodu':'Převést data a archivovat původní soubory';
  const amount=(Number(data.bytes||0)/1048576).toLocaleString('cs-CZ',{maximumFractionDigits:1})+' MB';
  status.textContent=data.state==='archived'?'Data jsou v Eduvizi. Ověřeno '+data.files+' souborů ('+amount+'). Původní data: '+data.archiveFolder+'. Archiv již není potřeba pro běžný provoz; nemaže se automaticky.':data.state==='verified'?'Ověřená data jsou v Eduvizi. '+(data.archiveRequired?'Zbývá dokončit archivaci původní složky.':'OneDrive není pro provoz potřeba.')+(data.error?' '+data.error:''):data.state==='copying'?(data.phase==='verifying'?'Kontroluji kopie':'Kopíruji do Eduvize')+': '+(data.files||0)+' souborů · '+amount+'. Převod běží na serveru; tuto stránku lze znovu otevřít.':data.state==='failed'?'Převod se zastavil. '+(data.error||'Zdrojové soubory zůstávají zachované.'):running?'Převod je spuštěný na serveru. Čekám na první výsledek…':'Data čekají na převod. Nejdříve zkopírujeme a ověříme obsah; až potom se původní složka přesune do archivu. Během převodu neupravujte data v jiných oknech.';
  if(running)timer=setTimeout(check,2500);
  if((data.state==='archived'||(data.state==='verified'&&!data.archiveRequired))&&!completionAnnounced){completionAnnounced=true;root.dispatchEvent(new Event('eduvize-cloud-migrated'));root.dispatchEvent(new CustomEvent('eduvize-admin-auth-change'));}
 }
 async function check(){if(busy)return;card.hidden=!auth.status().connected;if(card.hidden){clearTimeout(timer);return;}try{show(await request());}catch(e){status.textContent=e.message;}}
 refresh.onclick=check;
 move.onclick=async()=>{if(busy||running)return;busy=true;completionAnnounced=false;move.disabled=refresh.disabled=true;status.textContent='Spouštím převod a kontrolu kopií…';try{show(await request('/migrate',{method:'POST'}));}catch(e){status.textContent=e.message+' Původní soubory nebyly smazány. Ověřte stav před opakováním.';}finally{busy=false;move.disabled=running;refresh.disabled=false;}};
 root.addEventListener('eduvize-admin-auth-change',check);auth.ready.then(check);
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})(window);
