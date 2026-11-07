import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const work=source.slice(source.indexOf('    function state(){'),source.indexOf('    function login(){'));
const setup=`let visualBusy=false,busy=false,ready=true,needsReload=false,needsLogin=false,errorText='',timer,profileTitle='Test škola',profileId='selected';
const save={},load={},undo={hidden:true},actions={},manage={},profileText={},profilePicker={select:{}},messages=[];
const canSave=()=>true,say=(text,state)=>messages.push({text,state});
${work}
globalThis.test={work,state,save,profileText,profilePicker,messages,get busy(){return busy;}};`;
let callbacks=new Map(),serial=0;const context={setTimeout:f=>{callbacks.set(++serial,f);return serial;},clearTimeout:id=>callbacks.delete(id)};vm.runInNewContext(setup,context);const t=context.test;
t.state();await t.work('Načítám…',async()=>{}, {warm:true});assert.equal(t.save.disabled,false);assert.equal(t.profileText.textContent,'Profil: Test škola');assert.equal(t.profilePicker.select.value,'selected');assert.equal(t.messages.length,0,'immediate warm read never flashes loading');assert.equal(callbacks.size,0);
let resolve;const slow=t.work('Načítám…',()=>new Promise(r=>resolve=r),{warm:true});assert.equal(t.busy,true);assert.equal(t.save.disabled,false);for(const cb of callbacks.values())cb();assert.equal(t.save.disabled,true);assert.equal(t.messages.at(-1).text,'Načítám…');resolve();await slow;assert.equal(t.save.disabled,false);
let coldResolve;const cold=t.work('Cold loading',()=>new Promise(r=>coldResolve=r));assert.equal(t.save.disabled,true);assert.equal(t.messages.at(-1).text,'Cold loading');coldResolve();await cold;
await t.work('Warm',async()=>{throw Error('Visible failure');},{warm:true});assert.equal(t.messages.at(-1).state,'error');assert.equal(t.messages.at(-1).text,'Visible failure');
const preserve=source.match(/const preserveEditing=(.*);/)[1];for(const [changed,manual,expected] of [[true,false,true],[false,false,false],[true,true,false]]){const actual=vm.runInNewContext(preserve,{apply:true,replace:false,manualLoad:manual,userChanged:changed,dirty:()=>changed,adapter:{app:'weather'}});assert.equal(actual,expected,'automatic read preserves dirty form, explicit load remains available');}
assert.ok(source.includes("const warm=await warmProfile();if(warm){profileId=warm.id;profileTitle=warm.name;state();}"));
console.log('PASS: verified warm label/selection retained; no loading flash; cold/slow loading and errors visible; dirty form protected.');
