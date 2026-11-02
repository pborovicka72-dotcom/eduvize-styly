import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let writes=0;const pending=[];const style=()=>({setProperty(){writes++;}});
const header={style:style(),clientWidth:800,textContent:'Počasí',dataset:{},getBoundingClientRect:()=>({width:800,left:0}),querySelectorAll:()=>[]};
const html={dataset:{kioskApp:'weather'},style:style(),classList:{contains:()=>false,toggle(){}}};
const context={window:{innerWidth:1280,innerHeight:720,location:{search:''},addEventListener(){},EduvizeOutputModes:{mode:()=> 'kiosk'},EduvizeSegmentProfile:{resolve:()=>({short:720}),header:()=>({height:120,icon:60,title:36,meta:20,padding:10,gap:10}),text:()=>({body:24})}},document:{readyState:'complete',documentElement:html,body:{},querySelectorAll:selector=>selector==='.edu-output-header'?[header]:[]},requestAnimationFrame:fn=>pending.push(fn),MutationObserver:class{observe(){}},URLSearchParams};
vm.runInNewContext(fs.readFileSync(new URL('../output-header.js',import.meta.url),'utf8'),context);
const first=writes;
for(let i=0;i<50;i++){context.window.EduvizeOutputHeader.update();while(pending.length)pending.shift()();}
// Shared root tokens can be reapplied, but the header itself is skipped without rewriting its layout.
assert.equal(header.dataset.eduHeader,'shared');
let headerWrites=0;header.style.setProperty=()=>headerWrites++;
context.window.EduvizeOutputHeader.update();while(pending.length)pending.shift()();assert.equal(headerWrites,0);
header.textContent='Nové údaje';context.window.EduvizeOutputHeader.update();while(pending.length)pending.shift()();assert(headerWrites>0);
console.log('Repeated header events preserve layout; new header content still updates.');
