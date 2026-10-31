/* Weather density follows real viewport geometry and shared text roles, never template IDs. */
(function(root){
 function policy(width,height,mode='nsp'){
  const geometry=root.EduvizeSegmentProfile.resolve(width,height),text=root.EduvizeSegmentProfile.text(geometry,mode==='web'?'web':'kiosk');
  const gutter=mode==='web'?Math.min(36,Math.max(16,width*.03)):Math.min(24,Math.max(8,geometry.short*.012));
  const available=Math.max(1,Math.min(mode==='web'?1440:width,width)-gutter*2);
  const panels=mode==='web'&&available/text.body>=30&&width/height>1.25?2:1;
  const columnWidth=(available-(panels-1)*gutter)/panels;
  return Object.freeze({profile:geometry.kind,headerOnly:mode==='nsp'&&geometry.kind==='compact',strip:mode==='nsp'&&geometry.kind==='panoramic',panels,metrics:Math.max(1,Math.min(3,Math.floor(columnWidth/(text.body*(mode==='web'?9:6))))),hours:Math.max(1,Math.min(6,Math.floor(columnWidth/(text.body*(mode==='web'?8:5))))),forecast:Math.max(1,Math.min(3,Math.floor(available/(text.body*9)))),gap:gutter});
 }
 function apply(){const mode=root.EduvizeOutputModes.mode(),p=policy(root.innerWidth,root.innerHeight,mode),html=document.documentElement;html.dataset.weatherProfile=p.profile;html.toggleAttribute('data-weather-header-only',p.headerOnly);html.toggleAttribute('data-weather-strip',p.strip);for(const name of ['panels','metrics','hours','forecast'])html.style.setProperty('--weather-'+name,p[name]);html.style.setProperty('--weather-gap',p.gap+'px');const host=document.querySelector('#weather-pages');if(host){for(const [page,columns] of [['0',p.metrics],['1',p.hours]]){const section=host.querySelector('[data-page="'+page+'"]');if(section)section.dataset.sectionColumns=String(columns);}}if(host)for(const [name,value] of Object.entries(root.EduvizeSegmentProfile.text(root.EduvizeSegmentProfile.resolve(root.innerWidth,root.innerHeight),mode==='web'?'web':'kiosk')))host.style.setProperty('--edu-text-'+name,(p.strip&&name!=='footnote'?value*1.5:value)+'px');}
 root.EduvizeWeatherLayout=Object.freeze({policy,apply});
 root.addEventListener('resize',apply);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})(window);
