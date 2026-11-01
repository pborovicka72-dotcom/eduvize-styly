/* One physical header and text scale for equal viewport dimensions. */
(function(root){
 let parentHeight=null,queued=false;
 function headerStyle(value){document.documentElement.dataset.kioskHeader=value==='light'?'light':'dark';}
 headerStyle(new URLSearchParams(root.location.search).get('kiosk_header'));
 function fitTitles(header){
  for(const node of header.querySelectorAll('.edu-header-title,.edu-header-meta')){
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
 const textAnchors={
  holidays:['.calendar-card .metric-value','.upcoming-day .upcoming-date'],
  weather:['.metric-value','.forecast-card h3','.hour-time','.hour-temp','.forecast-empty'],
  news:['#news .title','#news .content'],
  wisdom:['.wisdom-quotation .quote','.wisdom-quotation'],
  documents:['#browse .tile-title','#browse .doc-title','#browse .tile'],
  transport:['.departure .time','.table-header span:first-child'],
  kiosk:['#schoolContent .school-card h3','#pageContent .page-section h2','#pageContent .page-section p']
 };
 function contentInset(header,app,fallback){
  if(app==='kiosk'){
   const card=document.querySelector('#schoolContent .school-card-about'),copy=card?.querySelector('.school-about-copy');
   if(card&&copy&&card.getBoundingClientRect().width)return Math.max(0,card.getBoundingClientRect().left-header.getBoundingClientRect().left+(parseFloat(getComputedStyle(copy).paddingLeft)||fallback));
  }
  for(const selector of textAnchors[app]||[]){
   const target=Array.from(document.querySelectorAll(selector)).find(node=>node.getBoundingClientRect().width>0);
   if(!target)continue;
   const style=getComputedStyle(target),rect=target.getBoundingClientRect();
   const scale=target.offsetWidth?rect.width/target.offsetWidth:1;
   return Math.max(0,rect.left-header.getBoundingClientRect().left+((parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0))*scale);
  }
  return fallback;
 }
 function update(){
  queued=false;const api=root.EduvizeSegmentProfile;if(!api)return;
  const geometry=api.resolve(root.innerWidth,root.innerHeight),mode=root.EduvizeOutputModes?.mode?.()||(root.EduvizeOutputModes?.isKiosk?.()?'kiosk':'nsp');
  let metrics=api.header(geometry,mode);
  if(mode!=='web'&&document.documentElement.dataset.eduHeaderDensity==='compact'){
   const height=Math.max(80,Math.min(200,geometry.short*.12));
   metrics={height,icon:height*.64,title:height*.34,meta:height*.18,padding:height*.08,gap:height*.1};
  }
  if(mode==='kiosk'&&parentHeight){const h=document.documentElement.dataset.eduHeaderDensity==='compact'?Math.min(parentHeight,metrics.height):parentHeight;metrics={height:h,icon:h*.64,title:h*.36,meta:h*.18,padding:h*.05,gap:h*.08};}
  if(mode==='kiosk'&&!parentHeight&&document.documentElement.dataset.kioskApp==='news'){
   const height=Math.min(metrics.height,Math.max(96,Math.min(176,root.innerWidth*.07)));
   metrics={height,icon:height*.64,title:height*.34,meta:height*.16,padding:height*.1,gap:height*.18};
  }
  const weatherCompact=mode==='nsp'&&document.documentElement.dataset.kioskApp==='weather'&&geometry.kind==='compact';
  if(weatherCompact){const height=geometry.height-Math.min(24,Math.max(8,geometry.short*.012))*2;metrics={height,icon:Math.min(height*.55,geometry.width*.16),title:geometry.width*.11,meta:geometry.width*.045,padding:height*.05,gap:geometry.width*.025};}
  const weatherPortrait=mode!=='web'&&!parentHeight&&document.documentElement.dataset.kioskApp==='weather'&&geometry.ratio<.8;
  if(weatherPortrait){const height=Math.max(288,Math.min(640,geometry.short*.36));metrics={height,icon:height*.38,title:height*.25,meta:height*.09,padding:height*.06,gap:height*.06};}
  const inset=weatherCompact||weatherPortrait?metrics.padding:(metrics.height-metrics.icon)/2;
  metrics={...metrics,gap:inset};
  const html=document.documentElement;html.style.setProperty('--edu-header-inset',inset+'px');
  for(const [name,value] of Object.entries(metrics))html.style.setProperty('--edu-header-'+name,value+'px');
  for(const [name,value] of Object.entries(api.text?.(geometry,mode)||{}))html.style.setProperty('--edu-text-'+name,value+'px');
  document.querySelectorAll('.edu-output-header').forEach(header=>{
   for(const name of ['height','min-height','max-height'])header.style.setProperty(name,metrics.height+'px','important');
   const textInset=mode==='kiosk'?contentInset(header,html.dataset.kioskApp,inset):inset;
   if(mode==='kiosk'){
    html.style.setProperty('--edu-kiosk-text-inset',textInset+'px');
    const textLeft=header.getBoundingClientRect().left+textInset;
    for(const section of document.querySelectorAll('.section-heading')){
     const rect=section.getBoundingClientRect();
     if(!rect.width||!section.offsetWidth)continue;
     const scale=rect.width/section.offsetWidth;
     section.style.setProperty('--edu-kiosk-section-inset',Math.max(0,(textLeft-rect.left)/scale)+'px');
    }

    if(html.dataset.kioskApp==='holidays')html.style.setProperty('--edu-calendar-text-inset',textInset+'px');
   }
   header.style.setProperty('padding',metrics.padding+'px '+textInset+'px','important');
   header.style.setProperty('gap',metrics.gap+'px','important');
   header.style.setProperty('flex-shrink','0','important');
   for(const node of header.querySelectorAll('.edu-header-title'))node.style.setProperty('font-size',metrics.title+'px','important');
   for(const node of header.querySelectorAll('.edu-header-meta'))node.style.setProperty('font-size',metrics.meta+'px','important');
   for(const group of header.querySelectorAll('.hero-details')){
    group.hidden=false;
    const nodes=group.querySelectorAll('.feels-like,.hero-meta');
    for(const node of nodes)node.style.fontSize=metrics.meta+'px';
    const current=header.querySelector('.weather-current'),temperature=header.querySelector('.temperature');
    if(current&&temperature&&getComputedStyle(current).display!=='contents'){
     const gap=parseFloat(getComputedStyle(current).gap)||0;
     const needed=Math.max(group.scrollWidth,...Array.from(nodes,node=>node.scrollWidth));
     const available=current.clientWidth-temperature.getBoundingClientRect().width-gap;
     const scale=Math.min(1,available/Math.max(1,needed));
     if(scale<.8)group.hidden=true;
     else for(const node of nodes)node.style.fontSize=(metrics.meta*scale)+'px';
    }
   }
   fitTitles(header);
   header.dataset.eduHeader='shared';
  });
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(update);}
 root.addEventListener('resize',schedule);
 root.addEventListener('message',event=>{if(event.source!==root.parent||root.parent===root||!root.EduvizeOutputModes?.isKiosk?.())return;if(event.data?.type==='eduvize-kiosk-layout'){headerStyle(event.data.headerStyle||(event.data.menuLayout?'light':'dark'));if(event.data.parentMode)document.documentElement.classList.toggle('edu-kiosk-header-legacy',event.data.parentMode!=='kiosk');document.documentElement.classList.toggle('edu-menu-app-header',event.data.menuLayout===true);schedule();}const h=Number(event.data?.headerHeight);if(event.data?.type==='eduvize-kiosk-layout'&&Number.isFinite(h)&&h>=44&&h<=root.innerHeight*.4){parentHeight=h;schedule();}});
 function start(){
  if(root.EduvizeOutputModes?.mode?.()==='kiosk'&&document.documentElement.dataset.kioskApp==='weather'){
   const transforms=new WeakMap();
   new MutationObserver(records=>{
    for(const {target} of records){
     if(!target.matches('.weather-page'))continue;
     const key=target.style.transform+'|'+target.style.width+'|'+target.className;
     if(transforms.get(target)!==key){transforms.set(target,key);schedule();}
    }
   }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['style','class']});
  }
  update();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  root.addEventListener('load',schedule);document.fonts?.ready.then(schedule);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 update();root.EduvizeOutputHeader=Object.freeze({update:schedule,setStyle:headerStyle});
})(window);

