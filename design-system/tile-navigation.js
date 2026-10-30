/* Shared capacity-aware tile paging, grid normalization and viewport geometry. */
(function(root){
  function groups(items,capacity=8){
    capacity=Math.max(3,Math.min(64,Math.floor(Number(capacity)||8)));
    if(items.length<=capacity)return [items];
    const result=[items.slice(0,capacity-1)];let start=capacity-1;
    while(items.length-start>capacity-1){result.push(items.slice(start,start+capacity-2));start+=capacity-2;}
    if(start<items.length)result.push(items.slice(start));return result;
  }
  function page(items,index=0,capacity=8){
    capacity=Math.max(3,Math.min(64,Math.floor(Number(capacity)||8)));
    const pages=groups(items,capacity),current=Math.max(0,Math.min(pages.length-1,Number(index)||0));
    const previous=current>0?current-1:null,next=current+1<pages.length?current+1:null;
    return {items:pages[current],index:current,hasMore:pages.length>1,count:pages.length,previous,next,slots:pages.length>1?capacity:pages[current].length};
  }
  function indexFor(items,index,capacity=8){const item=items[index];return Math.max(0,groups(items,capacity).findIndex(group=>group.includes(item)));}
  function grid(columns,rows){columns=Math.max(1,Math.min(8,Math.round(Number(columns)||4)));rows=Math.max(Math.ceil(3/columns),Math.min(8,Math.round(Number(rows)||2)));return {columns,rows,capacity:columns*rows};}
  function fit(nav,{mode='menu',position='left',columns,rows:requestedRows,wrap,slots}={}){
    const n=slots||Number(nav.dataset.menuSlots)||nav.children.length;if(!n||!nav.clientWidth||!nav.clientHeight)return;
    const style=document.documentElement.style,w=root.innerWidth,h=root.innerHeight,gap=parseFloat(getComputedStyle(nav).gap)||0;let cols,rows;
    const vertical=mode!=='tiles'&&!['top','bottom'].includes(position);
    if(mode==='tiles'){const setup=grid(columns,requestedRows);cols=setup.columns;rows=setup.rows;style.setProperty('--home-cols',cols);style.setProperty('--home-rows',rows);}
    else{cols=vertical?(n>1?2:1):Math.max(2,n);rows=vertical?Math.ceil(n/cols):1;style.setProperty('--menu-cols',cols);style.setProperty('--menu-rows',rows);if(vertical){const tileHeight=Math.max(1,(nav.clientHeight-gap*(rows-1))/rows);style.setProperty('--menu-side',Math.round(Math.min(w*.44,Math.max(cols*56+gap*(cols-1),cols*tileHeight+gap*(cols-1))))+'px');}else{const width=wrap.clientWidth-2*(parseFloat(getComputedStyle(wrap).paddingLeft)||0);style.setProperty('--menu-band',Math.min((width-gap*(cols-1))/cols,h*.28)+'px');}}
    for(const button of nav.querySelectorAll('[data-nav-slot]')){const slot=Number(button.dataset.navSlot);button.style.gridColumn=String(slot%cols+1);button.style.gridRow=String(Math.floor(slot/cols)+1);}
    const tileWidth=(nav.clientWidth-gap*(cols-1))/cols,tileHeight=(nav.clientHeight-gap*(rows-1))/rows;style.setProperty('--menu-cell-width',tileWidth+'px');style.setProperty('--menu-cell-height',Math.max(1,tileHeight)+'px');const span=vertical?cols:Math.min(2,Math.max(1,Math.floor(cols*.45)));style.setProperty('--navigation-heading-width',Math.round(tileWidth*span+gap*(span-1))+'px');
  }
  root.EduvizeTileNavigation=Object.freeze({page,indexFor,grid,fit});
})(window);
