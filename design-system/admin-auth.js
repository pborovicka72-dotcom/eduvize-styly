/* Shared short-lived administration session. Never stores Microsoft/admin keys. */
(function(root){
 if(root.EduvizeAdminAuth)return;
 const CENTRAL='https://eduvize-design-system-api.onrender.com',DOCS='https://eduvize-dokumenty-api.onrender.com';
 const HUB='https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html',KEY='eduvize-admin-session-v1';
 const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
 const isAccount=location.origin==='https://pborovicka72-dotcom.github.io'&&location.pathname==='/eduvize-styly/ucet.html';
 const isHub=location.origin==='https://pborovicka72-dotcom.github.io'&&location.pathname==='/eduvize-styly/aplikace.html';
 let session=null,validated=false,message='',expiryTimer,banner,refreshVersion=0,lastState='';

 function requestProgress(text){root.dispatchEvent(new CustomEvent('eduvize-admin-request-progress',{detail:{text}}));}
 async function sessionFetch(url,options={}){
  const method=(options.method||'GET').toUpperCase(),safe=method==='GET'||method==='HEAD';
  const deadline=Date.now()+180000;
  for(let attempt=0;;attempt++){
   const controller=new AbortController();
   const remaining=deadline-Date.now();
   if(remaining<=0)throw Error('Služba se zatím neprobudila. Uložené přihlášení zůstává zachované; zkuste to znovu.');
   const timer=setTimeout(()=>controller.abort(),Math.min(safe?45000:180000,remaining));
   const progress=setTimeout(()=>requestProgress('Čekám na službu. Pokud je uspaná, probouzí se; chvíli prosím počkejte…'),8000);
   let response;
   try{
    response=await fetch(url,{...options,redirect:'error',signal:controller.signal});
    const transient=[502,503,504].includes(response.status);
    // Repeat reads and an explicitly rejected login, never an ambiguous mutation.
    const login=method==='POST'&&new URL(url).pathname==='/api/admin-session';
    if(!transient||(!safe&&!login)||attempt>=3||Date.now()>=deadline)return response;
   }catch(error){
    if(!safe||attempt>=3||Date.now()>=deadline){
     if(error.name==='AbortError'||error instanceof TypeError)throw Error('Služba nyní neodpovídá. Uložené přihlášení zůstává zachované; zkuste to znovu.');
     throw error;
    }
   }finally{clearTimeout(timer);clearTimeout(progress);}
   requestProgress('Čekám na spuštění služby a automaticky opakuji ověření…');
   await new Promise(resolve=>setTimeout(resolve,Math.min(3000,Math.max(0,deadline-Date.now()))));
  }
 }

 function read(storage){try{const s=JSON.parse(storage.getItem(KEY)||'null');return s&&typeof s.token==='string'&&s.token.startsWith('edu_')&&Number.isFinite(s.expiresAt)&&s.expiresAt*1000>Date.now()?s:null;}catch{return null}}
 function stored(){try{return location.origin==='https://pborovicka72-dotcom.github.io'?(sessionStorage.getItem('eduvize-admin-session-fallback')==='1'?read(sessionStorage)||read(localStorage):read(localStorage)||read(sessionStorage)):read(sessionStorage)}catch{return null}}
 function save(s,central=false){refreshVersion++;session=s;validated=true;try{(central?localStorage:sessionStorage).setItem(KEY,JSON.stringify(s));if(central){try{sessionStorage.setItem(KEY,JSON.stringify(s));}catch{}sessionStorage.removeItem('eduvize-admin-session-fallback');}}catch{try{sessionStorage.setItem(KEY,JSON.stringify(s));sessionStorage.setItem('eduvize-admin-session-fallback','1');message='Prohlížeč nepovolil trvalé zapamatování. Přihlášení platí v této kartě.';}catch{message='Prohlížeč nepovolil zapamatování přihlášení.';}}changed();}
 function clear(all=false){refreshVersion++;const previous=session?.token;session=null;validated=false;try{if(all||read(sessionStorage)?.token===previous)sessionStorage.removeItem(KEY);if(all||read(localStorage)?.token===previous)localStorage.removeItem(KEY);}catch{}changed();}
 function getToken(scope){return validated&&session?.expiresAt*1000>Date.now()&&(!scope||session.scopes.includes(scope))?session.token:''}
 function cleanUrl(){const u=new URL(location.href);const hash=new URLSearchParams(u.hash.slice(1));if(hash.has('edu-auth-code'))u.hash=hash.get('edu-return-hash')||'';return u;}
 function loginUrl(returnTo=cleanUrl().href){const u=new URL(ACCOUNT);if(!isAccount){u.searchParams.set('returnTo',returnTo);if(getToken())u.searchParams.set('manage','1');}u.hash='account';return u.href}
 function changed(){clearTimeout(expiryTimer);if(session){expiryTimer=setTimeout(()=>{if(session?.expiresAt*1000>Date.now()){changed();return;}message='Přihlášení vypršelo. Obnovte je na stránce Účet a konfigurace.';clear();},Math.max(1,Math.min(2147483647,session.expiresAt*1000-Date.now())));}renderBanner();const state=JSON.stringify([!!getToken(),validated?session?.scopes:[],validated?session?.profileId||'':'',validated?session?.schoolId||'':'',session?.expiresAt||0,message]);if(state!==lastState){lastState=state;root.dispatchEvent(new CustomEvent('eduvize-admin-auth-change'));}}
 async function json(response){const data=await response.json().catch(()=>({}));if(!response.ok){const e=Error(typeof data.detail==='string'?data.detail:'Služba není dostupná ('+response.status+').');e.status=response.status;throw e;}return data;}
 async function refresh(){
  const version=++refreshVersion,candidate=stored(),sameToken=session?.token===candidate?.token;session=candidate;if(!sameToken)validated=false;
  if(!session){changed();return;}
  const token=session.token;
  try{const data=await json(await sessionFetch(CENTRAL+'/api/admin-session',{cache:'no-store',headers:{Authorization:'Bearer '+token}}));if(version!==refreshVersion||stored()?.token!==token)return;session={...session,...data};validated=true;try{sessionStorage.setItem(KEY,JSON.stringify(session));}catch{}message='';changed();}
  catch(error){if(version!==refreshVersion||stored()?.token!==token)return;message=error.message;if(error.status===401){clear();}else changed();}
 }
 async function loginMicrosoft(remember=false){
  if(!isAccount)throw Error('Přihlášení Microsoftem otevřete na stránce účtu.');
  const verifier=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const proof=btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const pending=JSON.stringify({verifier,createdAt:Date.now()});
  sessionStorage.setItem('eduvize-ms-login-v1',pending);try{localStorage.setItem('eduvize-ms-login-v1',pending);}catch{}
  const url=new URL(DOCS+'/auth/microsoft/login');url.searchParams.set('proof',proof);url.searchParams.set('remember',remember?'true':'false');location.assign(url.href);
 }
 async function initialize(){
  try{sessionStorage.removeItem('eduvize-documents-admin-token');}catch{}
  const u=new URL(location.href),hash=new URLSearchParams(u.hash.slice(1)),code=hash.get('edu-auth-code');
  const msError=hash.get('edu-ms-error');
  if(msError&&isAccount){u.hash='account';history.replaceState(null,'',u.href);sessionStorage.removeItem('eduvize-ms-login-v1');await refresh();message=msError.slice(0,400);changed();return;}
  const msTicket=hash.get('edu-ms-ticket'),emailTicket=hash.get('edu-email-ticket'),loginTicket=emailTicket||msTicket,loginKind=emailTicket?'email':'microsoft',pendingKey=emailTicket?'eduvize-email-login-v1':'eduvize-ms-login-v1';
  if(loginTicket)u.searchParams.delete('edu-login-return');
  if(loginTicket){
   u.hash='account';history.replaceState(null,'',u.href);
   try{
    if(!isAccount)throw Error('Přihlášení otevřete na stránce účtu.');
    let raw=sessionStorage.getItem(pendingKey);try{raw=raw||localStorage.getItem(pendingKey);localStorage.removeItem(pendingKey);}catch{}
    const pending=JSON.parse(raw||'null');sessionStorage.removeItem(pendingKey);
    if(!pending?.verifier||Date.now()-pending.createdAt>12*60*1000)throw Error('Přihlášení nebylo zahájeno v tomto prohlížeči nebo vypršelo.');
    const existing=stored();
    const data=await json(await sessionFetch(CENTRAL+'/api/admin-session/'+loginKind,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',...(existing?.token?{Authorization:'Bearer '+existing.token}:{})},body:JSON.stringify({ticket:loginTicket,verifier:pending.verifier})}));
    message='';save(data,true);return;
   }catch(error){message=error.message;changed();return;}
  }
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
  const response=await sessionFetch(u.href,{...options,cache:'no-store',redirect:'error',headers:{...(options.headers||{}),Authorization:'Bearer '+token}});
  if(!response.ok){const data=await response.clone().json().catch(()=>({}));if(session?.token===token&&stored()?.token===token)failure(response.status,typeof data.detail==='string'?data.detail:'');}
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
 async function handoff(returnTo){await ready;if(!getToken())throw Error(need());const data=await json(await sessionFetch(CENTRAL+'/api/admin-session/handoff',{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({returnTo})}));const u=new URL(returnTo),hash=u.hash;if(session?.profileId)u.searchParams.set('edu-profile',session.profileId);u.hash=new URLSearchParams({'edu-auth-code':data.code,...(hash?{'edu-return-hash':hash}:{})}).toString();return u.href;}
 function renderBanner(){
  if(isAccount||isHub||!document.body)return;
  if(!banner){banner=document.createElement('aside');banner.className='edu-admin-session';banner.setAttribute('role','status');const title=document.createElement('span'),link=document.createElement('a');title.className='edu-admin-session__status';link.className='edu-admin__button edu-admin__button--secondary';banner.append(title,link);const header=document.querySelector('main .edu-page-header');if(header)header.after(banner);else document.querySelector('main')?.prepend(banner);}
  banner.querySelector('span').textContent=message||(getToken()?'Přihlášeno do správy Eduvize.':'Přihlášení a připojení OneDrive se spravuje na stránce Účet a konfigurace.');const a=banner.querySelector('a');a.href=loginUrl();a.textContent=getToken()?'Účet a připojení':'Přejít na přihlášení';
 }
 const ready=initialize();
 root.EduvizeAdminAuth=Object.freeze({ready,refresh,getToken,fetch:authorizedFetch,login,loginMicrosoft,logout,handoff,selectProfile,loginUrl,need,failure,status:()=>({connected:!!getToken(),profileId:validated?session?.profileId||'':'',schoolId:validated?session?.schoolId||'':'',scopes:validated?[...session.scopes]:[],expiresAt:session?.expiresAt||0,message}),CENTRAL,DOCS,HUB,ACCOUNT});
 const linkLibrary=document.createElement('script');linkLibrary.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/generated-links.js?v=20261103-feedback-anchor-1';document.head.append(linkLibrary);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderBanner,{once:true});else renderBanner();
 root.addEventListener('storage',e=>{if(e.key===KEY){refresh();}});
})(window);


