import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
function page(url){
 const location=new URL(url),redirects=[],events={};location.replace=value=>redirects.push(value);
 const storage=()=>({getItem:()=>null,setItem(){},removeItem(){}});
 const window={addEventListener:(name,fn)=>events[name]=fn,dispatchEvent(){}};
 const document={readyState:'loading',body:null,addEventListener(){},getElementById(){return null;}};
 const context={window,document,location,URL,URLSearchParams,localStorage:storage(),sessionStorage:storage(),setTimeout:()=>0,clearTimeout(){},CustomEvent:class{},AbortController,Date,console};
 return {context,window,redirects,events};
}
test('legacy account and configuration links preserve profile and return destination',()=>{
 for(const suffix of ['?edu-profile=abc#configurations','?returnTo=https%3A%2F%2Feduvize-weather.onrender.com%2Fconfig#account','?onedrive=connected#account','#edu-account-panel']){
  const p=page('https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html'+suffix);vm.runInNewContext(read('admin-launcher.js'),p.context);
  const target=new URL(p.redirects[0]);assert.equal(target.origin+target.pathname,ACCOUNT);assert.equal(target.search,p.context.location.search);assert.equal(target.hash,suffix==='#edu-account-panel'?'#account':p.context.location.hash);
 }
});
test('ordinary application hub stays on the hub',()=>{
 const p=page('https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html');vm.runInNewContext(read('admin-launcher.js'),p.context);assert.deepEqual(p.redirects,[]);
});
test('shared administration login goes to account page with the original profile',async()=>{
 const original='https://eduvize-weather.onrender.com/config?edu-profile=abc';const p=page(original);vm.runInNewContext(read('admin-auth.js'),p.context);await p.window.EduvizeAdminAuth.ready;
 const target=new URL(p.window.EduvizeAdminAuth.loginUrl());assert.equal(target.origin+target.pathname,ACCOUNT);assert.equal(target.searchParams.get('returnTo'),original);assert.equal(target.hash,'#account');
});
test('account login does not create a return-to-self loop',async()=>{
 const p=page(ACCOUNT);vm.runInNewContext(read('admin-auth.js'),p.context);await p.window.EduvizeAdminAuth.ready;const target=new URL(p.window.EduvizeAdminAuth.loginUrl());assert.equal(target.searchParams.has('returnTo'),false);
});
test('hub contains a route, while the dedicated page owns the two panels',()=>{
 const hub=fs.readFileSync(new URL('../../aplikace.html',import.meta.url),'utf8'),account=fs.readFileSync(new URL('../../ucet.html',import.meta.url),'utf8');
 assert.ok(hub.includes('href="./ucet.html"'));for(const id of ['edu-account-panel','configurations']){assert.ok(!hub.includes('id="'+id+'"'));assert.equal(account.split('id="'+id+'"').length-1,1);}
});
