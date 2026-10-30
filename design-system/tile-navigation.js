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
  function area(count=10,portrait=false,width,height,gap=0){
    count=Math.max(3,Math.min(25,Math.round(Number(count)||10)));
    const long=Math.ceil(Math.sqrt(count)),short=Math.ceil(count/long);
    let best={columns:portrait?short:long,rows:portrait?long:short,capacity:count},score=Infinity;
    if(width>0&&height>0)for(let columns=1;columns<=count;columns++){
      const rows=Math.ceil(count/columns),w=(width-gap*(columns-1))/columns,h=(height-gap*(rows-1))/rows;
      if(w<=0||h<=0)continue;
      const candidate=Math.abs(Math.log(w/h))+(columns*rows-count)*.001;
      if(candidate<score){score=candidate;best={columns,rows,capacity:count};}
    }
    return best;
  }
  function count(config){return area(config.tileCount??(config.tileColumns!==undefined||config.tileRows!==undefined?(config.tileColumns||4)*(config.tileRows||2):10)).capacity;}
  function layout(position='left',portrait=false){
    const band=['top','bottom'].includes(position);
    return portrait?(band?{columns:5,rows:2,capacity:10,band:true}:{columns:3,rows:3,capacity:9,band:false}):(band?{columns:7,rows:1,capacity:7,band:true}:{columns:2,rows:5,capacity:10,band:false});
  }
  function fit(nav,{mode='menu',position='left',columns,rows:requestedRows,tileCount,wrap}={}){
    if(!nav.clientWidth||!nav.clientHeight)return;
    const style=document.documentElement.style,portrait=root.innerHeight>root.innerWidth,gap=parseFloat(getComputedStyle(nav).gap)||0;
    let setup=layout(position,portrait);
    if(mode==='tiles'){
      const padding=parseFloat(getComputedStyle(wrap).paddingLeft)||0,width=wrap.clientWidth-padding*2,height=wrap.clientHeight-padding*2;
      const base=area(tileCount??((columns||4)*(requestedRows||2)),portrait);
      const band=Math.max(1,(height-gap*base.rows)/(base.rows+1));
      setup=area(base.capacity,portrait,width,Math.max(1,height-band-gap),gap);
      style.setProperty('--home-cols',setup.columns);style.setProperty('--home-rows',setup.rows);style.setProperty('--menu-band',band+'px');
    }
    else if(!portrait&&!setup.band){const height=wrap.clientHeight-2*(parseFloat(getComputedStyle(wrap).paddingTop)||0);const cell=(height-gap*4)/5;style.setProperty('--menu-side',Math.min(root.innerWidth*.42,cell*2+gap)+'px');style.setProperty('--menu-band',cell+'px');}
    else{const width=wrap.clientWidth-2*(parseFloat(getComputedStyle(wrap).paddingLeft)||0);const cells=portrait||position==='bottom'?setup.columns:10;const cell=(width-gap*(cells-1))/cells;style.setProperty('--menu-band',cell+'px');}
    const cols=setup.columns,rows=setup.rows;style.setProperty('--menu-cols',cols);style.setProperty('--menu-rows',rows);
    style.setProperty('--menu-cell-width',Math.max(1,(nav.clientWidth-gap*(cols-1))/cols)+'px');style.setProperty('--menu-cell-height',Math.max(1,(nav.clientHeight-gap*(rows-1))/rows)+'px');
  }
  root.EduvizeTileNavigation=Object.freeze({page,indexFor,grid,area,count,layout,fit});
})(window);
