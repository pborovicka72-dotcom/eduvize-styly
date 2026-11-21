import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../design-system/configuration-profiles.js',import.meta.url),'utf8');
const id='a'.repeat(32),other='b'.repeat(32),defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};},tick=()=>new Promise(r=>setTimeout(r,5));
class Node{
 constructor(tag='div',text=''){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.style={setProperty(){}};this._text=text;this.className='';this.classList={add(){}};}
 set textContent(v){this._text=v;if(this.onText)this.onText(v);}get textContent(){return this._text;}
 append(...nodes){for(const n of nodes){if(!n)continue;n.parentElement=this;this.children.push(n);}}prepend(...nodes){this.children.unshift(...nodes.filter(Boolean));for(const n of nodes)if(n)n.parentElement=this;}
 after(n){this.parentElement?.append(n);}before(n){this.parentElement?.prepend(n);}setAttribute(k,v){this[k]=v;}addEventListener(n,f){(this.listeners[n]??=[]).push(f);}replaceChildren(...n){this.children=[];this.append(...n);}add(n){this.append(n);}closest(){return this.parentElement;}contains(n){return n===this||this.children.some(c=>c.contains?.(n));}querySelector(){return null;}
}
function harness({crypto=webcrypto,failAck=false,failPut=false}={}){
 let token='synthetic-principal',profile=id,school='c'.repeat(32),validated=true,current={schemaVersion:1,data:{value:'local'}},applyCalls=0,fetchCalls=0;
 const order=[],storage=new Map([['eduvize-local-configuration-v1:day-progress','old'],['eduvize-profile-save-draft-v1:day-progress:/pocasi/config','old'],['auth-keep','synthetic']]),listeners={},docListeners={},labels=[],statuses=[],timerCallbacks=new Map();let timerId=0;
 const nodes=[],main=new Node(),header=new Node(),row=new Node(),local=new Node('button'),copy=new Node('button'),open=new Node('button');main.append(header,row);row.append(local,copy,open);
 const all=()=>{const a=[];function visit(n){a.push(n);n.children.forEach(visit);}visit(main);return a;};
 const document={readyState:'loading',hidden:false,head:new Node(),createElement:tag=>{const n=new Node(tag);nodes.push(n);return n;},getElementById:key=>key==='weather-save-settings'?local:key==='location-settings-cancel'?copy:all().find(n=>n.id===key)||null,querySelector:s=>s.startsWith('main.edu-admin-page')?main:s==='button[form="location-settings"][type="submit"]'?open:s==='[data-edu-profile-panel]'?all().find(n=>n.dataset.eduProfilePanel)||null:null,addEventListener:(n,f)=>(docListeners[n]??=[]).push(f)};main.querySelector=s=>s==='.edu-page-header'?header:null;
 const auth={ready:Promise.resolve(),getToken:s=>validated&&s==='configurations'?token:'',status:()=>({connected:validated,schoolId:school,profileId:profile,scopes:['configurations'],expiresAt:token?3600:0}),refresh:async()=>{},fetch:async (url,options={})=>{fetchCalls++;if(options.method==='PUT'){order.push('put');if(failPut)return {ok:false,status:503,json:async()=>({detail:'unavailable'})};return {ok:true,status:200,json:async()=>({revision:4})};}return {ok:true,status:200,json:async()=>url.endsWith('/'+profile)?{id:profile,name:token==='synthetic-principal'?'Verified TEST':'Other principal',apps:{'day-progress':{revision:3,config:{schemaVersion:1,data:{value:'server'}}}}}:{items:profile?[{id:profile,name:token==='synthetic-principal'?'Verified TEST':'Other principal'}]:[]}};}};
 const root={crypto,EduvizeAdminAuth:auth,addEventListener:(n,f)=>(listeners[n]??=[]).push(f),dispatchEvent:e=>{for(const f of listeners[e.type]||[])f(e);}};
 const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const location={origin:'https://test.skola.eduvize.cz',href:'https://test.skola.eduvize.cz/pocasi/config',pathname:'/pocasi/config'};
 const context={window:root,document,location,history:{replaceState(_a,_b,url){location.href=url;}},sessionStorage:store,localStorage:store,structuredClone,TextEncoder,URL,URLSearchParams,Event:class{constructor(type){this.type=type;}},Option:class extends Node{constructor(text,value){super('option',text);this.value=value;}},setTimeout:(f,ms)=>{timerCallbacks.set(++timerId,{f,ms});return timerId;},clearTimeout:n=>timerCallbacks.delete(n),queueMicrotask,requestAnimationFrame:f=>f(),console};
 vm.runInNewContext(source,context);
 const adapterReady=defer(),adapter={app:'day-progress',afterSaved:async()=>{order.push('ack');if(failAck)throw Error('ack failure');},outputActions:{workflow:'saved-copy-preview',withSavedCommit:async commit=>{order.push('lock');await commit();order.push('output');}},ready:adapterReady.promise,read:()=>current,apply:async v=>{applyCalls++;current=structuredClone(v);}};
 function observe(){for(const n of all()){if(n.className==='edu-profile-current__name'&&!n.onText){labels.push(n.textContent);n.onText=v=>labels.push(v);}if(n.className==='edu-profile-panel__status'&&!n.onText){statuses.push(n.textContent);n.onText=v=>statuses.push(v);}}}
 const mount=()=>{const p=root.EduvizeProfiles.mount(adapter);observe();return p;};
 return {order,storage,save:()=>all().find(n=>Object.hasOwn(n.dataset,'eduProfileSave')),docListeners,api:root.EduvizeProfiles,auth,adapter,adapterReady,labels,statuses,mount,observe,local,root,get fetchCalls(){return fetchCalls;},get applyCalls(){return applyCalls;},get current(){return current;},setCurrent:v=>current=v,setIdentity:(t,p=id,s=school)=>{token=t;profile=p;school=s;},setValidated:v=>validated=v,fireTimers:ms=>{for(const [id,t]of [...timerCallbacks])if(t.ms===ms){timerCallbacks.delete(id);t.f();}},edit(){current={schemaVersion:1,data:{value:'dirty'}};for(const f of docListeners['eduvize-profile-change']||[])f({type:'eduvize-profile-change',isTrusted:false,target:{}});}};
}

for(const options of [{},{failAck:true},{failPut:true}]){
 const h=harness(options);const mounted=h.mount();h.adapterReady.resolve();await mounted;
 assert.equal(h.storage.get('auth-keep'),'synthetic');
 assert.equal(h.storage.has('eduvize-local-configuration-v1:day-progress'),false);
 h.edit();await h.save().onclick();
 assert.deepEqual(h.order,options.failPut?['lock','put']:options.failAck?['lock','put','ack']:['lock','put','ack','output']);
 assert.equal([...h.storage.keys()].some(k=>k.startsWith('eduvize-local-configuration')||k.startsWith('eduvize-profile-save-draft')),false);
 if(options.failAck)assert.match(h.statuses.at(-1),/potvrzení hodin/);
 if(options.failPut)assert.match(h.statuses.at(-1),/unavailable/);
}
console.log('PASS: cloud save precedes awaited Day ACK and output update; failures prevent false success; no local drafts; auth preserved.');
