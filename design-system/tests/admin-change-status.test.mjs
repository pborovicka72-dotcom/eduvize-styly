import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const start=source.indexOf("let editBaseline=''"),end=source.indexOf('    const ui={status}',start);
assert.ok(start>0&&end>start);
for(const app of ['documents','weather','transport','holidays','wisdom','news','kiosk','menu','day-progress','styles','school-systems','school-identity']){
 let value={setting:'initial'};
 const scope={changeStatus:{dataset:{}},fingerprint:JSON.stringify,adapter:{app,read:()=>value}};
 vm.runInNewContext(source.slice(start,end)+';this.reset=resetEditState;this.show=showEditState;this.touch=()=>userChanged=true;',scope);
 scope.reset();value={setting:'automatic'};scope.show();
 assert.equal(scope.changeStatus.dataset.state,'saved',app+': automatic initialization');
 scope.reset();value={setting:'edited'};scope.touch();scope.show();
 assert.equal(scope.changeStatus.textContent,'Neuložené změny.',app+': real edit');
 scope.reset('Uloženo v prohlížeči.');assert.equal(scope.changeStatus.textContent,'Uloženo v prohlížeči.');
 value={setting:'refreshed automatically'};scope.show();
 assert.equal(scope.changeStatus.dataset.state,'saved',app+': automatic refresh after local save');
}
console.log('Shared edit status passes for all 12 administration adapters.');

const changeStart=source.indexOf('function changed(event)'),changeEnd=source.indexOf("    for(const event of ['input','change','click','eduvize-profile-change'])",changeStart);
let checked=false;
const scope={changeStatus:{dataset:{}},fingerprint:JSON.stringify,adapter:{read:()=>({checked})},panel:{contains:()=>false},save:{},local:{},busy:false,needsReload:false,baseline:'',timer:null,clearTimeout(){},setTimeout(){return 1;}};
vm.runInNewContext(source.slice(start,end)+source.slice(changeStart,changeEnd)+';this.reset=resetEditState;this.change=changed;',scope);
const target={matches:()=>true,closest:()=>null,readOnly:false,disabled:false};
scope.reset();checked=true;scope.change({type:'click',isTrusted:true,target});scope.change({type:'input',isTrusted:true,target});
assert.equal(scope.changeStatus.textContent,'Neuložené změny.','checkbox click must not replace the pre-edit baseline');
checked=false;scope.change({type:'input',isTrusted:true,target});assert.equal(scope.changeStatus.textContent,'Bez neuložených změn.','reverting the checkbox clears the warning');
