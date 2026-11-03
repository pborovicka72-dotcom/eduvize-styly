(function(root){
 const API='https://eduvize-dokumenty-api.onrender.com/api/update-plans/',clock=root.EduvizeRefreshClock;
 if(!clock)return;
 const applications=['weather','transport','news','menu','documents','kiosk','wisdom','holidays','styles','school-systems','day-progress'];
 function appId(){const id=document.documentElement.dataset.kioskApp;if(applications.includes(id))return id;
  const map={'pocasi':'weather','weather':'weather','jizdni-rady':'transport','aktuality':'news','jidelnicek':'menu','dokumenty':'documents','kiosek':'kiosk','moudrost-dne':'wisdom','svatky':'holidays','skolni-systemy':'school-systems','prubeh-dne':'day-progress'};
  return Object.entries(map).find(([part])=>location.href.includes('eduvize-'+part))?.[1];
 }
 let inheritedProfile='';
 function storedProfile(){try{return localStorage.getItem('eduvize-profile-selection-v1');}catch{return '';}}
 function profile(){const value=inheritedProfile||new URL(location.href).searchParams.get('edu-profile')||storedProfile();return /^[a-f0-9]{32}$/.test(value||'')?value:'c0e094dbb91b4139a150a86efc87001b';}
 root.addEventListener('message',event=>{
  if(event.data?.type==='eduvize-update-profile-request'&&[...document.querySelectorAll('iframe')].some(frame=>frame.contentWindow===event.source)){
   event.source.postMessage({type:'eduvize-update-profile',profile:profile()},event.origin);
  }
  if(event.source===root.parent&&root.parent!==root&&event.data?.type==='eduvize-update-profile'&&/^[a-f0-9]{32}$/.test(event.data.profile)&&event.data.profile!==inheritedProfile){
   inheritedProfile=event.data.profile;sync();
  }
 });
 async function sync(){if(root.parent!==root)root.parent.postMessage({type:'eduvize-update-profile-request'},'*');const app=appId();if(!app||root.EduvizeProfileAdapter||document.body?.classList.contains('edu-admin')||/config(?:\.html)?$/.test(location.pathname))return;
  try{const id=profile(),response=await fetch(API+app+'?profile='+id,{cache:'no-store'});if(!response.ok)return;const plan=await response.json();clock.configure(plan.refreshSeconds);root.dispatchEvent(new CustomEvent('eduvize-update-plan',{detail:plan}));}catch{/* Keep current working cadence while offline. */}
 }
 function start(){sync();clock.nativeInterval(sync,60000);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
