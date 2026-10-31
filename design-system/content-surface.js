/* Typography is based on the stable page viewport, never the remaining height after its own header. */
(function(root){
  const mounted=new WeakMap();
  function metrics(w,h,flow=false){return {shape:w/h<.85?'portrait':w/h>(flow?2.2:1.6)?'landscape':'square',font:Math.max(16,Math.min(68,Math.round(Math.min(w,h)*.03))),gap:Math.max(10,Math.min(32,Math.min(w,h)*.016))};}
  function mount(host,options={}){
    if(mounted.has(host))return;
    host.dataset.eduContentSurface='';
    const viewport=host.closest('.wrap')||host.parentElement||host;
    let queued=false;
    function set(style,key,value){if(style.getPropertyValue(key)!==value)style.setProperty(key,value);}
    function refresh(){
      queued=false;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
      const referenceHeight=viewport.clientHeight||h;
      const metric=metrics(w,referenceHeight,options.flow);
      const shape=metrics(w,h,options.flow).shape;
      if(host.dataset.contentShape!==shape)host.dataset.contentShape=shape;
      set(host.style,'--edu-content-font',metric.font+'px');
      set(host.style,'--edu-content-gap',metric.gap+'px');
      if(viewport!==host)set(viewport.style,'--edu-page-font',metric.font+'px');
    }
    function schedule(){if(queued)return;queued=true;requestAnimationFrame(refresh);}
    const resize=new ResizeObserver(schedule);resize.observe(host);if(viewport!==host)resize.observe(viewport);
    document.fonts?.ready.then(schedule);
    mounted.set(host,true);refresh();
  }
  root.EduvizeContentSurface=Object.freeze({mount,metrics});
})(window);
