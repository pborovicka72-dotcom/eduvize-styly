import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../output-modes.js',import.meta.url),'utf8');
function environment(href,{app=''}={}){
 const callbacks=[],intervals=new Map(),nodes=new Map(),saved=new Map();let seq=0;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners={};this.value='';this.className='';this.classList={add(){},toggle(){}};this.isConnected=true;}
  append(...nodes){this.children.push(...nodes);for(const n of nodes)if(n.id)document.nodes.set(n.id,n);}
  add(option){this.children.push(option);if(!this.value)this.value=option.value;}
  get options(){return this.children;}
  setAttribute(k,v){this[k]=v;}
  closest(){return this;}
  after(node){this.afterNode=node;for(const child of node.children)if(child.id)document.nodes.set(child.id,child);}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  dispatchEvent(e){for(const fn of this.listeners[e.type]||[])fn(e);}
 }
 const document={nodes,readyState:'loading',hidden:false,documentElement:{dataset:{kioskApp:app},classList:{add(){}}},createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),head:new Element('head'),getElementById:id=>nodes.get(id)||null,addEventListener:(t,fn)=>callbacks.push(fn)};
 const location=new URL(href),window={location};
 const ctx={window,document,location,URL,URLSearchParams,WeakMap,Event:class{constructor(type){this.type=type;}},Option:class{constructor(text,value){this.text=text;this.value=value;}},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},setInterval:fn=>{intervals.set(++seq,fn);return seq;},clearInterval:id=>intervals.delete(id)};
 vm.runInNewContext(source,ctx);return {api:window.EduvizeOutputModes,document,Element,intervals};
}
for(const type of ['web','nsp'])for(const interaction of ['interactive','display']){
 const e=environment('https://example.test/index.html?viewMode='+type+'&interaction='+interaction);assert.equal(e.api.isInteractive(),interaction==='interactive');
}
for(const href of ['https://example.test/?viewMode=kiosk&interaction=display','https://example.test/?output=kiosk&interaction=display'])assert.equal(environment(href).api.interaction(),'interactive');
assert.equal(environment('https://example.test/?viewMode=web&interaction=display',{app:'kiosk'}).api.interaction(),'interactive');
// Legacy URLs preserve deterministic behavior without inspecting hardware.
assert.equal(environment('https://example.test/?viewMode=nsp').api.interaction(),'display');assert.equal(environment('https://example.test/?viewMode=web').api.interaction(),'interactive');
const e=environment('https://example.test/config.html'),select=new e.Element('select');select.add({value:'nsp',text:'Newline Signage Pro'});select.add({value:'web',text:'Běžná stránka'});select.add({value:'kiosk',text:'Kiosek'});e.api.install(select);
e.api.setInteraction('display');assert.equal(e.api.url('https://example.test/index.html','web').searchParams.get('interaction'),'display');
select.value='kiosk';select.dispatchEvent({type:'change'});assert.equal(e.document.getElementById('edu-output-interaction').disabled,true);assert.equal(e.api.url('https://example.test/index.html?interaction=display','kiosk').searchParams.get('interaction'),'interactive');
select.value='nsp';select.dispatchEvent({type:'change'});assert.equal(e.document.getElementById('edu-output-interaction').value,'display');e.api.setInteraction('interactive');assert.equal(e.api.url('https://example.test/?segment_style=1','nsp').searchParams.get('interaction'),'interactive');
const passive=environment('https://example.test/?viewMode=nsp&interaction=display'),host={isConnected:true};let advances=0;passive.api.autoplay(host,()=>advances++);passive.api.autoplay(host,()=>advances++);assert.equal(passive.intervals.size,1);[...passive.intervals.values()][0]();assert.equal(advances,1);host.isConnected=false;[...passive.intervals.values()][0]();assert.equal(passive.intervals.size,0);
const active=environment('https://example.test/?viewMode=nsp&interaction=interactive');active.api.autoplay({isConnected:true},()=>{throw Error('must not rotate');});assert.equal(active.intervals.size,0);
assert.doesNotMatch(source,/matchMedia|navigator\.(?:userAgent|maxTouchPoints)|ontouchstart/);
console.log('Output interaction: explicit URLs, manual NSP, forced kiosk, restored choice and timer lifecycle OK');
