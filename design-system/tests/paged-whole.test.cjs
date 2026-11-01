const {readFileSync}=require('node:fs');
const vm=require('node:vm');const assert=require('node:assert/strict');
class Element{
 constructor(){this.children=[];this.style={};this.dataset={};this.className='';this.scrollHeight=0;this.classList={add:(value)=>{this.className+=' '+value;}};}
 append(...nodes){for(const node of nodes){node.remove?.();node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const child of this.children)child.parent=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}}
 setAttribute(){}
 getBoundingClientRect(){return {height:34};}
 querySelector(selector){return this.children.find(x=>x.className===selector.slice(1))||null;}
 addEventListener(){}
}
function pack(preferWhole,items,height){
 const host=new Element();host.clientWidth=1000;host.clientHeight=1000;
 const window={EduvizeOutputModes:{mode:()=> 'kiosk'}};
 const context={window,document:{createElement:()=>new Element()},getComputedStyle:()=>({rowGap:'10px'}),ResizeObserver:class{observe(){}},requestAnimationFrame:()=>{}};
 vm.runInNewContext(readFileSync(__dirname+'/../paged-panel.js','utf8'),context);
 let displayed;
 window.EduvizePagedPanel.mountFlow(host,items,{key:'school',preferWhole,fit:false,render:(sheet,group)=>{sheet.scrollHeight=height(group);displayed=group;}});
 return {host,get displayed(){return displayed;},nav:host.querySelector('.edu-pagination')};
}
let whole=pack(true,[1,2,3,4],items=>items.length===4?900:1100);
assert.equal(whole.nav.hidden,true);assert.deepEqual(Array.from(whole.displayed),[1,2,3,4]);
let pages=pack(true,[1,2,3],items=>items.length*400);
assert.equal(pages.nav.hidden,false);assert.deepEqual(Array.from(pages.displayed),[1,2]);
pages.nav.children[2].onclick();assert.deepEqual(Array.from(pages.displayed),[3]);
let legacy=pack(false,[1,2,3,4],items=>items.length===4?900:1100);
assert.equal(legacy.nav.hidden,false);assert.deepEqual(Array.from(legacy.displayed),[1]);
console.log('Whole-layout preference, pagination fallback and legacy packing passed');
