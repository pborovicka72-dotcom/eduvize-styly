import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html=readFileSync(new URL('../editor.html',import.meta.url),'utf8');
const profiles=readFileSync(new URL('../design-system/configuration-profiles.js',import.meta.url),'utf8');
function editor(){
 const elements=new Map();
 function element(){return {value:'',dataset:{},style:{},classList:{toggle(){}},setAttribute(){},replaceChildren(){},append(){},addEventListener(){},querySelector(){return element()}};}
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return []},createElement:element};
 const requests=[];
 let state={connected:true,schoolId:'school-a',profileId:'profile-a',scopes:['configurations']};
 const context=vm.createContext({document,console,window:{EduvizeAdminAuth:{status:()=>state,ready:Promise.resolve()}},
   api:()=>new Promise((resolve,reject)=>requests.push({resolve,reject,profile:state.profileId})),
   feedback(){},msg(){},fields(){},swatchGradient(){return ''}});
 vm.runInContext("let themes=[],selected='standard',standardUnlocked=false,theme;const deep=o=>JSON.parse(JSON.stringify(o));"+
   html.slice(html.indexOf("let themeContext="),html.indexOf('function render(){'))+
   html.slice(html.indexOf('function selectTheme('),html.indexOf("document.getElementById('theme-select').addEventListener")),context);
 return {run:code=>vm.runInContext(code,context),elements,requests,setProfile(profile){state={...state,profileId:profile}},async load(){const promise=vm.runInContext('loadThemes()',context);await new Promise(setImmediate);return {promise,request:requests.at(-1)}}};
}
const theme=(id,color)=>({id,name:id,config:{colors:{background:color}},active:true,editable:true,locked:false});

test('A → B → A keeps the last profile even when responses arrive out of order',async()=>{
 const e=editor();const a=await e.load();
 e.setProfile('profile-b');const b=await e.load();
 e.setProfile('profile-a');const final=await e.load();
 final.request.resolve([theme('blue','#123456')]);await final.promise;
 b.request.resolve([theme('red','#ff0000')]);await b.promise;
 a.request.resolve([theme('old-blue','#000000')]);await a.promise;
 assert.equal(e.run('selected'),'blue');
 assert.equal(e.run('theme.colors.background'),'#123456');
 assert.equal(e.run('hasUnsavedStyleChanges()'),false);
 assert.equal(e.requests.length,3); // Only catalog reads; no theme write on a profile switch.
});

test('even a response without a newer request is discarded after identity changes',async()=>{
 const e=editor();const a=await e.load();e.setProfile('profile-b');
 a.request.resolve([theme('wrong-profile','#ff0000')]);await a.promise;
 assert.equal(e.run('selected'),'standard');assert.equal(e.run('canPublishStyle()'),false);
});

test('browsing saved styles is clean; actual edits warn and a saved reload clears them',async()=>{
 const e=editor();const load=await e.load();
 load.request.resolve([theme('blue','#123456'),{...theme('red','#ff0000'),active:false}]);await load.promise;
 e.run("selectTheme('red');selectTheme('blue')");
 assert.equal(e.run('hasUnsavedStyleChanges()'),false);
 e.run("theme.colors.background='#abcdef'");assert.equal(e.run('hasUnsavedStyleChanges()'),true);
 e.run("theme.colors.background='#123456'");assert.equal(e.run('hasUnsavedStyleChanges()'),false);
 e.elements.get('theme-name').value='New name';assert.equal(e.run('hasUnsavedStyleChanges()'),true);
 const saved=await e.load();saved.request.resolve([theme('blue','#abcdef')]);await saved.promise;
 assert.equal(e.run('hasUnsavedStyleChanges()'),false);
 // Execute the actual shared navigation guard against an obsolete profile backup.
 const code=profiles.slice(profiles.indexOf('    function hasUnsavedDeparture(){'),profiles.indexOf('    root.EduvizeAdminNavigation?.registerExitGuard'));
 const guard=vm.createContext({adapter:{app:'styles',hasUnsavedChanges:()=>e.run('hasUnsavedStyleChanges()')},profileId:'profile-a',baseline:'old-profile-snapshot'});
 vm.runInContext(code,guard);assert.equal(vm.runInContext('hasUnsavedDeparture()',guard),false);
 e.run("theme.colors.background='#ffffff'");assert.equal(vm.runInContext('hasUnsavedDeparture()',guard),true);
});

test('school can create a draft from Standard but cannot overwrite it',async()=>{
 const e=editor();const load=await e.load();
 load.request.resolve([{...theme('standard','#ffffff'),editable:false,locked:true}]);await load.promise;
 assert.equal(e.run('canPublishStyle()'),true);assert.equal(e.run('editable()'),false);
 e.run('updateEditLock()');assert.equal(e.elements.get('create').disabled,false);assert.equal(e.elements.get('save').disabled,true);
});
