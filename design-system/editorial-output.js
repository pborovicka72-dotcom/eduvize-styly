/* Fit complete quotations to the actual content box in both NSP and kiosk. */
(function(root){
 let queued=false;
 function fit(){
  queued=false;
  if(root.EduvizeOutputModes?.mode?.()==='web')return;
  const quote=document.querySelector('.edu-wisdom-output .quote');if(!quote)return;
  const content=quote.closest('.content');if(!content||!content.clientHeight||!content.clientWidth)return;
  quote.style.removeProperty('font-size');
  const cs=getComputedStyle(content),visible=[...content.children].filter(e=>e.getBoundingClientRect().height>0);
  const other=visible.filter(e=>e!==quote).reduce((sum,e)=>sum+e.getBoundingClientRect().height,0);
  const available=content.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-other-(parseFloat(cs.rowGap)||0)*Math.max(0,visible.length-1);
  const base=parseFloat(getComputedStyle(quote).fontSize);if(available<=0)return;
  function fits(size){quote.style.setProperty('font-size',size+'px','important');return quote.scrollHeight<=available+1&&quote.scrollWidth<=quote.clientWidth+1;}
  const length=quote.textContent.trim().length;
  const target=root.EduvizeOutputModes?.mode?.()==='kiosk'?base:length<=180?Math.max(base,Math.min(220,content.clientWidth/9,available*.38)):base;
  if(fits(target))return;
  let low=Math.min(12,base),high=target;
  for(let step=0;step<12;step++){const mid=(low+high)/2;if(fits(mid))low=mid;else high=mid;}
  fits(low);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(fit);}}
 function start(){
  const content=document.querySelector('.edu-wisdom-output .content');if(!content)return;
  const topic=document.querySelector('.edu-wisdom-output #topic');
  if(topic){
   const category=document.createElement('div');category.className='wisdom-category';
   content.prepend(category);
   const syncTopic=()=>{const text=topic.textContent.trim()?'Citát':'';if(category.textContent!==text)category.textContent=text;};
   new MutationObserver(syncTopic).observe(topic,{childList:true,characterData:true,subtree:true});syncTopic();
  }
  new MutationObserver(schedule).observe(content,{childList:true,characterData:true,subtree:true});
  const observer=new ResizeObserver(schedule);observer.observe(content);
  const header=document.querySelector('.edu-output-header');if(header)observer.observe(header);
  document.fonts?.ready.then(schedule);root.addEventListener('load',schedule);root.addEventListener('resize',schedule);schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);

/* News cards adapt to their available content area; shared headers keep their geometry. */
(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function resolve(width,height,{signage=true,images=true,count=6,portrait=height>width}={}){
  let columns=signage?(width>=2600?3:width>=1500?2:1):(width>=780?2:1);
  let rows=signage?clamp(Math.floor(height/(images?480:380)),1,3):1;
  // Near-square portrait segments need wider cards, rather than six shallow photo strips.
  const proposedRatio=(width/columns)/(height/rows);
  if(signage&&images&&columns===2&&rows===3&&proposedRatio>=1.15&&proposedRatio<1.45)columns=1;
  const capacity=signage?Math.min(6,columns*rows):count;
  columns=Math.max(1,Math.min(columns,count||1,capacity||1));
  rows=signage?Math.max(1,Math.ceil(Math.min(capacity,count||1)/columns)):1;
  const gap=clamp(Math.min(width,height)*.014,10,28);
  const cardWidth=(width-gap*(columns-1))/columns;
  const cardHeight=(height-gap*(rows-1))/rows;
  const font=root.EduvizeOutputModes?.mode?.()==='kiosk'?root.EduvizeSegmentProfile.text(root.EduvizeSegmentProfile.resolve(width,height),'kiosk').body:signage?clamp(Math.min(cardWidth/24,cardHeight/15),20,58):(root.EduvizeOutputModes?.mode?.()==='kiosk'?clamp(width/100,20,32):16);
  return {columns,rows,capacity,side:images&&!portrait,font,pad:clamp(font*.65,14,32),gap};
 }
 function apply(body,grid,options){
  const policy=resolve(grid.clientWidth,grid.clientHeight||root.innerHeight*.78,{portrait:root.innerHeight>root.innerWidth,...options});
  for(const [key,value] of Object.entries({body:policy.font,title:policy.font*1.25,meta:Math.max(14,policy.font*.68),pad:policy.pad,gap:policy.gap}))body.style.setProperty('--news-card-'+key,value+'px');
  return policy;
 }
 root.EduvizeNewsLayout=Object.freeze({resolve,apply});
})(window);

