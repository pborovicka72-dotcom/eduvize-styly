/* Every output checks its school entitlement independently of the notice job. */
(function(root){
 'use strict';
 if(root.EduvizeBroadcastLicense||!document.documentElement.dataset.kioskApp||/\/(?:config(?:\.html)?|editor\.html|admin)\/?$/.test(location.pathname))return;
 const html=document.documentElement,query=new URL(location.href).searchParams,profile=query.get('edu-profile')||'',appId=html.dataset.kioskApp;
 const licenseQuery=new URLSearchParams({appId});if(profile)licenseQuery.set('profile',profile);if(['school-systems','day-progress'].includes(appId)&&query.get('provider'))licenseQuery.set('provider',query.get('provider'));
 const nativeInterval=root.setInterval.bind(root),nativeTimeout=root.setTimeout.bind(root);
 const pausedMedia=new Set();
 let state='checking',screen,title,detail,checking=false,lease=0,expiry=null,wasSuspended=false;
 html.dataset.eduLicense=state;
 const css=document.createElement('style');css.textContent='html[data-edu-license]:not([data-edu-license="active"]) body>:not(#edu-license-screen),html[data-edu-license]:not([data-edu-license="active"]) body>:not(#edu-license-screen) *{visibility:hidden!important}#edu-license-screen{position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;box-sizing:border-box!important;align-items:center!important;justify-content:center!important;padding:clamp(20px,5vmin,100px)!important;background:var(--ev-bg,#eaf3f6)!important;color:var(--ev-text,#18394b)!important;text-align:center!important;font-family:Arial,sans-serif!important}#edu-license-screen[hidden]{display:none!important}#edu-license-screen>div{max-width:1000px}#edu-license-screen h1{margin:0 0 .6em!important;font-size:clamp(28px,5vmin,80px)!important;line-height:1.2!important}#edu-license-screen p{margin:0!important;font-size:clamp(18px,3vmin,44px)!important;line-height:1.5!important}';document.head.append(css);
 function panel(){
  if(!document.body)return;
  if(!screen){screen=document.createElement('section');screen.id='edu-license-screen';screen.setAttribute('role','status');screen.setAttribute('aria-live','polite');const box=document.createElement('div');title=document.createElement('h1');detail=document.createElement('p');box.append(title,detail);screen.append(box);document.body.append(screen);}
  const quiet=state==='active'||state==='checking';
  screen.hidden=quiet;
  screen.style.setProperty('display',quiet?'none':'flex','important');
  screen.style.setProperty('visibility','visible','important');
  title.textContent=state==='suspended'?'Vysílání pozastaveno':state==='checking'?'':'Vysílání dočasně nedostupné';
  detail.textContent=state==='suspended'?'Aplikace nebo její zdroj nejsou součástí platné licence školy.':state==='checking'?'':'Čekám na ověření licence školy.';
 }
 function hold(media){if(!media.paused)pausedMedia.add(media);media.pause();}
 function stopMedia(){if(state==='active')return;for(const media of document.querySelectorAll('video,audio'))hold(media);if(state!=='checking')for(const frame of document.querySelectorAll('iframe'))frame.remove();}
 function set(value){const old=state;state=value;html.dataset.eduLicense=value;panel();stopMedia();if(value==='suspended'||value==='unavailable')wasSuspended=true;if(value==='active'&&wasSuspended&&old!=='active')location.reload();else if(value==='active'){for(const media of pausedMedia)if(media.isConnected)media.play()?.catch(()=>{});pausedMedia.clear();}root.dispatchEvent(new CustomEvent('eduvize-broadcast-state',{detail:{state:value}}));}
 async function check(){
  if(checking)return;checking=true;
  try{
   const response=await fetch(location.origin+'/api/public/broadcast-status?'+licenseQuery,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw Error('License unavailable');const data=await response.json();
   if(typeof data.active!=='boolean'||!Number.isFinite(data.serverTime)||(data.expiresAt!==null&&!Number.isFinite(data.expiresAt)))throw Error('Invalid license');
   if(expiry)clearTimeout(expiry);
   if(!data.active){lease=0;set('suspended');return;}
   const remaining=data.expiresAt===null?Infinity:(data.expiresAt-data.serverTime)*1000;
   if(remaining<=0){lease=0;set('suspended');return;}
   lease=performance.now()+Math.min(90000,remaining);set('active');
   if(Number.isFinite(remaining))expiry=nativeTimeout(()=>{lease=0;set('suspended');check();},Math.min(remaining,2147483647));
  }catch{if(performance.now()>=lease)set('unavailable');}
  finally{checking=false;}
 }
 root.EduvizeBroadcastLicense=Object.freeze({check,status:()=>state});
 document.addEventListener('play',event=>{if(state!=='active'&&typeof event.target.pause==='function')hold(event.target);},true);
 function start(){panel();new MutationObserver(()=>{if(state!=='active')stopMedia();}).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 check();nativeInterval(check,60000);nativeInterval(()=>{if(state==='active'&&performance.now()>=lease)set('unavailable');},1000);
 root.addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})(window);
