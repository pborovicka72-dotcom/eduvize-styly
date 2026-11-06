const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Blob}=require('node:buffer');
const id='a'.repeat(32),key='b'.repeat(32),origin='https://test.skola.eduvize.cz';
function setup(fetch){const timers=new Map();let next=0;const env={location:{origin},URL,URLSearchParams,AbortController,setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimeout:id=>timers.delete(id),fetch};vm.createContext(env);vm.runInContext(fs.readFileSync('design-system/output-client.js','utf8'),env);return {create:env.EduvizeOutputClient.create,timers};}
function image(){return {ok:true,status:200,headers:{get:name=>name.toLowerCase()==='content-type'?'image/png':null},blob:async()=>new Blob(['bitmap'],{type:'image/png'})};}
test('shared item methods construct only scoped anonymous no-store endpoints',async()=>{
 const calls=[];const s=setup(async(url,options)=>{calls.push({url,options});return url.endsWith('/image')?image():{ok:true,json:async()=>({key,title:'Text',paragraphs:[]})};});const client=s.create();
 assert.equal((await client.getPublicItem(id,key)).key,key);assert.equal((await client.getPublicItemImage(id,key)).type,'image/png');assert.equal(s.timers.size,0);
 assert.deepEqual(calls.map(x=>x.url),[origin+'/api/public/v1/outputs/'+id+'/items/'+key,origin+'/api/public/v1/outputs/'+id+'/items/'+key+'/image']);
 for(const {options} of calls){assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.ok(!options.headers.Authorization);}
 assert.throws(()=>client.getPublicItem(id,'https://foreign.example'));
});
test('item-level and parent cancellation abort network and discard late responses',async()=>{
 for(const parent of [false,true]){let signal,resolve;const s=setup((_url,options)=>{signal=options.signal;return new Promise(done=>resolve=done);});const control=new AbortController();const client=s.create(parent?{signal:control.signal}:{});const pending=client.getPublicItemImage(id,key,parent?{}:{signal:control.signal});control.abort();assert.ok(signal.aborted);resolve(image());await assert.rejects(pending,e=>e.code==='REQUEST_ABORTED');assert.equal(s.timers.size,0);}
});
test('deadline covers bitmap body consumption',async()=>{
 let finish,signal;const s=setup(async(_url,options)=>{signal=options.signal;return {...image(),blob:()=>new Promise(resolve=>finish=resolve)};});const pending=s.create().getPublicItemImage(id,key);for(let n=0;n<5;n++)await Promise.resolve();const deadline=[...s.timers.values()][0];assert.equal(deadline.ms,12000);deadline.fn();assert.ok(signal.aborted);finish(new Blob(['x'],{type:'image/png'}));await assert.rejects(pending,e=>e.code==='REQUEST_ABORTED');
});
test('denial, invalid MIME and excessive bitmap sizes never return usable bytes',async()=>{
 for(const status of [403,404,410]){let read=false;const s=setup(async()=>({ok:false,status,json:async()=>({error:{code:'DENIED'}}),blob:async()=>{read=true;}}));await assert.rejects(s.create().getPublicItemImage(id,key),e=>e.status===status);assert.equal(read,false);}
 for(const response of [{...image(),headers:{get:()=> 'image/svg+xml'}},{...image(),headers:{get:name=>name==='Content-Length'?'8388609':'image/png'}},{...image(),blob:async()=>new Blob([],{type:'image/png'})}]){const s=setup(async()=>response);await assert.rejects(s.create().getPublicItemImage(id,key),e=>e.code==='INVALID_RESPONSE');}
});
