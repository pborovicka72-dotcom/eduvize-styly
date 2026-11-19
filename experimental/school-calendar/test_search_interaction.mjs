import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const rootDir=new URL('./',import.meta.url);
const source=fs.readFileSync(new URL('school-card.js',rootDir),'utf8');
const nodes=new Map(),timers=new Map();let nextTimer=0;
function element(tag='div'){
 const node={tagName:tag.toUpperCase(),hidden:false,value:'',textContent:'',style:{},children:[],events:{},attrs:{},selectedOptions:[{textContent:'Základní škola'}],
 append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,fn){this.events[k]=fn;},focus(){},scrollIntoView(){},reportValidity(){return true;}};
 Object.defineProperty(node,'childElementCount',{get(){return this.children.length;}});return node;
}
const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
const original={name:'Původní škola',school_type:'ZS',red_izo:'111111111'};
const fields=['name','red_izo','izo','ico','address','municipality','district','region','school_type'];
const records=[['Základní škola Nová Praha','222222222','222222223','12345678','Nová 1','Praha','Praha 1','Praha','ZS'],['Mateřská škola Praha','333333333','333333334','87654321','Jiná 2','Praha','Praha 1','Praha','MS']];
const bytes=new TextEncoder().encode(JSON.stringify({date:'2026-09-30',fields,items:records}));
const docEvents={},root={EduvizeAdminAuth:{ready:Promise.resolve(),status:()=>({schoolId:'own'})},dispatchEvent(){}};
const scope={window:root,document:{currentScript:{src:'https://example.test/school-card.js'},getElementById:get,createElement:element,addEventListener:(type,fn)=>{docEvents[type]=fn;},dispatchEvent(){}},URL,Intl,TextDecoder,TextEncoder,CustomEvent:class{constructor(type){this.type=type;}},fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer}),localStorage:{getItem:()=>JSON.stringify(original),setItem(){}},setTimeout:fn=>{const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
vm.runInNewContext(source,scope);await Promise.resolve();
assert.equal(root.EduvizeProfileAdapter.loadedMessage,'Karta školy načtena z Eduvize.','School profiles use Eduvize storage even without a connected OneDrive');
get('school-edit').onclick();get('school-change').onclick();
assert.equal(get('school-query').value,'');assert.equal(get('school-lookup').hidden,false);
get('school-query').value='ZŠ Praha';get('school-query').events.input();
for(const [id,fn]of [...timers]){timers.delete(id);await fn();}
assert.equal(get('school-results').children.length,1,'ZŠ abbreviation finds only the matching school');
get('school-results').children[0].onclick();
assert.equal(get('name').value,'Základní škola Nová Praha');
get('school-change').onclick();
assert.equal(get('school-query').value,'','Repeated search starts with an empty query');
assert.equal(get('school-results').children.length,0,'No stale results from the previous query');
assert.equal(root.EduvizeProfileAdapter.isEditing(),true);
get('school-cancel').onclick();
assert.equal(get('name').value,original.name,'Cancel restores original school');
assert.equal(root.EduvizeProfileAdapter.isEditing(),false);

const profiles=fs.readFileSync(new URL('../../design-system/configuration-profiles.js',rootDir),'utf8');
const start=profiles.indexOf('    async function readProfile('),end=profiles.indexOf('    async function list(',start);
let resolveRead,editing=false,applied=0;
const saved={schemaVersion:1,data:{name:'Uložená škola'}},draft={schemaVersion:1,data:{name:'Nově vybraná škola'}};
const ctx={profileId:'a'.repeat(32),manualLoad:false,tracked:'',adapter:{app:'school-identity',isEditing:()=>editing,read:()=>draft,apply:async()=>{applied++;}},request:()=>new Promise(resolve=>{resolveRead=resolve;}),fingerprint:JSON.stringify,structuredClone,userChanged:true,resetEditState(){throw Error('Must not reset an active edit');},say(){},dirty:()=>true};
vm.runInNewContext(profiles.slice(start,end)+';this.readProfile=readProfile;',ctx);
const pending=ctx.readProfile(true);editing=true;
resolveRead({name:'Profil školy',apps:{'school-identity':{revision:7,config:saved}}});await pending;
assert.equal(applied,0,'Late remote profile must not overwrite the search or selected school');
assert.equal(ctx.revision,7,'Next save uses the correct server revision');
assert.equal(ctx.baseline,JSON.stringify(saved),'Unsaved changes are compared with the saved profile');
ctx.manualLoad=true;ctx.undo={hidden:true};ctx.resetEditState=()=>{};
const manual=ctx.readProfile(true);resolveRead({name:'Profil školy',apps:{'school-identity':{revision:7,config:saved}}});await manual;assert.equal(applied,1,'Explicit loading still replaces the draft when requested');
console.log('Repeated autocomplete, school aliases, cancel and delayed profile arrival regressions passed.');
