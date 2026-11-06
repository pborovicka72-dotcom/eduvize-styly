/* Run with node tests/link-contract.test.cjs from the repository root. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const contract=fs.readFileSync('design-system/link-contract.js','utf8');
const modes=fs.readFileSync('design-system/output-modes.js','utf8');
assert.ok(modes.startsWith(contract+'\n'),'Generated bundle must match canonical contract');
const context={URL,URLSearchParams,window:{location:{href:'https://pborovicka72-dotcom.github.io/eduvize-jizdni-rady/index.html',search:'',pathname:'/eduvize-jizdni-rady/index.html'},addEventListener(){},dispatchEvent(){},setInterval(){return 1},clearInterval(){}},document:{readyState:'loading',documentElement:{dataset:{},classList:{add(){}}},currentScript:{src:'https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/output-modes.js'},getElementById(){return null},addEventListener(){},head:{append(){}},createElement(){return {}}}};
vm.runInNewContext(modes,context);vm.runInNewContext(fs.readFileSync('design-system/nsp-geometry.js','utf8'),context);
const api=context.window.EduvizeLinkContract,layouts=context.window.EduvizeNSPLayouts.layouts;
const bases=['https://eduvize-weather.onrender.com/display','https://pborovicka72-dotcom.github.io/eduvize-jizdni-rady/index.html','https://eduvize-aktuality.onrender.com/','https://eduvize-jidelnicek.onrender.com/index.html','https://eduvize-dokumenty-api.onrender.com/display','https://pborovicka72-dotcom.github.io/eduvize-kiosek/','https://pborovicka72-dotcom.github.io/eduvize-moudrost-dne/index.html','https://pborovicka72-dotcom.github.io/eduvize-svatky/index.html','https://eduvize-skolni-systemy.onrender.com/index.html','https://eduvize-prubeh-dne.onrender.com/index.html'];
for(const base of bases){
 const old=base+'?stops=Hlubo%C4%8Depy&future=a&future=b&v=old#part';
 assert.equal(api.inspect(old).status,'legacy');
 const next=api.stamp(old);assert.equal(next.searchParams.get('edu-link'),'1');
 assert.equal(next.searchParams.getAll('future').join(','),'a,b');assert.equal(next.hash,'#part');assert.equal(next.searchParams.get('v'),'old');
 assert.equal(api.inspect(next.href).status,'current');
}
for(const [query,status] of [['edu-link=99','review'],['edu-link=bad','review'],['viewMode=kiosk&output=web','review'],['segment_style=99','review'],['interaction=other','review'],['viewMode=web&viewMode=kiosk','review'],['viewMode=web-pages','legacy']])assert.equal(api.inspect(bases[1]+'?'+query,{layouts}).status,status,query);
for(const address of ['https://evil.example/index.html','javascript:alert(1)',bases[0]+'/other','https://user:password@eduvize-weather.onrender.com/display'])assert.equal(api.inspect(address).status,'unknown');
assert.equal(api.stamp(bases[0]+'?edu-link=99').searchParams.get('edu-link'),'99');
let segments=0;
for(const [orientation,styles] of Object.entries(layouts))for(const [style,rects] of Object.entries(styles))for(const [block] of rects.entries()){
 assert.equal(api.inspect(bases[1]+'?segment_orientation='+orientation+'&segment_style='+style+'&segment_block='+(block+1),{layouts}).status,'legacy');segments++;
}
const generated=context.window.EduvizeOutputModes.url(bases[1]+'?stops=Hlubo%C4%8Depy&custom=yes','web');
assert.equal(generated.searchParams.get('edu-link'),'1');assert.equal(generated.searchParams.get('custom'),'yes');assert.equal(generated.searchParams.get('stops'),'Hlubočepy');
for(const [query,mode,interaction] of [['','web','interactive'],['viewMode=web-all','web','interactive'],['viewMode=web-pages','web','interactive'],['layout=signage','nsp','display'],['orientation=portrait&style=2&block=2','nsp','display'],['output=kiosk','kiosk','interactive'],['viewMode=kiosk','kiosk','interactive'],['viewMode=nsp&interaction=interactive','nsp','interactive'],['viewMode=web&interaction=display','web','display']]){
 const old=bases[1]+'?'+query;
 assert.equal(context.window.EduvizeOutputModes.mode(old),mode,query);
 assert.equal(context.window.EduvizeOutputModes.interaction(old),interaction,query);
 assert.equal(context.window.EduvizeOutputModes.mode(api.stamp(old)),mode,query);
 assert.equal(context.window.EduvizeOutputModes.interaction(api.stamp(old)),interaction,query);
}
console.log('Link contract OK: 10 application addresses, '+segments+' NSP segments, legacy/future/invalid URLs, parameter preservation and generation.');

for(const origin of ['https://skola.eduvize.cz','https://test.skola.eduvize.cz']){
 const stable=origin+'/jidelnicek/output.html?edu-menu='+'a'.repeat(32)+'&edu-link=1';
 assert.equal(api.inspect(stable).status,'current');
 assert.equal(api.inspect(origin+'/jidelnicek/index.html?days=1&custom=a&custom=b').status,'legacy');
 const stamped=context.window.EduvizeOutputModes.url(origin+'/jidelnicek/index.html?custom=a&custom=b','web');
 assert.deepEqual(stamped.searchParams.getAll('custom'),['a','b']);
}
