import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const start=source.indexOf('    if(root.EduvizeOutputModes&&!adapter.outputInteractionWrapped)'),end=source.indexOf('\n',start);
assert(start>=0&&end>start);
let interaction='interactive',layout='tiles',applied;
const api={selection:()=>interaction,layoutSelection:()=>layout,setInteraction:value=>interaction=value,setKioskLayout:value=>layout=value};
const adapter={read:()=>({appSetting:'kept'}),apply:async value=>{applied=value}};
await vm.runInNewContext('(async()=>{'+source.slice(start,end)+'})()',{root:{EduvizeOutputModes:api},adapter});
assert.equal(adapter.read().outputInteraction,'interactive');assert.equal(adapter.read().outputKioskLayout,'tiles');
await adapter.apply({appSetting:'restored',outputInteraction:'display',outputKioskLayout:'menu'});
assert.equal(applied.appSetting,'restored');assert.equal(interaction,'display');assert.equal(layout,'menu');
await adapter.apply({appSetting:'legacy'});assert.equal(applied.appSetting,'legacy');assert.equal(layout,'menu');
console.log('Profile controls: both preferences serialize/restore and legacy profiles remain compatible.');

delete api.layoutSelection;delete api.setKioskLayout;assert.doesNotThrow(()=>adapter.read());await adapter.apply({appSetting:'cached-runtime',outputKioskLayout:'tiles'});
