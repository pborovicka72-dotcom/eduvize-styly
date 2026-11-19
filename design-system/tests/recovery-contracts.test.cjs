const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const bundle=fs.readFileSync(path.join(__dirname,'../output-modes.js'),'utf8');
function setup(query='',defaultInteraction){
 const location=new URL('https://test.skola.eduvize.cz/jidelnicek/config.html'+query);
 const window={location,addEventListener(){},dispatchEvent(){},setInterval(){return 1;},clearInterval(){}};
 const document={readyState:'loading',documentElement:{dataset:{eduDefaultInteraction:defaultInteraction},classList:{add(){}}},getElementById(){return null;},addEventListener(){},head:{append(){}},createElement(){return {dataset:{}}}};
 vm.runInNewContext(bundle,{window,document,location,URL,URLSearchParams});return window;
}
test('native interactive default is opt-in and explicit URLs retain priority',()=>{
 assert.equal(setup('?viewMode=nsp').EduvizeOutputModes.interaction(),'display');
 assert.equal(setup('?viewMode=nsp','interactive').EduvizeOutputModes.interaction(),'interactive');
 assert.equal(setup('?viewMode=nsp&interaction=display','interactive').EduvizeOutputModes.interaction(),'display');
 assert.equal(setup('?viewMode=web').EduvizeOutputModes.interaction(),'interactive');
 assert.equal(setup('?viewMode=kiosk&interaction=display').EduvizeOutputModes.interaction(),'interactive');
});
test('v1 publication remains the sole lifecycle owner',()=>{
 const context=setup('?edu-output='+'a'.repeat(32));
 for(const name of ['EduvizeLinkContract','EduvizeOutputModes','EduvizeRefreshClock','EduvizeBroadcastLicense'])assert.equal(context[name],undefined,name);
});
test('published menu validation accepts a single ID and rejects ambiguity',()=>{
 const api=setup().EduvizeLinkContract,id='a'.repeat(32);
 for(const origin of ['https://test.skola.eduvize.cz','https://skola.eduvize.cz']){
  const base=origin+'/jidelnicek/output.html';
  assert.equal(api.inspect(base+'?edu-menu='+id+'&edu-link=1').status,'current');
  for(const suffix of ['', '?edu-menu=short','?edu-menu='+id+'&edu-menu='+id])assert.equal(api.inspect(base+suffix).status,'review',suffix);
 }
 assert.equal(api.inspect('https://untrusted.example/jidelnicek/output.html?edu-menu='+id).status,'unknown');
 assert.equal(api.inspect('https://test.skola.eduvize.cz/eduvize-skolni-kalendar/').app,'school-calendar');
});
