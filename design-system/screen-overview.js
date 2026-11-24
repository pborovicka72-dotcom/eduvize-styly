/* Read the school's existing screen inventory for the selected profile. */
(function(root){
 'use strict';
 const host=document.querySelector('[data-edu-screen-overview]');
 if(!host)return;
 const count=host.querySelector('[data-screen-count]');
 const status=host.querySelector('[data-screen-status]');
 const list=host.querySelector('[data-screen-list]');
 let generation=0;

 async function read(path,token,signal){
  const response=await fetch(path,{cache:'no-store',redirect:'error',signal,headers:{Authorization:'Bearer '+token}});
  if(!response.ok)throw Error(String(response.status));
  return response.json();
 }

 async function load(){
  const version=++generation;
  if(location.hash!=='#odkazy')return;
  count.textContent='—';
  status.textContent='Načítám evidované obrazovky…';
  list.replaceChildren();
  const auth=root.EduvizeAdminAuth;
  try{await auth?.ready;}catch{}
  if(version!==generation)return;
  const identity=auth?.status();
  const token=auth?.getToken('configurations');
  if(!token||!identity?.schoolId||!identity?.profileId){
   status.textContent='Pro zobrazení obrazovek se přihlaste a vyberte profil školy.';
   return;
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  let screens,devices;
  try{
   [screens,devices]=await Promise.allSettled([
    read('/api/account/screens',token,controller.signal),
    read('/api/account/devices',token,controller.signal)
   ]);
  }finally{clearTimeout(timeout);}
  if(version!==generation||auth.status().schoolId!==identity.schoolId||auth.status().profileId!==identity.profileId)return;
  if(screens.status!=='fulfilled'||!Array.isArray(screens.value.items)){
   status.textContent='Evidenci obrazovek se nepodařilo načíst. Zkuste to znovu.';
   return;
  }
  const assigned=screens.value.items.filter(item=>item.state==='declared'&&item.profileId===identity.profileId);
  const active=new Set(devices.status==='fulfilled'&&Array.isArray(devices.value.items)
   ?devices.value.items.filter(item=>item.state==='active').map(item=>item.screenId):[]);
  count.textContent=String(assigned.length);
  status.textContent=assigned.length?'Přiřazené k vybranému profilu':'K tomuto profilu není přiřazená žádná obrazovka.';
  list.replaceChildren(...assigned.map(item=>{
   const row=document.createElement('li');
   const name=document.createElement('strong');name.textContent=item.name||'Obrazovka';
   const detail=document.createElement('small');
   detail.textContent=devices.status==='fulfilled'
    ?active.has(item.id)?'Aktivní instalace':'Bez aktivní instalace'
    :'Stav instalace není dostupný';
   row.append(name,detail);
   return row;
  }));
 }
 root.addEventListener('hashchange',load);
 root.addEventListener('eduvize-admin-auth-change',load);
 root.addEventListener('eduvize-profile-selected',load);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})(window);
