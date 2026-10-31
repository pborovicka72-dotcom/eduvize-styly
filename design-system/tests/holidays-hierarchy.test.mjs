import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope={window:{},getComputedStyle:element=>({fontSize:element.style.fontSize||element.font+'px'})};
vm.runInNewContext(fs.readFileSync(new URL('../holidays-layout.js',import.meta.url),'utf8'),scope);
// Today's name may already have been reduced to fit a long name: actual size wins.
for(const todaySize of [194,44,24]){
 const today={font:todaySize,style:{},getBoundingClientRect:()=>({height:50})};
 const future=[20,65,162].map(font=>({font,style:{}}));
 const body={querySelector:()=>today,querySelectorAll:()=>future};
 scope.window.EduvizeHolidaysLayout.fitHierarchy(body);
 assert.ok(future.every(el=>Number(scope.getComputedStyle(el).fontSize.replace('px',''))<=todaySize*.8));
 assert.ok(Number(scope.getComputedStyle(future[0]).fontSize.replace('px',''))<=20);
}
console.log('Today remains dominant after long-name fitting at full, strip and compact sizes.');
