import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const readSource=source.slice(source.indexOf('    async function readProfile('),source.indexOf('    async function list('));
const managerSource=source.slice(source.indexOf('  async function manager('),source.indexOf('  async function picker('));
const updatedSource=source.slice(source.indexOf("    root.addEventListener('eduvize-profile-updated'"),source.indexOf('    root.EduvizeProfileBeforeSwitch='));
const id='a'.repeat(32),baseline={schemaVersion:1,data:{name:'TEST škola',address:'Pouze testovací prostředí'}};
const marker={schemaVersion:1,data:{...baseline.data,address:'Pouze testovací prostředí – kontrola obnovy'}};
const equalData=(actual,expected)=>assert.equal(JSON.stringify(actual),JSON.stringify(expected));

function harness(){
  let current=structuredClone(marker),profile={id,name:'TEST profil',revision:20,apps:{'school-identity':{revision:3,config:structuredClone(marker)}}};
  const requests=[],buttons=[],listeners={},inflight=[],applied=[];
  const node=text=>({textContent:text||'',dataset:{},value:'',children:[],classList:{add(){}},append(...children){this.children.push(...children);},prepend(...children){this.children.unshift(...children);},replaceChildren(...children){this.children=[...children];},setAttribute(){}});
  const controls={select:node(),reload:node(),status:node()};
  const context={
    profileId:id,profileTitle:profile.name,revision:3,tracked:id,loaded:true,manualLoad:false,ready:true,initialized:true,
    baseline:JSON.stringify(current),userChanged:false,needsReload:false,
    adapter:{app:'school-identity',isEditing:()=>true,read:()=>current,apply:async value=>{current=structuredClone(value);applied.push(current);}},
    root:{EduvizeAdminAuth:{ready:Promise.resolve(),status:()=>({connected:true,profileId:id})},
      addEventListener:(type,fn)=>{listeners[type]=fn;},dispatchEvent:event=>listeners[event.type]?.(event)},
    make:(_tag,text)=>node(text),button:text=>{const value=node(text);buttons.push(value);return value;},
    controls:()=>controls,options:(select,_items,selected)=>{select.value=selected;},watchAuth(){},
    prompt:()=> 'TEST přejmenovaný profil',confirm:()=>true,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    fingerprint:JSON.stringify,structuredClone,resetEditState(){},say(text){context.message=text;},dirty:()=>JSON.stringify(current)!==context.baseline,
    refreshPicker:async()=>{context.pickerRefreshes=(context.pickerRefreshes||0)+1;},
    work:(_text,fn)=>{const pending=fn();inflight.push(pending);return pending;},
    request:async(path='',options={})=>{
      requests.push({path,options});
      if(options.method==='PATCH'){profile.name=JSON.parse(options.body).name;profile.revision++;return structuredClone(profile);}
      if(options.method==='POST'){
        const body=JSON.parse(options.body);assert.equal(body.expectedRevision,profile.revision);assert.equal(body.revision,19);
        profile.revision++;profile.apps['school-identity']={revision:4,config:structuredClone(baseline)};return structuredClone(profile);
      }
      if(path.endsWith('/history'))return {items:[{revision:19,updatedAt:'2026-11-07T00:00:00Z'}]};
      return path?structuredClone(profile):{items:[{id,name:profile.name,revision:profile.revision}]};
    }
  };
  vm.createContext(context);vm.runInContext(readSource+managerSource+updatedSource+';this.readProfile=readProfile;this.manager=manager;',context);
  return {context,controls,requests,buttons,applied,inflight,setCurrent:value=>{current=value;},getCurrent:()=>current};
}

// The same manager action that writes the restored server version must update
// the mounted adapter without a navigation or a second save.
{
  const h=harness();await h.context.manager({dataset:{},classList:{add(){}},replaceChildren(){},append(){}});
  await h.buttons.find(b=>b.textContent==='Historie a obnova').onclick();
  await h.buttons.find(b=>b.textContent.startsWith('Obnovit verzi 19')).onclick();
  await Promise.all(h.inflight);
  equalData(h.getCurrent(),baseline);
  assert.equal(h.context.revision,4);
  assert.equal(h.context.needsReload,false);
  assert.equal(h.context.pickerRefreshes,1);
  assert.equal(h.requests.filter(r=>r.options.method==='POST').length,1);
  assert.equal(h.requests.at(-1).options.fresh,true);
}

// Canceling the existing unsaved-change guard must not perform a server restore.
{
  const h=harness();h.context.root.EduvizeProfileBeforeSwitch=async()=>false;
  await h.context.manager({dataset:{},classList:{add(){}},replaceChildren(){},append(){}});
  await h.buttons.find(b=>b.textContent==='Historie a obnova').onclick();
  await h.buttons.find(b=>b.textContent.startsWith('Obnovit verzi 19')).onclick();
  assert.equal(h.requests.filter(r=>r.options.method==='POST').length,0);
  equalData(h.getCurrent(),marker);
}

// Renaming refreshes the mounted title/picker while preserving an unsaved card.
{
  const h=harness();h.context.baseline=JSON.stringify(baseline);
  await h.context.manager({dataset:{},classList:{add(){}},replaceChildren(){},append(){}});
  await h.buttons.find(b=>b.textContent==='Přejmenovat profil').onclick();
  await Promise.all(h.inflight);
  assert.equal(h.context.profileTitle,'TEST přejmenovaný profil');
  assert.equal(h.context.pickerRefreshes,1);
  assert.equal(h.applied.length,0);
  equalData(h.getCurrent(),marker);
  assert.equal(h.context.baseline,JSON.stringify(baseline));
}

// An edit made after the explicit restore read starts must survive its response.
{
  const h=harness();let finish;
  h.context.request=()=>new Promise(resolve=>{finish=resolve;});
  const pending=h.context.readProfile(true,{fresh:true,replace:true});
  const newer={schemaVersion:1,data:{...baseline.data,address:'Nově rozepsaná adresa'}};h.setCurrent(newer);
  finish({name:'TEST profil',apps:{'school-identity':{revision:4,config:baseline}}});await pending;
  assert.equal(h.applied.length,0);equalData(h.getCurrent(),newer);
  assert.equal(h.context.needsReload,true);
  assert.match(h.context.message,/nově rozepsané změny/);
}

console.log('History restore updates the live card; cancellation, rename drafts and in-flight edits remain safe.');
