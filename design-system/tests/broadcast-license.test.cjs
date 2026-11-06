const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../broadcast-license.js'),'utf8');
async function run(app,active=true,unavailable=false){
 const calls=[],root={setInterval:()=>1,setTimeout:()=>1,addEventListener(){},dispatchEvent(){}};
 const document={documentElement:{dataset:{kioskApp:app}},body:null,head:{append(){}},readyState:'loading',createElement:()=>({}),addEventListener(){},querySelectorAll:()=>[]};
 const location={origin:'https://test.skola.eduvize.cz',href:'https://test.skola.eduvize.cz/view?edu-profile='+'a'.repeat(32)+'&provider=edupage',pathname:'/view'};
 vm.runInNewContext(source,{window:root,document,location,URL,URLSearchParams,AbortSignal,performance:{now:()=>0},clearTimeout(){},CustomEvent:class{},fetch:async(url)=>{calls.push(url);if(unavailable)throw Error('offline');return {ok:true,json:async()=>({active,serverTime:10,expiresAt:null})};}});
 await new Promise(resolve=>setImmediate(resolve));return {calls,api:root.EduvizeBroadcastLicense};
}
test('each output sends its application and provider to the same-origin license endpoint',async()=>{
 for(const app of ['weather','documents','gallery','kiosk','news','transport','menu','holidays','wisdom','school-systems','day-progress']){
  const value=await run(app);const url=new URL(value.calls[0]);assert.equal(url.origin,'https://test.skola.eduvize.cz');assert.equal(url.pathname,'/api/public/broadcast-status');assert.equal(url.searchParams.get('appId'),app);assert.equal(url.searchParams.get('profile'),'a'.repeat(32));assert.equal(url.searchParams.get('provider'),['school-systems','day-progress'].includes(app)?'edupage':null);assert.equal(value.api.status(),'active');
 }
});
test('denial and unavailable verification never become an active output',async()=>{
 assert.equal((await run('school-systems',false)).api.status(),'suspended');assert.equal((await run('weather',true,true)).api.status(),'unavailable');
});
