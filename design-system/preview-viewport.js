/* Physical preview resolution is independent of the administrator's browser size. */
(function(root){
 if(root.EduvizePreviewViewport)return;
 const mounted=new WeakMap();
 function mount(frame,options={}){
  if(mounted.has(frame)){const existing=mounted.get(frame);existing.setSize(options.width||3840,options.height||2160);return existing;}
  let host=options.host;if(!host){host=document.createElement('div');frame.before(host);host.append(frame);}
  if(getComputedStyle(host).position==='static')host.style.position='relative';host.classList.add('edu-preview-viewport');frame.classList.add('edu-preview-frame');
  // Required geometry must survive missing or cached preview stylesheets.
  host.style.setProperty('overflow','hidden','important');
  for(const [name,value] of Object.entries({position:'absolute',left:'0',top:'0','max-width':'none','max-height':'none','min-width':'0','min-height':'0','transform-origin':'top left',border:'0',display:'block',margin:'0'}))frame.style.setProperty(name,value,'important');
  let width=3840,height=2160,renderWidth=width,renderHeight=height;
  function mobilePreview(){return root.matchMedia?.('(max-width: 800px) and (pointer: coarse)').matches===true;}
  function fit(){const scale=Math.min(host.clientWidth/renderWidth,host.clientHeight/renderHeight);if(scale>0)frame.style.setProperty('transform','scale('+scale+')','important');}
  function setSize(w,h){
   if(!(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0))throw new Error('Neplatné rozlišení náhledu');
   width=w;height=h;
   // iOS keeps the full iframe rendering surface even when CSS scales it down.
   // Keep the saved output geometry, but bound the embedded surface on phones.
   const ratio=mobilePreview()?Math.min(1,960/Math.max(w,h),Math.sqrt(600000/(w*h))):1;
   renderWidth=Math.max(1,Math.round(w*ratio));renderHeight=Math.max(1,Math.round(h*ratio));
   frame.style.setProperty('width',renderWidth+'px','important');frame.style.setProperty('height',renderHeight+'px','important');
   if(options.aspect!==false)host.style.setProperty('aspect-ratio',w+' / '+h,'important');
   host.dataset.previewResolution=w+' × '+h;frame.setAttribute('data-preview-width',String(w));frame.setAttribute('data-preview-height',String(h));fit();
  }
  const observer=new ResizeObserver(fit);observer.observe(host);frame.addEventListener('load',fit);
  const api={setSize,fit,getSize:()=>({width,height}),destroy(){observer.disconnect();frame.removeEventListener('load',fit);mounted.delete(frame);}};mounted.set(frame,api);setSize(options.width||3840,options.height||2160);return api;
 }
 root.EduvizePreviewViewport=Object.freeze({mount,unmount:frame=>mounted.get(frame)?.destroy()});
})(window);
