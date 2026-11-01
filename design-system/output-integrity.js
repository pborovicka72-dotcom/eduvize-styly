/* Final display policy. Components provide data; modes own framing and reading flow. */
(function(root){
 'use strict';
 function start(){
 const html=document.documentElement,mode=root.EduvizeOutputModes.mode();
 html.dataset.outputMode=mode;html.classList.toggle('web-output',mode==='web');html.classList.toggle('nsp-output',mode==='nsp');html.classList.toggle('kiosk-output',mode==='kiosk');
 if(mode==='web')document.body.classList.remove('nsp','signage','is-paged','segment-mode');
 if(mode==='web'){
  for(const frame of document.querySelectorAll('#contentFrame'))frame.addEventListener('load',()=>frame.style.setProperty('height','1px','important'));
  root.addEventListener('message',event=>{
   if(event.data?.type!=='eduvize-web-content-height')return;
   const h=Number(event.data.height);if(!Number.isFinite(h)||h<1||h>100000)return;
   for(const frame of document.querySelectorAll('#contentFrame')){
    if(frame.contentWindow===event.source){frame.style.setProperty('height',Math.ceil(h)+'px','important');}
   }
  });
 }
 if(mode==='web'&&root.parent!==root){
  let queued=false,last=0;
  function report(){queued=false;const body=document.body;const height=Math.ceil(Math.max(body.scrollHeight,body.getBoundingClientRect().height));if(Math.abs(height-last)>1){last=height;root.parent.postMessage({type:'eduvize-web-content-height',height},'*');}}
  function schedule(){if(!queued){queued=true;requestAnimationFrame(report);}}
  new ResizeObserver(schedule).observe(document.body);
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  root.addEventListener('load',schedule);root.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();
 }
 root.EduvizeBrand?.mount();root.EduvizeOutputHeader?.update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
