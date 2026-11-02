import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../admin-auth.js',import.meta.url),'utf8');
function storage(){const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
function environment(hash='',pending=storage()){
 let assigned='',calls=0;
 const url=new URL('https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html'+hash);
 const local=storage();const window={addEventListener(){},dispatchEvent(){},crypto:webcrypto};
 const context={window,location:{origin:url.origin,pathname:url.pathname,href:url.href,hash:url.hash,assign:value=>{assigned=String(value);}},history:{replaceState(){}},localStorage:local,sessionStorage:pending,document:{head:{append(){}},createElement(){return {};},readyState:'loading',addEventListener(){},querySelector(){return null;}},URL,URLSearchParams,TextEncoder,AbortController,crypto:webcrypto,btoa,CustomEvent:class{},setTimeout:()=>0,clearTimeout(){},fetch:async()=>{calls++;return {ok:true,json:async()=>({token:'edu_test',scopes:['styles','documents'],expiresAt:Date.now()/1000+3600})}}};
 vm.runInNewContext(source,context);return {auth:window.EduvizeAdminAuth,local,pending,get assigned(){return assigned;},get calls(){return calls;}};
}
const first=environment();await first.auth.ready;await first.auth.loginMicrosoft(true);
const url=new URL(first.assigned);assert.equal(url.origin,'https://eduvize-dokumenty-api.onrender.com');assert.equal(url.pathname,'/auth/microsoft/login');assert.equal(url.searchParams.get('remember'),'true');assert.match(url.searchParams.get('proof'),/^[A-Za-z0-9_-]{43}$/);
const saved=JSON.parse(first.pending.getItem('eduvize-ms-login-v1'));assert.match(saved.verifier,/^[A-Za-z0-9_-]{64}$/);assert.equal(first.local.getItem('eduvize-admin-session-v1'),null);
const returned=environment('#edu-ms-ticket='+'t'.repeat(43),first.pending);await returned.auth.ready;assert.equal(returned.calls,1);assert.equal(returned.auth.status().connected,true);assert.equal(JSON.parse(returned.local.getItem('eduvize-admin-session-v1')).token,'edu_test');assert.equal(first.pending.getItem('eduvize-ms-login-v1'),null);
const replay=environment('#edu-ms-ticket='+'t'.repeat(43),first.pending);await replay.auth.ready;assert.equal(replay.calls,0);assert.equal(replay.auth.status().connected,false);
console.log('Microsoft browser proof, session exchange and replay rejection passed.');
