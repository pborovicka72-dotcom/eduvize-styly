/* Aspect-ratio composition shared by preview, web, NSP and kiosk. */
(function(root){
 const ratio=i=>Math.max(.15,Math.min(7,Number(i.width)/Number(i.height)||4/3));
 function trees(items){
  if(items.length===1)return [{ratio:ratio(items[0]),item:items[0]}];
  const result=[];
  for(let k=1;k<items.length;k++)for(const a of trees(items.slice(0,k)))for(const b of trees(items.slice(k))){
   result.push({ratio:a.ratio+b.ratio,a,b,axis:'x'});
   result.push({ratio:1/(1/a.ratio+1/b.ratio),a,b,axis:'y'});
  }
  // A bounded range of natural canvas ratios, not just square templates.
  const buckets=new Map();for(const t of result){const key=Math.round(Math.log(t.ratio)*18);if(!buckets.has(key))buckets.set(key,t);}
  return [...buckets.values()].slice(0,100);
 }
 function place(t,x,y,w,h,gap,out=[]){
  if(t.item){out.push({item:t.item,x,y,w:Math.max(1,w),h:Math.max(1,h)});return out;}
  if(t.axis==='x'){const a=(w-gap)*t.a.ratio/(t.a.ratio+t.b.ratio);place(t.a,x,y,a,h,gap,out);place(t.b,x+a+gap,y,w-a-gap,h,gap,out);}
  else {const a=(h-gap)*(1/t.a.ratio)/(1/t.a.ratio+1/t.b.ratio);place(t.a,x,y,w,a,gap,out);place(t.b,x,y+a+gap,w,h-a-gap,gap,out);}
  return out;
 }
 function compose(items,width,height,options={}){
  if(!items.length)return [];
  const gap=Math.max(0,Math.min(24,Math.min(width,height)*.008));
  let orders=[items];
  if(options.smart!==false){const sorted=[...items].sort((a,b)=>ratio(a)-ratio(b));orders.push(sorted,[...sorted].reverse(),sorted.filter((_,i)=>i%2===0).concat(sorted.filter((_,i)=>i%2)));}
  if(options.style==='rows'){
   const count=items.length,rows=width>height?Math.max(1,Math.round(Math.sqrt(count*height/width))):Math.ceil(count/2),per=Math.ceil(count/rows),out=[];
   const groups=[];for(let i=0;i<count;i+=per)groups.push(items.slice(i,i+per));
   const weights=groups.map(g=>1/g.reduce((s,i)=>s+ratio(i),0)),sum=weights.reduce((a,b)=>a+b,0);let y=0;
   groups.forEach((g,i)=>{const h=(height-gap*(groups.length-1))*weights[i]/sum,total=g.reduce((s,i)=>s+ratio(i),0);let x=0;g.forEach(item=>{const w=(width-gap*(g.length-1))*ratio(item)/total;out.push({item,x,y,w,h});x+=w+gap;});y+=h+gap;});
   return decorate(out,options);
  }
  let best=null,score=Infinity;
  for(const order of orders)for(const tree of trees(order)){
   const cells=place(tree,0,0,width,height,gap),cost=cells.reduce((s,c)=>{const r=c.w/c.h,loss=1-Math.min(r/ratio(c.item),ratio(c.item)/r);return s+loss*loss*c.w*c.h/(width*height)+(loss>(Number(options.crop)||0)/100?.08:0);},0);
   if(cost<score){score=cost;best=cells;}
  }
  return decorate(best||[],options);
 }
 function decorate(cells,options){const max=(Number(options.crop)||0)/100;return cells.map(c=>{const r=c.w/c.h,loss=1-Math.min(r/ratio(c.item),ratio(c.item)/r);return {...c,cropLoss:loss,fit:loss<=max+.00001?'cover':'contain'};});}
 root.EduvizeGalleryLayout=Object.freeze({compose,ratio});
})(typeof window==='undefined'?globalThis:window);
