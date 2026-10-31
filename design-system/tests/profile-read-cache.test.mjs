import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const storage=memory(),id='a'.repeat(32),requests=[];let now=1000,identity=3600,signedIn=true;
const auth={ready:Promise.resolve(),getToken:()=>signedIn?'test-only-session':'',status:()=>({connected:signedIn,expiresAt:identity}),fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>url.endsWith('/'+id)?{id,name:'Test',apps:{}}:{items:[{id,name:'Test'}]}};}};
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
function client(){const scope={window:{EduvizeAdminAuth:auth,addEventListener(){}},document:{readyState:'loading',addEventListener(){}},sessionStorage:storage,structuredClone,URL,Date:{now:()=>now}};vm.runInNewContext(source,scope);return scope.window.EduvizeProfiles;}
const first=client();const list=await first.request();list.items[0].name='Local mutation';assert.equal((await first.request()).items[0].name,'Test');assert.equal(requests.length,1);
await first.request('/'+id);await first.request('/'+id);assert.equal(requests.length,2);
const navigated=client();await navigated.request();await navigated.request('/'+id);assert.equal(requests.length,2,'back navigation should reuse recent authenticated reads');
await navigated.request('',{fresh:true});assert.equal(requests.length,3);assert.ok(!Object.hasOwn(requests.at(-1).options,'fresh'));
await navigated.request('/'+id+'/apps/weather',{method:'PUT',body:'{}'});await navigated.request();assert.equal(requests.length,5,'a successful save must invalidate cached profile data');
now+=90001;await navigated.request();assert.equal(requests.length,6,'expired entries must be reloaded');
identity++;await navigated.request();assert.equal(requests.length,7,'a different login must not reuse previous cached reads');
signedIn=false;await assert.rejects(navigated.request(),/Přihlaste/);assert.equal(requests.length,7,'cached data must not bypass authentication');
console.log('Repeated reads and back navigation reuse data; explicit refresh, saves, expiry and login changes invalidate it.');
