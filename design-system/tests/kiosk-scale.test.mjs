import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const scope={};
vm.runInNewContext(readFileSync(new URL('../segment-profile.js',import.meta.url),'utf8'),scope);
const api=scope.EduvizeSegmentProfile;
for(const [width,height] of [[3840,2160],[2160,3840],[2968,1672],[2160,2880],[1920,1080],[1080,1920],[872,488]]){
 test('Kiosk uses NSP reading scale at '+width+'x'+height,()=>{
  const g=api.resolve(width,height);
  assert.equal(JSON.stringify(api.text(g,'kiosk')),JSON.stringify(api.text(g,'nsp')));
 });
}
test('Ordinary web retains document text scale',()=>assert.equal(api.text(api.resolve(1920,1080),'web').body,18));
