/* Behavioral regressions for the shared theme/loading runtime. No browser credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const first = fs.readFileSync(path.join(root, 'theme-first-paint.js'), 'utf8');
const active = fs.readFileSync(path.join(root, 'active-theme.js'), 'utf8');
const profile = 'a'.repeat(32), other = 'b'.repeat(32);
const theme = color => ({colors: {primary: color}, controls: {heightPx: 44}, cards: {radiusPx: 18}});

function environment({url='https://school.example/display', cached={}, forms=false, explicit=[], request}={}) {
 const values = new Map(Object.entries(cached)), style = new Map(), nodes = [...explicit];
 const listeners = new Map(), observers = [];
 const html = {dataset: {}, style: {setProperty: (k,v)=>style.set(k,v)}, classList: {add(){throw Error('Must not hide the page while waiting for theme');},remove(){}}};
 const document = {documentElement:html, body:{nodeType:1,matches:()=>false,childNodes:[]}, readyState:'loading', hidden:false,
  currentScript:{src:'https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/active-theme.js'},
  head:{append(node){nodes.push(node);}},
  createElement:tag=>({tagName:tag.toUpperCase(), dataset:{}, getAttribute(k){return this[k]||null;}}),
  querySelectorAll(selector){return nodes.filter(n=>selector.startsWith(n.tagName.toLowerCase()));},
  querySelector(selector){if(selector.includes('.ev-admin'))return forms?{}:null;return null;},
  getElementById(){return null;},
  addEventListener(name,fn){const list=listeners.get('doc:'+name)||[];list.push(fn);listeners.set('doc:'+name,list);}
 };
 const window={addEventListener(name,fn){const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list);},setInterval(){},scrollTo(){}};
 const context={window,document,location:new URL(url),URL,Map,Set,Number,JSON,console:{warn(){}},
  history:{scrollRestoration:'auto'},performance:{getEntriesByType:()=>[]},requestAnimationFrame(){},
  localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},
  MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}},
  AbortSignal:{timeout:()=>({})},fetch:request||(()=>new Promise(()=>{}))};
 vm.createContext(context);
 return {context,style,values,nodes,listeners,observers,run:source=>vm.runInContext(source,context),
  dispatch(name){for(const fn of listeners.get(name)||[])fn({});}};
}

(async()=>{
 const a=environment({url:'https://school.example/?edu-profile='+profile,cached:{
  'eduvize-active-theme-v1':JSON.stringify(theme('#ff0000')),
  ['eduvize-active-theme-v1:'+other]:JSON.stringify(theme('#00ff00')),
  ['eduvize-active-theme-v1:'+profile]:JSON.stringify(theme('#123456'))}});
 a.run(first);assert.equal(a.style.get('--ev-primary'),'#123456');
 const b=environment({cached:{'eduvize-active-theme-v1':JSON.stringify(theme('#ff0000'))}});
 b.run(first);assert.equal(b.style.size,0,'Legacy unscoped cache can belong to another school');
 const c=environment({cached:{['eduvize-active-theme-v1:global']:JSON.stringify(theme('#654321'))}});
 c.run(first);assert.equal(c.style.get('--ev-primary'),'#654321');
 const blocked=environment();blocked.context.localStorage.getItem=()=>{throw Error('blocked storage');};blocked.run(first);

 const explicit={tagName:'SCRIPT',src:'https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/typography.js?v=old',getAttribute(k){return this[k];}};
 let calls=0,resolve;
 const d=environment({explicit:[explicit],request:()=>{calls++;return new Promise(r=>resolve=r);}});
 d.run(active);d.run(active);d.dispatch('doc:DOMContentLoaded');d.dispatch('eduvize-admin-auth-change');
 assert.equal(calls,1,'Overlapping startup/auth refreshes share a request');
 assert.equal(d.nodes.filter(n=>(n.src||'').includes('/typography.js')).length,1,'Explicit shared assets are not inserted twice');
 assert.equal(d.nodes.some(n=>(n.src||'').includes('form-fields.js')),false,'Public output without forms has no form runtime');
 resolve({ok:true,json:async()=>[{active:true,config:theme('#112233')}]});
 await new Promise(r=>setImmediate(r));
 assert.equal(d.values.has('eduvize-active-theme-v1:global'),true);
 assert.equal(d.values.has('eduvize-active-theme-v1'),false);
 d.dispatch('eduvize-admin-auth-change');assert.equal(calls,2,'Future updates still refresh');

 const admin=environment({forms:true});admin.run(active);admin.dispatch('doc:DOMContentLoaded');
 assert.equal(admin.nodes.filter(n=>(n.src||'').includes('form-fields.js')).length,1);
 console.log('shared-loading: 10 behavioral checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
