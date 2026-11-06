const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const origin='https://test.skola.eduvize.cz',id='a'.repeat(32),calls=[];
const ctx={location:{origin,href:origin+'/?edu-output='+id},crypto:{randomUUID:()=> 'b'.repeat(32)},URL,URLSearchParams,AbortController,Date,console,setTimeout,clearTimeout};
ctx.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id,url:origin+'/o/'+id,publishedRevision:1})};};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('design-system/output-client.js','utf8'),ctx);
(async()=>{
 let client=ctx.EduvizeOutputClient.create({getAuthorization:()=> 'Bearer test'});
 await client.getOutputLink(id);assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.body,undefined);assert(!calls[0].options.headers['Idempotency-Key']);
 await client.getPublicOutput(id);assert(!calls[1].options.headers.Authorization);
 const key=client.newOperation();await client.publishOutput(id,{expectedRevision:0},key);await client.publishOutput(id,{expectedRevision:0},key);
 assert.equal(calls[2].options.headers['Idempotency-Key'],calls[3].options.headers['Idempotency-Key']);
 await assert.rejects(()=>client.createOutput({},undefined),/operation key/);
 assert.throws(()=>ctx.EduvizeOutputClient.create({origin:'https://bad.example'}));
 ctx.fetch=async()=>({ok:false,status:409,json:async()=>({error:{code:'REVISION_CONFLICT',message:'Conflict',requestId:'req'}})});
 client=ctx.EduvizeOutputClient.create({getAuthorization:()=> 'Bearer test'});
 try{await client.getOutputLink(id);assert.fail();}catch(e){assert.equal(e.code,'REVISION_CONFLICT');assert.equal(e.status,409);}
 ctx.fetch=async()=>({ok:true,json:async()=>({url:'https://bad.example/o/'+id})});
 client=ctx.EduvizeOutputClient.create({getAuthorization:()=> 'Bearer test'});
 await assert.rejects(()=>client.getOutputLink(id),/neplatný odkaz/);
 // Runtime fetches public snapshot and theme, never session/profile storage.
 let timer,listener,rendered=0,cleared=0,revoked=false;
 ctx.document={hidden:false,documentElement:{style:{setProperty(){}}},addEventListener:(e,f)=>listener=f,removeEventListener(){}};
 ctx.setInterval=f=>{timer=f;return 1};ctx.clearInterval=()=>{};
 ctx.EduvizeSegmentProfile={resolve:(w,h)=>({width:w,height:h}),header:()=>({}),text:()=>({})};ctx.innerWidth=1920;ctx.innerHeight=1080;ctx.document.documentElement.dataset={};
 const colors=Object.fromEntries(['background','text','muted','surface','primary','primaryText','secondary','secondaryText','accent','border'].map(k=>[k,'#112233']));
 ctx.fetch=async(url)=>revoked?{ok:false,status:410,json:async()=>({error:{code:'REVOKED',message:'Revoked'}})}:{ok:true,json:async()=>url.endsWith('/theme')?{colors}:{schemaVersion:1,id,appId:'news',publishedRevision:1,presentation:{mode:'web',geometry:null,interaction:'display'},theme:{mode:'profile-active',url:'/api/public/v1/outputs/'+id+'/theme',refreshSeconds:60}}};
 vm.runInContext(fs.readFileSync('design-system/output-runtime.js','utf8'),ctx);
 const runtime=ctx.EduvizeOutputRuntime.start({appId:'news',render:()=>rendered++,clear:()=>cleared++});
 await new Promise(r=>setImmediate(r));assert.equal(rendered,1);timer();await new Promise(r=>setImmediate(r));assert.equal(rendered,1);
 revoked=true;await runtime.refresh();assert.equal(cleared,1);runtime.stop();
 // A hanging application renderer must not prevent a subsequent revoke poll.
 revoked=false;let deadline=0;ctx.setTimeout=(f,delay)=>delay===10000?(queueMicrotask(f),1):setTimeout(f,delay);ctx.clearTimeout=clearTimeout;
 const hanging=ctx.EduvizeOutputRuntime.start({appId:'news',render:()=>new Promise(()=>{}),clear:()=>cleared++,onError:()=>deadline++});
 await new Promise(r=>setImmediate(r));assert.equal(deadline,1);revoked=true;await hanging.refresh();assert.equal(cleared,2);hanging.stop();
 ctx.setTimeout=(f)=>{queueMicrotask(f);return 1};ctx.clearTimeout=()=>{};
 const timeoutClient=ctx.EduvizeOutputClient.create({fetch:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Timeout')),{once:true}))});
 await assert.rejects(()=>timeoutClient.getPublicOutput(id),/Timeout/);
 console.log('Output client/runtime: copy/open read-only, retry keys, auth isolation, invalid origin, errors, polling/revoke passed');
})().catch(e=>{console.error(e);process.exitCode=1});
