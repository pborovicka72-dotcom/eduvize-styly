/* Final display policy. Components provide data; modes own framing and reading flow. */
(function(root){
 'use strict';
 let menuWebReady=false;
 function menuPage(){const html=document.documentElement;return html.dataset.kioskApp==='menu'&&html.dataset.menuPublished==='true'&&new URLSearchParams(root.location.search).has('edu-output');}
 function start(installWeb=true){
 const html=document.documentElement,mode=root.EduvizeOutputModes.mode();
 html.dataset.outputMode=mode;html.classList.toggle('web-output',mode==='web');html.classList.toggle('nsp-output',mode==='nsp');html.classList.toggle('kiosk-output',mode==='kiosk');
 if(mode==='web')document.body.classList.remove('nsp','signage','is-paged','segment-mode');
 if(mode==='web'&&installWeb){
  for(const frame of document.querySelectorAll('#contentFrame'))frame.addEventListener('load',()=>frame.style.setProperty('height','1px','important'));
  root.addEventListener('message',event=>{
   if(event.data?.type!=='eduvize-web-content-height'||menuPage()&&root.EduvizeOutputModes.mode()!=='web')return;
   const h=Number(event.data.height);if(!Number.isFinite(h)||h<1||h>100000)return;
   for(const frame of document.querySelectorAll('#contentFrame')){
    if(frame.contentWindow===event.source){frame.style.setProperty('height',Math.ceil(h)+'px','important');}
   }
  });
 }
 if(mode==='web'&&root.parent!==root&&installWeb){
  let queued=false,last=0;
  function report(){queued=false;if(menuPage()&&root.EduvizeOutputModes.mode()!=='web')return;const body=document.body;const height=Math.ceil(Math.max(body.scrollHeight,body.getBoundingClientRect().height));if(Math.abs(height-last)>1){last=height;root.parent.postMessage({type:'eduvize-web-content-height',height},'*');}}
  function schedule(){if(!queued){queued=true;requestAnimationFrame(report);}}
  new ResizeObserver(schedule).observe(document.body);
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  root.addEventListener('load',schedule);root.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();
 }
 root.EduvizeBrand?.mount();root.EduvizeOutputHeader?.update();
 }
 function applyMenuPublication(){
  const ids=new URLSearchParams(root.location.search).getAll('edu-output'),published=root.EduvizePublishedOutput,p=published?.presentation,modes=root.EduvizeOutputModes;
  if(!menuPage()||ids.length!==1||!(/^[a-f0-9]{32}$/).test(ids[0])||!published||!Object.isFrozen(published)||published.id!==ids[0]||!p||!['web','nsp','kiosk'].includes(p.mode)||!['interactive','display'].includes(p.interaction)||!published.metrics?.geometry||!published.metrics?.header||!published.metrics?.text||!modes||!Object.isFrozen(modes)||typeof modes.mode!=='function'||typeof modes.interaction!=='function'||modes.mode()!==p.mode||modes.interaction()!==p.interaction)throw Object.assign(Error('Publikovaný jídelníček není připraven k zobrazení.'),{code:'MENU_PUBLICATION_NOT_READY'});
  const installWeb=p.mode==='web'&&!menuWebReady;if(installWeb)menuWebReady=true;start(installWeb);return true;
 }
 root.EduvizeOutputIntegrity=Object.freeze({menuPublication:'verified-snapshot-v1',applyMenuPublication});
 function autoStart(){if(!menuPage())start();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoStart,{once:true});else autoStart();
})(window);
