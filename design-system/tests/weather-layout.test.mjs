import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{addEventListener(){}},document:{readyState:'loading',addEventListener(){}}};
vm.runInNewContext(fs.readFileSync(new URL('../weather-layout.js',import.meta.url),'utf8'),context);
const policy=context.window.EduvizeWeatherLayout.stationPolicy;
for(const [width,height]of [[1390,1560],[1900,1400],[2160,3840],[3840,2160],[600,1000]]){
 const result=policy(width,height,{text:false});
 assert.equal(result.portrait,width<height);
 assert.equal(result.hours,6);
 assert(result.body>=14&&result.body<=54);
 assert.equal(result.rows.split('minmax').length-1,3);
 assert(!result.rows.includes('auto'));
}
assert(policy(1390,1560,{text:true}).rows.endsWith('auto'));
assert.equal(policy(1390,1560,{hourly:false,daily:false,text:false}).rows.split('minmax').length-1,1);
console.log('Station composition follows the available content viewport and enabled forecasts.');

assert.equal(policy(1400,2400).hours,6);assert.equal(policy(1900,1400).hours,6);

const expanded=policy(1400,2400,{text:true,textOpen:true});assert.equal(expanded.rows.split('minmax').length-1,4);assert(!expanded.rows.includes('auto'));assert.equal(expanded.hours,6);
