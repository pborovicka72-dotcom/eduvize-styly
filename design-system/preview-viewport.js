/* Physical preview resolution is independent of the administrator's browser size. */
(function(root){
 const mounted=new WeakMap();
 function mount(frame,options={}){
  if(mounted.has(frame)){const existing=mounted.get(frame);existing.setSize(options.width||3840,options.height||2160);return existing;}
  let host=options.host;if(!host){host=document.createElement('div');frame.before(host);host.append(frame);}
  if(getComputedStyle(host).position==='static')host.style.position='relative';host.classList.add('edu-preview-viewport');frame.classList.add('edu-preview-frame');
  let width=3840,height=2160;
  function fit(){const scale=Math.min(host.clientWidth/width,host.clientHeight/height);if(scale>0)frame.style.setProperty('transform','scale('+scale+')','important');}
  function setSize(w,h){if(!(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0))throw new Error('Neplatné rozlišení náhledu');width=w;height=h;frame.style.setProperty('width',w+'px','important');frame.style.setProperty('height',h+'px','important');if(options.aspect!==false)host.style.aspectRatio=w+' / '+h;host.dataset.previewResolution=w+' × '+h;frame.setAttribute('data-preview-width',String(w));frame.setAttribute('data-preview-height',String(h));fit();}
  const observer=new ResizeObserver(fit);observer.observe(host);frame.addEventListener('load',fit);
  const api={setSize,fit,getSize:()=>({width,height}),destroy(){observer.disconnect();mounted.delete(frame);}};mounted.set(frame,api);setSize(options.width||3840,options.height||2160);return api;
 }
 root.EduvizePreviewViewport=Object.freeze({mount,unmount:frame=>mounted.get(frame)?.destroy()});
})(window);
