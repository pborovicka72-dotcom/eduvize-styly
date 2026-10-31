/* Equalize repeated cards across every row of a single overview. */
(function(root){
 if(root.EduvizeCardLayout)return;
 const groups='.app-grid,.system-grid,.upcoming-grid,.forecast-grid,.hourly-grid,.daily-hourly-grid';
 const cards='.card,.edu-admin__card,.upcoming-day,.forecast-card,.hour-cell,.daily-hour-cell';
 let queued=false;const widths=new WeakMap(),watched=new WeakSet();
 function equalize(group){
  const display=getComputedStyle(group).display;if(!display.includes('grid'))return;
  const items=[...group.children].filter(e=>e.matches(cards)&&e.offsetHeight>0);
  if(!items.length)return;
  for(const e of items)e.style.removeProperty('--edu-card-equal-height');
  const height=Math.ceil(Math.max(...items.map(e=>e.offsetHeight)));
  for(const e of items)e.style.setProperty('--edu-card-equal-height',height+'px');
 }
 function refresh(){queued=false;for(const group of document.querySelectorAll(groups)){
  if(!watched.has(group)){watched.add(group);resize.observe(group);}equalize(group);
 }}
 function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh);}}
 const resize=new ResizeObserver(entries=>{for(const {target,contentRect} of entries){if(widths.get(target)!==contentRect.width){widths.set(target,contentRect.width);schedule();}}});
 function start(){schedule();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});document.fonts?.ready.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);root.addEventListener('resize',schedule);}
 root.EduvizeCardLayout=Object.freeze({refresh:schedule});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
