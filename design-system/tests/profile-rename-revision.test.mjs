import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('    rename.onclick='),source.indexOf('    history.onclick='));
assert.ok(handler.startsWith('    rename.onclick='),'rename handler must exist');

const id='a'.repeat(32);
async function scenario({current={name:'Škola',revision:7},patchError,answer='Nový název'}={}){
  const requests=[],events=[];
  let refreshes=0;
  const context={
    rename:{},
    items:[{id,name:'Škola',revision:4}],
    ui:{select:{value:id}},
    prompt:()=>answer,
    act:fn=>fn(),
    request:async(path,options)=>{
      requests.push({path,options});
      if(options?.fresh)return current;
      if(patchError)throw patchError;
      return {};
    },
    refresh:async()=>{refreshes++;},
    root:{dispatchEvent:event=>events.push(event.type)},
    Event:class Event{constructor(type){this.type=type;}},
    Error,
    JSON
  };
  vm.runInNewContext(handler,context);
  return {run:()=>context.rename.onclick(),requests,events,get refreshes(){return refreshes;}};
}

const saved=await scenario();
await saved.run();
assert.equal(saved.requests.length,2);
assert.equal(saved.requests[0].options.fresh,true);
assert.equal(saved.requests[1].options.method,'PATCH');
assert.equal(JSON.parse(saved.requests[1].options.body).expectedRevision,7,'use the freshly loaded revision');
assert.equal(saved.refreshes,1);
assert.deepEqual(saved.events,['eduvize-profiles-changed']);

const renamedElsewhere=await scenario({current:{name:'Jiný název',revision:7}});
await assert.rejects(renamedElsewhere.run(),/Název profilu se mezitím změnil/);
assert.equal(renamedElsewhere.requests.length,1,'do not overwrite another rename');
assert.equal(renamedElsewhere.refreshes,1);
assert.equal(renamedElsewhere.events.length,0);

const conflict=await scenario({patchError:Object.assign(Error('Conflict'),{status:409})});
await assert.rejects(conflict.run(),/Profil se mezitím změnil/);
assert.equal(conflict.refreshes,1,'refresh the list after a race');
assert.equal(conflict.events.length,0);

const cancelled=await scenario({answer:null});
await cancelled.run();
assert.equal(cancelled.requests.length,0);
console.log('Rename uses a fresh revision, preserves concurrent names and refreshes after conflicts.');
