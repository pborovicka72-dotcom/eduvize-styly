import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../nsp-segments.js',import.meta.url),'utf8');
// Execute the real preparation/load binding, not a copy of the visibility policy.
const start=source.indexOf(" if(!frame.classList.contains('edu-preview-frame'))"),end=source.indexOf(' if(options.preservePreview!==true)cell.append(frame);',start);
assert.ok(start>0&&end>start);
const prepare=source.slice(start,end);
function fixture(){
 const classes=new Set(),raf=[],style={visibility:'',setProperty(name,value){this[name]=value;},set cssText(value){this.visibility=value.match(/visibility:([^;]+)/)?.[1]||'';}};
 const frame={style,classList:{contains:name=>classes.has(name),add:name=>classes.add(name)},setAttribute(){},addEventListener(){}},context={frame,width:872,height:1672,reused:false,options:{},requestAnimationFrame:fn=>raf.push(fn)};
 const draw=reused=>{context.reused=reused;vm.runInNewContext(prepare,context);};
 const load=()=>{frame.onload();while(raf.length)raf.shift()();};
 return {frame,context,draw,load,mount(){
  const host={clientWidth:772,clientHeight:127,style:{setProperty(){}},classList:{add(){}},dataset:{}};
  const helper={window:{},getComputedStyle:()=>({position:'relative'}),ResizeObserver:class{observe(){}disconnect(){}}};
  vm.runInNewContext(fs.readFileSync(new URL('../preview-viewport.js',import.meta.url),'utf8'),helper);
  helper.window.EduvizePreviewViewport.mount(frame,{host,width:context.width,height:context.height,aspect:false});
 }};
}
const f=fixture();f.draw(false);assert.equal(f.frame.style.visibility,'hidden','new navigation waits for load');
f.draw(true);assert.equal(f.frame.style.visibility,'hidden','reuse before first load must not reveal incomplete content');
f.load();assert.equal(f.frame.style.visibility,'visible');
// Helper script resolves after the document: same URL, new segment, no second load.
f.context.width=2968;f.context.height=488;f.draw(true);
assert.equal(f.frame.style.visibility,'visible','same-document geometry redraw before async viewport helper must keep loaded preview visible');
f.mount();assert.equal(f.frame.style.visibility,'visible','late helper mount changes geometry only');assert.equal(f.frame.style.width,'2968px');assert.equal(f.frame.style.height,'488px');assert.ok(f.frame.style.transform.startsWith('scale('));
f.draw(true);assert.equal(f.frame.style.visibility,'visible','mounted same-document redraw remains visible');
f.draw(false);assert.equal(f.frame.style.visibility,'hidden','actual new navigation still hides until load');f.draw(true);assert.equal(f.frame.style.visibility,'hidden','reusing pending new navigation cannot reveal it early');f.load();assert.equal(f.frame.style.visibility,'visible');
console.log('PASS: delayed helper + same URL segment resize retains visibility; first/new navigation still waits for load.');
