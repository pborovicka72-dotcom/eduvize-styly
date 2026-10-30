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
    return portrait?(band?{columns:5,rows:2,capacity:10,band:true}:{columns:1,rows:9,capacity:9,band:false}):(band?{columns:7,rows:1,capacity:7,band:true}:{columns:2,rows:5,capacity:10,band:false});
  }
  // Balanced rows fill every row; the last row never leaves empty grid slots.
  function pack(total,width,height,gap=0){
    total=Math.max(1,Math.min(25,Math.floor(total)||1));let best,score=Infinity;
    for(let rows=1;rows<=total;rows++){
      const base=Math.floor(total/rows),extra=total%rows,counts=Array.from({length:rows},(_,i)=>base+(i<extra?1:0)),h=(height-gap*(rows-1))/rows;
      if(h<=0)continue;
      const candidate=counts.reduce((sum,n)=>sum+n*Math.abs(Math.log(Math.max(1,(width-gap*(n-1))/n)/h)),0)/total;
      if(candidate<score){score=candidate;best={rows,counts};}
    }
    return best||{rows:1,counts:[total]};
  }
  function fit(nav,{mode='menu',position='left',columns,rows:requestedRows,tileCount,wrap}={}){
    if(!nav.children.length||!nav.clientWidth||!nav.clientHeight)return;
    const style=document.documentElement.style,portrait=root.innerHeight>root.innerWidth,gap=parseFloat(getComputedStyle(nav).gap)||0;
    const padding=parseFloat(getComputedStyle(wrap).paddingLeft)||0,width=wrap.clientWidth-padding*2,height=wrap.clientHeight-padding*2;
    const uiScale=Math.max(1,Math.min(width/1280,height/720));style.setProperty('--kiosk-ui-scale',String(uiScale));
    // Use one physical proportion for every menu placement and both orientations.
    const status=Math.max(64,Math.min(width,height)*.16);style.setProperty('--status-band',status+'px');
    let setup=layout(position,portrait);
    if(mode==='tiles'){
      const packed=pack(nav.children.length,width,Math.max(1,height-status-gap),gap);
      const gcd=(a,b)=>b?gcd(b,a%b):a,tracks=packed.counts.reduce((a,b)=>a*b/gcd(a,b),1);
      style.setProperty('--home-cols',tracks);style.setProperty('--home-rows',packed.rows);
      let i=0;for(let row=0;row<packed.rows;row++)for(let col=0;col<packed.counts[row];col++){
        const button=nav.children[i++],span=tracks/packed.counts[row];button.style.gridRow=String(row+1);button.style.gridColumn=(col*span+1)+' / span '+span;
      }
      setup={columns:Math.max(...packed.counts),rows:packed.rows};
    }else if(!setup.band){
      const available=portrait?height-status-gap:height,cell=(available-gap*(setup.rows-1))/setup.rows;
      style.setProperty('--menu-side',Math.min(width*.42,cell*setup.columns+gap*(setup.columns-1))+'px');
    }else{style.setProperty('--menu-band',Math.max(1,(width-gap*(setup.columns-1))/setup.columns)+'px');}
    const cols=setup.columns,rows=setup.rows;style.setProperty('--menu-cols',cols);style.setProperty('--menu-rows',rows);
    style.setProperty('--menu-cell-width',Math.max(1,(nav.clientWidth-gap*(cols-1))/cols)+'px');style.setProperty('--menu-cell-height',Math.max(1,(nav.clientHeight-gap*(rows-1))/rows)+'px');
  }
  root.EduvizeTileNavigation=Object.freeze({page,indexFor,grid,area,count,layout,pack,fit});
})(window);
