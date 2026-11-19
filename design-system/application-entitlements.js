/* Catalog hints only. Every protected server operation independently enforces grants. */
(function(root){
 'use strict';
 const auth=root.EduvizeAdminAuth;if(!auth)return;
 const apps=new Set(['weather','documents','gallery','kiosk','news','transport','menu','holidays','wisdom','school-systems','day-progress','school-calendar','styles']);
 const CACHE_KEY='eduvize-hub-license-hints-v2',CACHE_MAX_AGE=5*60*1000;
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('application-entitlements.css?v=20261119-license-corner-r5',document.currentScript?.src||location.href).href;document.head.append(stylesheet);
 let generation=0,tooltipId=0,openTrigger=null,refreshTimer,forceScheduled=false;
 function cards(){return [...document.querySelectorAll('article.card')].filter(card=>!card.hasAttribute('data-edu-operator-only')).map(card=>({card,app:card.dataset.licenseApp||card.querySelector('[data-edu-app-icon]')?.dataset.eduAppIcon})).filter(item=>apps.has(item.app));}
 function closeTooltip(){if(!openTrigger)return;const trigger=openTrigger;openTrigger=null;trigger.classList.remove('is-open');trigger.closest('article.card')?.classList.remove('edu-license-menu-open');trigger.querySelector('.edu-license-popover').hidden=true;trigger.querySelector('button').setAttribute('aria-expanded','false');}
 function showTooltip(trigger){if(openTrigger===trigger)return;closeTooltip();openTrigger=trigger;trigger.classList.add('is-open');trigger.closest('article.card')?.classList.add('edu-license-menu-open');trigger.querySelector('.edu-license-popover').hidden=false;trigger.querySelector('button').setAttribute('aria-expanded','true');}
 function badge(label,detail,included=true){
  const trigger=document.createElement('span');trigger.className='edu-license-trigger';
  const button=document.createElement('button');button.type='button';button.className='edu-license-chip'+(included?'':' edu-license-chip--denied');button.setAttribute('aria-expanded','false');
  if(included){const check=document.createElement('span');check.className='edu-license-chip__check';check.setAttribute('aria-hidden','true');check.textContent='✓';button.append(check);}
  button.append(document.createTextNode(label));
  if(label.includes('Bakaláři')){const info=document.createElement('span');info.className='edu-license-chip__info';info.setAttribute('aria-hidden','true');info.textContent='ⓘ';button.append(info);}
  const popover=document.createElement('span');popover.className='edu-license-popover';popover.id='edu-license-detail-'+(++tooltipId);popover.setAttribute('role','tooltip');popover.hidden=true;
  if(label.includes('Bakaláři')){const title=document.createElement('strong');title.textContent='Doplněk Bakaláři';popover.append(title);}
  popover.append(document.createTextNode(detail));button.setAttribute('aria-describedby',popover.id);trigger.append(button,popover);
  trigger.addEventListener('mouseenter',()=>showTooltip(trigger));trigger.addEventListener('mouseleave',()=>{if(openTrigger===trigger)closeTooltip();});
  trigger.addEventListener('focusin',()=>showTooltip(trigger));trigger.addEventListener('focusout',event=>{if(!trigger.contains(event.relatedTarget)&&openTrigger===trigger)closeTooltip();});
  button.addEventListener('click',()=>showTooltip(trigger));
  return trigger;
 }
 function render(state,grants={}){
  for(const {card,app} of cards()){
   const allowed=state==='open'||state==='error'||state==='ready'&&!!grants['app.'+app];card.dataset.licenseState=allowed?'allowed':state==='ready'?'denied':'checking';
   let message=card.querySelector('[data-license-message]');if(!message){message=document.createElement('div');message.dataset.licenseMessage='';message.className='edu-license-line';message.setAttribute('aria-label','Stav licence');card.append(message);}
   const bakalari=app==='school-systems'&&!!grants['integration.bakalari'],signature=JSON.stringify([state,allowed,bakalari]);
   if(message.dataset.licenseSignature!==signature){if(openTrigger&&message.contains(openTrigger))closeTooltip();message.dataset.licenseSignature=signature;message.hidden=state==='open'||state==='checking';message.replaceChildren();
    if(state==='ready'){
     message.append(badge(allowed?'Součást licence':'Není součástí licence',allowed?'Aplikace je zahrnutá v licenci školy.':'Aplikace není zahrnutá v licenci školy.',allowed));
     if(allowed&&app==='school-systems')message.append(badge(bakalari?'Bakaláři':'Bakaláři · mimo licenci',bakalari?'Je zahrnutý v licenci školy.':'Není zahrnutý v licenci školy.',bakalari));
    }else if(state==='error'){const hint=document.createElement('span');hint.className='edu-admin__hint';hint.setAttribute('role','status');hint.textContent='Oprávnění nyní nelze ověřit';message.append(hint);}
   }
   for(const link of card.querySelectorAll('a[href]')){if(allowed)link.removeAttribute('aria-disabled');else link.setAttribute('aria-disabled','true');}
  }
 }
 function cacheRead(identity){try{const item=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');return item?.identity===identity&&Number.isFinite(item.at)&&item.at<=Date.now()&&item.effective&&typeof item.effective==='object'?item:null;}catch{return null;}}
 function cacheWrite(identity,effective){try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({identity,at:Date.now(),effective}));}catch{}}
 async function fingerprint(token){try{const bytes=new TextEncoder().encode(token),hash=await root.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash)).map(value=>value.toString(16).padStart(2,'0')).join('');}catch{return null;}}
 function grants(value){const effective={};for(const app of apps)effective['app.'+app]=!!value['app.'+app];effective['integration.bakalari']=!!value['integration.bakalari'];return effective;}
 async function refresh(force=false){
  const request=++generation,state=auth.status(),token=auth.getToken('configurations');
  if(!state.connected||!state.schoolId||!token){render('open');return;}
  const digest=await fingerprint(token);if(request!==generation||auth.getToken('configurations')!==token)return;
  const identity=digest?[state.schoolId,state.profileId,digest].join(':'):null,cached=identity&&cacheRead(identity);
  if(cached)render('ready',cached.effective);else render('open');
  if(cached&&Date.now()-cached.at<CACHE_MAX_AGE&&!force)return;
  try{
   const response=await fetch(location.origin+'/api/account/entitlements',{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error();const data=await response.json();if(!data.effective||typeof data.effective!=='object')throw Error();
   if(request===generation&&auth.getToken('configurations')===token){const effective=grants(data.effective);render('ready',effective);if(identity)cacheWrite(identity,effective);}
  }catch{if(request===generation&&auth.getToken('configurations')===token&&!cached)render('error');}
 }
 function schedule(force=false){forceScheduled=forceScheduled||force;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{const next=forceScheduled;forceScheduled=false;void refresh(next);},40);}
 document.addEventListener('click',event=>{const card=event.target.closest('a[href]')?.closest('article.card');if(card?.dataset.licenseState&&card.dataset.licenseState!=='allowed'){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('pointerdown',event=>{if(openTrigger&&!openTrigger.contains(event.target))closeTooltip();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&openTrigger){const button=openTrigger.querySelector('button');closeTooltip();button.focus();event.preventDefault();}});
 root.addEventListener('eduvize-admin-auth-change',()=>schedule(true));auth.ready.then(()=>schedule());document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
})(window);
