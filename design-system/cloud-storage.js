/* The migration action is explicit, authenticated and never deletes source files. */
(function(root){
 function start(){
 if(document.getElementById('cloud-storage'))return;
 const auth=root.EduvizeAdminAuth;if(!auth||!document.getElementById('edu-account-panel'))return;
 const card=document.createElement('section');card.className='edu-admin__card edu-admin__flow';card.hidden=true;card.dataset.accountPrivate='';card.id='cloud-storage';
 const title=document.createElement('h2');title.textContent='Cloudové úložiště Eduvize';
 const info=document.createElement('p');info.textContent='Nastavení, dokumenty a fotografie se ukládají přímo do Eduvize. OneDrive je volitelný zdroj importu a záloh.';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const row=document.createElement('div');row.className='edu-admin__actions';
 const move=document.createElement('button');move.type='button';move.className='edu-admin__button';move.textContent='Převést data a archivovat původní soubory';
 const refresh=document.createElement('button');refresh.type='button';refresh.className='edu-admin__button edu-admin__button--secondary';refresh.textContent='Ověřit stav';row.append(move,refresh);card.append(title,info,status,row);document.getElementById('edu-account-panel').after(card);
 let busy=false;
 async function request(path='',options={}){const response=await auth.fetch(auth.DOCS+'/api/admin/cloud-storage'+path,options,'documents');const data=await response.json();if(!response.ok)throw Error(data.detail||'Úložiště nyní není dostupné.');return data.migration;}
 function show(data){move.hidden=data.state==='archived'||(data.state==='verified'&&!data.archiveRequired);move.textContent=data.state==='verified'?'Dokončit přesun původních souborů do archivu':'Převést data a archivovat původní soubory';status.textContent=data.state==='archived'?'Data jsou v Eduvizi. Ověřeno '+data.files+' souborů. Původní data: '+data.archiveFolder+'. Archiv již není potřeba pro běžný provoz; nemaže se automaticky.':data.state==='verified'?'Ověřená data jsou v Eduvizi. '+(data.archiveRequired?'Zbývá přesunout originály do archivu.':'OneDrive není pro provoz potřeba.'):'Data čekají na převod. Nejprve je zkopírujeme a ověříme; až poté se původní složka přesune do archivu. Během převodu neupravujte data v jiných oknech.';}
 async function check(){if(busy)return;card.hidden=!auth.status().connected;if(card.hidden)return;try{show(await request());}catch(e){status.textContent=e.message;}}
 refresh.onclick=check;
 move.onclick=async()=>{if(busy)return;busy=true;move.disabled=refresh.disabled=true;status.textContent='Převádím soubory a kontroluji kopie. Ponechte stránku otevřenou…';try{show(await request('/migrate',{method:'POST'}));root.dispatchEvent(new Event('eduvize-cloud-migrated'));root.dispatchEvent(new CustomEvent('eduvize-admin-auth-change'));}catch(e){status.textContent=e.message+' Původní soubory nebyly smazány. Ověřte stav před opakováním.';}finally{busy=false;move.disabled=refresh.disabled=false;}};
 root.addEventListener('eduvize-admin-auth-change',check);auth.ready.then(check);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
