/* Shared PDF/media zoom controls, fit modes, fullscreen and mouse panning. */
(function(root){
  function scale(page,width,height,mode='fit',zoom=1){return Math.max(.01,(mode==='width'?width/page.width:Math.min(width/page.width,height/page.height))*zoom);}
  // Prefer more pages when their combined fitted area remains within 10% of the best use of space.
  function overview(pages,width,height,{gap=12,padding=12,maxPages=3}={}){
    const w=Math.max(1,width-padding*2),h=Math.max(1,height-padding*2),options=[];
    for(let columns=1;columns<=Math.min(maxPages,3,pages.length);columns++){
      const cell=Math.max(1,(w-gap*(columns-1))/columns);
      const filled=pages.slice(0,columns).reduce((sum,page)=>{const fit=Math.min(cell/page.width,h/page.height);return sum+page.width*page.height*fit*fit;},0);
      options.push({columns,utilization:filled/(w*h)});
    }
    const best=Math.max(0,...options.map(x=>x.utilization));
    return options.filter(x=>x.utilization>=best*.9).at(-1)||{columns:1,utilization:0};
  }
  function mount(host,{onChange,fullscreenTarget}={}){
    (fullscreenTarget||host).classList.add('edu-document-fullscreen');const toolbar=document.createElement('div');toolbar.className='edu-document-tools';toolbar.hidden=true;
    const bound=new WeakSet();let active=false,mode='width',zoom=1;
    const label=document.createElement('span');label.className='edu-document-zoom';label.setAttribute('aria-live','polite');
    function changed(){label.textContent=Math.round(zoom*100)+' %';fit.setAttribute('aria-pressed',String(mode==='fit'));width.setAttribute('aria-pressed',String(mode==='width'));onChange?.();}
    function button(text,action){const b=document.createElement('button');b.type='button';b.className='edu-document-tool';b.textContent=text;b.onclick=action;toolbar.append(b);return b;}
    const fit=button('Celá stránka',()=>{mode='fit';zoom=1;changed();}),width=button('Vyplnit šířku',()=>{mode='width';zoom=1;changed();});
    button('−',()=>{zoom=Math.max(.5,zoom-.25);changed();}).setAttribute('aria-label','Zmenšit dokument');toolbar.append(label);button('+',()=>{zoom=Math.min(4,zoom+.25);changed();}).setAttribute('aria-label','Zvětšit dokument');
    const full=button('Celá obrazovka',async()=>{const target=fullscreenTarget||host;try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement)await document.webkitExitFullscreen?.();else if(target.requestFullscreen)await target.requestFullscreen();else target.webkitRequestFullscreen?.();}catch{label.textContent='Celá obrazovka není dostupná';}});
    function fullscreenState(){const enabled=!!(document.fullscreenElement||document.webkitFullscreenElement);full.textContent=enabled?'⤡ Ukončit celou obrazovku':'⛶ Celá obrazovka';full.title=enabled?'Vrátit dokument do původního zobrazení':'Zvětšit dokument na celou obrazovku';full.setAttribute('aria-label',enabled?'Ukončit celou obrazovku':'Celá obrazovka');full.setAttribute('aria-pressed',String(enabled));}
    document.addEventListener('fullscreenchange',fullscreenState);document.addEventListener('webkitfullscreenchange',fullscreenState);fullscreenState();
    if(!(fullscreenTarget||host).requestFullscreen&&!(fullscreenTarget||host).webkitRequestFullscreen)full.hidden=true;
    host.append(toolbar);label.textContent='100 %';
    return {get mode(){return mode;},get zoom(){return zoom;},activate(value){active=value;toolbar.hidden=!value;if(value){mode='width';zoom=1;}label.textContent=Math.round(zoom*100)+' %';fit.setAttribute('aria-pressed',String(mode==='fit'));width.setAttribute('aria-pressed',String(mode==='width'));},zoomIn(){zoom=Math.min(4,zoom+.25);changed();},scale:(page,w,h)=>scale(page,w,h,mode,zoom),bind(viewport){if(bound.has(viewport))return;bound.add(viewport);let drag=null,moved=false;viewport.addEventListener('wheel',e=>{if(!active||(!e.ctrlKey&&!e.metaKey))return;e.preventDefault();zoom=Math.max(.5,Math.min(4,zoom+(e.deltaY<0?.25:-.25)));changed();},{passive:false});viewport.addEventListener('pointerdown',e=>{if(!active||e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};moved=false;viewport.setPointerCapture?.(e.pointerId);});viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;viewport.scrollLeft=drag.left-dx;viewport.scrollTop=drag.top-dy;});viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);viewport.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();moved=false;}},true);}};
  }
  root.EduvizeDocumentViewport=Object.freeze({mount,scale,overview});
})(window);
