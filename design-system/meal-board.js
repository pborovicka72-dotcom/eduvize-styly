/* Complete-day menu component. Shared by web, kiosk and native NSP viewports. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function profile(width,height,mode='nsp'){
  const short=Math.min(width,height),web=mode==='web';
  return {body:web?22:width/height>=2.7?clamp(short*.065,26,56):width/height<.8?clamp(short*.052,36,88):clamp(short*.024,20,60),gap:web?22:clamp(short*.018,10,40),
   first:web?(width>=1050?2:1):(width>=1500&&height>=850?2:1),
   later:web?(width>=1500?3:width>=1050?2:1):(width>=2400&&height>=1100?3:width>=1500&&height>=850?2:1),
   horizontal:!web&&(width/height>=2.7||height<=720&&width>=700)};
 }
 // No day may be split or silently shortened. First two days form the primary spread.
 function pages(days,first,later){
  if(!days.length)return [];
  const result=[days.slice(0,first)];
  for(let i=first;i<days.length;i+=later)result.push(days.slice(i,i+later));
  return result;
 }
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 function icon(path){const n=el('span','edu-meal-icon');n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';return n;}
 function card(day,options){
  const n=el('section','edu-meal-day'),head=el('header','edu-meal-day-head'),body=el('div','edu-meal-day-body');
  n.dataset.date=day.date;head.append(el('h2','',day.title),el('span','edu-meal-date',day.dateLabel));n.append(head,body);
  const supplements=el('div','edu-meal-supplements');
  for(const group of day.groups){
   const section=el('article','edu-meal-course'),copy=el('div','edu-meal-copy');section.dataset.kind=group.kind;
   section.append(icon(options.paths[group.kind]||options.paths.other),copy);copy.append(el('h3','edu-meal-category',group.label));
   const list=el('div','edu-meal-choices');list.style.setProperty('--meal-choices',Math.min(3,group.meals.length));
   for(const meal of group.meals){const row=el('div','edu-meal-choice'),text=el('div','edu-meal-choice-copy');
    if(meal.variant)row.append(el('span','edu-meal-number',meal.variant));else row.classList.add('unnumbered');
    text.append(el('p','edu-meal-name',meal.name));
    if(options.allergens){const note=el('p','edu-meal-allergens',meal.allergenText);if(meal.allergenTitle)note.title=meal.allergenTitle;text.append(note);}
    row.append(text);list.append(row);
   }
   copy.append(list);(group.kind==='other'||group.kind==='drinks'?supplements:body).append(section);
  }
  if(supplements.children.length)body.append(supplements);
  return n;
 }
 function render(host,days,options){
  const board=el('div','edu-meal-board');board.style.setProperty('--edu-meal-columns',days.length);
  for(const day of days)board.append(card(day,options));host.append(board);
  for(const selector of ['.edu-meal-course[data-kind=soup]','.edu-meal-supplements']){
   const rows=[...board.querySelectorAll(selector)];const height=Math.max(0,...rows.map(n=>n.getBoundingClientRect().height));
   if(height&&!options.horizontal&&options.align!==false)rows.forEach(n=>n.style.minHeight=height+'px');
  }
  return board;
 }
 root.EduvizeMealBoard=Object.freeze({profile,pages,render});
})(typeof window==='undefined'?globalThis:window);
