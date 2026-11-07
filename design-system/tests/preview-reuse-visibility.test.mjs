import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../nsp-segments.js',import.meta.url),'utf8');
// Execute the real preparation/load binding, not a copy of the visibility policy.
const start=source.indexOf(" if(!frame.classList.contains('edu-preview-frame'))"),end=source.indexOf(' if(options.preservePreview!==true)cell.append(frame);',start);
assert.ok(start>0&&end>start);
const prepare=source.slice(start,end);
function fixture(){
 let mounted=false;const raf=[],style={visibility:'',set cssText(value){this.visibility=value.match(/visibility:([^;]+)/)?.[1]||'';}};
 const frame={style,classList:{contains:()=>mounted}},context={frame,width:872,height:1672,reused:false,options:{},requestAnimationFrame:fn=>raf.push(fn)};
 const draw=reused=>{context.reused=reused;vm.runInNewContext(prepare,context);};
 const load=()=>{frame.onload();while(raf.length)raf.shift()();};
 return {frame,context,draw,load,mount(){mounted=true;}};
}
const f=fixture();f.draw(false);assert.equal(f.frame.style.visibility,'hidden','new navigation waits for load');
f.draw(true);assert.equal(f.frame.style.visibility,'hidden','reuse before first load must not reveal incomplete content');
f.load();assert.equal(f.frame.style.visibility,'visible');
// Helper script resolves after the document: same URL, new segment, no second load.
f.context.width=2968;f.context.height=488;f.draw(true);
assert.equal(f.frame.style.visibility,'visible','same-document geometry redraw before async viewport helper must keep loaded preview visible');
f.mount();assert.equal(f.frame.style.visibility,'visible','late helper mount changes geometry only');
f.draw(true);assert.equal(f.frame.style.visibility,'visible','mounted same-document redraw remains visible');
f.draw(false);assert.equal(f.frame.style.visibility,'hidden','actual new navigation still hides until load');f.load();assert.equal(f.frame.style.visibility,'visible');
console.log('PASS: delayed helper + same URL segment resize retains visibility; first/new navigation still waits for load.');
