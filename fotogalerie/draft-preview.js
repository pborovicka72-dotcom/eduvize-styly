/* Ephemeral same-origin draft preview. No opener, storage, credentials or output writes. */
(function(root){'use strict';
 const PREFIX='eduvize-gallery-preview:',TTL=10*60*1000;
 function create({album,settings,presentation,isCurrent,mediaUrl}){
  if(!root.BroadcastChannel)throw Error('Tento prohlížeč nepodporuje samostatný náhled galerie.');
  const nonce=root.crypto.randomUUID(),channel=new root.BroadcastChannel(PREFIX+nonce);
  const snapshot={id:album.id,name:album.name,profile:album.profile,preview:true,settings:structuredClone(settings),items:album.items.map(i=>Object.fromEntries(['id','name','mime','width','height','date'].filter(k=>i[k]!==undefined).map(k=>[k,i[k]])))};
  let closed=false;const close=()=>{if(closed)return;closed=true;clearTimeout(timer);channel.close();root.removeEventListener('pagehide',close);};
  const timer=setTimeout(close,TTL);root.addEventListener('pagehide',close,{once:true});
  channel.onmessage=async event=>{
   const m=event.data;if(!m||closed)return;
   if(!isCurrent()){channel.postMessage({type:'error',message:'Školní profil nebo album se změnilo. Otevřete náhled znovu.'});close();return;}
   if(m.type==='ready'){channel.postMessage({type:'snapshot',album:snapshot,presentation});return;}
   if(m.type==='media'&&typeof m.requestId==='string'){
    const item=album.items.find(i=>i.id===m.itemId);if(!item)return;
    try{const url=await mediaUrl(item);if(!closed&&isCurrent())channel.postMessage({type:'media-response',requestId:m.requestId,url});}
    catch{if(!closed)channel.postMessage({type:'media-response',requestId:m.requestId,error:'Soubor náhledu není dostupný.'});}
   }
  };
  const url=new URL('index.html',root.location.href);url.searchParams.set('preview','1');url.searchParams.set('ev_inner','1');url.searchParams.set('draft-preview',nonce);url.searchParams.set('viewMode',presentation.mode);url.searchParams.set('interaction',presentation.interaction);if(presentation.mode==='kiosk'){url.searchParams.set('kiosk_layout',presentation.kioskLayout);url.searchParams.set('kiosk_header',presentation.kioskLayout==='menu'?'light':'dark');}url.searchParams.set('edu-profile',album.profile);return url.href;
 }
 function receive(nonce,onSnapshot,onError){
  if(!root.BroadcastChannel||!(/^[a-f0-9-]{36}$/i).test(nonce)){onError('Náhled nyní není dostupný.');return;}
  const channel=new root.BroadcastChannel(PREFIX+nonce),pending=new Map();let received=false;
  const stop=()=>{channel.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Náhled byl uzavřen.'));}pending.clear();};
  root.addEventListener('pagehide',stop,{once:true});
  root.EduvizeGalleryPreviewMedia=item=>new Promise((resolve,reject)=>{const requestId=root.crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Náhled souboru není dostupný.'));},20000);pending.set(requestId,{resolve,reject,timer});channel.postMessage({type:'media',requestId,itemId:item.id});});
  const timer=setTimeout(()=>{if(!received){stop();onError('Náhled vypršel. Otevřete jej z konfigurace znovu.');}},20000);
  channel.onmessage=e=>{const m=e.data;if(m?.type==='snapshot'&&!received){received=true;clearTimeout(timer);onSnapshot(m.album,m.presentation);}else if(m?.type==='error')onError(m.message);else if(m?.type==='media-response'){const p=pending.get(m.requestId);if(!p)return;pending.delete(m.requestId);clearTimeout(p.timer);m.url?p.resolve(m.url):p.reject(Error(m.error));}};
  channel.postMessage({type:'ready'});
 }
 root.EduvizeGalleryDraftPreview=Object.freeze({create,receive});
})(window);
