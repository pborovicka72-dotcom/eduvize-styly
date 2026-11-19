import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../admin-auth.js',import.meta.url),'utf8');
const launcher=fs.readFileSync(new URL('../admin-launcher.js',import.meta.url),'utf8');
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
function fixture({stored,fragment='',reject=false}={}){
 const tab=memory(),local=memory(),redirects=[],requests=[];
 if(stored)tab.setItem('eduvize-admin-session-v1',JSON.stringify(stored));
 const href='https://eduvize-dokumenty-api.onrender.com/config?view=categories'+fragment;
 const scope={window:{addEventListener(){},dispatchEvent(){}},location:{origin:'https://eduvize-dokumenty-api.onrender.com',pathname:'/config',href,replace:u=>redirects.push(u)},history:{replaceState(a,b,u){scope.location.href=u;}},document:{body:null,readyState:'complete',head:{append(){}},createElement:()=>({dataset:{}})},sessionStorage:tab,localStorage:local,URL,URLSearchParams,AbortController,CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},fetch:async(url,options={})=>{requests.push({url,options});const ok=!reject;return {ok,status:ok?200:401,json:async()=>ok?{token:'edu_child',scopes:['documents','configurations'],expiresAt:Date.now()/1000+3600}:{detail:'Přihlášení vypršelo.'}};}};
 vm.runInNewContext(source,scope);
 return {auth:scope.window.EduvizeAdminAuth,tab,redirects,requests};
}
const direct=fixture();await direct.auth.ready;
assert.equal(await direct.auth.ensureConnection('documents'),false);
const account=new URL(direct.redirects[0]);assert.equal(account.pathname,'/eduvize-styly/ucet.html');
assert.equal(account.searchParams.get('returnTo'),'https://eduvize-dokumenty-api.onrender.com/config?view=categories');assert.equal(account.hash,'#account');
await assert.rejects(direct.auth.ensureConnection('documents'),/Obnovuji|Přihlášení/);
assert.equal(direct.redirects.length,1);
const stored={token:'edu_existing',scopes:['documents'],expiresAt:Date.now()/1000+3600};
const connected=fixture({stored});await connected.auth.ready;assert.equal(await connected.auth.ensureConnection('documents'),true);assert.equal(connected.redirects.length,0);
const redeemed=fixture({fragment:'#edu-auth-code=one-use&edu-return-hash=files'});await redeemed.auth.ready;
assert.equal(await redeemed.auth.ensureConnection('documents'),true);assert.equal(redeemed.redirects.length,0);
assert.equal(JSON.parse(redeemed.requests[0].options.body).code,'one-use');
const expired=fixture({stored,reject:true});await expired.auth.ready;assert.equal(await expired.auth.ensureConnection('documents'),false);assert.equal(expired.redirects.length,1);
assert.ok(!expired.redirects[0].includes(stored.token));
let click,resolveReady,readyDone=false;const opened=[],ready=new Promise(r=>resolveReady=r);
const auth={CENTRAL:'https://eduvize-design-system-api.onrender.com',DOCS:'https://eduvize-dokumenty-api.onrender.com',ready,status:()=>({connected:readyDone}),handoff:async url=>url+'#edu-auth-code=one-use',loginUrl:url=>'https://account.example/?returnTo='+encodeURIComponent(url)};
const location={href:'https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html',origin:'https://pborovicka72-dotcom.github.io',assign:u=>opened.push(u)};
vm.runInNewContext(launcher,{window:{EduvizeAdminAuth:auth,addEventListener(){}},location,URL,document:{querySelectorAll:()=>[],getElementById:()=>null,addEventListener:(n,fn)=>{if(n==='click')click=fn;}}});
let prevented=false;const clickPromise=click({button:0,target:{closest:()=>({href:auth.DOCS+'/config'})},preventDefault(){prevented=true;}});
assert.equal(prevented,true);assert.equal(opened.length,0);readyDone=true;resolveReady();await clickPromise;
assert.match(opened[0],/edu-auth-code=one-use/);
console.log('Direct Documents entry reconnects; valid/redeemed sessions stay; expiry reconnects without token leaks; loop is bounded; launcher waits for validation.');
