const assert=require('node:assert/strict');
require('./layout.js');
const layout=globalThis.EduvizeGalleryLayout;
const items=[[600,900],[1600,900],[900,600],[800,1200],[2000,600],[900,900]].map(([width,height],id)=>({id,width,height}));
let checks=0;
for(const [w,h] of [[1920,1080],[1080,1920],[872,488],[2968,488],[960,2160]])
for(const style of ['mosaic','rows','single'])for(let count=1;count<=6;count++){
 const cells=layout.compose(items.slice(0,count),w,h,{style,smart:true,crop:10});
 assert.equal(cells.length,count);assert.equal(new Set(cells.map(c=>c.item.id)).size,count);
 for(const c of cells){assert(c.x>=0&&c.y>=0&&c.x+c.w<=w+.1&&c.y+c.h<=h+.1);assert(c.fit!=='cover'||c.cropLoss<=.10001);}
 for(let a=0;a<count;a++)for(let b=a+1;b<count;b++){
  const x=cells[a],y=cells[b];assert(!(Math.min(x.x+x.w,y.x+y.w)-Math.max(x.x,y.x)>.1&&Math.min(x.y+x.h,y.y+y.h)-Math.max(x.y,y.y)>.1));
 }
 checks++;
}
console.log(`${checks} aspect-ratio, crop-bound and non-overlap cases passed`);
