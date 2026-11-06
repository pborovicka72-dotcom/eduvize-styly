/* Explicit published-output lifecycle. Applications own rendering and live data adapters. */
(function(root){'use strict';
 const roles={background:'--ev-bg',text:'--ev-text',muted:'--ev-muted',surface:'--ev-surface',primary:'--ev-primary',primaryText:'--ev-primary-text',secondary:'--ev-secondary',secondaryText:'--ev-secondary-text',accent:'--ev-accent',border:'--ev-border'};
 function presentation(snapshot){
  const p=snapshot.presentation,g=p.geometry,profile=root.EduvizeSegmentProfile;
  if(!p||!['web','nsp','kiosk'].includes(p.mode)||!['display','interactive'].includes(p.interaction))throw Error('Invalid presentation');
  let width=root.innerWidth,height=root.innerHeight;
  if(p.mode==='nsp'){
   if(g?.registryId!=='nsp-4k'||g.registryVersion!==1)throw Error('Unknown geometry');
   const rect=root.EduvizeNSPLayouts?.layouts[g.orientation]?.[g.layoutId]?.[g.segmentId-1];
   if(!rect)throw Error('Unknown segment');[width,height]=rect;
  }else if(p.mode==='kiosk'){
   if(g?.registryId!=='kiosk-viewport'||g.registryVersion!==1||!(g.width>=240&&g.height>=240)||!['menu','tiles'].includes(p.kioskLayout))throw Error('Invalid viewport');
   width=g.width;height=g.height;
  }else if(g!==null)throw Error('Invalid web geometry');
  if(!profile)throw Error('Load shared segment-profile.js before published runtime');
  const geometry=profile.resolve(width,height),metrics=Object.freeze({geometry,header:profile.header(geometry,p.mode),text:profile.text(geometry,p.mode)});
  if(p.mode==='kiosk')root.document.documentElement.dataset.kioskHeader=p.kioskLayout==='menu'?'light':'dark';
  root.document.documentElement.dataset.outputMode=p.mode;
  root.document.documentElement.dataset.outputInteraction=p.interaction;
  root.EduvizePublishedOutput=Object.freeze({id:snapshot.id,presentation:p,metrics});
  // Read-only facade for renderers; it cannot generate URLs or read local preferences.
  root.EduvizeOutputModes=Object.freeze({mode:()=>p.mode,isKiosk:()=>p.mode==='kiosk',interaction:()=>p.interaction,isInteractive:()=>p.interaction==='interactive'});
  return metrics;
 }
 function start(options){
  const outputId=options.outputId||new URL(root.location.href).searchParams.get('edu-output');
  if(!/^[a-f0-9]{32}$/.test(outputId||''))throw new TypeError('Published output ID required');
  if(typeof options.render!=='function'||typeof options.clear!=='function')throw new TypeError('render and clear hooks required');
  const origin=root.location.origin;
  if(!['https://test.skola.eduvize.cz','https://skola.eduvize.cz'].includes(origin))throw new TypeError('Eduvize origin required');
  const controller=new AbortController(),client=root.EduvizeOutputClient.create({origin,signal:controller.signal});
  let stopped=false,running=false,revision=null,lastSuccess=Date.now(),renderAbort=null;
  async function bounded(callback){let timer;try{return await Promise.race([Promise.resolve().then(callback),new Promise((_,reject)=>{timer=root.setTimeout(()=>reject(Error("Renderer deadline exceeded")),10000);})]);}finally{root.clearTimeout(timer);}}
  async function refresh(){
   if(stopped||running)return;running=true;
   try{
    const snapshot=await client.getPublicOutput(outputId);
    if(snapshot.id!==outputId||snapshot.schemaVersion!==1||!Number.isInteger(snapshot.publishedRevision)||snapshot.appId!==options.appId)throw Error('Unexpected publication');
    const expected='/api/public/v1/outputs/'+outputId+'/theme';
    if(snapshot.theme?.mode!=='profile-active'||snapshot.theme.url!==expected||snapshot.theme.refreshSeconds!==60)throw Error('Invalid theme descriptor');
    const theme=await client.getPublicTheme(outputId);
    for(const key of Object.keys(roles))if(!/^#[a-f0-9]{6}$/i.test(theme.colors?.[key]||''))throw Error('Invalid theme');
    if(stopped)return;
    for(const [key,variable] of Object.entries(roles))root.document.documentElement.style.setProperty(variable,theme.colors[key]);
    for(const [group,key,variable,max] of [['controls','heightPx','--ev-control-height',80],['controls','radiusPx','--ev-control-radius',80],['cards','radiusPx','--ev-card-radius',80],['icons','radiusPx','--ev-icon-radius',24]]){const value=theme[group]?.[key];if(Number.isInteger(value)&&value>=0&&value<=max)root.document.documentElement.style.setProperty(variable,value+'px');}
    if(revision!==snapshot.publishedRevision){renderAbort?.abort();renderAbort=new AbortController();const metrics=presentation(snapshot);await bounded(()=>options.onPresentation?.(snapshot.presentation,metrics));await bounded(()=>options.render(snapshot,metrics,{signal:renderAbort.signal}));revision=snapshot.publishedRevision;}
    lastSuccess=Date.now();options.onReady?.(snapshot);
   }catch(error){
    if(stopped)return;
    if(error.status===401||error.status===404||error.status===410||error.status===403){stop();options.clear(error);}
    // Aborting invalidates this render generation even when publication did not change.
    // Recover with a fresh signal/render after the next successful verification.
    else {renderAbort?.abort();revision=null;if(Date.now()-lastSuccess>300000){options.clear(error);}options.onError?.(error);}
   }finally{running=false;}
  }
  const visibility=()=>{if(!root.document.hidden)refresh();};
  const timer=root.setInterval(()=>{if(!root.document.hidden)refresh();},60000);
  function stop(){if(stopped)return;stopped=true;root.clearInterval(timer);root.document.removeEventListener('visibilitychange',visibility);controller.abort();renderAbort?.abort();}
  root.document.addEventListener('visibilitychange',visibility);refresh();
  return Object.freeze({refresh,stop,outputId});
 }
 root.EduvizeOutputRuntime=Object.freeze({start});
})(typeof window==='undefined'?globalThis:window);
