/* Touch pagination for real viewport sizes. Retains complete content, including long text. */
(function(root){
 'use strict';
 const instances=new WeakMap();
 function offsets(total,height,boundaries=[]){
  const last=Math.max(0,total-height),points=[0];if(height<=0)return points;
  // An overlap retains lines that straddle a page boundary.
  const step=Math.max(1,height-Math.min(40,height*.12));
  while(points[points.length-1]<last){
   const start=points[points.length-1],limit=start+step;
   const boundary=boundaries.filter(x=>x>start+height*.45&&x<=limit).pop();
   points.push(Math.min(last,boundary||limit));
  }
  return points;
 }
 function mount(host,options={}){
  if(!host)return null;if(instances.has(host))return instances.get(host);
  host.classList.add('edu-kiosk-stage');
  const nav=document.createElement('nav');nav.className='edu-kiosk-pagination';nav.setAttribute('aria-label',options.label||'Stránkování obsahu');
  const previous=document.createElement('button'),status=document.createElement('span'),next=document.createElement('button');
  previous.type=next.type='button';previous.textContent='← Předchozí';next.textContent='Další →';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  nav.append(previous,status,next);if(options.automatic)nav.classList.add('edu-auto-pagination');host.after(nav);
  let pages=[0],index=0,queued=false;
  function show(){index=Math.max(0,Math.min(index,pages.length-1));host.scrollTop=pages[index];previous.disabled=index===0;next.disabled=index===pages.length-1;status.textContent=(index+1)+' / '+pages.length;nav.hidden=pages.length<2;host.dataset.kioskPages=String(pages.length);}
  function measure(){
   queued=false;if(!host.clientHeight)return;
   // Measure with the pager hidden first, so one screen uses all available space.
   nav.hidden=true;
   const overflow=host.scrollHeight>host.clientHeight+2;
   nav.hidden=!overflow;
   const top=host.getBoundingClientRect().top-host.scrollTop;
   const nodes=host.querySelectorAll(options.items||':scope > *');
   const boundaries=Array.from(nodes).filter(n=>n.getBoundingClientRect().height>0).map(n=>n.getBoundingClientRect().top-top).sort((a,b)=>a-b);
   pages=offsets(host.scrollHeight,host.clientHeight,boundaries);show();
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(measure);}
  previous.onclick=()=>{index--;show();};next.onclick=()=>{index++;show();};
  host.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select,button,a,[contenteditable]'))return;if(event.key==='PageDown'||event.key==='PageUp'){event.preventDefault();index+=event.key==='PageDown'?1:-1;show();}});
  host.addEventListener('focusin',()=>{const target=document.activeElement;if(!host.contains(target))return;const top=target.getBoundingClientRect().top-host.getBoundingClientRect().top+host.scrollTop;if(top<pages[index]||top>pages[index]+host.clientHeight){index=Math.max(0,pages.findIndex((p,i)=>top>=p&&(i===pages.length-1||top<pages[i+1])));show();}});
  new ResizeObserver(schedule).observe(host);
  new MutationObserver(schedule).observe(host,{subtree:true,childList:true,characterData:true});
  host.addEventListener('load',schedule,true);root.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);
  if(options.automatic)setInterval(()=>{if(!document.hidden&&pages.length>1){index=(index+1)%pages.length;show();}},Math.max(3,Number(options.seconds)||8)*1000);const api=Object.freeze({refresh:schedule});instances.set(host,api);schedule();return api;
 }
 function start(){
  const mode=root.EduvizeOutputModes?.mode?.()||(root.EduvizeOutputModes?.isKiosk?.()?'kiosk':'web');const app=document.documentElement.dataset.kioskApp;if(mode==='nsp'&&app==='weather'){mount(document.querySelector('#weather-pages'),{items:'.weather-page > *',automatic:true,seconds:new URLSearchParams(location.search).get('page_seconds')});return;}if(mode!=='kiosk')return;
  if(app==='weather')mount(document.querySelector('#weather-pages'),{items:'.weather-page > *'});
  if(app==='news')mount(document.querySelector('#news'),{items:'.card'});
  if(app==='wisdom')mount(document.querySelector('#display .content'),{items:'.quote,.attribution'});
  if(app==='documents')mount(document.querySelector('#browse'),{items:'.tile'});
  if(app==='holidays')mount(document.querySelector('.shell'),{items:'.today,.upcoming,.next-day,.panel'});
 }
 root.EduvizeKioskOutput=Object.freeze({mount,offsets});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
