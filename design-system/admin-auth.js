/* Shared short-lived administration session. Never stores Microsoft/admin keys. */
(function(root){
 if(root.EduvizeAdminAuth)return;
 const CENTRAL='https://eduvize-design-system-api.onrender.com',DOCS='https://eduvize-dokumenty-api.onrender.com';
 const HUB='https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html',KEY='eduvize-admin-session-v1';
 const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
 const isAccount=location.origin==='https://pborovicka72-dotcom.github.io'&&location.pathname==='/eduvize-styly/ucet.html';
 const isHub=location.origin==='https://pborovicka72-dotcom.github.io'&&location.pathname==='/eduvize-styly/aplikace.html';
 let session=null,validated=false,message='',expiryTimer,banner,refreshVersion=0,lastState='';
 async function sessionFetch(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{return await fetch(url,{...options,redirect:'error',signal:controller.signal});}catch(error){if(error.name==='AbortError')throw Error('Ověření přihlášení trvá příliš dlouho. Zkuste to znovu.');throw error;}finally{clearTimeout(timer);}}
 function read(storage){try{const s=JSON.parse(storage.getItem(KEY)||'null');return s&&typeof s.token==='string'&&s.token.startsWith('edu_')&&Number.isFinite(s.expiresAt)&&s.expiresAt*1000>Date.now()?s:null;}catch{return null}}
 function stored(){try{return location.origin==='https://pborovicka72-dotcom.github.io'?read(localStorage)||read(sessionStorage):read(sessionStorage)}catch{return null}}
 function save(s,central=false){refreshVersion++;session=s;validated=true;try{(central?localStorage:sessionStorage).setItem(KEY,JSON.stringify(s));}catch{}changed();}
 function clear(all=false){refreshVersion++;const previous=session?.token;session=null;validated=false;try{sessionStorage.removeItem(KEY);if(isAccount||all||(location.origin==='https://pborovicka72-dotcom.github.io'&&read(localStorage)?.token===previous))localStorage.removeItem(KEY);}catch{}changed();}
 function getToken(scope){return validated&&session?.expiresAt*1000>Date.now()&&(!scope||session.scopes.includes(scope))?session.token:''}
 function cleanUrl(){const u=new URL(location.href);const hash=new URLSearchParams(u.hash.slice(1));if(hash.has('edu-auth-code'))u.hash=hash.get('edu-return-hash')||'';return u;}
 function loginUrl(returnTo=cleanUrl().href){const u=new URL(ACCOUNT);if(!isAccount){u.searchParams.set('returnTo',returnTo);if(getToken())u.searchParams.set('manage','1');}u.hash='account';return u.href}
 function changed(){clearTimeout(expiryTimer);if(session){expiryTimer=setTimeout(()=>{if(session?.expiresAt*1000>Date.now()){changed();return;}message='Přihlášení vypršelo. Obnovte je na stránce Účet a konfigurace.';clear();},Math.max(1,Math.min(2147483647,session.expiresAt*1000-Date.now())));}renderBanner();const state=JSON.stringify([!!getToken(),validated?session?.scopes:[],validated?session?.profileId||'':'',session?.expiresAt||0,message]);if(state!==lastState){lastState=state;root.dispatchEvent(new CustomEvent('eduvize-admin-auth-change'));}}
 async function json(response){const data=await response.json().catch(()=>({}));if(!response.ok){const e=Error(typeof data.detail==='string'?data.detail:'Služba není dostupná ('+response.status+').');e.status=response.status;throw e;}return data;}
 async function refresh(){
  const version=++refreshVersion,candidate=stored(),sameToken=session?.token===candidate?.token;session=candidate;if(!sameToken)validated=false;
  if(!session){changed();return;}
  const token=session.token;
  try{const data=await json(await sessionFetch(CENTRAL+'/api/admin-session',{cache:'no-store',headers:{Authorization:'Bearer '+token}}));if(version!==refreshVersion||stored()?.token!==token)return;session={...session,...data};validated=true;message='';changed();}
  catch(error){if(version!==refreshVersion||stored()?.token!==token)return;message=error.message;if(error.status===401){clear();}else changed();}
 }
 async function initialize(){
  try{sessionStorage.removeItem('eduvize-documents-admin-token');}catch{}
  const u=new URL(location.href),hash=new URLSearchParams(u.hash.slice(1)),code=hash.get('edu-auth-code');
  if(code){
   u.hash=hash.get('edu-return-hash')||'';history.replaceState(null,'',u.href);
   try{save(await json(await sessionFetch(CENTRAL+'/api/admin-session/redeem',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})})));if(location.origin==='https://pborovicka72-dotcom.github.io'&&read(localStorage))await refresh();return;}
   catch(error){message=error.message;clear();return;}
  }
  await refresh();
 }
 function need(scope){message=scope==='styles'?'Pro správu stylů se přihlaste na stránce Účet a konfigurace.':'Pro práci s OneDrive se přihlaste na stránce Účet a konfigurace.';renderBanner();return message;}
 function failure(status,text=''){
  if(status===401){message='Přihlášení vypršelo. Obnovte je na stránce Účet a konfigurace.';clear();}
  else if(status===403){message='Pro tuto administraci doplňte přihlášení na stránce Účet a konfigurace.';renderBanner();}
  else if(status===503&&/OneDrive|připojení vypršelo/i.test(text)){message='Připojení OneDrive je potřeba obnovit na stránce Účet a konfigurace.';renderBanner();}
 }
 async function authorizedFetch(value,options={},scope='documents'){
  await ready;const token=getToken(scope);if(!token)throw Error(need(scope));
  const u=new URL(value,location.href),allowed=scope==='styles'?u.origin===CENTRAL&&u.pathname.startsWith('/api/design-system/'):u.origin===DOCS&&u.pathname.startsWith('/api/admin/');
  if(!allowed)throw Error('Nepovolená adresa administračního požadavku.');
  const response=await fetch(u.href,{...options,cache:'no-store',redirect:'error',headers:{...(options.headers||{}),Authorization:'Bearer '+token}});
  if(!response.ok){const data=await response.clone().json().catch(()=>({}));failure(response.status,typeof data.detail==='string'?data.detail:'');}
  return response;
 }
 async function login(stylesKey,documentsKey,remember=false){
  await ready;
  const headers={'Content-Type':'application/json'};if(getToken())headers.Authorization='Bearer '+session.token;
  const data=await json(await sessionFetch(CENTRAL+'/api/admin-session',{method:'POST',cache:'no-store',headers,body:JSON.stringify({stylesKey,documentsKey,remember:remember===true})}));
  message='';save(data,true);return data;
 }
 async function selectProfile(profileId){await ready;if(!getToken())throw Error(need());const data=await json(await sessionFetch(CENTRAL+'/api/admin-session/profile',{method:'PUT',cache:'no-store',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({profileId})}));save({...session,profileId:data.profileId},true);return data.profileId;}
 async function logout(){try{if(session)await json(await sessionFetch(CENTRAL+'/api/admin-session',{method:'DELETE',cache:'no-store',headers:{Authorization:'Bearer '+session.token}}));}finally{message='Odhlášeno ze správy Eduvize.';clear(true);}}
 async function handoff(returnTo){await ready;if(!getToken())throw Error(need());const data=await json(await sessionFetch(CENTRAL+'/api/admin-session/handoff',{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({returnTo})}));const u=new URL(returnTo),hash=u.hash;u.hash=new URLSearchParams({'edu-auth-code':data.code,...(hash?{'edu-return-hash':hash}:{})}).toString();return u.href;}
 function renderBanner(){
  if(isAccount||isHub||!document.body)return;
  if(!banner){banner=document.createElement('aside');banner.className='edu-admin-session';banner.setAttribute('role','status');const title=document.createElement('span'),link=document.createElement('a');title.className='edu-admin-session__status';link.className='edu-admin__button edu-admin__button--secondary';banner.append(title,link);const header=document.querySelector('main .edu-page-header');if(header)header.after(banner);else document.querySelector('main')?.prepend(banner);}
  banner.querySelector('span').textContent=message||(getToken()?'Přihlášeno do správy Eduvize.':'Přihlášení a připojení OneDrive se spravuje na stránce Účet a konfigurace.');const a=banner.querySelector('a');a.href=loginUrl();a.textContent=getToken()?'Účet a připojení':'Přejít na přihlášení';
 }
 const ready=initialize();
 root.EduvizeAdminAuth=Object.freeze({ready,refresh,getToken,fetch:authorizedFetch,login,logout,handoff,selectProfile,loginUrl,need,failure,status:()=>({connected:!!getToken(),profileId:validated?session?.profileId||'':'',scopes:validated?[...session.scopes]:[],expiresAt:session?.expiresAt||0,message}),CENTRAL,DOCS,HUB,ACCOUNT});
 const linkLibrary=document.createElement('script');linkLibrary.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/generated-links.js?v=20261102-groups-3';document.head.append(linkLibrary);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderBanner,{once:true});else renderBanner();
 root.addEventListener('storage',e=>{if(e.key===KEY)refresh();});
})(window);

