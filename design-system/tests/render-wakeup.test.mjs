import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../admin-auth.js',import.meta.url),'utf8');
const key='eduvize-admin-session-v1';
const session={token:'edu_test',scopes:['documents','styles'],expiresAt:Date.now()/1000+3600};
function setup(initial=null){
 const values=new Map(initial?[[key,JSON.stringify(initial)]]:[]),requests=[],events=[],timers=[];
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let handler=async()=>reply(200,session);
 const scope={window:{addEventListener(){},dispatchEvent:e=>events.push(e)},location:{origin:'https://pborovicka72-dotcom.github.io',pathname:'/eduvize-styly/ucet.html',href:'https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html'},history:{replaceState(){}},document:{body:null,readyState:'complete',createElement:()=>({}),head:{append(){}}},localStorage:storage,sessionStorage:{getItem:()=>null,removeItem(){}},URL,URLSearchParams,AbortController,TypeError,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},setTimeout(fn,ms){timers.push(ms);if(ms<=3000)queueMicrotask(fn);return timers.length;},clearTimeout(){},fetch:async(url,options)=>{requests.push({url,options});return handler(url,options);}};
 vm.runInNewContext(source,scope);
 return {auth:scope.window.EduvizeAdminAuth,values,requests,events,timers,setHandler:fn=>handler=fn};
}
function reply(status,data={}){return {status,ok:status>=200&&status<300,json:async()=>data,clone(){return reply(status,data)}};}
{
 const t=setup();await t.auth.ready;let n=0;
 t.setHandler(async()=>++n===1?reply(503):reply(200,session));
 await t.auth.login('test','test',true);
 assert.equal(n,2);assert.equal(t.auth.getToken(),'edu_test');
 assert.ok(t.events.some(e=>e.type==='eduvize-admin-request-progress'));
 assert.ok(t.timers.includes(180000),'login allows both services to start');
}
{
 const t=setup();await t.auth.ready;t.setHandler(async()=>reply(401,{detail:'Neplatný klíč'}));
 await assert.rejects(t.auth.login('wrong','wrong'),/Neplatný klíč/);assert.equal(t.requests.length,1);
}
{
 const t=setup(session);await t.auth.ready;let n=0;
 t.setHandler(async()=>{if(++n===1)throw new TypeError('network');return reply(200,{connected:true});});
 await t.auth.fetch(t.auth.DOCS+'/api/admin/status');assert.equal(n,2);
 assert.equal(t.requests.at(-1).options.headers.Authorization,'Bearer edu_test');
}
{
 const t=setup(session);await t.auth.ready;t.setHandler(async()=>reply(503));
 await t.auth.refresh();assert.equal(t.values.has(key),true);assert.equal(t.auth.getToken(),'edu_test');
 assert.equal(t.requests.length,5,'one successful initialization and four bounded retry attempts');
}
{
 const t=setup(session);await t.auth.ready;t.setHandler(async()=>reply(401));
 await t.auth.refresh();assert.equal(t.values.has(key),false);assert.equal(t.auth.getToken(),'');
}
{
 const t=setup(session);await t.auth.ready;t.setHandler(async()=>{throw new TypeError('network');});
 await assert.rejects(t.auth.fetch(t.auth.DOCS+'/api/admin/microsoft/start',{method:'POST'}),/neodpovídá/);
 assert.equal(t.requests.length,2,'ambiguous POST is never repeated');assert.equal(t.values.has(key),true);
}
{
 const t=setup();await t.auth.ready;t.setHandler(async()=>{const e=new Error('timeout');e.name='AbortError';throw e;});
 await assert.rejects(t.auth.login('test','test'),/neodpovídá/);assert.equal(t.requests.length,1);
}
console.log('Render wakeup: retries, progress, long login timeout, invalid keys, bounded failures, preserved sessions and mutation safety passed.');
