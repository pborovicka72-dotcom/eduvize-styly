import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../nsp-segments.js',import.meta.url),'utf8');
function integration(id,value,weatherStyle){
 const ready=[];let options;
 const mode={id,value,addEventListener(){},closest:selector=>selector==='.edu-output-section'?section:null};
 const section={querySelector:()=>({before(){}})};
 const root={};
 const document={readyState:'loading',body:{dataset:{}},getElementById:key=>key===id?mode:key==='setting-weather-style'?{value:weatherStyle}:null,createElement:()=>root,addEventListener:(type,fn)=>{if(type==='DOMContentLoaded')ready.push(fn);}};
 const window={EduvizePreviewViewport:{},EduvizeNSPLayouts:{layouts:{},positions:{}},EduvizeOutputModes:{isKiosk:()=>false,url:u=>new URL(u)},addEventListener(){}};
 vm.runInNewContext(source,{window,document,location:{search:'',origin:'https://example.test',href:'https://example.test/config'},localStorage:{getItem:()=>null},URL,URLSearchParams,queueMicrotask(){},setTimeout,clearTimeout});
 window.EduvizeNSPPicker.mount=(host,opts)=>{options=opts;return{get:()=>({orientation:'landscape',style:1,block:1}),setMode(){}}};
 for(const start of ready)start();
 return options;
}
for(const style of ['classic','station']){
 const options=integration('setting-output','signage',style);
 assert.equal(options.preservePreview,true,style+' weather admin must preserve its preview document');
 const first=options.previewUrl({orientation:'landscape',style:2,block:2});
 const next=options.previewUrl({orientation:'landscape',style:3,block:2});
 assert.notEqual(first,next,'exported/initial URLs still describe the selected segment');
}
assert.equal(integration('layout','signage').preservePreview,false,'other integrations retain their current reload policy');
console.log('Classic and station weather administrations opt into persistent segment previews.');
