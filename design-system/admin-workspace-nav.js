/* Approved workspace navigation. No auth, profile or save handlers are replaced. */
(function(root){
 'use strict';
 function mount(){
  if(document.getElementById('edu-workspace-nav'))return;
  const main=document.querySelector('main.edu-admin-page');
  if(!main||!/(?:^|\/)(?:ucet|aplikace)\.html$/.test(root.location.pathname))return;
  const account='/eduvize-styly/ucet.html',apps='/eduvize-styly/aplikace.html';
  const aside=document.createElement('aside');aside.id='edu-workspace-nav';aside.className='edu-workspace-nav';
  const brand=document.createElement('a');brand.href=apps;brand.target='_self';brand.className='edu-workspace-brand';brand.textContent='Eduvize';
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Hlavní navigace');
  const entries=[['Aplikace',apps],['Účet',account+'#account'],['Karta školy',account+'#school-card'],['Profily a konfigurace',account+'#configurations'],['Licence školy',account+'#account-license']];
  for(const [label,href] of entries){
   const link=document.createElement('a');link.textContent=label;link.href=href;link.target='_self';
   const target=new URL(href,root.location.origin),currentHash=root.location.hash||'#account';
   if(target.pathname===root.location.pathname&&(!target.hash||target.hash===currentHash))link.setAttribute('aria-current','page');
   link.addEventListener('click',()=>toggle(false));nav.append(link);
  }
  const service=document.createElement('a');service.href='/eduvize-styly/licence.html';service.target='_self';service.textContent='Správa služby';service.hidden=true;nav.append(service);
  const menu=document.createElement('button');menu.type='button';menu.className='edu-workspace-menu';menu.textContent='Menu';menu.setAttribute('aria-controls',aside.id);menu.setAttribute('aria-expanded','false');
  function toggle(open){document.body.classList.toggle('edu-workspace-open',open);menu.setAttribute('aria-expanded',String(open));}
  menu.addEventListener('click',()=>toggle(menu.getAttribute('aria-expanded')!=='true'));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){toggle(false);if(document.activeElement&&aside.contains(document.activeElement))menu.focus();}});
  function identity(){
   const state=root.EduvizeAdminAuth?.status?.();
   const connected=state?.connected===true;
   // The sidebar is a school workspace. Preserve the existing signed-out login layout.
   document.body.classList.toggle('edu-workspace-enabled',connected);
   aside.hidden=!connected;menu.hidden=!connected;
   service.hidden=!(connected&&!state.schoolId&&Array.isArray(state.scopes)&&state.scopes.includes('styles'));
   for(const link of nav.querySelectorAll('a'))if(link!==service&&link.getAttribute('href')!==apps&&link.getAttribute('href')!==account+'#account')link.hidden=!(connected&&state.schoolId);
   if(!connected)toggle(false);
  }
  aside.append(brand,nav);document.body.prepend(aside,menu);
  root.addEventListener('eduvize-admin-auth-change',identity);identity();root.EduvizeAdminAuth?.ready?.then(identity);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
