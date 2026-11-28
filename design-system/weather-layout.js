/* Weather density follows real viewport geometry and shared text roles, never template IDs. */
(function(root){
 function contentText(geometry,mode){
  if(mode==='kiosk')return root.EduvizeSegmentProfile.text(geometry,mode);
  const base=root.EduvizeSegmentProfile.text(geometry,'web');
  const body=mode==='web'?18:Math.max(20,Math.min(56,geometry.short*(geometry.kind==='portrait'?.045:.028))),scale=body/18;
  return Object.fromEntries(Object.entries(base).map(([role,value])=>[role,role==='footnote'?value:value*scale]));
 }
 function policy(width,height,mode='nsp'){
  const geometry=root.EduvizeSegmentProfile.resolve(width,height),text=contentText(geometry,mode);
  const gutter=mode==='web'?Math.min(36,Math.max(16,width*.03)):Math.min(24,Math.max(8,geometry.short*.012));
  const available=Math.max(1,Math.min(mode==='web'?1440:width,width)-gutter*2);
  const panels=mode==='web'&&available/text.body>=30&&width/height>1.25?2:1;
  const portrait=mode!=='web'&&geometry.ratio<.8;
  const columnWidth=(available-(panels-1)*gutter)/panels;
  const strip=mode==='nsp'&&geometry.kind==='panoramic';
  return Object.freeze({profile:geometry.kind,portrait,headerOnly:mode==='nsp'&&geometry.kind==='compact'&&!portrait&&!strip,strip,panels,metrics:strip?3:portrait?2:Math.max(1,Math.min(3,Math.floor(columnWidth/(text.body*(mode==='web'?9:6))))),hours:strip?3:portrait?2:Math.max(1,Math.min(6,Math.floor(columnWidth/(text.body*(mode==='web'?8:5))))),daily:portrait?1:3,forecast:strip?3:portrait?1:Math.max(1,Math.min(3,Math.floor(available/(text.body*9)))),gap:gutter});
 }
 function stationPolicy(width,height,{hourly=true,daily=true,air=false,text=true,textOpen=false}={}){
  const portrait=width/height<1;
  const body=root.EduvizeOutputModes?.mode?.()==='kiosk'?root.EduvizeSegmentProfile.text(root.EduvizeSegmentProfile.resolve(width,height),'kiosk').body:Math.max(14,Math.min(54,Math.min(width,height)*(portrait?.025:.022)));
  return {portrait,body,hours:6,
   rows:['minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*(portrait?24:13.5))+'px':'0')+','+(portrait?'2.35':'1.45')+'fr)',hourly?'minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*(portrait?12:9))+'px':'0')+',1.25fr)':'',daily?'minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*7)+'px':'0')+','+(portrait?'.85':'.9')+'fr)':'',air?'minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*(portrait?8:5))+'px':'0')+','+(portrait?'.7':'.52')+'fr)':'',text?(textOpen?(root.EduvizeOutputModes?.mode?.()==='kiosk'?'minmax('+Math.round(body*12)+'px,1fr)':'minmax(0,1fr)'):root.EduvizeOutputModes?.mode?.()==='kiosk'?'minmax('+Math.round(body*3)+'px,auto)':'auto'):''].filter(Boolean).join(' ')};
 }
 function physicalGeometry(mode){
  if(mode==='nsp'){
   const saved=root.EduvizePublishedOutput?.metrics?.geometry;
   if(Number.isFinite(saved?.width)&&Number.isFinite(saved?.height))return saved;
   const query=new URLSearchParams(root.location.search);
   const orientation=query.get('segment_orientation')||query.get('orientation')||'landscape';
   const style=Number(query.get('segment_style')||query.get('style'));
   const block=Number(query.get('segment_block')||query.get('block'));
   const rect=root.EduvizeNSPLayouts?.layouts?.[orientation]?.[style]?.[block-1];
   if(Array.isArray(rect)&&rect.length===2)return root.EduvizeSegmentProfile.resolve(rect[0],rect[1]);
  }
  return root.EduvizeSegmentProfile.resolve(root.innerWidth,root.innerHeight);
 }
 function apply(){const mode=root.EduvizeOutputModes.mode(),geometry=physicalGeometry(mode),p=policy(geometry.width,geometry.height,mode),html=document.documentElement;if(mode==='kiosk')for(const [name,value] of Object.entries(contentText(geometry,mode)))html.style.setProperty('--edu-text-'+name,value+'px');html.dataset.weatherProfile=p.profile;html.toggleAttribute('data-weather-portrait',p.portrait);html.toggleAttribute('data-weather-header-only',p.headerOnly);html.toggleAttribute('data-weather-strip',p.strip);for(const name of ['panels','metrics','hours','forecast','daily'])html.style.setProperty('--weather-'+name,p[name]);html.style.setProperty('--weather-gap',p.gap+'px');const host=document.querySelector('#weather-pages');if(host){const summaryPage=host.querySelector(':scope > .weather-summary-page');if(summaryPage){const summary=summaryPage.querySelector('.weather-summary');if(summary)host.before(summary);summaryPage.remove();}for(const [page,columns] of [['0',p.metrics],['1',p.hours],['2',p.forecast],['3',p.daily]]){const section=host.querySelector('[data-page="'+page+'"]');if(section)section.dataset.sectionColumns=String(columns);}for(const [name,value] of Object.entries(contentText(geometry,mode)))host.style.setProperty('--edu-text-'+name,value+'px');}}
 root.EduvizeWeatherLayout=Object.freeze({policy,stationPolicy,apply});
 root.addEventListener('resize',apply);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})(window);
