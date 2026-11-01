import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../output-header.js',import.meta.url),'utf8');
const start=source.indexOf(' const textAnchors='),end=source.indexOf(' function update(){',start);
assert.ok(start>=0&&end>start);
const nodes=new Map();
const context={document:{querySelectorAll:selector=>nodes.get(selector)||[]},getComputedStyle:n=>n.style};
vm.runInNewContext(source.slice(start,end),context);
const header={getBoundingClientRect:()=>({left:100})};
function node(left,width=200,padding='0px',border='0px'){return {getBoundingClientRect:()=>({left,width}),style:{paddingLeft:padding,borderLeftWidth:border}}}
for(const [app,selector] of [['holidays','.calendar-card .metric-value'],['weather','.metric-value'],['news','#news .title'],['wisdom','.wisdom-quotation .quote'],['documents','#browse .tile-title'],['transport','.departure .time'],['kiosk','#schoolContent .school-card h3']]){
 nodes.clear();nodes.set(selector,[node(123)]);
 assert.equal(context.contentInset(header,app,40),23,app);
}
nodes.clear();nodes.set('.metric-value',[node(0,0)]);nodes.set('.forecast-card h3',[node(131)]);
assert.equal(context.contentInset(header,'weather',40),31,'Use the visible section, not a hidden page.');
nodes.clear();nodes.set('#news .content',[node(100,400,'20px','1px')]);
assert.equal(context.contentInset(header,'news',40),21,'Include the border and inner card padding.');
nodes.clear();const scaled=node(100,200,'20px','1px');scaled.offsetWidth=400;nodes.set('#news .content',[scaled]);
assert.equal(context.contentInset(header,'news',40),10.5,'Convert inner padding to the visible scale.');
nodes.clear();
assert.equal(context.contentInset(header,'documents',40),40,'An empty catalogue retains a usable heading inset.');
assert.equal(context.contentInset(header,'unknown',40),40);
console.log('Kiosk text anchors, visible-section selection and empty-state fallback passed.');
