import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const start=source.indexOf('rename.onclick=()=>act(async()=>{');
const end=source.indexOf('          const remove=button',start);
assert.ok(start>0&&end>start,'profile row rename handler exists');
const handler=source.slice(start,end).trim();
const id='a'.repeat(32);
async function scenario({current={name:'Škola',revision:9},patchError,answer='Nový název'}={}){
  const calls=[],events=[];let refreshes=0;
  const context={
    rename:{},item:{id,name:'Škola',revision:4},
    prompt:()=>answer,act:fn=>fn(),
    request:async(path,options)=>{calls.push({path,options});if(options?.fresh)return current;if(patchError)throw patchError;return {};},
    refresh:async options=>{refreshes++;assert.equal(options?.force,true);},
    status:()=>{},root:{dispatchEvent:event=>events.push(event.type)},
    CustomEvent:class{constructor(type){this.type=type;}},Error,JSON
  };
  vm.runInNewContext(handler,context);
  let error;try{await context.rename.onclick();}catch(e){error=e;}
  return {calls,events,refreshes,error};
}
const saved=await scenario();
assert.equal(saved.error,undefined);
assert.equal(saved.calls[0].options.fresh,true);
assert.equal(JSON.parse(saved.calls[1].options.body).expectedRevision,9,'use fresh revision after settings save');
assert.equal(saved.refreshes,1);
assert.deepEqual(saved.events,['eduvize-profile-updated']);

const renamedElsewhere=await scenario({current:{name:'Jiný název',revision:9}});
assert.match(renamedElsewhere.error?.message||'',/Název profilu se mezitím změnil/);
assert.equal(renamedElsewhere.calls.length,1,'do not overwrite another rename');
assert.equal(renamedElsewhere.refreshes,1);

const conflict=await scenario({patchError:Object.assign(Error('409'),{status:409})});
assert.match(conflict.error?.message||'',/Profil se mezitím změnil/);
assert.equal(conflict.refreshes,1,'refresh the profile list after 409');
assert.equal(conflict.events.length,0);

const cancelled=await scenario({answer:null});
assert.equal(cancelled.calls.length,0);
console.log('Profile renaming uses a fresh revision and preserves concurrent changes.');
