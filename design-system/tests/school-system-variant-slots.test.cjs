const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

const source = fs.readFileSync(new URL('../output-actions.js', 'file://' + __filename), 'utf8');
let selected = 'timetable';
const keys = [];
const store = new Map();
const schoolId = 'school-test';
const profileId = 'a'.repeat(32);
const auth = {status: () => ({connected:true, schoolId, profileId, scopes:['configurations']}), getToken: () => 'test-token'};
const root = {
  location:{origin:'https://test.skola.eduvize.cz'},
  addEventListener(){},
  EduvizeAdminAuth:auth,
  EduvizeProfiles:{outputContextVersion:'profile-applied-v1',assertOutputContext(){}},
  TextEncoder, crypto:webcrypto,
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
};
vm.runInNewContext(source,{window:root,globalThis:root,URL,URLSearchParams,TextEncoder,WeakMap,Map,Set,JSON,Number,Array,Object,Promise,Error,TypeError});
const actions=root.EduvizeOutputActions.create({
  client:{lookupOutputSlot:async ({assemblyKey})=>{keys.push(assemblyKey);return {assemblyId:null,output:null,generation:0};}},
  context:()=>({schoolId,profileId,appId:'school-systems',sourceId:selected,presentation:{mode:'web',geometry:null,interaction:'interactive'}}),
});
(async()=>{
 await actions.state();
 selected='permanent';await actions.state();
 selected='timetable';await actions.state();
 assert.equal(keys.length,3);
 assert.notEqual(keys[0],keys[1]);
 assert.equal(keys[0],keys[2]);
 assert.equal(root.EduvizeOutputActions.schoolSystemsViewDiscriminator,'sis-view-v1');
 console.log('SIS variant slot keys: distinct per view and stable for repeated view');
})().catch(error=>{console.error(error);process.exitCode=1;});
