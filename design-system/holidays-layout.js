/* Holiday-specific binding of the shared geometry policy to presentation tokens. */
(function(root){
 function apply(body,options,width,height){
  const policy=root.EduvizeSegmentProfile.holidays(root.EduvizeSegmentProfile.resolve(width,height),options);
  body.classList.add('ev-modern');body.dataset.segmentLayout=policy.geometry.kind;
  body.dataset.showUpcoming=String(policy.showUpcoming);body.dataset.upcomingHeading=String(policy.showUpcomingHeading);
  for(const [key,value] of Object.entries(policy.px))body.style.setProperty('--ev-'+key,value+'px');
  body.style.setProperty('--ev-columns',String(policy.columns));body.style.setProperty('--calendar-metrics-columns',String(policy.metricsColumns));
  const date=body.querySelector('#date'),year=body.querySelector('#year');
  if(date&&year&&!date.parentElement.classList.contains('calendar-date-year')){const row=document.createElement('div');row.className='calendar-date-year';date.before(row);row.append(date,year);}
  return policy;
 }
function fit(body,minFont){
 fitWordColumns(body);
 body.querySelectorAll(".upcoming-date,.metric-name,.metric-note").forEach(el=>el.style.fontSize="");
 body.querySelectorAll(".upcoming-event,.upcoming-name,.metric-value").forEach(el=>{
  el.style.fontSize="";
  const parent=el.closest(".upcoming-day,.calendar-card");
  if(!parent)return;
  const base=parseFloat(getComputedStyle(el).fontSize);
  const min=minFont;
  // Measure the longest complete word using the actual rendered font.
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
  const cs=getComputedStyle(el);
  ctx.font=[cs.fontStyle,cs.fontWeight,base+"px",cs.fontFamily].join(" ");
  const available=el.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-parseFloat(cs.borderLeftWidth)-parseFloat(cs.borderRightWidth);
  const words=el.textContent.trim().split(/[ \t\r\n]+/);
  const longest=Math.max(0,...words.map(w=>ctx.measureText(w).width));
  if(available>0&&longest>available){
   const target=Math.max(min,Math.floor(base*available/longest*0.96));
   el.style.fontSize=target+"px";
  }
  // Extremely narrow containers: prevent painting into neighboring cards.

 });
 fitCardText(body,minFont);
 fitHierarchy(body);
}

function fitWordColumns(body){
 const grid=body.querySelector('.upcoming-grid');if(!grid||!grid.clientWidth)return;
 grid.style.removeProperty('grid-template-columns');grid.style.removeProperty('grid-template-rows');
 const cards=[...grid.querySelectorAll('.upcoming-day')];if(!cards.length)return;
 const style=getComputedStyle(grid),gap=parseFloat(style.columnGap)||0;
 const desired=Math.max(1,style.gridTemplateColumns.split(/\s+/).length);
 const ctx=document.createElement('canvas').getContext('2d');let minimum=0;
 for(const card of cards){
  const cardStyle=getComputedStyle(card);const padding=(parseFloat(cardStyle.paddingLeft)||0)+(parseFloat(cardStyle.paddingRight)||0)+2;
  for(const el of card.querySelectorAll('.upcoming-date,.upcoming-name,.upcoming-event')){
   const cs=getComputedStyle(el);ctx.font=[cs.fontStyle,cs.fontWeight,cs.fontSize,cs.fontFamily].join(' ');
   const inner=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
   for(const word of el.textContent.trim().split(/[ \t\r\n]+/))minimum=Math.max(minimum,ctx.measureText(word).width+padding+inner+4);
  }
 }
 const columns=Math.max(1,Math.min(desired,Math.floor((grid.clientWidth+gap)/(minimum+gap))));
 grid.style.setProperty('grid-template-columns','repeat('+columns+',minmax(0,1fr))','important');
 if(body.classList.contains('ev-modern'))grid.style.setProperty('grid-template-rows','repeat('+Math.ceil(cards.length/columns)+',minmax(0,1fr))','important');
}

function fitCardText(body,minFont){
 body.querySelectorAll('.upcoming-day,.calendar-card').forEach(card=>{
  if(!card.clientHeight)return;
  const elements=[...card.querySelectorAll('.upcoming-date,.upcoming-name,.upcoming-event,.metric-name,.metric-value,.metric-note')].filter(el=>el.getBoundingClientRect().height>0);
  for(let attempt=0;attempt<24&&card.scrollHeight>card.clientHeight+1;attempt++){
   let changed=false;
   for(const el of elements){const size=parseFloat(getComputedStyle(el).fontSize),next=Math.max(minFont,size*.9);if(next<size-.1){el.style.fontSize=next+'px';changed=true;}}
   if(!changed)break;
  }
 });
}

 // Refit after text wrapping, asynchronous typefaces and subsequent calendar updates.
 function observe(body,getMinFont){
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fit(body,getMinFont());});}
  const observer=new MutationObserver(schedule);
  const shell=body.querySelector('.shell');
  if(shell)observer.observe(shell,{subtree:true,childList:true,characterData:true});
  document.fonts?.ready.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
  return ()=>{observer.disconnect();document.fonts?.removeEventListener('loadingdone',schedule);};
 }
 // Compare actual sizes after content fitting, including unusually long today's names.
 function fitHierarchy(body){
  const today=body.querySelector('#names');
  if(!today||!today.getBoundingClientRect().height)return;
  const ceiling=parseFloat(getComputedStyle(today).fontSize)*.8;
  body.querySelectorAll('.upcoming-name,.upcoming-event,.upcoming-date').forEach(element=>{
   if(parseFloat(getComputedStyle(element).fontSize)>ceiling)element.style.fontSize=ceiling+'px';
  });
 }
 root.EduvizeHolidaysLayout=Object.freeze({apply,fit,observe,fitHierarchy});
})(window);
