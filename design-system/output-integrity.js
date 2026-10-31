/* Final display policy. Components provide data; modes own framing and reading flow. */
(function(root){
 'use strict';
 const html=document.documentElement,mode=root.EduvizeOutputModes.mode();
 html.dataset.outputMode=mode;html.classList.toggle('web-output',mode==='web');html.classList.toggle('nsp-output',mode==='nsp');html.classList.toggle('kiosk-output',mode==='kiosk');
 if(mode==='web')document.body.classList.remove('nsp','signage','is-paged','segment-mode');
 root.EduvizeBrand?.mount();root.EduvizeOutputHeader?.update();
})(window);
