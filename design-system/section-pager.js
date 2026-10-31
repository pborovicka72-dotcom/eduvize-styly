/* Whole-section paging. A heading and its cards always occupy the same screen. */
(function(root){
 const instances=new WeakMap();
 function mount(host,{items=':scope > *',automatic=false,seconds=8}={}){
  if(!host||instances.has(host))return instances.get(host);
  host.classList.add('edu-kiosk-stage','edu-section-stage');host.dataset.sectionPager='true';
  const nav=document.createElement('nav');nav.className='edu-kiosk-pagination'+(automatic?' edu-auto-pagination':'');nav.setAttribute('aria-label','Stránkování sekcí');
  const previous=document.createElement('button'),label=document.createElement('span'),next=document.createElement('button');previous.type=next.type='button';previous.textContent='← Předchozí';next.textContent='Další →';label.setAttribute('role','status');if(automatic){previous.hidden=true;next.hidden=true;}nav.append(previous,label,next);host.after(nav);
  let pages=[],index=0,queued=false;
  function fit(section){
   const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
   const grid=section.querySelector('.metrics,.hourly-grid,.forecast-grid');
   if(grid)grid.style.minHeight='0';
   const count=grid?.children.length||1,fixed=Number(section.dataset.sectionColumns);const candidates=grid?(Number.isInteger(fixed)&&fixed>0?[Math.min(fixed,count)]:[...new Set([1,2,3,6].filter(n=>n<=count))]):[1];
   let best={scale:0,columns:1};
   section.style.setProperty('display','block','important');section.style.transform='none';
   function fits(scale,columns){section.style.width=(width/scale)+'px';if(grid)grid.style.setProperty('grid-template-columns','repeat('+columns+',minmax(0,1fr))','important');return section.scrollHeight*scale<=height-2&&section.scrollWidth*scale<=width+1;}
   for(const columns of candidates){let low=.025,high=1;if(fits(1,columns))low=1;else for(let step=0;step<10;step++){const mid=(low+high)/2;if(fits(mid,columns))low=mid;else high=mid;}if(low>best.scale+.002)best={scale:low,columns};}
   fits(best.scale,best.columns);if(grid&&document.documentElement.hasAttribute('data-weather-portrait')){const heading=section.querySelector('.section-heading');const reserved=(heading?.getBoundingClientRect().height||0)+parseFloat(getComputedStyle(heading||section).marginBottom||0);grid.style.minHeight=Math.max(0,height/best.scale-reserved-4)+'px';for(let pass=0;pass<3&&section.scrollHeight*best.scale>height-2;pass++){const excess=section.scrollHeight-(height-2)/best.scale;grid.style.minHeight=Math.max(0,parseFloat(grid.style.minHeight)-excess-2)+'px';}}section.style.transform='scale('+best.scale+')';section.style.transformOrigin='top left';section.dataset.sectionScale=best.scale.toFixed(3);section.style.removeProperty('display');
  }
  function show(){
   pages=Array.from(host.querySelectorAll(items)).filter(section=>section.dataset.disabled!=='true');
   index=Math.max(0,Math.min(index,pages.length-1));nav.hidden=pages.length<2;
   for(const section of host.querySelectorAll(items))section.classList.toggle('is-section-current',section===pages[index]);
   if(pages[index])fit(pages[index]);previous.disabled=index===0;next.disabled=index>=pages.length-1;label.textContent=pages.length?(index+1)+' / '+pages.length:'';host.dataset.kioskPages=String(pages.length);
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;show();});}}
  previous.onclick=()=>{index--;show();};next.onclick=()=>{index++;show();};
  host.tabIndex=0;host.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select,button,a,[contenteditable]'))return;if(event.key==='PageDown'||event.key==='PageUp'){event.preventDefault();index+=event.key==='PageDown'?1:-1;show();}});
  new ResizeObserver(schedule).observe(host);new MutationObserver(schedule).observe(host,{subtree:true,childList:true,characterData:true});
  host.addEventListener('load',schedule,true);root.addEventListener('resize',schedule);root.addEventListener('load',schedule);document.fonts?.ready.then(schedule);
  if(automatic)setInterval(()=>{if(!document.hidden&&pages.length>1){index=(index+1)%pages.length;show();}},Math.max(3,Number(seconds)||8)*1000);
  const api=Object.freeze({refresh:schedule});instances.set(host,api);schedule();return api;
 }
 root.EduvizeSectionPager=Object.freeze({mount});
})(window);
