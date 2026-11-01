import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
for(const name of ['nsp-segments.js','output-integrity.js']){
 const events={};
 const document={readyState:'loading',body:null,addEventListener(type,fn){events[type]=fn},getElementById(){return null},documentElement:{dataset:{},classList:{toggle(){}}}};
 const window={EduvizePreviewViewport:{},EduvizeOutputModes:{mode:()=> 'nsp'},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(new URL(name,base),'utf8'),{window,document,Promise,URL,URLSearchParams});
 assert.equal(typeof events.DOMContentLoaded,'function',name+' waits for DOM');
 document.body={dataset:{},classList:{remove(){}}};
 assert.doesNotThrow(()=>events.DOMContentLoaded(),name+' initializes after DOM is available');
}
const header=fs.readFileSync(new URL('output-header.js',base),'utf8');
assert.match(header,/root.innerWidth<1\|\|root.innerHeight<1/);
console.log('Shared modules safely defer DOM access and ignore detached zero-sized viewports.');
