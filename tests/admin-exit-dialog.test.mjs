import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../design-system/admin-navigation.js',import.meta.url),'utf8');
const handlers={},assigned=[];
let dialog;
function element(tag){
 const node={tag,children:[],listeners:{},addEventListener(type,handler){this.listeners[type]=handler;},append(...children){this.children.push(...children);},remove(){},close(){},showModal(){},focus(){},matches(){return false;},hasAttribute(){return false;}};
 if(tag==='dialog')dialog=node;
 return node;
}
const document={body:{append(){}},documentElement:{},readyState:'complete',querySelectorAll:()=>[],createElement:element,addEventListener:(type,handler)=>handlers[type]=handler};
const window={location:{href:'https://skola.eduvize.cz/aktuality/config',origin:'https://skola.eduvize.cz',assign:url=>assigned.push(url)},open:()=>{throw Error('Unexpected popup');}};
vm.runInNewContext(source,{window,document,URL,setTimeout,MutationObserver:class{observe(){}}});

let dirty=true;
window.EduvizeAdminNavigation.registerExitGuard(()=>dirty);
const link={href:'https://skola.eduvize.cz/eduvize-styly/aplikace.html',target:'_self',matches:selector=>selector==='a[href]:not([download]),form',hasAttribute:()=>false};
function click(){
 let prevented=false;
 handlers.click({target:{closest:()=>link},button:0,defaultPrevented:false,preventDefault(){prevented=true;},stopImmediatePropagation(){}});
 return prevented;
}
assert.equal(click(),true);
assert.equal(assigned.length,0);
dialog.children[2].children[0].listeners.click();
await Promise.resolve();
assert.equal(assigned.length,0,'Stay must keep edits on the current page');

assert.equal(click(),true);
dialog.children[2].children[1].listeners.click();
await Promise.resolve();
assert.equal(assigned.length,1,'Leave must navigate exactly once');
assert.equal(window.EduvizeAdminNavigation.isApprovedDeparture(),true,'beforeunload may be suppressed for the approved navigation');

link.href='https://skola.eduvize.cz/aktuality/config#sources';
assert.equal(click(),false,'In-page anchors must not warn about leaving');
dirty=false;
link.href='https://skola.eduvize.cz/eduvize-styly/aplikace.html';
assert.equal(click(),false,'Clean navigation must remain native');
console.log('Shared exit dialog: Stay, Leave, native-warning suppression, hash links and clean navigation.');
