/* One physical header and text scale for equal viewport dimensions. */
(function(root){
 let parentHeight=null,queued=false,lastParentLayout='';const headerStates=new WeakMap();
 function writeStyle(node,name,value,priority=''){
  value=String(value);if(node.style.getPropertyValue(name)!==value||node.style.getPropertyPriority(name)!==priority)node.style.setProperty(name,value,priority);
 }
 function headerStyle(value){const next=value==='light'?'light':'dark';if(document.documentElement.dataset.kioskHeader!==next)document.documentElement.dataset.kioskHeader=next;}
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
    writeStyle(node,'font-size',Math.max(1,size-.2)+'px','important');
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
  // News photos can sit beside the copy; the identity stays at the shared left inset.
  if(app==='news'||app==='holidays'&&document.body.classList.contains('calendar-reading'))return fallback;
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
 function htmlWeather(){return document.documentElement.dataset.kioskApp==='weather';}
 function update(){
  queued=false;if(document.documentElement.classList.contains('weather-station'))return;const api=root.EduvizeSegmentProfile;if(!api||root.innerWidth<1||root.innerHeight<1)return;
  const geometry=api.resolve(root.innerWidth,root.innerHeight),mode=root.EduvizeOutputModes?.mode?.()||(root.EduvizeOutputModes?.isKiosk?.()?'kiosk':'nsp');
  let metrics=api.header(geometry,mode);
  if(mode==='nsp'&&document.documentElement.dataset.eduHeaderDensity==='compact'){
   const height=Math.max(80,Math.min(200,geometry.short*.12));
   metrics={height,icon:height*.64,title:height*.34,meta:height*.18,padding:height*.08,gap:height*.1};
  }
  if(mode==='kiosk'&&parentHeight){const h=Math.min(parentHeight,metrics.height);metrics={...metrics,height:h,icon:h*.6,title:h*.34,meta:h*.18,padding:h*.1,gap:h*.15};}

  const weatherCompact=mode==='nsp'&&document.documentElement.dataset.kioskApp==='weather'&&geometry.kind==='compact';
  if(weatherCompact){const height=geometry.height-Math.min(24,Math.max(8,geometry.short*.012))*2;metrics={height,icon:Math.min(height*.55,geometry.width*.16),title:geometry.width*.11,meta:geometry.width*.045,padding:height*.05,gap:geometry.width*.025};}
  const weather=htmlWeather();
  if(weather){
   const low=geometry.ratio>=2.7||(metrics.height<=120&&geometry.width>=700);
   document.documentElement.dataset.weatherHeaderLayout=low?'low':'stacked';
   if(mode!=='kiosk')metrics={...metrics,title:metrics.height*(low?.36:.30),meta:metrics.height*(low?.18:.14)};
  }
  const inset=weatherCompact?metrics.padding:(metrics.height-metrics.icon)/2;
  metrics={...metrics,gap:inset};
  const html=document.documentElement;
  // Activate common output bindings before slower theme/integrity scripts finish.
  if(html.dataset.kioskApp&&!/\/(?:config(?:\.html)?|editor\.html|ucet\.html)(?:\/|$)/.test(root.location.pathname)){
   html.dataset.outputMode=mode;
   html.classList.toggle('kiosk-output',mode==='kiosk');
  }
  writeStyle(html,'--edu-header-inset',inset+'px');
  for(const [name,value] of Object.entries(metrics))writeStyle(html,'--edu-header-'+name,value+'px');
  for(const [name,value] of Object.entries(api.text?.(geometry,mode)||{}))writeStyle(html,'--edu-text-'+name,value+'px');
  document.querySelectorAll('.edu-output-header').forEach(header=>{
   // Hidden source headers must not mutate values observed by alternate views.
   if(!header.getBoundingClientRect().width)return;
   const textInset=mode==='kiosk'?contentInset(header,html.dataset.kioskApp,inset):inset;
   const state=JSON.stringify([metrics,textInset,mode,header.clientWidth,header.textContent]);if(headerStates.get(header)===state)return;
   for(const name of ['height','min-height','max-height'])writeStyle(header,name,metrics.height+'px','important');
   if(mode==='kiosk'){
    writeStyle(html,'--edu-kiosk-text-inset',textInset+'px');
    const textLeft=header.getBoundingClientRect().left+textInset;
    for(const section of document.querySelectorAll('.section-heading')){
     const rect=section.getBoundingClientRect();
     if(!rect.width||!section.offsetWidth)continue;
     const scale=rect.width/section.offsetWidth;
     writeStyle(section,'--edu-kiosk-section-inset',Math.max(0,(textLeft-rect.left)/scale)+'px');
    }

    if(html.dataset.kioskApp==='holidays')writeStyle(html,'--edu-calendar-text-inset',textInset+'px');
   }
   writeStyle(header,'padding',metrics.padding+'px '+textInset+'px','important');
   writeStyle(header,'gap',metrics.gap+'px','important');
   writeStyle(header,'flex-shrink','0','important');
   for(const node of header.querySelectorAll('.edu-header-title'))writeStyle(node,'font-size',metrics.title+'px','important');
   for(const node of header.querySelectorAll('.edu-header-meta'))writeStyle(node,'font-size',metrics.meta+'px','important');
   for(const group of header.querySelectorAll('.hero-details')){
    group.hidden=false;
    const nodes=group.querySelectorAll('.feels-like,.hero-meta');
    for(const node of nodes)node.style.fontSize=metrics.meta+'px';

   }
   fitTitles(header);
   header.dataset.eduHeader='shared';headerStates.set(header,state);
  });
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(update);}
 root.addEventListener('resize',schedule);
 root.addEventListener('message',event=>{if(event.source!==root.parent||root.parent===root||!root.EduvizeOutputModes?.isKiosk?.())return;if(event.data?.type==='eduvize-kiosk-layout'){const state=JSON.stringify([event.data.headerStyle,event.data.menuLayout,event.data.parentMode,event.data.headerHeight,event.data.headerInset]);if(state===lastParentLayout)return;lastParentLayout=state;headerStyle(event.data.headerStyle||(event.data.menuLayout?'light':'dark'));if(event.data.parentMode)document.documentElement.classList.toggle('edu-kiosk-header-legacy',event.data.parentMode!=='kiosk');document.documentElement.classList.toggle('edu-menu-app-header',event.data.menuLayout===true);schedule();}const h=Number(event.data?.headerHeight);if(event.data?.type==='eduvize-kiosk-layout'&&Number.isFinite(h)&&h>=44&&h<=root.innerHeight*.4){parentHeight=h;schedule();}});
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



