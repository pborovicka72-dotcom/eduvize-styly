(function(root){
 const baseKey='eduvize-school-card-preview-v1';
 const key=()=>baseKey+ (root.EduvizeAdminAuth?.status().schoolId?':'+root.EduvizeAdminAuth.status().schoolId:'');
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 function schoolsOnly(items){const groups=new Map(),priority={ZS:0,SS:1,KON:2,VOS:3,ZUS:4,MS:5};for(const item of items){if(!(item.school_type in priority))continue;const previous=groups.get(item.red_izo);if(!previous)groups.set(item.red_izo,{...item,school_izos:[item.izo],school_types:[item.school_type]});else{previous.school_izos=[...new Set([...previous.school_izos,item.izo])];previous.school_types=[...new Set([...previous.school_types,item.school_type])];if(priority[item.school_type]<priority[previous.school_type])Object.assign(previous,{...item,school_izos:previous.school_izos,school_types:previous.school_types});}}return [...groups.values()];}
 function search(items,query){const q=normalize(query),numeric=/^\d+$/.test(q),parts=q.split(' ');if(q.length<2)return [];return items.filter(s=>numeric?[s.red_izo,s.ico].some(v=>String(v||'').startsWith(q)):parts.every(p=>normalize([s.name,s.municipality,...(s.school_types||[s.school_type])].join(' ')).includes(p))).sort((a,b)=>Number([b.red_izo,b.ico].includes(q))-Number([a.red_izo,a.ico].includes(q))||a.name.localeCompare(b.name,'cs'));}
 function calendarDistrict(district){const match=/^Praha (\d+)$/.exec(district||'');if(!match)return district;return [1,2,3,4,5,11,12,13,16].includes(Number(match[1]))?'Praha 1 až 5':'Praha 6 až 10';}
 function countSchools(n){const form=new Intl.PluralRules('cs').select(n);return (form==='one'?'Nalezena ':form==='few'?'Nalezeny ':'Nalezeno ')+n+' '+(form==='one'?'škola':form==='few'?'školy':'škol');}
 root.EduvizeSchoolCard={normalize,search,schoolsOnly,calendarDistrict,countSchools};
 if(typeof document==='undefined'||!document.getElementById('schoolForm'))return;
 const source=new URL(document.currentScript.src),$=id=>document.getElementById(id),fields=['name','school_type','red_izo','izo','ico','address','municipality','district','region'];
 let school={};
 const summary=$('school-summary'),editor=$('school-editor'),lookup=$('school-lookup');
 let editing=false,searching=false,snapshot=null;
 function drawCard(){
   if(!summary)return;
   const hasSchool=!!school.name;
   summary.replaceChildren();
   const labels={name:'Název školy',school_type:'Typ školy',red_izo:'RED IZO',izo:'IZO',ico:'IČO',address:'Adresa',municipality:'Obec',district:'Okres',region:'Kraj'};
   const list=document.createElement('dl');list.className='edu-admin__field-grid';
   for(const id of fields){if(!school[id])continue;const group=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');term.textContent=labels[id];value.textContent=id==='school_type'?($('school_type').selectedOptions[0]?.textContent||school[id]):school[id];value.style.margin='4px 0 16px';group.append(term,value);list.append(group);}
   summary.append(list);summary.hidden=!hasSchool||editing;editor.hidden=hasSchool&&!editing;
   lookup.hidden=hasSchool&&!searching;
   $('school-edit').hidden=!hasSchool||editing;$('school-change').hidden=!editing||!hasSchool;$('school-cancel').hidden=!editing||!hasSchool;
   $('schoolSaveLocal').hidden=hasSchool&&!editing;
 }
 if(summary){
   $('school-edit').onclick=()=>{snapshot=read();editing=true;searching=false;drawCard();$('name').focus();};
   $('school-change').onclick=()=>{searching=true;resetSearch();drawCard();query.focus();};
   $('school-cancel').onclick=()=>{if(snapshot)apply(snapshot);editing=false;searching=false;resetSearch();snapshot=null;drawCard();};
   document.addEventListener('eduvize-configuration-saved',()=>{school=read();editing=false;searching=false;snapshot=null;resetSearch();drawCard();});
 }
 function apply(item){school={...item};for(const id of fields)$(id).value=item[id]||'';}
 function read(){const next={...school};for(const id of fields)next[id]=$(id).value.trim();next.calendar_district=calendarDistrict(next.district);return next;}
 function validate(){if(!$('schoolForm').reportValidity())throw Error('Zkontrolujte údaje školy.');}
 function localSave(){validate();const next=read();localStorage.setItem(key(),JSON.stringify(next));school=next;$('status').textContent='Karta školy je uložená v tomto prohlížeči.';document.dispatchEvent(new CustomEvent('eduvize-configuration-saved'));}
 root.EduvizeAdminAuth?.ready.then(()=>{try{school=JSON.parse(localStorage.getItem(key())||'{}')||{};}catch{}apply(school);drawCard();});
 apply(school);drawCard();$('schoolSaveLocal').onclick=()=>{try{localSave();}catch(e){$('status').textContent=e.message;}};$('schoolForm').onsubmit=e=>e.preventDefault();
 root.EduvizeProfileAdapter={app:'school-identity',read:()=>({schemaVersion:1,data:read()}),validate,isEditing:()=>editing||searching,apply(config){if(!config||config.schemaVersion!==1||!config.data||typeof config.data!=='object'||Array.isArray(config.data))throw Error('Neplatná karta školy v profilu.');apply(config.data);localStorage.setItem(key(),JSON.stringify(school));editing=false;searching=false;drawCard();},loadedMessage:'Karta školy načtena z OneDrive.'};
 root.dispatchEvent(new CustomEvent('eduvize-profile-adapter-ready'));
 let registryPromise;
 function registry(){if(!registryPromise)registryPromise=(async()=>{const r=await fetch(new URL('schools.json.gz?v=20260930',source));if(!r.ok)throw Error('Rejstřík škol se nepodařilo načíst. Zkuste to znovu.');const bytes=new Uint8Array(await r.arrayBuffer());const raw=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);const data=JSON.parse(raw);$('school-source').textContent='Rejstřík MŠMT · stav k '+data.date.split('-').reverse().join('.')+'.';return schoolsOnly(data.items.map(row=>Object.fromEntries(data.fields.map((k,i)=>[k,row[i]||'']))));})().catch(e=>{registryPromise=null;throw e});return registryPromise;}
 const query=$('school-query'),host=$('school-results');let version=0,timer,index=-1;
 function close(){host.replaceChildren();query.setAttribute('aria-expanded','false');query.removeAttribute('aria-activedescendant');index=-1;}
 function resetSearch(){++version;clearTimeout(timer);query.value='';close();$('school-search-status').textContent='Zadejte alespoň dva znaky názvu školy, RED IZO nebo IČO.';}
 function choose(item){++version;clearTimeout(timer);if(!snapshot)snapshot=read();apply(item);editing=true;searching=false;drawCard();query.value=item.name;close();$('school-search-status').textContent='Škola vybrána.';$('status').textContent='Údaje načteny. Zkontrolujte je a uložte kartu.';document.dispatchEvent(new CustomEvent('eduvize-profile-change'));}
 async function suggest(){const current=++version,q=query.value.trim();if(q.length<2){close();$('school-search-status').textContent='Zadejte alespoň dva znaky.';return;}close();$('school-search-status').textContent='Hledám školy…';try{const matches=search(await registry(),q);if(current!==version)return;$('school-search-status').textContent=matches.length?countSchools(matches.length)+(matches.length>20?'. Upřesněte hledání; zobrazuji prvních 20.':'. Klikněte na požadovanou školu.'):'Žádná škola nenalezena.';for(const [i,item] of matches.slice(0,20).entries()){const row=document.createElement('button');row.type='button';row.id='school-option-'+i;row.className='school-result';row.setAttribute('role','option');row.setAttribute('aria-selected','false');const title=document.createElement('strong'),info=document.createElement('span');title.textContent=item.name;info.textContent=[item.address,'RED IZO '+item.red_izo,'IČO '+item.ico].join(' · ');row.append(title,info);row.onclick=()=>choose(item);host.append(row);}query.setAttribute('aria-expanded',String(host.childElementCount>0));}catch(e){if(current===version)$('school-search-status').textContent=e.message;}}
 query.addEventListener('input',()=>{searching=true;++version;clearTimeout(timer);timer=setTimeout(suggest,200);});
 query.addEventListener('keydown',e=>{const rows=[...host.children];if(e.key==='Escape'){++version;clearTimeout(timer);close();return;}if(['ArrowDown','ArrowUp'].includes(e.key)&&rows.length){e.preventDefault();index=index<0?(e.key==='ArrowDown'?0:rows.length-1):(index+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows.forEach((row,i)=>row.setAttribute('aria-selected',String(i===index)));query.setAttribute('aria-activedescendant',rows[index].id);rows[index].scrollIntoView({block:'nearest'});}else if(e.key==='Enter'&&index>=0&&rows[index]){e.preventDefault();rows[index].click();}});
 $('school-search').onsubmit=e=>{e.preventDefault();clearTimeout(timer);suggest();};
 document.addEventListener('click',e=>{if(!e.target.closest('#school-search,#school-results')){++version;clearTimeout(timer);close();}});
})(typeof window==='undefined'?globalThis:window);
