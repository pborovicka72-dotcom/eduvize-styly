import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root={innerWidth:2968,innerHeight:1750,EduvizeOutputModes:{mode:()=> 'nsp'}};
vm.runInNewContext(fs.readFileSync(new URL('../design-system/editorial-output.js',import.meta.url),'utf8'),{window:root,document:{readyState:'loading',addEventListener(){}}});
for(const signage of [true,false])for(const [w,h] of [[3840,2160],[2968,1750],[872,488],[1080,1080],[960,2160],[1200,2160],[1080,1920]]){const p=root.EduvizeNewsLayout.resolve(w,h,{signage,images:true});assert.equal(p.side,h<=w,w+'x'+h);assert.ok(p.cardWidth>0&&p.cardHeight>0);}
assert.equal(root.EduvizeNewsLayout.resolve(960,2160,{images:false}).side,false);
const styles={};root.EduvizeNewsLayout.apply({style:{setProperty:(k,v)=>styles[k]=v}},{clientWidth:2968,clientHeight:1750},{signage:true,images:true});
assert.ok(parseFloat(styles['--news-card-media-height'])>0);
const css=fs.readFileSync(new URL('../design-system/editorial-output.css',import.meta.url),'utf8');
assert.doesNotMatch(css,/container-type:\s*size|\d+cq[wh]/);
assert.match(css,/grid-template-columns:minmax\(0,32%\) minmax\(0,1fr\)/);
for(const mode of ['nsp','kiosk']){
 root.EduvizeOutputModes.mode=()=>mode;
 root.EduvizeSegmentProfile={resolve:(width,height)=>({width,height}),text:()=>({body:32})};
 for(const [w,h] of [[2160,3840],[2160,2880],[1080,1920]]){
  root.innerWidth=w;root.innerHeight=h;
  const values={};
  const policy=root.EduvizeNewsLayout.apply({style:{setProperty:(key,value)=>values[key]=value}},{clientWidth:w-40,clientHeight:h-300},{signage:true,images:true,count:6});
  assert.equal(policy.side,false,mode+' '+w+'x'+h);
  assert.ok(parseFloat(values['--news-card-media-height'])<=policy.cardHeight*.4);
 }
}
assert.equal(root.EduvizeNewsLayout.resolve(2160,960,{portrait:true}).side,false,'explicit portrait context');
console.log('Portrait images above text in NSP/kiosk; landscape unchanged; photo height leaves room for text.');
