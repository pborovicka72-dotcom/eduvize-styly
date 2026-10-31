import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const here=new URL('../',import.meta.url);
const doc={readyState:'loading',addEventListener(){},documentElement:{classList:{add(){}}}};
const window={location:{href:'https://example.org/display',search:''}};
const context={window,document:doc,URL,URLSearchParams};
vm.runInNewContext(fs.readFileSync(new URL('output-modes.js',here),'utf8'),context);
const api=window.EduvizeOutputModes;
const old='https://example.org/display?lat=50&lon=14&hourly=off&document=abc&topic=one&topic=two&segment_style=4&segment_block=2&segment_orientation=portrait&layout=signage&orientation=portrait&block=2&ev_inner=1';
const kiosk=api.url(old,'kiosk');
assert.equal(kiosk.searchParams.get('viewMode'),'kiosk');
assert.equal(kiosk.searchParams.get('output'),'kiosk');
for(const k of [...api.segmentKeys,'layout'])assert.equal(kiosk.searchParams.has(k),false,k);
assert.equal(kiosk.searchParams.get('hourly'),'off');
assert.equal(kiosk.searchParams.get('lat'),'50');
assert.equal(kiosk.searchParams.get('document'),'abc');
assert.equal(JSON.stringify(kiosk.searchParams.getAll('topic')),JSON.stringify(['one','two']));
assert.equal(api.url(kiosk,'kiosk').href,kiosk.href);
assert.equal(api.url(kiosk,'web').searchParams.has('output'),false);
assert.equal(api.url(old,'nsp').href,old);
assert.equal(api.isKiosk(kiosk),true);
assert.equal(api.isKiosk('?viewMode=nsp'),false);
vm.runInNewContext(fs.readFileSync(new URL('kiosk-output.js',here),'utf8'),context);
const offsets=window.EduvizeKioskOutput.offsets;
for(const [total,height] of [[100,500],[900,400],[20000,300],[1200,1],[0,0]]){
 const pages=offsets(total,height,[200,600,1000]);assert.equal(pages[0],0);
 if(height>0){assert.equal(pages.at(-1),Math.max(0,total-height));for(let i=1;i<pages.length;i++){assert(pages[i]>pages[i-1]);assert(pages[i]-pages[i-1]<=height);}}
}
console.log('PASS: output URLs preserve settings, remove NSP geometry, and pagination covers complete content');
