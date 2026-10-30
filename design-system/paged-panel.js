/* Shared logical pagination. Segment boundaries are supplied by the application. */
(function(root){
  const states=new WeakMap();
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
    function draw(){sheet.replaceChildren();if(items.length)options.render(sheet,items[state.index],state.index);previous.disabled=state.index===0;next.disabled=state.index>=items.length-1;status.textContent=(state.index+1)+' / '+items.length;root.EduvizeFitPanel?.refresh();}
    previous.onclick=()=>{if(state.index>0){state.index--;draw();}};
    next.onclick=()=>{if(state.index<items.length-1){state.index++;draw();}};
    draw();
  }
  root.EduvizePagedPanel=Object.freeze({mount});
})(window);
