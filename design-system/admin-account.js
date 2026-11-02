/* The only place where administrators enter credentials or connect Microsoft. */
(function(root){
 const auth=root.EduvizeAdminAuth,host=document.getElementById('edu-account-panel');if(!auth||!host)return;
 if(root.top!==root.self){const link=document.createElement('a');link.href=auth.ACCOUNT;link.target='_top';link.rel='noopener';link.textContent='Otevřít účet a připojení';host.replaceChildren(link);return;}
 function revealAccount(event){
  if(performance.getEntriesByType('navigation')[0]?.type==='reload'&&event?.type!=='hashchange')return;
  if(location.hash!=='#account'&&location.hash!=='#edu-account-panel')return;
  for(let parent=host.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const heading=document.querySelector('main > .edu-page-header');const target=heading||host;root.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+root.scrollY-16),left:0,behavior:'instant'});}));
 }
 root.addEventListener('hashchange',revealAccount);
 root.addEventListener('load',revealAccount,{once:true});
 revealAccount();
 const $=id=>host.querySelector('#'+id),message=$('account-message');let busy=false,driveConnected=false;
 const pageParams=new URL(location.href).searchParams;
 let requested=pageParams.get('returnTo'),manage=pageParams.get('manage')==='1';
 try{if(requested)sessionStorage.setItem('eduvize-account-return',requested);else if(pageParams.get('onedrive')==='connected'){requested=sessionStorage.getItem('eduvize-account-return');manage=!!requested;}}catch{}
 function needsDrive(){try{const u=new URL(requested);return u.searchParams.get('edu-require-drive')==='1'||u.searchParams.has('edu-profile')||u.origin===auth.DOCS||/\/eduvize-(?:kiosek|dokumenty)\/config.html$/.test(u.pathname);}catch{return true;}}
 async function returnToApp(){if(!auth.status().profileId){say('Nejprve vyberte profil pro ukládání nastavení.');document.getElementById('configurations')?.scrollIntoView({block:'start',behavior:'smooth'});return;}const url=await auth.handoff(requested);try{sessionStorage.removeItem('eduvize-account-return');}catch{}location.replace(url);}

 function say(text){message.textContent=text;}
 function status(){const s=auth.status();$('account-session').textContent=s.connected?'Přihlášeno do '+s.scopes.map(x=>x==='styles'?'správy stylů':'Dokumentů a OneDrive').join(' a ')+'. Platí do '+new Date(s.expiresAt*1000).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})+'.':s.message||'Nejste přihlášeni.';$('account-logout').disabled=!s.connected;$('account-microsoft').disabled=!s.scopes.includes('documents');$('account-check').disabled=!s.scopes.includes('documents');$('account-return').hidden=!requested;$('account-return').disabled=!s.connected||!s.profileId;}
 async function connection(){status();if(!auth.getToken('documents')){driveConnected=false;$('account-onedrive').textContent='Pro ověření připojení se přihlaste společným klíčem Eduvize.';return;}try{const r=await auth.fetch(auth.DOCS+'/api/admin/status?verify=1',{},'documents');const d=await r.json();if(!r.ok)throw Error(d.detail||'Připojení nelze ověřit.');driveConnected=!!d.connected;$('account-onedrive').textContent=d.connected?'OneDrive je připojený'+(d.account?.displayName?' · '+d.account.displayName:'')+'.':d.needsReconnect?'Připojení OneDrive vypršelo. Použijte Připojit / obnovit OneDrive.':'OneDrive není připojený. Použijte Připojit / obnovit OneDrive.';return true;}catch(e){driveConnected=false;$('account-onedrive').textContent=e.message;return false;}}
 async function work(fn){if(busy)return;busy=true;$('account-login').disabled=true;say('Pracuji…');try{await fn();}catch(e){say(e.message);}finally{busy=false;$('account-login').disabled=false;status();}}
 $('account-form').onsubmit=e=>{e.preventDefault();work(async()=>{const key=$('account-key').value.trim();if(!key)throw Error('Vyplňte společný klíč Eduvize.');await auth.login(key,key,$('account-remember')?.checked===true);$('account-key').value='';say('Společné přihlášení je připravené. Zařízení si pamatuje přihlašovací token; klíč se neukládá.');await connection();if(requested&&(!needsDrive()||driveConnected))await returnToApp();});};
 $('account-logout').onclick=()=>work(async()=>{await auth.logout();$('account-onedrive').textContent='Připojení OneDrive zůstává na serveru pro běžící aplikace.';say('Odhlášeno ve všech administracích.');});
 $('account-check').onclick=()=>work(async()=>{if(await connection())say('Stav připojení ověřen.');else say('Stav připojení nyní nelze ověřit. Zkuste to znovu.');});
 $('account-microsoft').onclick=()=>work(async()=>{const r=await auth.fetch(auth.DOCS+'/api/admin/microsoft/start',{method:'POST'},'documents');const data=await r.json();if(!r.ok)throw Error(data.detail||'Přihlášení nelze otevřít.');const u=new URL(data.url);if(u.origin!=='https://login.microsoftonline.com')throw Error('Neplatná přihlašovací adresa Microsoftu.');location.assign(u.href);});
 $('account-return').onclick=()=>work(returnToApp);
 root.addEventListener('eduvize-admin-auth-change',status);
 root.addEventListener('eduvize-admin-request-progress',event=>{if(event.detail?.text)say(event.detail.text);});
 auth.ready.then(async()=>{status();say('Ověřuji přihlášení a připojení…');await connection();say('');revealAccount();if(requested&&!manage&&auth.status().connected&&(!needsDrive()||driveConnected)){try{await returnToApp();}catch(e){say(e.message);}}});
})(window);
