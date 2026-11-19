import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const id='a'.repeat(32),other='b'.repeat(32),defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};},tick=()=>new Promise(r=>setTimeout(r,5));
class Node{
 constructor(tag='div',text=''){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.style={};this._text=text;this.className='';this.classList={add(){}};}
 set textContent(v){this._text=v;if(this.onText)this.onText(v);}get textContent(){return this._text;}
 append(...nodes){for(const n of nodes){if(!n)continue;n.parentElement=this;this.children.push(n);}}prepend(...nodes){this.children.unshift(...nodes.filter(Boolean));for(const n of nodes)if(n)n.parentElement=this;}
 after(n){this.parentElement?.append(n);}before(n){this.parentElement?.prepend(n);}setAttribute(k,v){this[k]=v;}addEventListener(n,f){(this.listeners[n]??=[]).push(f);}replaceChildren(...n){this.children=[];this.append(...n);}add(n){this.append(n);}closest(){return this.parentElement;}contains(n){return n===this||this.children.some(c=>c.contains?.(n));}querySelector(){return null;}
}
function harness({crypto=webcrypto}={}){
 let token='synthetic-principal',profile=id,school='c'.repeat(32),validated=true,current={schemaVersion:1,data:{value:'local'}},applyCalls=0,fetchCalls=0;
 const storage=new Map(),listeners={},docListeners={},labels=[],statuses=[],timerCallbacks=new Map();let timerId=0;
 const nodes=[],main=new Node(),header=new Node(),row=new Node(),local=new Node('button'),copy=new Node('button'),open=new Node('button');main.append(header,row);row.append(local,copy,open);
 const all=()=>{const a=[];function visit(n){a.push(n);n.children.forEach(visit);}visit(main);return a;};
 const document={readyState:'loading',hidden:false,head:new Node(),createElement:tag=>{const n=new Node(tag);nodes.push(n);return n;},getElementById:key=>key==='weather-save-settings'?local:key==='location-settings-cancel'?copy:all().find(n=>n.id===key)||null,querySelector:s=>s.startsWith('main.edu-admin-page')?main:s==='button[form="location-settings"][type="submit"]'?open:s==='[data-edu-profile-panel]'?all().find(n=>n.dataset.eduProfilePanel)||null:null,addEventListener:(n,f)=>(docListeners[n]??=[]).push(f)};main.querySelector=s=>s==='.edu-page-header'?header:null;
 const auth={ready:Promise.resolve(),getToken:s=>validated&&s==='configurations'?token:'',status:()=>({connected:validated,schoolId:school,profileId:profile,scopes:['configurations'],expiresAt:token?3600:0}),fetch:async url=>{fetchCalls++;return {ok:true,status:200,json:async()=>url.endsWith('/'+profile)?{id:profile,name:token==='synthetic-principal'?'Verified TEST':'Other principal',apps:{weather:{revision:3,config:{schemaVersion:1,data:{value:'server'}}}}}:{items:profile?[{id:profile,name:token==='synthetic-principal'?'Verified TEST':'Other principal'}]:[]}};}};
 const root={crypto,EduvizeAdminAuth:auth,addEventListener:(n,f)=>(listeners[n]??=[]).push(f),dispatchEvent:e=>{for(const f of listeners[e.type]||[])f(e);}};
 const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const location={origin:'https://test.skola.eduvize.cz',href:'https://test.skola.eduvize.cz/pocasi/config',pathname:'/pocasi/config'};
 const context={window:root,document,location,history:{replaceState(_a,_b,url){location.href=url;}},sessionStorage:store,localStorage:store,structuredClone,TextEncoder,URL,URLSearchParams,Event:class{constructor(type){this.type=type;}},Option:class extends Node{constructor(text,value){super('option',text);this.value=value;}},setTimeout:(f,ms)=>{timerCallbacks.set(++timerId,{f,ms});return timerId;},clearTimeout:n=>timerCallbacks.delete(n),queueMicrotask,requestAnimationFrame:f=>f(),console};
 vm.runInNewContext(source,context);
 const adapterReady=defer(),adapter={app:'weather',ready:adapterReady.promise,read:()=>current,apply:async v=>{applyCalls++;current=structuredClone(v);}};
 function observe(){for(const n of all()){if(n.className==='edu-profile-current__name'&&!n.onText){labels.push(n.textContent);n.onText=v=>labels.push(v);}if(n.className==='edu-profile-panel__status'&&!n.onText){statuses.push(n.textContent);n.onText=v=>statuses.push(v);}}}
 const mount=()=>{const p=root.EduvizeProfiles.mount(adapter);observe();return p;};
 return {api:root.EduvizeProfiles,auth,adapter,adapterReady,labels,statuses,mount,observe,local,root,get fetchCalls(){return fetchCalls;},get applyCalls(){return applyCalls;},get current(){return current;},setCurrent:v=>current=v,setIdentity:(t,p=id,s=school)=>{token=t;profile=p;school=s;},setValidated:v=>validated=v,fireTimers:ms=>{for(const [id,t]of [...timerCallbacks])if(t.ms===ms){timerCallbacks.delete(id);t.f();}},edit(){current={schemaVersion:1,data:{value:'dirty'}};for(const f of docListeners['eduvize-profile-change']||[])f({type:'eduvize-profile-change',isTrusted:false,target:{}});}};
}
// Entire mount lifecycle: cached list provides name before adapter is ready, but missing detail stays cold.
{
 const h=harness();await h.api.request();const pending=h.mount();assert.ok(h.labels.every(x=>!x.includes('není vybrán')));await tick();assert.equal(h.labels.at(-1),'Profil: Verified TEST');assert.equal(h.statuses.some(s=>s.includes('Načítám nastavení')),false,'adapter still pending');const before=h.fetchCalls;h.adapterReady.resolve();await pending;assert.equal(h.fetchCalls,before+1,'list-only warm data still fetches cold detail');assert.ok(h.statuses.includes('Načítám nastavení profilu…'),'partial cold settings show loading');
}
// Fully warm mount does not show loading and never clears the selected label.
{
 const h=harness();await h.api.request();await h.api.request('/'+id);const before=h.fetchCalls,pending=h.mount();await tick();assert.equal(h.labels.at(-1),'Profil: Verified TEST');h.adapterReady.resolve();await pending;assert.equal(h.fetchCalls,before);assert.ok(h.labels.every(s=>!s.includes('není vybrán')));assert.ok(!h.statuses.includes('Načítám nastavení profilu…'));assert.equal(h.current.data.value,'server');
}
// Authentication wait cannot expose previous cached principal's name.
{
 const h=harness();await h.api.request();const ready=defer();h.auth.ready=ready.promise;h.setValidated(false);const pending=h.mount();await tick();assert.ok(h.labels.at(-1).includes('ověřuji výběr'));h.setIdentity('different-principal',other);h.setValidated(true);ready.resolve();await tick();assert.ok(h.labels.every(s=>s!=='Profil: Verified TEST'),'other principal has no verified cached label');h.adapterReady.resolve();await pending;
}
// Auth/profile changes during digest or before consumer resume must not hydrate stale label.
{
 const digest=defer();let delayed=false;const h=harness({crypto:{subtle:{digest:(...args)=>delayed?digest.promise:webcrypto.subtle.digest(...args)}}});await h.api.request();delayed=true;const pending=h.mount();await tick();h.setIdentity('changed-during-digest',other);digest.resolve(new Uint8Array(32).buffer);await tick();assert.ok(h.labels.every(s=>s!=='Profil: Verified TEST'));h.adapterReady.resolve();await pending;
}
// Editing while remote detail is pending survives automatic configuration application.
{
 const h=harness();await h.api.request();const original=h.auth.fetch,detail=defer();h.auth.fetch=async url=>url.endsWith('/'+id)?detail.promise:original(url);const pending=h.mount();await tick();h.adapterReady.resolve();await tick();h.edit();detail.resolve({ok:true,status:200,json:async()=>({id,name:'Verified TEST',apps:{weather:{revision:3,config:{schemaVersion:1,data:{value:'server'}}}}})});await pending;assert.equal(h.current.data.value,'dirty');assert.equal(h.applyCalls,0);
}
// A warm configuration that takes over120ms to apply still reports real progress.
{
 const h=harness();await h.api.request();await h.api.request('/'+id);const apply=defer();h.adapter.apply=()=>apply.promise;const pending=h.mount();await tick();h.adapterReady.resolve();await tick();assert.ok(!h.statuses.includes('Načítám nastavení profilu…'));h.fireTimers(120);assert.ok(h.statuses.includes('Načítám nastavení profilu…'));apply.resolve();await pending;
}
// Empty selection is asserted only after authentication has actually settled.
{
 const h=harness(),ready=defer();h.auth.ready=ready.promise;h.setValidated(false);h.setIdentity('','');const pending=h.mount();await tick();assert.ok(h.labels.every(s=>!s.includes('není vybrán')));ready.resolve();await tick();assert.equal(h.labels.at(-1),'Profil: není vybrán');h.adapterReady.resolve();await pending;
}
// A stored but unvalidated session is pending, not evidence of an empty/disconnected identity.
{
 const h=harness();h.setValidated(false);const pending=h.mount();await tick();assert.ok(h.labels.at(-1).includes('ověřuji výběr'));h.adapterReady.resolve();await pending;assert.ok(h.labels.every(s=>!s.includes('není vybrán')));assert.ok(h.statuses.every(s=>!s.includes('se přihlaste')));assert.ok(h.statuses.includes('Ověřuji přihlášení…'));
}
// Same-page principal changes synchronously clear the old label, then only validated new data may name it.
{
 const h=harness();await h.api.request();await h.api.request('/'+id);const pending=h.mount();h.adapterReady.resolve();await pending;assert.equal(h.labels.at(-1),'Profil: Verified TEST');const index=h.labels.length;h.setIdentity('same-page-new-principal');h.root.dispatchEvent({type:'eduvize-admin-auth-change'});assert.equal(h.labels.at(-1),'Profil: ověřuji výběr…');await tick();assert.ok(h.labels.slice(index).every(s=>s!=='Profil: Verified TEST'));assert.equal(h.labels.at(-1),'Profil: Other principal');
}
// Same-page change to an unvalidated stored session must stay neutral and preserve a dirty form.
{
 const h=harness();await h.api.request();await h.api.request('/'+id);const pending=h.mount();h.adapterReady.resolve();await pending;h.edit();h.setValidated(false);h.root.dispatchEvent({type:'eduvize-admin-auth-change'});await tick();assert.equal(h.labels.at(-1),'Profil: ověřuji výběr…');assert.equal(h.current.data.value,'dirty');assert.ok(!h.statuses.at(-1).includes('se přihlaste'));
}
console.log('PASS: full mount first paint, list-only/cold detail, fully warm data, auth/digest isolation and dirty form lifecycle.');
