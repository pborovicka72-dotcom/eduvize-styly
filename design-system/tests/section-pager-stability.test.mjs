import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const pending=[],mutations=[];
let resets=0,labelWrites=0;
function node(tag='div'){
 const style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};
 let transform='',text='';
 Object.defineProperty(style,'transform',{get(){return transform;},set(value){if(value==='none')resets++;transform=value;}});
 const n={tag,style,dataset:{},classList:{add(){},toggle(){}},setAttribute(){},append(){},after(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},scrollHeight:100,scrollWidth:300};
 Object.defineProperty(n,'textContent',{get(){return text;},set(value){labelWrites++;text=value;}});return n;
}
const section=node(),host=node();host.clientWidth=300;host.clientHeight=200;host.querySelectorAll=()=>[section];
const window={EduvizeOutputModes:{isInteractive:()=>true},addEventListener(){}};
const context={window,document:{createElement:node,documentElement:{hasAttribute:()=>false}},getComputedStyle:()=>({fontSize:'18px',lineHeight:'24px',getPropertyValue:()=>''}),requestAnimationFrame:fn=>pending.push(fn),ResizeObserver:class{observe(){}},MutationObserver:class{constructor(fn){mutations.push(fn);}observe(){}}};
vm.runInNewContext(fs.readFileSync(new URL('../section-pager.js',import.meta.url),'utf8'),context);
const api=window.EduvizeSectionPager.mount(host);
const flush=()=>{while(pending.length)pending.shift()();};flush();assert.equal(resets,1);
const writes=labelWrites;
for(let i=0;i<100;i++){api.refresh();flush();}
assert.equal(resets,1,'Repeated unchanged layout events must not reset the section transform');
assert.equal(labelWrites,writes,'Repeated refresh must not rewrite pagination text');
host.clientWidth=320;api.refresh();flush();assert.equal(resets,2,'A real resize must still refit');
mutations[0]([{type:'childList'}]);flush();assert.equal(resets,3,'New source content must still refit');
console.log('Section fitting stays stable across repeated events and responds to data or viewport changes.');
