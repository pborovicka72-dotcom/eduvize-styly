/* Administration-only audit. No requests, storage, telemetry or automatic rewrites of supplied URLs. */
(function(root){
 'use strict';
 function mount(host){
  if(!host||host.querySelector('[data-edu-link-audit]'))return;
  const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const panel=el('details');panel.dataset.eduLinkAudit='';panel.className='edu-admin__card edu-admin__disclosure';
  const heading=el('summary','Aktualizace a kompatibilita odkazů');panel.append(heading);
  const body=el('div');body.className='edu-admin__disclosure-body';panel.append(body);
  const release=el('p','Načítám oznámení změn…');release.setAttribute('role','status');body.append(release);
  const base=new URL('.',document.currentScript?.src||'https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/link-compatibility.js');
  fetch(new URL('link-releases.json',base),{cache:'no-store'}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(data=>{
   if(!data||typeof data.message!=='string'||typeof data.id!=='string')throw Error();
   release.textContent=data.message;
   const key='eduvize-link-notice:'+data.id;let seen=false;try{seen=localStorage.getItem(key)==='seen';}catch{}
   if(!seen){panel.open=true;const dismiss=el('button','Beru na vědomí');dismiss.type='button';dismiss.className='edu-admin__button edu-admin__button--secondary';dismiss.onclick=()=>{try{localStorage.setItem(key,'seen');}catch{}dismiss.remove();};release.after(dismiss);}
  }).catch(()=>{release.textContent='Oznámení změn nyní nelze načíst. To neznamená, že je nutné měnit odkazy. Místní kontrola formátu zůstává dostupná.';});
  body.append(el('p','Aktualizace aplikace sama nevyžaduje nový odkaz. Starší odkazy bez označení formátu se nemažou ani automaticky nepřepisují.'));
  const note=el('p','Kontrola ověřuje adresu, formát odkazu a segment. Neověřuje dostupnost dat, oprávnění ani výsledný vzhled. Odkazy zůstávají pouze v této stránce; nevkládejte přístupové klíče.');body.append(note);
  const label=el('label','Odkazy ke kontrole · každý na samostatný řádek'),input=el('textarea');label.className='edu-admin__field';input.rows=5;input.spellcheck=false;input.setAttribute('aria-label','Odkazy ke kontrole');label.append(input);body.append(label);
  const run=el('button','Zkontrolovat odkazy');run.type='button';run.className='edu-admin__button';body.append(run);
  const summary=el('p');summary.setAttribute('role','status');body.append(summary);const results=el('ol');body.append(results);
  run.onclick=()=>{
   results.replaceChildren();const lines=input.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
   if(lines.length>500){summary.textContent='Najednou lze zkontrolovat nejvýše 500 odkazů.';return;}
   let review=0;
   for(const [i,line] of lines.entries()){
    const report=root.EduvizeLinkContract.inspect(line,{layouts:root.EduvizeNSPLayouts?.layouts}),item=el('li');
    const names={current:'Podporovaný formát odkazu',legacy:'Starší odkaz · formát bez verze',review:'Vyžaduje ověření',unknown:'Nelze posoudit'};
    if(['review','unknown'].includes(report.status))review++;
    // Do not echo URLs: query strings may contain school-specific or private settings.
    item.append(el('strong','Odkaz '+(i+1)+(report.app?' · '+report.app:'')+': '+names[report.status]));
    item.append(el('p',report.issues.length?report.issues.join(' '):report.status==='legacy'?'Stáří odkazu není důvod k výměně. Před změnou jej porovnejte s náhledem v administraci.':'Nebyl nalezen problém ve společných parametrech.'));
    results.append(item);
   }
   summary.textContent=lines.length?'Zkontrolováno '+lines.length+' odkazů. K ověření: '+review+'.':'Vložte alespoň jeden odkaz.';
  };
  host.append(panel);
 }
 root.EduvizeLinkCompatibility=Object.freeze({mount});
})(window);

