import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const managerSource=source.slice(source.indexOf('  async function manager('),source.indexOf('  async function picker('));
const currentId='a'.repeat(32),targetId='b'.repeat(32),archivedId='c'.repeat(32);
function fixture({check={},cancel=false,rejectArchive=false,archiveUnavailable=false}={}){
  const nodes=[],calls=[],events=[],confirmations=[];
  let selected=currentId;
  const profiles=[{id:currentId,name:'Výchozí',revision:1},{id:targetId,name:'Vedlejší budova',revision:7},{id:archivedId,name:'Archiv',revision:3,archived:true}];
  function node(tag,text=''){
    const n={tag,textContent:text,dataset:{},value:'',children:[],classList:{add(){}},append(...v){this.children.push(...v);},prepend(...v){this.children.unshift(...v);},replaceChildren(...v){this.children=[...v];if(tag==='select')this.value='';},setAttribute(k,v){this[k]=v;},add(v){this.children.push(v);}};nodes.push(n);return n;
  }
  const ui={select:node('select'),reload:node('button'),status:node('p')};
  const context={make:node,button:text=>node('button',text),controls:()=>ui,options:(select,_items,id)=>{select.value=id;},watchAuth(){},
    root:{EduvizeAdminAuth:{ready:Promise.resolve(),status:()=>({connected:true,profileId:selected}),selectProfile:async id=>{selected=id;}},dispatchEvent:e=>events.push(e)},
    Option:class{constructor(text,value){this.text=text;this.value=value;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    confirm:text=>{confirmations.push(text);return !cancel;},
    request:async(path='',options={})=>{
      calls.push({path,options});
      if(path==='?archived=1'&&archiveUnavailable)throw Error('Archivace není dostupná.');
      if(path===''||path==='?archived=1')return {items:profiles.filter(p=>!!p.archived===(path!=='')).map(p=>({...p}))};
      const id=path.split('/')[1],p=profiles.find(p=>p.id===id);
      if(path.endsWith('/archive-check'))return {profileId:id,revision:p.revision,canArchive:id!==currentId,complete:true,blockers:id===currentId?[{kind:'current',label:'Profil je právě používaný.',count:1}]:[],outputs:[],...check};
      if(path.endsWith('/archive')||path.endsWith('/unarchive')){
        const body=JSON.parse(options.body);assert.equal(body.expectedRevision,p.revision);
        if(rejectArchive)throw Error('Profil se mezitím změnil. Obnovte kontrolu vazeb.');
        p.archived=path.endsWith('/archive');p.revision++;return {...p};
      }
      throw Error('Unexpected request '+path);
    }};
  vm.createContext(context);vm.runInContext(managerSource+';this.manager=manager;',context);
  const find=text=>nodes.find(n=>n.textContent===text),target=()=>nodes.find(n=>n['aria-label']==='Profil k archivaci nebo obnově');
  async function start(){await context.manager(node('section'));const panel=nodes.find(n=>n.tag==='details');panel.open=true;await panel.ontoggle();}
  function choose(id){target().value=id;target().onchange();}
  return {start,choose,find,nodes,calls,events,confirmations,ui,profiles,selected:()=>selected,status:()=>nodes.find(n=>n['aria-live']==='polite').textContent};
}

// Original actions keep their order; archive controls live after the history.
{
  const f=fixture();await f.start();
  assert.deepEqual(f.nodes.filter(n=>n.tag==='button').slice(1,4).map(n=>n.textContent),['Vytvořit profil','Přejmenovat profil','Historie a obnova']);
  f.choose(targetId);await f.find('Archivovat profil').onclick();
  assert.equal(f.profiles.find(p=>p.id===targetId).archived,true);
  assert.equal(f.selected(),currentId);assert.equal(f.confirmations.length,1);
  const post=f.calls.find(c=>c.options.method==='POST');assert.equal(post.path,'/'+targetId+'/archive');assert.equal(JSON.parse(post.options.body).expectedRevision,7);
  assert.match(f.status(),/byl archivován/);
  await f.find('Obnovit profil').onclick();
  assert.equal(f.profiles.find(p=>p.id===targetId).archived,false);assert.equal(f.selected(),currentId);
  assert.match(f.status(),/byl obnoven/);
}

// A fresh check is mandatory even if a previous manual check succeeded.
{
  const f=fixture();await f.start();f.choose(targetId);await f.find('Zkontrolovat vazby').onclick();await f.find('Archivovat profil').onclick();
  assert.equal(f.calls.filter(c=>c.path.endsWith('/archive-check')).length,2);
}

for(const check of [
  {complete:false},
  {canArchive:false},
  {outputs:[{id:'output-1',label:'Výstup vstupní hala'}]},
  {blockers:[{kind:'legacy',label:'Používaný historický odkaz',count:1}]},
  {profileId:currentId},
  {revision:null},
  {blockers:null},
]){
  const f=fixture({check});await f.start();f.choose(targetId);await f.find('Archivovat profil').onclick();
  assert.equal(f.calls.filter(c=>c.options.method==='POST').length,0);assert.equal(f.confirmations.length,0);assert.equal(f.selected(),currentId);
}
{
  const f=fixture();await f.start();f.choose(currentId);await f.find('Archivovat profil').onclick();
  assert.equal(f.calls.filter(c=>c.options.method==='POST').length,0);assert.match(f.status(),/právě používaný/);
}
{
  const f=fixture({cancel:true});await f.start();f.choose(targetId);await f.find('Archivovat profil').onclick();
  assert.equal(f.calls.filter(c=>c.options.method==='POST').length,0);
}
{
  const f=fixture({rejectArchive:true});await f.start();f.choose(targetId);await f.find('Archivovat profil').onclick();
  assert.match(f.status(),/mezitím změnil/);assert.equal(f.profiles.find(p=>p.id===targetId).archived,undefined);assert.equal(f.events.length,0);
}
{
  const f=fixture({archiveUnavailable:true});await f.start();
  assert.equal(f.find('Archivovat profil').disabled,true);assert.equal(f.find('Obnovit profil').disabled,true);assert.match(f.status(),/není dostupná/);
}
{
  const f=fixture({check:{complete:false,blockers:[{kind:'legacy-config',label:'Nastavení aplikace weather může být používáno starším odkazem.',count:1}]}});await f.start();f.choose(targetId);await f.find('Archivovat profil').onclick();
  assert.match(f.status(),/není úplná/);assert.match(f.status(),/weather/);assert.equal(f.confirmations.length,0);
}
console.log('Archive UI preserves selection and action order; checks, cancellation, races and recovery pass.');
