import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const scope={};
vm.runInNewContext(readFileSync(new URL('../segment-profile.js',import.meta.url),'utf8'),scope);
const api=scope.EduvizeSegmentProfile;
for(const [width,height] of [[3840,2160],[2160,3840],[2968,1672],[2160,2880],[1920,1080],[1080,1920],[872,488]]){
 test('Kiosk uses bounded touch reading roles at '+width+'x'+height,()=>{
  const g=api.resolve(width,height);
  const text=api.text(g,'kiosk'),header=api.header(g,'kiosk');
  assert.ok(text.body>=24&&text.body<=40);
  assert.ok(header.height>=88&&header.height<=160);
  assert.equal(text.body,api.kiosk(g).body);
  assert.notEqual(text.body,api.text(g,'nsp').body);
 });
}
test('NSP retains its published 1920x1080 text and header metrics',()=>{
 const g=api.resolve(1920,1080);
 assert.equal(api.text(g,'nsp').body,56.16);
 assert.equal(api.header(g,'nsp').height,288);
});
test('Ordinary web retains document text scale',()=>assert.equal(api.text(api.resolve(1920,1080),'web').body,18));
