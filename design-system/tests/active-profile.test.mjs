import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const local=memory(),tab=memory(),response=data=>({ok:true,status:200,json:async()=>data});
let savedProfile='',pending=null,loginCount=0;
const scope={window:{addEventListener(){},dispatchEvent(){}},location:{origin:'https://pborovicka72-dotcom.github.io',pathname:'/eduvize-styly/ucet.html',href:'https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html'},history:{replaceState(){}},document:{body:null,readyState:'complete'},localStorage:local,sessionStorage:tab,URL,URLSearchParams,AbortController,CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},fetch:async(url,options={})=>{
 if(url.endsWith('/profile')){assert.equal(options.method,'PUT');savedProfile=JSON.parse(options.body).profileId;return response({profileId:savedProfile});}
 if(options.method==='POST'){loginCount++;return response({token:'edu_session_'+loginCount,scopes:['documents','styles'],expiresAt:Date.now()/1000+3600,profileId:savedProfile});}
 if(pending){const result=pending;pending=null;return await result;}
 return response({scopes:['documents','styles'],expiresAt:Date.now()/1000+3600,profileId:savedProfile});
}};
vm.runInNewContext(fs.readFileSync(new URL('../admin-auth.js',import.meta.url),'utf8'),scope);
const auth=scope.window.EduvizeAdminAuth;await auth.ready;await auth.login('test','test');
await auth.selectProfile('a'.repeat(32));assert.equal(auth.status().profileId,'a'.repeat(32));
let complete;pending=new Promise(resolve=>complete=resolve);const oldRead=auth.refresh();
await auth.selectProfile('b'.repeat(32));complete(response({scopes:['documents','styles'],expiresAt:Date.now()/1000+3600,profileId:'a'.repeat(32)}));await oldRead;
assert.equal(auth.status().profileId,'b'.repeat(32),'a stale status response must not undo a newer selection');
let fail;pending=new Promise(resolve=>fail=resolve);const oldSession=auth.refresh();await auth.login('test','test');
fail({ok:false,status:401,json:async()=>({detail:'Expired old session'})});await oldSession;
assert.equal(auth.getToken(),'edu_session_2','an old failed request must not erase a renewed login');
console.log('Active selection is shared; stale responses cannot undo a new profile or clear a renewed login.');
