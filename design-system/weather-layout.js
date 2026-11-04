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
  return Object.freeze({profile:geometry.kind,portrait,headerOnly:mode==='nsp'&&geometry.kind==='compact',strip:mode==='nsp'&&geometry.kind==='panoramic',panels,metrics:portrait?2:Math.max(1,Math.min(3,Math.floor(columnWidth/(text.body*(mode==='web'?9:6))))),hours:portrait?2:Math.max(1,Math.min(6,Math.floor(columnWidth/(text.body*(mode==='web'?8:5))))),daily:portrait?1:3,forecast:portrait?1:Math.max(1,Math.min(3,Math.floor(available/(text.body*9)))),gap:gutter});
 }
 function stationPolicy(width,height,{hourly=true,daily=true,text=true,textOpen=false}={}){
  const portrait=width/height<1;
  const body=root.EduvizeOutputModes?.mode?.()==='kiosk'?root.EduvizeSegmentProfile.text(root.EduvizeSegmentProfile.resolve(width,height),'kiosk').body:Math.max(14,Math.min(54,Math.min(width,height)*(portrait?.025:.022)));
  return {portrait,body,hours:6,
   rows:['minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*(portrait?24:13.5))+'px':'0')+','+(portrait?'2.35':'1.45')+'fr)',hourly?'minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*9)+'px':'0')+',1.25fr)':'',daily?'minmax('+(root.EduvizeOutputModes?.mode?.()==='kiosk'?Math.round(body*7)+'px':'0')+','+(portrait?'.85':'.9')+'fr)':'',text?(textOpen?'minmax(0,1fr)':root.EduvizeOutputModes?.mode?.()==='kiosk'?'minmax('+Math.round(body*3)+'px,auto)':'auto'):''].filter(Boolean).join(' ')};
 }
 function apply(){const mode=root.EduvizeOutputModes.mode(),p=policy(root.innerWidth,root.innerHeight,mode),html=document.documentElement;if(mode==='kiosk')for(const [name,value] of Object.entries(contentText(root.EduvizeSegmentProfile.resolve(root.innerWidth,root.innerHeight),mode)))html.style.setProperty('--edu-text-'+name,value+'px');html.dataset.weatherProfile=p.profile;html.toggleAttribute('data-weather-portrait',p.portrait);html.toggleAttribute('data-weather-header-only',p.headerOnly);html.toggleAttribute('data-weather-strip',p.strip);for(const name of ['panels','metrics','hours','forecast','daily'])html.style.setProperty('--weather-'+name,p[name]);html.style.setProperty('--weather-gap',p.gap+'px');const host=document.querySelector('#weather-pages');if(host){for(const [page,columns] of [['0',p.metrics],['1',p.hours],['2',p.forecast],['3',p.daily]]){const section=host.querySelector('[data-page="'+page+'"]');if(section)section.dataset.sectionColumns=String(columns);}}if(host)for(const [name,value] of Object.entries(contentText(root.EduvizeSegmentProfile.resolve(root.innerWidth,root.innerHeight),mode)))host.style.setProperty('--edu-text-'+name,value+'px');}
 root.EduvizeWeatherLayout=Object.freeze({policy,stationPolicy,apply});
 root.addEventListener('resize',apply);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})(window);
