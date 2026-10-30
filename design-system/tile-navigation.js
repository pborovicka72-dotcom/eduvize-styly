/* Up to eight tiles: seven entries on the first/last page, six between Back and Next. */
(function(root){
  function groups(items,capacity=8){
    capacity=Math.max(3,Math.min(64,Number(capacity)||8));
    if(items.length<=capacity)return [items];
    const result=[items.slice(0,capacity-1)];let start=capacity-1;
    while(items.length-start>capacity-1){result.push(items.slice(start,start+capacity-2));start+=capacity-2;}
    if(start<items.length)result.push(items.slice(start));return result;
  }
  function page(items,index=0,capacity=8){
    const pages=groups(items,capacity),current=Math.max(0,Math.min(pages.length-1,Number(index)||0));
    const previous=current>0?current-1:null,next=current+1<pages.length?current+1:null;
    return {items:pages[current],index:current,hasMore:pages.length>1,count:pages.length,previous,next,slots:pages.length>1?capacity:pages[current].length};
  }
  function indexFor(items,index,capacity=8){const item=items[index];return Math.max(0,groups(items,capacity).findIndex(group=>group.includes(item)));}
  function grid(columns,rows){columns=Math.max(1,Math.min(8,Math.round(Number(columns)||4)));rows=Math.max(Math.ceil(3/columns),Math.min(8,Math.round(Number(rows)||2)));return {columns,rows,capacity:columns*rows};}
  root.EduvizeTileNavigation=Object.freeze({page,indexFor,grid});
})(window);
