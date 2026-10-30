/* Shared logical pagination. Segment boundaries are supplied by the application. */
(function(root){
  const states=new WeakMap(),flows=new WeakMap();
  function mount(host,items,options){
    let state=states.get(host);
    if(!state||state.key!==options.key)state={key:options.key,index:0};
    state.index=Math.min(state.index,Math.max(0,items.length-1));states.set(host,state);
    host.replaceChildren();host.classList.add('edu-paged-panel');
    const stage=document.createElement('div');stage.className='edu-paged-stage';
    if(options.fit!==false)stage.dataset.eduFit='';
    const sheet=document.createElement('div');sheet.className='edu-paged-content';stage.append(sheet);host.append(stage);
    const nav=document.createElement('nav');nav.className='edu-pagination';nav.setAttribute('aria-label',options.label||'Stránkování obsahu');
    const previous=document.createElement('button'),next=document.createElement('button'),status=document.createElement('span');
    previous.type=next.type='button';previous.className=next.className='edu-pagination-button';
    previous.textContent='← Předchozí';next.textContent='Další →';status.className='edu-pagination-status';status.setAttribute('aria-live','polite');
    nav.append(previous,status,next);nav.hidden=items.length<2;host.append(nav);
    function draw(){sheet.replaceChildren();if(items.length)options.render(sheet,items[state.index],state.index);previous.disabled=state.index===0;next.disabled=state.index>=items.length-1;status.textContent=(state.index+1)+' / '+items.length;options.onPageChange?.(state.index);root.EduvizeFitPanel?.refresh();}
    previous.onclick=()=>{if(state.index>0){state.index--;draw();}};
    next.onclick=()=>{if(state.index<items.length-1){state.index++;draw();}};
    draw();
  }
  // Pack complete content blocks using their rendered height, rather than one block per page.
  function mountFlow(host,items,options){
    let flow=flows.get(host);
    if(!flow){
      flow={anchor:0,queued:false,loadedImages:new Set()};flows.set(host,flow);
      const schedule=()=>{if(flow.queued)return;flow.queued=true;requestAnimationFrame(()=>{flow.queued=false;reflow();});};
      function reflow(){if(flow.items&&host.clientWidth&&host.clientHeight)pack(host,flow);}
      if(typeof ResizeObserver!=='undefined'){flow.observer=new ResizeObserver(schedule);flow.observer.observe(host);}
      host.addEventListener?.('load',event=>{const image=event.target;if(image.tagName!=='IMG')return;const signature=image.currentSrc+'|'+image.naturalWidth+'|'+image.naturalHeight;if(flow.loadedImages.has(signature))return;flow.loadedImages.add(signature);schedule();},true);
      document.fonts?.ready.then(schedule);
    }
    if(flow.key!==options.key)flow.anchor=0;
    Object.assign(flow,{items,options,key:options.key});pack(host,flow);
  }
  function pack(host,flow){
    const {items,options}=flow,groups=[];let start=0,group=[];
    const probe=document.createElement('div'),measure=document.createElement('div');probe.className='edu-flow-measure';probe.append(measure);
    const measurable=host.clientWidth&&host.clientHeight;
    if(measurable){probe.style.width=host.clientWidth+'px';host.append(probe);}
    // Reserve the pager's measured height. A single page can use the complete viewport.
    const nav=host.querySelector?.('.edu-pagination'),style=typeof getComputedStyle==='function'?getComputedStyle(host):null;
    const reserve=(nav?.getBoundingClientRect().height||34)+(parseFloat(style?.rowGap)||10);
    const height=host.clientHeight-reserve;
    for(let i=0;i<items.length;i++){
      const candidate=[...group,items[i]];
      let fits=true;
      if(measurable){measure.replaceChildren();options.render(measure,candidate);fits=measure.scrollHeight<=(start===0&&i===items.length-1?host.clientHeight:height);}
      if(group.length&&!fits){groups.push({start,items:group});start=i;group=[];}
      group.push(items[i]);
    }
    if(group.length)groups.push({start,items:group});
    if(measurable)probe.remove();
    const index=Math.max(0,groups.findIndex(g=>flow.anchor>=g.start&&flow.anchor<g.start+g.items.length));
    states.set(host,{key:options.key,index});
    mount(host,groups,{...options,onPageChange:i=>{flow.anchor=groups[i]?.start||0;options.onPageChange?.(i);},render:(sheet,g)=>options.render(sheet,g.items)});
  }
  root.EduvizePagedPanel=Object.freeze({mount,mountFlow});
})(window);
