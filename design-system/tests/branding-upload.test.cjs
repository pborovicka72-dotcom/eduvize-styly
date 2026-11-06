const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const script=fs.readFileSync(require('node:path').join(__dirname,'../branding-admin.js'),'utf8');
function setup(){
 const handlers={},requests=[],applied=[];let markup='',src='';
 const field=()=>({value:'',files:[],style:{},disabled:false,validationMessage:'',setCustomValidity(v){this.validationMessage=v;},reportValidity(){return !this.validationMessage;},addEventListener(n,f){this[n]=f;}});
 const file=field(),input=field(),save=field(),reset=field(),status=field(),details=field();
 const preview={complete:true,naturalWidth:100,get src(){return src},set src(v){src=v},removeAttribute(){src=''}};
 const form={style:{},elements:{logoFile:file,logoUrl:input},reportValidity(){return !file.validationMessage&&!input.validationMessage;},querySelector(v){return v==='[type=submit]'?save:reset}};
 const host={style:{},querySelectorAll:()=>[],set innerHTML(v){markup=v},querySelector(v){return ({form,img:preview,'[role=status]':status,details})[v]}};
 const auth={getToken:()=>true,ready:Promise.resolve(),async fetch(url,options){requests.push({url,options});return {ok:true,json:async()=>({logoUrl:'/api/design-system/branding/assets/'+'a'.repeat(64)})}}};
 const window={EduvizeAdminAuth:auth,EduvizeBranding:{apply(v){applied.push(v)}},addEventListener(n,f){handlers[n]=f}};
 const document={currentScript:{src:'https://test.skola.eduvize.cz/eduvize-styly/design-system/branding-admin.js'},createElement:()=>host,querySelector:()=>({querySelector:()=>({after(){}})})};
 class TestURL extends URL{};TestURL.createObjectURL=()=> 'blob:test';TestURL.revokeObjectURL=()=>{};
 vm.runInNewContext(script,{document,window,location:{origin:'https://test.skola.eduvize.cz'},URL:TestURL,fetch:async()=>({ok:true,json:async()=>({logoUrl:'https://example.com/current.png'})})});
 return {file,input,form,preview,reset,status,requests,applied,auth,markup,submit:()=>form.onsubmit({preventDefault(){}})};
}
async function ready(){await new Promise(resolve=>setImmediate(resolve))}
test('existing URL stays visible before additive recommended upload and unchanged actions',()=>{const e=setup();assert.ok(e.markup.indexOf('type="url"')<e.markup.indexOf('type="file"'));assert.ok(e.markup.includes('Adresa nového loga (HTTPS)'));assert.ok(e.markup.includes('Nahrát logo Eduvize · doporučeno'));assert.ok(!e.markup.includes('<details'));assert.ok(e.markup.indexOf('type="file"')<e.markup.indexOf('data-edu-brand-preview'));assert.ok(e.markup.indexOf('Použít logo ve všech aplikacích')<e.markup.indexOf('Výchozí animované logo'));});
test('selected file wins and is sent as binary to same-origin endpoint',async()=>{const e=setup();await ready();const f={size:32,type:'image/png'};e.file.files=[f];e.input.value='https://example.com/secondary.png';e.file.change();assert.equal(e.preview.src,'blob:test');await e.submit();assert.equal(e.requests[0].url,'https://test.skola.eduvize.cz/api/design-system/branding/logo');assert.equal(e.requests[0].options.body,f);assert.equal(e.applied.length,1);});
test('URL remains available as secondary mode',async()=>{const e=setup();await ready();e.input.value='https://example.com/new.png';e.input.input();await e.submit();assert.equal(e.requests[0].options.method,'PUT');assert.equal(JSON.parse(e.requests[0].options.body).logoUrl,e.input.value||'https://example.com/new.png');});
test('reset is explicit and sends empty logo URL',async()=>{const e=setup();await ready();e.reset.onclick();await e.submit();assert.equal(JSON.parse(e.requests[0].options.body).logoUrl,'');});
test('oversized file and Render link cannot be saved',async()=>{const e=setup();await ready();e.file.files=[{size:3*1024*1024,type:'image/png'}];e.file.change();await e.submit();assert.equal(e.requests.length,0);e.file.files=[];e.input.value='https://x.onrender.com/logo.png';e.input.input();await e.submit();assert.equal(e.requests.length,0);});
test('failed upload leaves active branding unchanged',async()=>{const e=setup();await ready();e.file.files=[{size:32,type:'image/png'}];e.file.change();e.auth.fetch=async()=>({ok:false,json:async()=>({detail:'Storage unavailable'})});await e.submit();assert.equal(e.applied.length,0);assert.equal(e.status.textContent,'Storage unavailable');assert.equal(e.file.files.length,1);});
test('school without styles scope cannot use the form',async()=>{const e=setup();e.auth.getToken=()=>false;await ready();assert.equal(e.file.disabled,true);assert.equal(e.input.disabled,true);});

test("opposite environment is rejected before preview loads it",async()=>{const e=setup();await ready();e.input.value="https://skola.eduvize.cz/logo.png";e.input.input();await e.submit();assert.equal(e.preview.src,"");assert.equal(e.requests.length,0);});

test("selected file takes priority over an invalid unused URL",async()=>{const e=setup();await ready();e.input.value="not a URL";e.input.input();const f={size:32,type:"image/png"};e.file.files=[f];e.file.change();e.form.reportValidity=()=>false;await e.submit();assert.equal(e.requests[0].options.body,f);});
