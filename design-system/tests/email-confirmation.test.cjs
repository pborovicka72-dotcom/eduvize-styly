const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto:crypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../licensing.js'),'utf8');
const authSource=fs.readFileSync(require('node:path').join(__dirname,'../admin-auth.js'),'utf8');
const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
async function test(kind,result){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},value:'',addEventListener(){},setAttribute(){}});return nodes.get(id);};
 const local=memory(),tab=memory(),pendingKey=kind==='email-login'?'eduvize-email-login-v1':'eduvize-ms-login-v1';
 local.setItem(pendingKey,JSON.stringify({verifier:'v'.repeat(64),createdAt:Date.now()}));
 let destination='',confirmed=0;const location={href:ACCOUNT+'#edu-confirm=test-token&edu-confirm-kind='+kind,hash:'#edu-confirm=test-token&edu-confirm-kind='+kind};
 location.replace=url=>{destination=url;};
 const auth={ACCOUNT,ready:new Promise(()=>{}),status:()=>({connected:false})};
 const window={addEventListener(){},dispatchEvent(){},EduvizeLicensing:{auth,$,names:{},date(){},say(){},work(){},lookup(){},validIco(){},request:async()=>{confirmed++;return result;}}};
 vm.runInNewContext(source,{window,document:{body:{dataset:{}},getElementById:$},location,history:{replaceState(a,b,url){location.href=url;location.hash=new URL(url).hash;}},URL,URLSearchParams,crypto,Event:class{}});
 await $('license-confirm-button').onclick();assert.equal(confirmed,1);
 if(!result.emailTicket&&!result.microsoftTicket){assert.equal(destination,'');assert.equal($('license-confirm-button').disabled,false);return;}
 const next=new URL(destination),old=new URL(location.href);
 assert.equal(next.origin,old.origin);assert.equal(next.pathname,old.pathname);
 assert.notEqual(next.search,old.search,'Confirmation must trigger a document navigation, not just hashchange');
 assert.ok(next.searchParams.has('edu-login-return'));
 const ticket=result.emailTicket||result.microsoftTicket;assert.ok(!next.search.includes(ticket),'No credentials in query');
 const ticketKey=result.emailTicket?'edu-email-ticket':'edu-ms-ticket';assert.equal(new URLSearchParams(next.hash.slice(1)).get(ticketKey),ticket);
 const requests=[];const context={window:{addEventListener(){},dispatchEvent(){}},location:{origin:next.origin,pathname:next.pathname,href:next.href},history:{replaceState(a,b,url){assert.ok(!new URL(url).searchParams.has('edu-login-return'));}},document:{body:null,readyState:'complete',head:{append(){}},createElement(){return {dataset:{}}}},sessionStorage:tab,localStorage:local,URL,URLSearchParams,AbortController,CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({token:'edu_verified',scopes:['documents','configurations'],schoolId:'a'.repeat(32),profileId:'b'.repeat(32),expiresAt:Date.now()/1000+3600})}}};
 vm.runInNewContext(authSource,context);await context.window.EduvizeAdminAuth.ready;
 assert.equal(context.window.EduvizeAdminAuth.status().connected,true);
 assert.ok(requests[0].url.endsWith('/api/admin-session/'+(result.emailTicket?'email':'microsoft')));
 assert.equal(local.getItem(pendingKey),null);
}
module.exports=(async()=>{await test('email-login',{emailTicket:'t'.repeat(43)});await test('microsoft-link',{microsoftTicket:'m'.repeat(43)});await test('email-login',{});console.log('Email confirmation document navigation, protected ticket exchange and Microsoft linking passed.');})();
