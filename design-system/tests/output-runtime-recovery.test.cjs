const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const origin='https://test.skola.eduvize.cz',id='a'.repeat(32);
async function run(source=fs.readFileSync('design-system/output-runtime.js','utf8')){
 const colors=Object.fromEntries(['background','text','muted','surface','primary','primaryText','secondary','secondaryText','accent','border'].map(k=>[k,'#112233']));
 async function setup(){
  let failure=null,now=0;const signals=[],clears=[],errors=[],intervals=new Set();
  const snapshot={schemaVersion:1,id,appId:'day-progress',publishedRevision:1,presentation:{mode:'web',geometry:null,interaction:'display'},theme:{mode:'profile-active',url:'/api/public/v1/outputs/'+id+'/theme',refreshSeconds:60}};
  const env={location:{origin},URL,AbortController,Date:{now:()=>now},innerWidth:1920,innerHeight:1080,setTimeout,clearTimeout,
   setInterval:fn=>(intervals.add(fn),fn),clearInterval:fn=>intervals.delete(fn),
   document:{hidden:false,documentElement:{dataset:{},style:{setProperty(){}}},addEventListener(){},removeEventListener(){}},
   EduvizeSegmentProfile:{resolve:()=>({}),header:()=>({}),text:()=>({})},
   EduvizeOutputClient:{create:()=>({
    getPublicOutput:async()=>{if(failure?.phase==='snapshot')throw failure.error;return snapshot;},
    getPublicTheme:async()=>{if(failure?.phase==='theme')throw failure.error;return {colors};}
   })}};
  vm.runInNewContext(source,env);
  const runtime=env.EduvizeOutputRuntime.start({appId:'day-progress',outputId:id,render:(_s,_m,{signal})=>signals.push(signal),clear:e=>clears.push(e),onError:e=>errors.push(e)});
  await new Promise(resolve=>setImmediate(resolve));
  return {runtime,signals,clears,errors,intervals,fail:(phase,error=Error('Temporary outage'))=>failure={phase,error},recover:()=>failure=null,advance:ms=>now+=ms};
 }
 // Actual app cancellation: old signal ends, same-revision success must start a fresh generation.
 for(const phase of ['snapshot','theme']){
  const s=await setup();assert.equal(s.signals.length,1);
  await s.runtime.refresh();assert.equal(s.signals.length,1,'healthy unchanged revision must not rerender');
  s.fail(phase);await s.runtime.refresh();assert.ok(s.signals[0].aborted);assert.equal(s.clears.length,0,'retain short-lived static content');
  s.recover();await s.runtime.refresh();assert.equal(s.signals.length,2,'same revision must restart an aborted renderer');
  assert.notEqual(s.signals[0],s.signals[1]);assert.equal(s.signals[1].aborted,false);
  await s.runtime.refresh();assert.equal(s.signals.length,2,'do not accumulate duplicate pollers');
  s.runtime.stop();assert.ok(s.signals[1].aborted);assert.equal(s.intervals.size,0);
 }
 const aged=await setup();aged.advance(300001);aged.fail('theme');await aged.runtime.refresh();assert.equal(aged.clears.length,1);
 aged.recover();await aged.runtime.refresh();assert.equal(aged.signals.length,2);aged.runtime.stop();
 for(const status of [403,404,410]){
  const s=await setup();s.fail('snapshot',Object.assign(Error('Denied'),{status}));await s.runtime.refresh();
  assert.equal(s.clears.length,1);assert.ok(s.signals[0].aborted);assert.equal(s.intervals.size,0);
  s.recover();await s.runtime.refresh();assert.equal(s.signals.length,1,'terminal denial must not revive playback');
 }
 const stopped=await setup();stopped.fail('snapshot');await stopped.runtime.refresh();stopped.runtime.stop();stopped.recover();await stopped.runtime.refresh();assert.equal(stopped.signals.length,1);
 return 'Runtime recovery: snapshot/theme outage, same revision restart, no duplicate generation, stale clear, terminal denial and stop passed';
}
module.exports=run;
if(require.main===module)run().then(message=>console.log(message)).catch(error=>{console.error(error);process.exitCode=1;});
