import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const queue=[],observers=[],writes=[];
function style(initial={}){const values={...initial};return {getPropertyValue:k=>values[k]||'',setProperty(k,v){values[k]=v;writes.push([k,v]);}};}
const viewport={clientHeight:706,style:style({'--edu-page-font':'17px'})};
const host={clientWidth:1280,get clientHeight(){return viewport.clientHeight-7*parseFloat(viewport.style.getPropertyValue('--edu-page-font'));},style:style(),dataset:{},closest:()=>viewport};
const window={};
vm.runInNewContext(readFileSync(new URL('../content-surface.js',import.meta.url),'utf8'),{window,document:{},requestAnimationFrame:fn=>queue.push(fn),ResizeObserver:class {constructor(callback){this.callback=callback;observers.push(this);}observe(){}}});
window.EduvizeContentSurface.mount(host);
const sizes=[];
for(let frame=0;frame<30;frame++){observers[0].callback();while(queue.length)queue.shift()();sizes.push(host.style.getPropertyValue('--edu-content-font'));}
assert.equal(new Set(sizes).size,1);
assert.equal(sizes[0],'21px');
assert.equal(writes.filter(([k])=>k==='--edu-page-font').length,1,'Unchanged geometry must not rewrite the header metric.');
viewport.clientHeight=900;host.clientWidth=640;observers[0].callback();while(queue.length)queue.shift()();
assert.equal(host.style.getPropertyValue('--edu-content-font'),'19px','Real viewport changes must still resize text.');
console.log('Content typography remains stable across 30 resize notifications and responds to real viewport changes.');
