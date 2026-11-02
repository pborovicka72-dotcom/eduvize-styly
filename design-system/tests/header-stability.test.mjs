import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let writes=0;const pending=[],listeners={};
function style(){const values=new Map(),priorities=new Map();return {setProperty(name,value,priority=''){writes++;values.set(name,String(value));priorities.set(name,priority);},getPropertyValue:name=>values.get(name)||'',getPropertyPriority:name=>priorities.get(name)||''};}
const header={style:style(),clientWidth:800,textContent:'Počasí',dataset:{},getBoundingClientRect:()=>({width:800,left:0}),querySelectorAll:()=>[]};
const html={dataset:{kioskApp:'weather'},style:style(),classList:{contains:()=>false,toggle(){}}};
const parent={};
const context={window:{parent,innerWidth:1280,innerHeight:720,location:{search:''},addEventListener(name,fn){listeners[name]=fn;},EduvizeOutputModes:{mode:()=> 'kiosk',isKiosk:()=>true},EduvizeSegmentProfile:{resolve:()=>({short:720}),header:()=>({height:120,icon:60,title:36,meta:20,padding:10,gap:10}),text:()=>({body:24})}},document:{readyState:'complete',documentElement:html,body:{},querySelectorAll:selector=>selector==='.edu-output-header'?[header]:[]},requestAnimationFrame:fn=>pending.push(fn),MutationObserver:class{observe(){}},URLSearchParams};
vm.runInNewContext(fs.readFileSync(new URL('../output-header.js',import.meta.url),'utf8'),context);
const flush=()=>{while(pending.length)pending.shift()();};flush();
const initial=writes;
for(let i=0;i<100;i++){context.window.EduvizeOutputHeader.update();flush();}
assert.equal(writes,initial,'Unchanged updates must not rewrite any CSS property, including root variables');
const message={source:parent,data:{type:'eduvize-kiosk-layout',headerHeight:100,headerStyle:'light',menuLayout:true,parentMode:'kiosk'}};
listeners.message(message);flush();assert(writes>initial);
const applied=writes;
for(let i=0;i<100;i++){listeners.message(message);flush();}
assert.equal(writes,applied,'Duplicate kiosk messages must not trigger repaint-producing style writes');
message.data.headerHeight=110;listeners.message(message);flush();assert(writes>applied,'Real height changes must still apply');
assert.equal(header.dataset.eduHeader,'shared');
console.log('100 unchanged updates and 100 duplicate kiosk messages cause zero CSS writes; real changes still apply.');
