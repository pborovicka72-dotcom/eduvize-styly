/* One physical header and text scale for equal viewport dimensions. */
(function(root){
 let parentHeight=null,queued=false;
 function fitTitles(header){
  for(const node of header.querySelectorAll('.edu-header-title')){
   let available=node.clientWidth;
   if(!available)continue;
   let size=parseFloat(getComputedStyle(node).fontSize);
   // Measure the unwrapped label after flex/grid has reserved the icon and other content.
   for(let attempt=0;attempt<12&&node.scrollWidth>node.clientWidth+1;attempt++){
    available=node.clientWidth;
    size*=available/node.scrollWidth;
    node.style.setProperty('font-size',Math.max(1,size-.2)+'px','important');
   }
  }
 }
 function update(){
  queued=false;const api=root.EduvizeSegmentProfile;if(!api)return;
  const geometry=api.resolve(root.innerWidth,root.innerHeight),mode=root.EduvizeOutputModes?.mode?.()||(root.EduvizeOutputModes?.isKiosk?.()?'kiosk':'nsp');
  let metrics=api.header(geometry,mode);
  if(mode==='kiosk'&&parentHeight){const h=parentHeight;metrics={height:h,icon:h*.64,title:h*.36,meta:h*.18,padding:h*.05,gap:h*.08};}
  const inset=(metrics.height-metrics.icon)/2;
  metrics={...metrics,gap:inset};
  const html=document.documentElement;html.style.setProperty('--edu-header-inset',inset+'px');
  for(const [name,value] of Object.entries(metrics))html.style.setProperty('--edu-header-'+name,value+'px');
  for(const [name,value] of Object.entries(api.text?.(geometry,mode)||{}))html.style.setProperty('--edu-text-'+name,value+'px');
  document.querySelectorAll('.edu-output-header').forEach(header=>{
   for(const name of ['height','min-height','max-height'])header.style.setProperty(name,metrics.height+'px','important');
   header.style.setProperty('padding',metrics.padding+'px '+inset+'px','important');
   header.style.setProperty('gap',metrics.gap+'px','important');
   header.style.setProperty('flex-shrink','0','important');
   for(const node of header.querySelectorAll('.edu-header-title'))node.style.setProperty('font-size',metrics.title+'px','important');
   for(const node of header.querySelectorAll('.edu-header-meta'))node.style.setProperty('font-size',metrics.meta+'px','important');
   fitTitles(header);
   header.dataset.eduHeader='shared';
  });
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(update);}
 root.addEventListener('resize',schedule);
 root.addEventListener('message',event=>{if(event.source!==root.parent||root.parent===root||!root.EduvizeOutputModes?.isKiosk?.())return;const h=Number(event.data?.headerHeight);if(event.data?.type==='eduvize-kiosk-layout'&&Number.isFinite(h)&&h>=44&&h<=root.innerHeight*.4){parentHeight=h;schedule();}});
 function start(){update();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  root.addEventListener('load',schedule);document.fonts?.ready.then(schedule);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 update();root.EduvizeOutputHeader=Object.freeze({update:schedule});
})(window);
