import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
let mode='kiosk';
const context={console,innerWidth:1920,innerHeight:1080,location:{search:'?viewMode=kiosk'},addEventListener(){},document:{readyState:'loading',addEventListener(){}},EduvizeOutputModes:{mode:()=>mode}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['segment-profile.js','meal-board.js','weather-layout.js','transport-layout.js','editorial-output.js'])vm.runInContext(readFileSync(new URL(file,root),'utf8'),context,{filename:file});
const profile=context.EduvizeSegmentProfile;
for(const [width,height] of [[1280,720],[1920,1080],[1080,1920],[3840,2160],[2160,3840],[760,1400],[2968,488]]){
 context.innerWidth=width;context.innerHeight=height;
 const g=profile.resolve(width,height),text=profile.text(g,'kiosk'),reading=profile.kiosk(g),header=profile.header(g,'kiosk');
 assert(text.body>=24&&text.body<=40);assert(header.height>=88&&header.height<=160);
 assert.equal(text.body,reading.body);assert.equal(context.EduvizeMealBoard.profile(width,height,'kiosk').body,text.body);
 assert.equal(context.EduvizeWeatherLayout.stationPolicy(width,height).body,text.body);
 const style={setProperty(name,value){this[name]=value;}},body={style,dataset:{},querySelector(){return null;}};
 context.EduvizeTransportLayout.apply(body,{},width,height);assert.equal(style['--transport-text'],text.body+'px');
 const one=context.EduvizeNewsLayout.resolve(width,height,{count:1}),six=context.EduvizeNewsLayout.resolve(width,height,{count:6});assert.equal(one.font,six.font);assert(one.font<=40);
 assert(text.caption>=18);assert(text.footnote>=14);
}
// Existing Newline and normal web sizes must not change with the kiosk policy.
assert.equal(profile.header(profile.resolve(1920,1080),'nsp').height,288);
assert.equal(profile.text(profile.resolve(1920,1080),'nsp').body,56.16);
assert.equal(profile.text(profile.resolve(1920,1080),'web').body,18);
mode='nsp';assert.equal(context.EduvizeMealBoard.profile(1920,1080,'nsp').body,25.92);
console.log('Kiosk reading scale: 7 geometries, shared application roles, sparse/dense news and NSP/web regression checks passed.');
