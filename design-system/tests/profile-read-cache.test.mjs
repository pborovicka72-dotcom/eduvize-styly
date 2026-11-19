import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),dump:()=>[...m.values()].join('')};};
const storage=memory(),id='a'.repeat(32),requests=[];
let now=1000,expiresAt=3600,token='test-only-principal-one',signedIn=true,profileId=id,schoolId='c'.repeat(32),scopes=['configurations'],deferred,resolve,cloneHook;
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const auth={ready:Promise.resolve(),getToken:s=>signedIn&&scopes.includes(s)?token:'',status:()=>({connected:signedIn,expiresAt,schoolId,profileId,scopes}),fetch:async(url,options)=>{requests.push({url,options});if(deferred){const p=deferred;deferred=null;return p;}return response(url.endsWith('/'+id)?{id,name:'Test',apps:{}}:{items:[{id,name:'Test'}]});}};
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
function client({crypto=webcrypto,origin='https://test.skola.eduvize.cz'}={}){
 const listeners=new Map(),root={EduvizeAdminAuth:auth,crypto,addEventListener:(n,f)=>{if(!listeners.has(n))listeners.set(n,[]);listeners.get(n).push(f);}};
 const scope={window:root,location:{origin},document:{readyState:'loading',addEventListener(){}},sessionStorage:storage,structuredClone:v=>{cloneHook?.();return structuredClone(v);},TextEncoder,URL,Date:{now:()=>now}};
 vm.runInNewContext(source,scope);return {api:root.EduvizeProfiles,event:async(n,detail)=>{await Promise.all((listeners.get(n)||[]).map(f=>f({detail})));}};
}
const tick=()=>new Promise(r=>setTimeout(r,5));const start=()=>{deferred=new Promise(r=>resolve=r);};
const first=client();start();const cold=Array.from({length:3},()=>first.api.request());await tick();assert.equal(requests.length,1,'three consumers share one cold GET');resolve(response({items:[{id,name:'Test'}]}));const values=await Promise.all(cold);values[0].items[0].name='Changed';assert.equal(values[1].items[0].name,'Test');
await first.api.request('/'+id);let before=requests.length;const next=client();await next.api.request();await next.api.request('/'+id);assert.equal(requests.length,before,'same-session navigation 2→0 GETs');
expiresAt++;await next.event('eduvize-admin-auth-change');await next.api.request();assert.equal(requests.length,before,'expiry refresh retains verified principal cache');
await next.api.request('',{fresh:true});assert.equal(requests.length,before+1);assert.ok(!Object.hasOwn(requests.at(-1).options,'fresh'));
start();const stale=next.api.request('/'+id,{fresh:true});await tick();const oldResolve=resolve;await next.api.request('/'+id+'/apps/weather',{method:'PUT',body:JSON.stringify({expectedRevision:7})});assert.equal(JSON.parse(requests.at(-1).options.body).expectedRevision,7);oldResolve(response({id,name:'Old',apps:{}}));await assert.rejects(stale,/změnilo/);
before=requests.length;await next.api.request();assert.equal(requests.length,before+1);assert.ok(!storage.dump().includes(token));assert.ok(!storage.dump().includes('Authorization'));
for(const change of [()=>{token+='2';},()=>{profileId='b'.repeat(32);},()=>{schoolId='d'.repeat(32);},()=>{scopes=['documents'];}]){change();before=requests.length;await next.api.request();assert.equal(requests.length,before+1);}
for(const detail of [{id},{id,restore:true},{id,archived:true},{id,archived:false}]){await next.event('eduvize-profile-updated',detail);before=requests.length;await next.api.request();assert.equal(requests.length,before+1,'existing committed account event invalidates');}
for(const method of ['POST','DELETE','PATCH']){await next.api.request('/'+id,{method,body:'{}'});before=requests.length;await next.api.request();assert.equal(requests.length,before+1);}
let readyResolve;auth.ready=new Promise(r=>readyResolve=r);let delivered=false;const gated=next.api.request().then(()=>delivered=true);await tick();assert.equal(delivered,false);readyResolve();await gated;auth.ready=Promise.resolve();
// Schedule a change precisely between operation completion and awaiting consumers.
await next.event('eduvize-profile-updated',{id});start();const own=next.api.request(),joined=next.api.request();await tick();let armed=true;cloneHook=()=>{if(armed){armed=false;queueMicrotask(()=>{token+='-changed-after-completion';});}};resolve(response({items:[{id,name:'Test'}]}));const raced=await Promise.allSettled([own,joined]);cloneHook=null;assert.ok(raced.every(r=>r.status==='rejected'),'own and joined consumers recheck AFTER awaited operation');
await next.api.request();start();const old=next.api.request('',{fresh:true});await tick();const rejectOld=resolve;token+='new';await next.api.request();rejectOld(response({detail:'Old principal denied'},403));await assert.rejects(old,/změnilo/);before=requests.length;await next.api.request();assert.equal(requests.length,before);
now+=90001;before=requests.length;await next.api.request();assert.equal(requests.length,before+1);before=requests.length;await client({origin:'https://skola.eduvize.cz'}).api.request();assert.equal(requests.length,before+1);
signedIn=false;await next.event('eduvize-admin-auth-change');await assert.rejects(next.api.request(),/Přihlaste/);assert.equal(storage.getItem('eduvize-profile-reads-v2'),null);
signedIn=true;before=requests.length;const noCrypto=client({crypto:null});await noCrypto.api.request();await noCrypto.api.request();assert.equal(requests.length,before+2);assert.equal(storage.getItem('eduvize-profile-reads-v2'),null);
console.log('PASS: GET 3→1; warm navigation 2→0; post-await race; auth/mutation/account events; TTL/logout/no-crypto.');
