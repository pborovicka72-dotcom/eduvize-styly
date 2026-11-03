/* A verified session controls the account view and visibility of school information. */
(function(root){
 const auth=root.EduvizeAdminAuth,host=document.getElementById('edu-account-panel');if(!auth||!host)return;
 if(root.top!==root.self){const link=document.createElement('a');link.href=auth.ACCOUNT;link.target='_top';link.rel='noopener';link.textContent='Otevřít přihlášení';host.replaceChildren(link);return;}
 const $=id=>host.querySelector('#'+id),message=$('account-message');
 let initializing=true,busy=false,driveConnected=false,signingOut=false;
 const params=new URL(location.href).searchParams;
 let requested=params.get('returnTo'),manage=params.get('manage')==='1'||params.get('edu-link-pending')==='1'||new URLSearchParams(location.hash.slice(1)).has('edu-confirm');
 try{if(requested)sessionStorage.setItem('eduvize-account-return',requested);else if(params.get('onedrive')==='connected'){requested=sessionStorage.getItem('eduvize-account-return');manage=!!requested;}}catch{}
 function say(text){message.textContent=text;}
 function status(){
  const s=auth.status(),connected=s.connected&&!initializing&&!signingOut;
  host.setAttribute('aria-labelledby',connected?'account-connected-title':'account');
  document.body.dataset.accountState=initializing?'loading':connected?'signed-in':'signed-out';
  $('account-loading').hidden=!initializing;
  $('account-login-view').hidden=initializing||connected;
  $('account-connected-view').hidden=!connected;
  document.querySelectorAll('[data-account-private]').forEach(node=>{node.hidden=!connected||node.id==='configurations';});
  $('account-session').textContent=connected?(s.schoolId?'Přihlášeno do správy školy.':'Přihlášeno jako správce služby.') : '';
  $('account-microsoft-login').disabled=busy||initializing;
  $('account-login').disabled=busy||initializing;
  $('account-logout').disabled=busy||!connected;
  $('account-drive').hidden=!s.scopes.includes('documents');
  if($('account-link-microsoft'))$('account-link-microsoft').hidden=!connected||!s.schoolId;
  $('account-microsoft').disabled=busy||!connected||!s.scopes.includes('documents');
  $('account-microsoft').textContent=driveConnected?'Obnovit připojení':'Připojit OneDrive';
  $('account-microsoft').classList.toggle('edu-admin__button--secondary',driveConnected);
  $('account-check').disabled=busy||!connected||!s.scopes.includes('documents');
  $('account-return').hidden=!requested||!connected;
  $('account-return').disabled=busy||!s.profileId;
 }
 async function connection(){
  if(!auth.getToken('documents')){driveConnected=false;status();return false;}
  const token=auth.getToken('documents');$('account-onedrive').textContent='Ověřuji připojení…';
  try{
   const r=await auth.fetch(auth.DOCS+'/api/admin/status?verify=1',{},'documents'),d=await r.json();
   if(auth.getToken('documents')!==token)return false;
   if(!r.ok)throw Error(d.detail||'Připojení nelze ověřit.');
   driveConnected=!!d.connected;
   $('account-onedrive').textContent=d.connected?'Připojeno'+(d.account?.displayName?' · '+d.account.displayName:'')+'.':d.needsReconnect?'Připojení vypršelo. Obnovte je tlačítkem níže.':'OneDrive zatím není připojený.';
   status();return true;
  }catch(e){if(auth.getToken('documents')===token){driveConnected=false;$('account-onedrive').textContent=e.message;status();}return false;}
 }
 async function work(text,fn){if(busy)return;busy=true;say(text);status();try{await fn();}catch(e){say(e.message);}finally{busy=false;status();}}
 function needsDrive(){try{const u=new URL(requested);return u.searchParams.get('edu-require-drive')==='1'||u.searchParams.has('edu-profile')||u.origin===auth.DOCS||/\/eduvize-(?:kiosek|dokumenty)\/config.html$/.test(u.pathname);}catch{return true;}}
 async function returnToApp(){if(!auth.status().profileId)throw Error('Nejprve se přihlaste k účtu školy.');const url=await auth.handoff(requested);try{sessionStorage.removeItem('eduvize-account-return');}catch{}location.replace(url);}
 $('account-form').onsubmit=e=>{e.preventDefault();work('Ověřuji přihlášení…',async()=>{const key=$('account-key').value.trim();if(!key)throw Error('Vyplňte klíč správce služby.');await auth.login(key,key,$('account-remember').checked);$('account-key').value='';say('');await connection();if(requested&&(!needsDrive()||driveConnected))await returnToApp();});};
 $('account-microsoft-login').onclick=()=>work('Otevírám přihlášení Microsoft…',()=>auth.loginMicrosoft($('account-remember').checked));
 if($('account-link-microsoft'))$('account-link-microsoft').onclick=()=>work('Otevírám propojení Microsoft…',()=>auth.loginMicrosoft($('account-remember').checked));
 $('account-logout').onclick=()=>{signingOut=true;status();work('Odhlašuji…',async()=>{try{await auth.logout();}finally{signingOut=false;driveConnected=false;$('account-onedrive').textContent='Ověřuji připojení…';status();}say('Odhlášení proběhlo úspěšně.');});};
 $('account-check').onclick=()=>work('Ověřuji OneDrive…',async()=>{say(await connection()?'Připojení bylo ověřeno.':'Připojení nyní nelze ověřit. Zkuste to znovu.');});
 $('account-microsoft').onclick=()=>work('Otevírám připojení OneDrive…',async()=>{const r=await auth.fetch(auth.DOCS+'/api/admin/microsoft/start',{method:'POST'},'documents'),data=await r.json();if(!r.ok)throw Error(data.detail||'Připojení nelze otevřít.');const u=new URL(data.url);if(u.origin!==auth.DOCS||u.pathname!=='/auth/microsoft/storage/start')throw Error('Neplatná adresa připojení OneDrive.');location.assign(u.href);});
 $('account-return').onclick=()=>work('Otevírám administraci…',returnToApp);
 root.addEventListener('eduvize-admin-auth-change',()=>{status();if(!initializing&&!auth.status().connected){driveConnected=false;say(auth.status().message||'');}});
 root.addEventListener('eduvize-admin-request-progress',event=>{if(event.detail?.text)say(event.detail.text);});
 status();
 auth.ready.then(async()=>{initializing=false;status();if(!auth.status().connected){say(auth.status().message||'');return;}await connection();if(auth.status().connected)say('');if(requested&&!manage&&auth.status().connected&&(!needsDrive()||driveConnected)){try{await returnToApp();}catch(e){say(e.message);}}}).catch(e=>{initializing=false;status();say(e.message);});
})(window);
