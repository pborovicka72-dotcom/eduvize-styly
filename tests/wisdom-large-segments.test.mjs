import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync(new URL('../design-system/editorial-output.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../design-system/editorial-output.css',import.meta.url),'utf8');

function display({mode='nsp',width=3840,height=2160,base=112,lines=2}={}){
 let size=base,neededLines=lines;
 const frames=[],mutations=[],resizes=[],events={};
 const root={innerWidth:width,innerHeight:height,EduvizeOutputModes:{mode:()=>mode},addEventListener:(name,fn)=>events[name]=fn};
 const content={clientWidth:width-192,clientHeight:height-600,children:[]};
 const quote={textContent:'Krátký citát',clientWidth:1440,closest:()=>content,
  style:{removeProperty(){size=base;},setProperty(name,value){if(name==='font-size')size=parseFloat(value);}},
  get scrollHeight(){return size*1.3*neededLines;},scrollWidth:1440,
  getBoundingClientRect:()=>({height:size*1.3*neededLines})};
 const author={getBoundingClientRect:()=>({height:100})};content.children=[quote,author];
 const document={readyState:'loading',addEventListener:(name,fn)=>events[name]=fn,
  querySelector:selector=>selector.includes(' .quote')?quote:selector.endsWith(' .content')?content:null};
 class MutationObserver{constructor(fn){mutations.push(fn);}observe(){}}
 class ResizeObserver{constructor(fn){resizes.push(fn);}observe(){}}
 vm.runInNewContext(code,{window:root,document,MutationObserver,ResizeObserver,
  requestAnimationFrame:fn=>frames.push(fn),getComputedStyle:el=>el===content?{paddingTop:'96',paddingBottom:'96',rowGap:'48'}:{fontSize:String(base)}});
 events.DOMContentLoaded();
 function flush(){while(frames.length)frames.shift()();}
 flush();
 return {root,quote,content,events,flush,size:()=>size,
  changeLines(n){neededLines=n;mutations.forEach(fn=>fn());flush();},
  resize(w,h){content.clientWidth=w-192;content.clientHeight=h-600;resizes.forEach(fn=>fn());flush();}};
}

for(const [width,height] of [[3840,2160],[2640,1480],[2160,3840]]){
 const d=display({width,height});
 assert.equal(d.size(),112,`${width}x${height}: short quote must not fill free space`);
 d.changeLines(25);
 assert.ok(d.size()<112,`${width}x${height}: long quote shrinks`);
 const available=d.content.clientHeight-192-100-48;
 assert.ok(d.quote.scrollHeight<=available+1,'author and gaps remain inside card');
 d.changeLines(2);
 assert.equal(d.size(),112,'reused DOM restores role after a shorter quote');
 d.resize(width,height+800);
 assert.equal(d.size(),112,'ResizeObserver must not enlarge into new empty space');
}
assert.equal(display({mode:'kiosk',base:40}).size(),40,'kiosk keeps bounded nearby-reading role');
assert.equal(display({mode:'web',base:76}).size(),76,'web retains CSS role');

// Both editorial applications share this file: execute News layout, do not stub it.
const news=display().root;
news.EduvizeSegmentProfile={resolve:(width,height)=>({width,height}),text:()=>({body:32})};
for(const mode of ['nsp','kiosk']){
 news.EduvizeOutputModes.mode=()=>mode;
 for(const [width,height] of [[2160,3840],[1080,1920],[960,2160]]){
  news.innerWidth=width;news.innerHeight=height;
  const values={};const p=news.EduvizeNewsLayout.apply({style:{setProperty:(k,v)=>values[k]=v}},{clientWidth:width,clientHeight:height},{signage:true,images:true});
  assert.equal(p.side,false,'News portrait image stays above text');
  assert.ok(parseFloat(values['--news-card-media-height'])<=p.cardHeight*.4,'News portrait photo leaves text room');
 }
 assert.equal(news.EduvizeNewsLayout.resolve(2968,1750,{signage:true,images:true}).side,true,'News landscape retains side image');
}
assert.match(css,/@media \(min-width:1201px\) and \(min-height:721px\)/);
assert.match(css,/font-size:clamp\(32px,calc\(var\(--edu-text-body,40px\)\*1\.15\),112px\)/);
console.log('PASS: large Wisdom roles, shrink/reused DOM/resize, kiosk/web, News portrait/landscape and 40% media.');
