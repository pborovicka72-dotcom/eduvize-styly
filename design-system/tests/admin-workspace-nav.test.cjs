const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(){
 const events={};let state={connected:false,scopes:[]};const nodes=[];
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.events={};this.hidden=false;nodes.push(this);this.classes=new Set();this.classList={toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
  append(...n){this.children.push(...n);}prepend(...n){this.children.unshift(...n);}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}getAttribute(k){return k==='href'?this.href:this.attrs[k]??null;}
  addEventListener(k,f){this.events[k]=f;}focus(){document.activeElement=this;}
  querySelectorAll(tag){return this.children.flatMap(n=>[...(n.tag===tag?[n]:[]),...n.querySelectorAll(tag)]);}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
 }
 const main=new Node('main'),body=new Node('body');body.append(main);
 const document={readyState:'complete',body,activeElement:null,createElement:t=>new Node(t),querySelector:s=>s==='main.edu-admin-page'?main:null,getElementById:id=>nodes.find(n=>n.id===id)};
 const window={location:{origin:'https://test.skola.eduvize.cz',pathname:'/eduvize-styly/ucet.html',hash:''},addEventListener:(k,f)=>events[k]=f,EduvizeAdminAuth:{status:()=>state,ready:Promise.resolve()}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../admin-workspace-nav.js','utf8'),{window,document,URL});
 return {document,window,body,main,nodes,events,set(v){state=v;events['eduvize-admin-auth-change']();}};
}
const f=fixture(),aside=f.nodes.find(n=>n.id==='edu-workspace-nav'),menu=f.nodes.find(n=>n.tag==='button'),links=aside.querySelectorAll('a');
assert.equal(aside.hidden,true);assert.equal(menu.hidden,true);assert.equal(f.body.classes.has('edu-workspace-enabled'),false);
f.set({connected:true,schoolId:'synthetic-school',scopes:['configurations']});assert.equal(aside.hidden,false);assert.equal(links.find(n=>n.textContent==='Správa služby').hidden,true);assert.equal(links.find(n=>n.textContent==='Karta školy').hidden,false);assert.ok(links.every(n=>n.target==='_self'));assert.equal(links.filter(n=>n.attrs['aria-current']==='page').length,1);
menu.events.click();assert.equal(menu.attrs['aria-expanded'],'true');f.document.activeElement=links[1];f.events.keydown({key:'Escape'});assert.equal(menu.attrs['aria-expanded'],'false');assert.equal(f.document.activeElement,menu);
f.window.location.hash='#school-card';f.events.hashchange();assert.equal(links.find(n=>n.textContent==='Karta školy').attrs['aria-current'],'page');assert.equal(links.find(n=>n.textContent==='Účet').attrs['aria-current'],undefined);
links.find(n=>n.textContent==='Profily a konfigurace').events.click();assert.equal(links.find(n=>n.textContent==='Profily a konfigurace').attrs['aria-current'],'page');assert.equal(links.filter(n=>n.attrs['aria-current']==='page').length,1);
f.set({connected:true,schoolId:'',scopes:['styles']});assert.equal(links.find(n=>n.textContent==='Správa služby').hidden,false);assert.equal(links.find(n=>n.textContent==='Karta školy').hidden,true);
f.set({connected:false,scopes:[]});assert.equal(aside.hidden,true);assert.equal(f.body.classes.has('edu-workspace-enabled'),false);assert.ok(f.body.children.includes(f.main));assert.equal(f.main.children.length,0);
console.log('PASS: signed-out layout, school/operator visibility, same-tab links, unique current item, mobile Escape, unchanged main contents.');
