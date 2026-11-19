const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=path.resolve(__dirname,'..'),web=fs.existsSync(path.join(repo,'web/design-system/configuration-profiles.js'))?path.join(repo,'web'):repo;
const source=name=>fs.readFileSync(path.join(web,'design-system',name),'utf8');
const origins=['https://test.skola.eduvize.cz','https://skola.eduvize.cz','http://127.0.0.1:43210'];
const stores=()=>({getItem(){return null;},setItem(){},removeItem(){}}),settle=()=>new Promise(resolve=>setImmediate(resolve));
function context(origin){
 const calls=[],scripts=[];
 const document={readyState:'loading',hidden:false,addEventListener(){},querySelector(){return null;},getElementById(){return null;},createElement(){return {dataset:{}};},head:{append(node){scripts.push(String(node.src||node.href));queueMicrotask(()=>node.onload?.());}},documentElement:{dataset:{},style:{setProperty(){}},classList:{remove(){}}}};
 const root={addEventListener(){},setInterval(){},EduvizeAdminAuth:{ready:Promise.resolve(),status:()=>({schoolId:'fixture-school',profileId:'a'.repeat(32),expiresAt:1}),getToken:()=> 'synthetic-test-only',fetch:async(url)=>{calls.push(String(url));return {ok:true,json:async()=>({items:[]})};}},EduvizeUpdateSettings:{mount(){}},EduvizeLinkCompatibility:{mount(){}}};
 const c={...root,root,ORIGIN:origin,window:root,document,location:{origin,href:origin+'/eduvize-styly/ucet.html?edu-profile='+('a'.repeat(32)),search:'',hash:''},localStorage:stores(),sessionStorage:stores(),URL,URLSearchParams,AbortSignal:{timeout(){}},structuredClone,console,queueMicrotask,fetch:async(url)=>{calls.push(String(url));return {ok:true,json:async()=>[]};}};
 vm.createContext(c);return {c,root,calls,scripts};
}
for(const origin of origins){
 test('profile APIs and application links stay on '+origin,async()=>{
  const h=context(origin);vm.runInContext(source('configuration-profiles.js'),h.c);
  const expected={'school-calendar':'/eduvize-skolni-kalendar/config.html','school-identity':'/eduvize-styly/ucet.html','kiosk':'/eduvize-kiosek/config.html','documents':'/config','weather':'/pocasi/config','holidays':'/eduvize-svatky/config.html','menu':'/jidelnicek/config.html','transport':'/eduvize-jizdni-rady/config.html','wisdom':'/eduvize-moudrost-dne/config.html','news':'/aktuality/config','styles':'/','day-progress':'/prubeh-dne/config.html','school-systems':'/skolni-systemy/config.html'};
  for(const app of h.root.EduvizeProfiles.apps){const url=new URL(app.url);assert.equal(url.origin,origin);assert.equal(url.pathname,expected[app.id]);}
  await h.root.EduvizeProfiles.request('/'+('a'.repeat(32))+'/archive-check?keep=1');
  const url=new URL(h.calls[0]);assert.equal(url.origin,origin);assert.equal(url.pathname,'/api/admin/configuration-profiles/'+('a'.repeat(32))+'/archive-check');assert.equal(url.searchParams.get('keep'),'1');
 });
 test('theme and dynamically loaded shared components stay on '+origin,async()=>{
  const h=context(origin),raw=source('active-theme.js');
  const theme=raw.slice(raw.indexOf('/* Shared Eduvize active theme loader.'),raw.indexOf('/* Shared configuration controls'));
  vm.runInContext(theme,h.c);await settle();assert.equal(h.calls.length,1);assert.equal(new URL(h.calls[0]).origin,origin);assert.equal(new URL(h.calls[0]).pathname,'/api/design-system/themes');
  const branding=raw.split('\n').find(line=>line.includes('(function(){if(window.EduvizeBranding'));
  assert.ok(branding);vm.runInContext(branding,h.c);
  const config=source('configuration-profiles.js'),loaders=config.slice(config.indexOf('  let updatesScript;'),config.indexOf('  const make='));
  vm.runInContext(loaders+';mountUpdates("fixture",{});mountLinkAudit({});',h.c);await settle();await settle();
  assert.equal(h.scripts.length,4);for(const src of h.scripts)assert.equal(new URL(src).origin,origin);
  assert.deepEqual(h.scripts.map(s=>new URL(s).pathname).sort(),['/eduvize-styly/design-system/branding.js','/eduvize-styly/design-system/link-compatibility.js','/eduvize-styly/design-system/link-contract.js','/eduvize-styly/design-system/update-settings.js'].sort());
 });
}
test('canonical account carriers contain no retired host or fixed environment destination',()=>{
 for(const file of ['active-theme.js','configuration-profiles.js']){const text=source(file);new vm.Script(text);assert.doesNotMatch(text,/onrender\.com|github\.io|https:\/\/(?:test\.)?skola\.eduvize\.cz/);}
 const html=fs.readFileSync(path.join(web,'ucet.html'),'utf8');assert.doesNotMatch(html,/onrender\.com|github\.io|https:\/\/(?:test\.)?skola\.eduvize\.cz/);assert.match(html,/device-pair-form" class="edu-admin__flow/);
});
