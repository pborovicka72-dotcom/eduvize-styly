/* Recovered native Styles workflow from TEST 22f80a154e048a65948a.
 * Editor-only compatibility module: other apps keep configuration-profiles.js.
 * Explicit server Save, revision checks and no local draft persistence. */
(function(root){
  'use strict';
  if(!document.documentElement.classList.contains('edu-style-editor')||root.EduvizeProfiles)return;
  const ORIGIN=location.origin;
  const ACCOUNT=ORIGIN+'/eduvize-styly/ucet.html';
  const DOCS=ORIGIN;
  const API=DOCS+'/api/admin/configuration-profiles',SELECTION='eduvize-profile-selection-v1';
  const apps=Object.freeze([
    {id:'school-calendar',name:'Školní kalendář',url:ORIGIN+'/eduvize-skolni-kalendar/config.html'},
    {id:'school-identity',name:'Karta školy',url:ACCOUNT+'#school-card'},
    {id:'kiosk',name:'Kiosek',url:ORIGIN+'/eduvize-kiosek/config.html'},
    {id:'documents',name:'Dokumenty',url:DOCS+'/config'},
    {id:'weather',name:'Počasí',url:ORIGIN+'/pocasi/config'},
    {id:'holidays',name:'Svátky',url:ORIGIN+'/eduvize-svatky/config.html'},
    {id:'menu',name:'Jídelníček',url:ORIGIN+'/jidelnicek/config.html'},
    {id:'transport',name:'Jízdní řády',url:ORIGIN+'/eduvize-jizdni-rady/config.html'},
    {id:'wisdom',name:'Moudrost dne',url:ORIGIN+'/eduvize-moudrost-dne/config.html'},
    {id:'news',name:'Aktuality',url:ORIGIN+'/aktuality/config'},
    {id:'styles',name:'Styly',url:ORIGIN+'/'},
    {id:'day-progress',name:'Průběh dne',url:ORIGIN+'/prubeh-dne/config.html'},
    {id:'school-systems',name:'Školní informační systémy',url:ORIGIN+'/skolni-systemy/config.html'}
  ]);
  let updatesScript;
  let linkContractScript;
  function ensureLinkContract(){
    if(!linkContractScript)linkContractScript=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=ORIGIN+'/eduvize-styly/design-system/link-contract.js?v=92ec10e6057ac4c39eba';
      script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    return linkContractScript;
  }
  function mountUpdates(app,host){
    if(!updatesScript)updatesScript=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=ORIGIN+'/eduvize-styly/design-system/update-settings.js?v=92ec10e6057ac4c39eba';
      script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    updatesScript.then(()=>root.EduvizeUpdateSettings.mount(app,host)).catch(()=>{const message=document.createElement('p');message.className='edu-admin__hint';message.textContent='Modul aktualizací se nepodařilo načíst.';host.append(message);});
  }
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,secondary=true)=>{const e=make('button',text,'edu-admin__button'+(secondary?' edu-admin__button--secondary':''));e.type='button';return e;};
  const fingerprint=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function selection(){const own=root.EduvizeAdminAuth?.status();if(own?.schoolId&&own.profileId)return own.profileId;const query=new URL(location.href).searchParams.get('edu-profile');if(query&&/^[a-f0-9]{32}$/.test(query))return query;try{const id=localStorage.getItem(SELECTION);return /^[a-f0-9]{32}$/.test(id||'')?id:'';}catch{return '';}}
  function select(id){try{if(id)localStorage.setItem(SELECTION,id);else localStorage.removeItem(SELECTION);}catch{}const u=new URL(location.href);if(id)u.searchParams.set('edu-profile',id);else u.searchParams.delete('edu-profile');history.replaceState(null,'',u.href);root.dispatchEvent(new Event('eduvize-profile-selected'));}
  function manageUrl(id){const u=new URL(ACCOUNT);if(id)u.searchParams.set('edu-profile',id);u.hash='configurations';return u.href;}
  // Read-only cache partitioned by validated principal, never by expiry alone.
  const CACHE_KEY='eduvize-profile-reads-v2',CACHE_TTL=90000;
  let reads={identity:'',entries:{}},readEpoch=0,authObservation=0;
  const pendingReads=new Map();
  try{sessionStorage.removeItem('eduvize-profile-reads-v1');const value=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(value&&typeof value.identity==='string'&&value.entries&&typeof value.entries==='object')reads=value;}catch{}
  function readCache(identity,path){if(reads.identity!==identity){reads={identity,entries:{}};return;}const entry=reads.entries[path];if(entry&&Date.now()-entry.time>=0&&Date.now()-entry.time<CACHE_TTL)return structuredClone(entry.value);}
  function remember(identity,path,value){if(reads.identity!==identity)reads={identity,entries:{}};reads.entries[path]={time:Date.now(),value:structuredClone(value)};reads.entries=Object.fromEntries(Object.entries(reads.entries).sort((a,b)=>b[1].time-a[1].time).slice(0,9));try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(reads));}catch{}}
  function forgetReads(){readEpoch++;reads={identity:'',entries:{}};pendingReads.clear();try{sessionStorage.removeItem(CACHE_KEY);}catch{}}
  const authSignature=s=>JSON.stringify([s?.connected,s?.schoolId||'',s?.profileId||'',s?.scopes||[]]);
  async function readContext(auth,scope){
    const token=auth.getToken(scope),state=auth.status(),signature=authSignature(state);
    const valid=()=>!!token&&auth.getToken(scope)===token&&authSignature(auth.status())===signature;
    if(!valid())throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k nastavení školy do Eduvize.');
    // The digest partitions cached reads; it never grants permission.
    if(!root.crypto?.subtle||typeof TextEncoder==='undefined')return {identity:'',cacheable:false,valid};
    const origin=location.origin;let bytes;
    try{bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode('eduvize-profile-reads-v2\0'+origin+'\0'+token));}catch{if(!valid())throw Error('Přihlášení nebo vybraný profil se během načítání změnil.');return {identity:'',cacheable:false,valid};}
    if(!valid())throw Error('Přihlášení nebo vybraný profil se během načítání změnil.');
    const principal=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
    return {identity:JSON.stringify([origin,state.schoolId||'',state.profileId||'',scope,[...(state.scopes||[])].sort(),principal]),cacheable:true,valid};
  }
  async function checkReadIdentity(){
    const version=++authObservation,auth=root.EduvizeAdminAuth;if(!auth)return;await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope)){forgetReads();return;}
    try{const context=await readContext(auth,scope);if(version===authObservation&&context.valid()&&(!context.cacheable||reads.identity&&reads.identity!==context.identity))forgetReads();}catch{if(version===authObservation)forgetReads();}
  }
  root.addEventListener('eduvize-admin-auth-change',checkReadIdentity);
  root.addEventListener('eduvize-profile-selected',checkReadIdentity);
  root.addEventListener('eduvize-profile-updated',forgetReads);
  function watchAuth(callback){const signature=()=>{const s=root.EduvizeAdminAuth?.status();return JSON.stringify([s?.connected,s?.schoolId,s?.profileId,s?.expiresAt,s?.scopes]);};let previous=signature();root.addEventListener('eduvize-admin-auth-change',()=>{const next=signature();if(next===previous)return;previous=next;callback();});}
  const styleRequestOperationGuards=new WeakMap();
  function guardedStyleRequestOptions(options,headers,valid){
    const result={...options};
    Object.defineProperty(result,'headers',{enumerable:true,get(){if(!valid())throw Object.assign(Error('Přihlášení se před odesláním změnilo.'),{code:'STYLES_SESSION_CHANGED',settingsSaved:false});return headers;}});
    return result;
  }
  function immutableStyleAcknowledgement(value){const copy=structuredClone(value);const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};return freeze(copy);}
  async function request(path='',options={}){
    const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Společné přihlášení se nepodařilo načíst.');
    const {fresh=false,...fetchOptions}=options,method=(fetchOptions.method||'GET').toUpperCase();
    const generation=authObservation,signature=authSignature(auth.status()),scopes=['configurations','documents','styles'],tokens=scopes.map(scope=>auth.getToken(scope)||'');
    const operationGuard=styleRequestOperationGuards.get(options);
    const initialValid=()=>root.EduvizeAdminAuth===auth&&authObservation===generation&&authSignature(auth.status())===signature&&scopes.every((scope,index)=>(auth.getToken(scope)||'')===tokens[index])&&(!operationGuard||operationGuard());
    await auth.ready;if(method!=='GET'&&!initialValid())throw Object.assign(Error('Přihlášení se před odesláním změnilo.'),{code:'STYLES_SESSION_CHANGED',settingsSaved:false});
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope)){forgetReads();throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k nastavení školy do Eduvize.');}
    const context=await readContext(auth,scope),cacheable=context.cacheable&&method==='GET'&&(path===''||/^\/[a-f0-9]{32}$/.test(path));
    if(method!=='GET')forgetReads();
    const epoch=readEpoch,key=context.identity+'\0'+path;let acknowledged=null;
    const valid=()=>context.valid()&&(method==='GET'||initialValid());
    const stale=()=>Object.assign(Error('Přihlášení, profil nebo uložené nastavení se během načítání změnilo. Načtěte je znovu.'),{code:'STYLES_SESSION_CHANGED',settingsSaved:!!acknowledged,...(acknowledged?{acknowledgedResponse:acknowledged}:{})});
    const finalRead=value=>{if(!valid()||method==='GET'&&epoch!==readEpoch)throw stale();return structuredClone(value);};
    if(cacheable&&!fresh){const value=readCache(context.identity,path);if(value!==undefined)return finalRead(value);}
    if(cacheable&&pendingReads.has(key))return finalRead(await pendingReads.get(key));
    const operation=(async()=>{
      const response=await auth.fetch(API+path,guardedStyleRequestOptions(fetchOptions,{...(fetchOptions.body?{'Content-Type':'application/json'}:{}),...fetchOptions.headers},valid),scope);
      const data=await response.json().catch(()=>({}));
      let expectedRevision;try{expectedRevision=JSON.parse(fetchOptions.body||'null')?.expectedRevision;}catch{}
      if(response.ok&&method==='PUT'&&Number.isSafeInteger(expectedRevision)&&expectedRevision>=0&&Number.isSafeInteger(data.revision)&&data.revision>expectedRevision)acknowledged=immutableStyleAcknowledgement(data);
      if(!valid()||method==='GET'&&epoch!==readEpoch)throw stale();
      if(!response.ok){if(response.status===401||response.status===403)forgetReads();const e=Error(typeof data.detail==='string'?data.detail:'Úložiště Eduvize není dostupné ('+response.status+').');e.status=response.status;throw e;}
      if(cacheable)remember(context.identity,path,data);else if(method!=='GET')forgetReads();return data;
    })();
    if(cacheable)pendingReads.set(key,operation);
    try{return finalRead(await operation);}finally{if(pendingReads.get(key)===operation)pendingReads.delete(key);}
  }

  async function profileReadiness(){
    const auth=root.EduvizeAdminAuth;if(!auth)return null;await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope)){const state=auth.status(),signature=authSignature(state);if(!state.connected&&state.expiresAt)return null;return {id:state.profileId||'',title:'',settingsWarm:false,valid:()=>!auth.getToken('configurations')&&!auth.getToken('documents')&&authSignature(auth.status())===signature};}
    const epoch=readEpoch,context=await readContext(auth,scope);
    const valid=()=>context.valid()&&epoch===readEpoch;
    if(!valid())return null;
    const id=auth.status().profileId||'',list=context.cacheable?readCache(context.identity,''):null;
    const item=list?.items?.find(p=>p.id===id),profile=context.cacheable&&id?readCache(context.identity,'/'+id):null;
    return {id,title:item?.name||'',settingsWarm:!!item&&profile?.id===id,valid};
  }
  function controls(host){
    const row=make('div',null,'edu-profile-panel__row'),label=make('label','Profil školy / obrazovky'),select=make('select');select.setAttribute('aria-label','Profil školy nebo obrazovky');label.append(select);
    const actions=make('div',null,'edu-admin__actions'),reload=button('Obnovit seznam');row.append(label,actions);actions.append(reload);
    const status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(row,status);return {select,actions,reload,status};
  }
  function options(select,items,id){select.replaceChildren(new Option('Vyberte profil…',''));for(const p of items)select.add(new Option(p.name,p.id));select.value=items.some(p=>p.id===id)?id:'';}
  async function waitAdapter(adapter){if(adapter.ready)await adapter.ready;for(let i=0;i<100;i++){if(adapter.read())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Nastavení aplikace se dosud nepodařilo načíst.');}
  function removeOwnedLocalDrafts(adapter){
    // This compatibility module owns only the Styles editor's obsolete draft keys.
    if(adapter.app!=='styles')return;
    try{localStorage.removeItem('eduvize-local-configuration-v1:styles');sessionStorage.removeItem('eduvize-profile-save-draft-v1:styles:'+location.pathname);}catch{}
    const url=new URL(location.href);if(url.searchParams.has('edu-resume-save')){url.searchParams.delete('edu-resume-save');history.replaceState(null,'',url.href);}
  }
  function askNewsDeparture(){return root.EduvizeAdminNavigation?.departureChoice?.()||Promise.resolve('cancel');}
  const statusSinks=new Map();
  function createStatus({app,panel,profileNode,settingsNode,resultNode}){
    if(statusSinks.has(app))throw Error('Stavová oblast aplikace je již připojená.');
    const profile=profileNode||make('p',null,'edu-profile-current__name'),settings=settingsNode||make('p'),placeholder=make('p');let result=resultNode||placeholder;
    panel.classList.add('edu-admin-status-region');profile.classList.add('edu-profile-current__name');
    function decorate(node){node.classList.add('edu-admin__status');node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');}
    decorate(settings);decorate(result);settings.dataset.eduSettingsStatus='';result.dataset.eduActionResult='';
    panel.prepend(profile,settings,result);result.hidden=!result.textContent;
    document.body.classList.add('edu-admin-status-context');
    if(!document.querySelector('link[data-edu-admin-status]')){const css=document.createElement('link');css.rel='stylesheet';css.dataset.eduAdminStatus='';css.href=ORIGIN+'/eduvize-styly/design-system/admin-status.css?v=20261116-admin-recovery-1';document.head.append(css);}
    const sink=Object.freeze({
      setProfile(name){profile.hidden=false;profile.textContent='Profil: '+(name||'ověřuji výběr…');},
      settings(text,state=''){if(settings.textContent!==text)settings.textContent=text;if(settings.dataset.state!==state)settings.dataset.state=state;settings.hidden=false;},
      result(text,state='success'){result.textContent=text;result.dataset.state=state;result.hidden=!text;},
      edit(){if(result.dataset.state==='success'){result.textContent='';result.dataset.state='';result.hidden=true;}},
      beginAction(){result.textContent='';result.dataset.state='';result.hidden=true;},
      useResult(node){if(!node||node===result)return;if(result!==placeholder)throw Error('Výsledek akce již používá jiný uzel.');placeholder.remove();result=node;decorate(result);result.dataset.eduActionResult='';settings.after(result);result.hidden=!result.textContent;}
    });
    statusSinks.set(app,sink);return sink;
  }
  async function mount(adapter){
    if(adapter?.app!=='styles')return;
    if(adapter?.app==='school-identity'){await root.EduvizeAdminAuth?.ready;if(!root.EduvizeAdminAuth?.status().schoolId)return;}
    if(!adapter||document.querySelector('[data-edu-profile-panel]'))return;
    if(root.EduvizeOutputModes&&!adapter.outputInteractionWrapped){const read=adapter.read.bind(adapter),apply=adapter.apply.bind(adapter);adapter.read=()=>{const value=read();return value?{...value,outputInteraction:root.EduvizeOutputModes.selection(),outputKioskLayout:root.EduvizeOutputModes.layoutSelection?.()}:value;};adapter.apply=async value=>{if(value.outputKioskLayout)root.EduvizeOutputModes.setKioskLayout?.(value.outputKioskLayout,{notify:false});if(value.outputInteraction)root.EduvizeOutputModes.setInteraction(value.outputInteraction,{notify:false});await apply(value);if(value.outputKioskLayout)root.EduvizeOutputModes.setKioskLayout?.(value.outputKioskLayout);if(value.outputInteraction)root.EduvizeOutputModes.setInteraction(value.outputInteraction);};adapter.outputInteractionWrapped=true;}
    const main=document.querySelector('main.edu-admin-page,main .edu-admin-page,.edu-admin-page');if(!main)return;
    const ids={'school-calendar':'save','school-identity':'schoolSaveLocal','day-progress':'save',menu:'saveLocal',kiosk:'save',documents:'save-settings',weather:'weather-save-settings',holidays:'saveSettings',transport:'saveSettings',news:'saveLocal',wisdom:'saveLocal',styles:'saveLocal','school-systems':'save'};
    const opens={'school-calendar':'#open','day-progress':'#open',menu:'#open',kiosk:'#openKiosk',documents:'#open',weather:'button[form="location-settings"][type="submit"]',holidays:'#save',transport:'button[form="form"][type="submit"]',news:'#save',wisdom:'#openOutput','school-systems':'#open'};
    const copies={'school-calendar':'copy','day-progress':'copy',menu:'copy',kiosk:'shareTouch',documents:'copy',weather:'location-settings-cancel',holidays:'openOutput',transport:'copy',news:'copyUrl',wisdom:'copyOutput','school-systems':'copy'};
    const localKey='eduvize-local-configuration-v1:'+adapter.app;
    let local=document.getElementById(ids[adapter.app]);
    const copy=document.getElementById(copies[adapter.app]),open=document.querySelector(opens[adapter.app]||':not(*)');
    let row=(local||copy)?.closest('.edu-output-actions,.toolbar,.theme-action-buttons,.sis-admin-actions')||(local||copy)?.parentElement;
    if(!row){row=make('div',null,'edu-output-actions');const server=document.getElementById('save');if(adapter.app==='styles'&&server)server.closest('.theme-action-panel').before(row);else main.append(row);}
    if(!local){
      local=button('Uložit v prohlížeči');local.id=ids[adapter.app];
      local.onclick=()=>{};
    }
    if(adapter.app==='kiosk'){const primary=make('div',null,'edu-output-actions');row.before(primary);row=primary;}
    local.textContent='Uložit v prohlížeči';
    const save=button(['kiosk','school-systems'].includes(adapter.app)?'Uložit nastavení':'Uložit do Eduvize',false);save.dataset.eduProfileSave='';
    const generate=document.getElementById('generateOutput');
    for(const control of [save,local,generate,copy,open].filter(Boolean)){const saving=control===save||control===local;control.className='edu-admin__button'+(saving?'':' edu-admin__button--secondary');control.dataset.eduOutputAction=saving?'save':'secondary';if(saving)control.dataset.eduSave='';}
    local.hidden=true;local.style.setProperty('display','none','important');local.setAttribute('aria-hidden','true');
    // Move existing controls so their original handlers and submit behavior survive.
    row.prepend(...[...(adapter.app==='school-identity'?[document.getElementById('school-edit')]:[]),save,local,generate,copy,open].filter(Boolean));
    if(adapter.app==='styles'){const publish=document.getElementById('save');if(publish){publish.textContent='Použít změny ve sdíleném stylu';publish.title='Aktualizuje centrální styl Eduvize. Konfiguraci svého profilu uložíte tlačítkem Uložit do Eduvize.';}}
    if(open){open.textContent=['kiosk','school-systems'].includes(adapter.app)?'Otevřít náhled':'Otevřít výstup';open.dataset.eduOpenOutput='';window.EduvizeAdminNavigation?.normalize(open);}
    if(copy)copy.textContent='Kopírovat odkaz';
    const panel=make('div',null,'edu-profile-current');panel.dataset.eduProfilePanel=adapter.app;panel.id='edu-profile-save';
    const profileText=make('p','Profil: ověřuji výběr…','edu-profile-current__name'),status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const manage=make('a','Účet a připojení','edu-admin__button edu-admin__button--secondary');manage.href=manageUrl('');const actions=make('div',null,'edu-admin__actions'),load=button('Načíst uložené nastavení'),undo=button('Vrátit před načtením');undo.hidden=true;load.hidden=true;actions.append(load,undo);panel.append(profileText,status,manage,actions);if(row)row.after(panel);else save.after(panel);
    if(adapter.app!=='school-identity'&&adapter.app!=='styles')mountUpdates(adapter.app,panel);
    if(adapter.app!=='school-identity')void ensureLinkContract().catch(()=>{});
    const newsStatus=true;let newsSaving=false,approvedDeparture=null,departureEpoch=0;
    root.addEventListener('eduvize-admin-auth-change',()=>{departureEpoch++;approvedDeparture=null;});
    root.addEventListener('eduvize-profile-selected',()=>{departureEpoch++;approvedDeparture=null;});
    let stylesDeparture=null;const departureEvents=new WeakMap();
    function registerDeparture(hooks){
      if(!['styles','documents'].includes(adapter.app)||stylesDeparture||!['dirty','read','save'].every(key=>typeof hooks?.[key]==='function'))throw Error('Ochranu změn stylu nelze připojit.');
      stylesDeparture=Object.freeze({dirty:hooks.dirty,read:hooks.read,save:hooks.save,...(typeof hooks.status==='function'?{status:hooks.status}:{})});
    }
    let styleDecisionPending=false;
    function captureStyleDepartureSession(){
      const authority=auth(),signature=authSignature(authority?.status()),generation=authObservation,epoch=departureEpoch;
      const scopes=['configurations','documents','styles'],tokens=scopes.map(scope=>authority?.getToken(scope)||'');
      return {valid:()=>!!authority&&tokens.some(Boolean)&&auth()===authority&&authObservation===generation&&departureEpoch===epoch&&authSignature(authority.status())===signature&&scopes.every((scope,index)=>(authority.getToken(scope)||'')===tokens[index])};
    }
    function consumeDepartureApproval(event,channel='native'){
      if(!stylesDeparture||!event||event.type!=='beforeunload')return false;
      let entry=departureEvents.get(event);
      if(!entry){const approval=approvedDeparture;approvedDeparture=null;if(!approval)return false;entry={approval,used:new Set()};departureEvents.set(event,entry);}
      if(entry.used.has(channel))return false;entry.used.add(channel);
      const a=entry.approval;
      try{return a.session?.valid()===true&&revision===a.revision&&departureEpoch===a.epoch&&Date.now()<=a.expiresAt&&profileId===a.profileId&&activeId()===a.profileId&&(auth()?.status().schoolId||'')===a.schoolId&&fingerprint(adapter.read())===a.config&&fingerprint(stylesDeparture.read())===a.nativeConfig;}catch{return false;}
    }
    const changeStatus=make('p'); // Detached legacy alias; the settings sink is the only visible state.
    const resultSelectors={news:'#result',documents:'#document-output-status','school-calendar':'#status',weather:'#weather-copy-status',styles:'#save-feedback'};
    const resultNode=resultSelectors[adapter.app]?document.querySelector(resultSelectors[adapter.app]):null;
    const adminStatus=createStatus({app:adapter.app,panel,profileNode:profileText,settingsNode:status,resultNode});adapter.adminStatus=adminStatus;
    adminStatus.settings('Načítání nastavení…','loading');
    root.dispatchEvent(new CustomEvent('eduvize-admin-status-ready',{detail:{app:adapter.app}}));
    let editBaseline='',userChanged=false;
    function resetEditState(message='Bez neuložených změn.'){
      userChanged=false;editBaseline=fingerprint(adapter.read());
      if(newsStatus){if(!busy&&identityVerified&&loaded)showEditState();return;}
      changeStatus.hidden=false;changeStatus.textContent=message;changeStatus.dataset.state='saved';
    }
    function showEditState(){
      if(newsStatus){
        if(busy||!identityVerified||(!loaded&&!initialized)||errorText)return;
        say(settingsDirty()?'Máte neuložené změny.':'Všechny změny jsou uložené.',settingsDirty()?'dirty':'saved');return;
      }
      if(!editBaseline)return;changeStatus.hidden=false;const changed=fingerprint(adapter.read())!==editBaseline;changeStatus.textContent=userChanged&&changed?'Neuložené změny. Před odchodem je uložte.':'Bez neuložených změn.';changeStatus.dataset.state=userChanged&&changed?'dirty':'saved';
    }
    const ui={status};
    removeOwnedLocalDrafts(adapter);
    let verifiedIdentity=null,identityVerified=false,visualBusy=false,busy=false,profileId='',profileTitle='',revision=0,baseline='',backup=null,errorText='',loaded=false,ready=false,initialized=false,tracked='',needsLogin=false,restored=false,needsReload=false,manualLoad=false,timer,kioskEdited=false,browserBaseline='';
    const auth=()=>root.EduvizeAdminAuth;
    const canSave=()=>!!(auth()?.getToken('configurations')||auth()?.getToken('documents'));
    const activeId=()=>auth()?.status().profileId||'';
    function profileName(){return profileTitle||'vybraný profil';}
    function settingsDirty(){try{return dirty()||!!stylesDeparture?.dirty();}catch{return true;}}
    function say(text,state=''){
      let native;try{native=stylesDeparture?.status?.();}catch{native={state:'error',message:'Stav ukládání souborů se nepodařilo ověřit.'};}
      if(state!=='error'&&native?.state==='error'){text=native.message||'Uložení souborů se nepodařilo.';state='error';}
      else if(state!=='error'&&native?.state==='saving'){text='Ukládání…';state='saving';}
      if(newsStatus){
        if(state==='dirty'&&!needsReload)text='Máte neuložené změny.';
        else if(state==='saved'){
          if(!identityVerified)return;
          if(settingsDirty()){text='Máte neuložené změny.';state='dirty';}
          else if(!loaded){text='Tento profil zatím nemá uložené nastavení.';state='empty';}
          else text='Všechny změny jsou uložené.';
        }else if(state==='error'&&newsSaving&&!/^Nastavení bylo uloženo do Eduvize\./.test(text))text='Uložení se nepodařilo. Změny zůstávají neuložené.'+(text?' '+text:'');
        else if(newsSaving&&state!=='error'){text='Ukládání…';state='saving';}
        else if(!state&&/^(Načítám|Načítání)/.test(text)){text='Načítání nastavení…';state='loading';}
        adminStatus.settings(text,state);return;
      }
      status.textContent=text;status.dataset.state=state;changeStatus.hidden=state==='saved'&&/^Uloženo do Eduvize/.test(text);
    }
    let segmentEdited=false,profilePicker=null;
    function dirty(){
      if(!baseline||!userChanged)return false;
      const current=adapter.read(),saved=JSON.parse(baseline);
      if(adapter.app==='documents'&&!segmentEdited){
        const {segment:currentSegment,...currentValues}=current;
        const {segment:savedSegment,...savedValues}=saved;
        return fingerprint(currentValues)!==fingerprint(savedValues);
      }
      return fingerprint(current)!==baseline;
    }
    if(adapter.app==='documents'){
      document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('.ev-segments button'))segmentEdited=true;},true);
      document.addEventListener('change',event=>{if(event.isTrusted&&event.target.closest('.ev-segments'))segmentEdited=true;},true);
    }
    // Choosing a preview segment is persisted, but is not a reason to block navigation.
    function departureFingerprint(value){if(!value||typeof value!=='object')return fingerprint(value);const {segment,...content}=value;if(adapter.app==='kiosk'&&content.data){const {newsSources,layoutOrientation,layoutStyle,layoutBlock,previewPage,previewView,previewRevision,previewReset,...data}=content.data;content.data=data;}return fingerprint(content);}
    function state(){save.disabled=visualBusy||!ready||needsReload;load.disabled=visualBusy||!ready||!canSave();load.hidden=!needsReload;undo.disabled=visualBusy;actions.hidden=load.hidden&&undo.hidden;manage.hidden=true;profileText.hidden=false;profileText.textContent='Profil: '+(profileTitle||(identityVerified?(profileId?'vybraný profil':'není vybrán'):'ověřuji výběr…'));if(profilePicker){profilePicker.select.disabled=visualBusy||!ready;profilePicker.select.value=profileId;}}
    async function work(text,fn,{warm=false,propagate=false}={}){
      if(busy)return;clearTimeout(timer);busy=true;
      newsSaving=newsStatus&&text==='Připravuji uložení…';if(newsSaving)adminStatus.beginAction();const beforeSaveRevision=revision;
      let loadingTimer;const loading=()=>{visualBusy=true;state();say(text);};
      if(warm)loadingTimer=setTimeout(loading,120);else loading();
      try{errorText='';await fn();}
      catch(e){errorText=e.message;needsLogin=[401,403].includes(e.status);if(e.status===409)needsReload=true;if(/^Nastavení bylo uloženo do Eduvize\./.test(e.message)){say(settingsDirty()?'Máte neuložené změny.':'Všechny změny jsou uložené.',settingsDirty()?'dirty':'saved');adminStatus.result(e.message,'error');}else say(e.message,'error');if(propagate)throw e;}
      finally{
        clearTimeout(loadingTimer);busy=false;visualBusy=false;state();
        if(newsSaving&&!errorText){
          if(revision>beforeSaveRevision&&loaded){say(settingsDirty()?'Máte neuložené změny.':'Všechny změny jsou uložené.',settingsDirty()?'dirty':'saved');adminStatus.result('Nastavení uloženo.','success');}
          else say('Uložení nebylo potvrzeno. Změny zůstávají neuložené.','error');
        }
        newsSaving=false;
      }
    }
    function login(){
      const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Přihlášení se nepodařilo načíst. Obnovte stránku.');
      // No local draft or baseline reset: the existing unsaved-change guard remains active.
      if(baseline){userChanged=fingerprint(adapter.read())!==baseline;editBaseline=baseline;showEditState();}
      const url=new URL(location.href);url.searchParams.delete('edu-resume-save');url.searchParams.delete('edu-require-drive');url.hash='edu-profile-save';
      location.assign(auth.loginUrl(url.href));
    }
    async function readProfile(apply=false,{fresh=false,replace=false}={}){
      const beforeRestore=replace&&apply?fingerprint(adapter.read()):'';
      const p=await request('/'+profileId,{fresh:manualLoad||fresh}),entry=p.apps[adapter.app],incoming=entry?.revision||0;identityVerified=true;profileTitle=p.name;
      // An explicit history restore replaces the confirmed draft, but not edits
      // made while its fresh read was in flight.
      const preserveEditing=apply&&(replace?fingerprint(adapter.read())!==beforeRestore:!manualLoad&&(userChanged||dirty()||adapter.app==='school-identity'&&adapter.isEditing?.()));
      if(!apply&&tracked===profileId){if(incoming!==revision){needsReload=true;say('Na Eduvize je novější nastavení. Před uložením je načtěte.','error');return;}say(settingsDirty()?'Změny nejsou uložené do Eduvize.':loaded?'Uloženo do Eduvize.':'Dosud neuloženo do Eduvize.',settingsDirty()?'dirty':'saved');return;}
      if(entry&&!entry.config.empty&&apply&&!preserveEditing){const before=structuredClone(adapter.read());try{await adapter.apply(structuredClone(entry.config));}catch(error){try{await adapter.apply(before);}catch{}throw error;}if(manualLoad){backup=before;undo.hidden=false;}}
      if(!entry&&apply&&!preserveEditing&&adapter.app==='school-identity')await adapter.apply({schemaVersion:1,data:{}});
      if(apply&&!preserveEditing){userChanged=false;resetEditState();}
      revision=incoming;tracked=profileId;needsReload=false;loaded=!!entry&&!entry.config.empty;baseline=fingerprint(preserveEditing?(loaded?entry.config:{schemaVersion:1,data:{}}):(apply||!loaded?adapter.read():entry.config));
      if(replace&&preserveEditing){needsReload=true;say('Verze byla obnovena v Eduvizi. Před načtením zkontrolujte nově rozepsané změny.','dirty');return;}
      say(loaded?(apply&&!preserveEditing?(adapter.loadedMessage||'Nastavení načteno z Eduvize.'):dirty()?'Změny nejsou uložené do Eduvize.':'Uloženo do Eduvize.'):'Dosud neuloženo do Eduvize.',dirty()?'dirty':'saved');
    }
    async function list(initial=false){
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId){profileId='';return;}
      if(!canSave()){const state=auth()?.status();say(!state?.connected&&state?.expiresAt?(state.message||'Ověřuji přihlášení…'):'Pro uložení do Eduvize se přihlaste. Rozpracované změny zůstanou zachované.');return;}
      const active=await schoolConfiguration();
      if(!active){profileId='';profileTitle='';say('Přihlaste se k účtu školy.');return;}
      if(tracked&&active!==profileId&&!restored){if(dirty()){needsReload=true;say('Změnil se vybraný profil. Uložte rozpracované změny před načtením jiného profilu.','error');return;}profileId=active;revision=0;tracked='';select(profileId);manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}backup=null;undo.hidden=true;return;}
      if(active!==profileId){profileId=active;revision=0;tracked='';}
      needsLogin=false;select(profileId);await readProfile(initial);
      if(restored){if(!needsReload)say('Rozpracované změny obnoveny. Uloží se do nastavení školy.','dirty');restored=false;requestAnimationFrame(()=>panel.scrollIntoView({block:'nearest'}));}
    }
    load.onclick=()=>work('Načítám uložené nastavení…',async()=>{if(dirty()&&!confirm('Nahradit rozpracované změny uloženým nastavením? Původní místní stav půjde vrátit.'))return;await auth().refresh();if(!activeId())throw Error('Nejprve připojte účet školy na stránce Účet a konfigurace.');profileId=activeId();tracked='';manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}});
    const saveProfileWork=(stylesCommit=null)=>{const session=adapter.app==='styles'?captureStyleDepartureSession():null,expectedStyleRevision=revision;const validStyleSave=()=>!session||session.valid()&&revision===expectedStyleRevision;return work('Připravuji uložení…',async()=>{
      if(!validStyleSave())throw Error('Přihlášení nebo revize stylu se změnily.');
      if(stylesCommit&&(adapter.app!=='styles'||stylesCommit.expectedProfileId!==profileId||stylesCommit.expectedProfileId!==activeId()||stylesCommit.expectedSchoolId!==(auth()?.status().schoolId||'')))throw Error('Účet nebo profil uloženého stylu se změnily.');
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId)return;
      adapter.validate?.();
      await auth()?.ready;if(!canSave()||needsLogin){login();return;}
      await auth().refresh();if(!validStyleSave())throw Error('Přihlášení nebo revize stylu se změnily.');if(!canSave()){login();return;}
      if(!activeId())await schoolConfiguration();
      if(activeId()!==profileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
      const saveProfileId=profileId,saveAppId=adapter.app,saveSchoolId=auth().status().schoolId||'';
      const commit=async()=>{
        // The output controller acquires its canonical-slot lock before calling us.
        if(!canSave()||(auth().status().schoolId||'')!==saveSchoolId)throw Object.assign(Error('Přihlášení se během přípravy uložení změnilo. Přihlaste se znovu.'),{status:403});
        if(activeId()!==saveProfileId||profileId!==saveProfileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
        if(stylesCommit&&(stylesCommit.expectedProfileId!==saveProfileId||stylesCommit.expectedSchoolId!==saveSchoolId))throw Error('Účet nebo profil uloženého stylu se změnily.');
        adapter.validate?.();
        const snapshot=structuredClone(stylesCommit?stylesCommit.config:adapter.read());
        say('Ukládám do Eduvize…');
        if(!validStyleSave())throw Error('Přihlášení nebo revize stylu se změnily.');
        const expectedRevision=revision,requestOptions={method:'PUT',body:JSON.stringify({expectedRevision,config:snapshot})};
        if(session)styleRequestOperationGuards.set(requestOptions,validStyleSave);
        let result;try{result=await request('/'+saveProfileId+'/apps/'+saveAppId,requestOptions);}catch(error){if(error.settingsSaved===true&&error.acknowledgedResponse){error.committed=immutableStyleAcknowledgement({settingsSaved:true,profileId:saveProfileId,appId:saveAppId,revision:error.acknowledgedResponse.revision,config:snapshot,outputUpdated:false});}throw error;}
        if(!Number.isSafeInteger(result.revision)||result.revision<=expectedRevision)throw Error('Server nepotvrdil novou revizi profilu.');
        if(!validStyleSave())throw Object.assign(Error('Profil byl uložen, ale přihlášení se změnilo.'),{settingsSaved:true,committed:immutableStyleAcknowledgement({settingsSaved:true,profileId:saveProfileId,appId:saveAppId,revision:result.revision,config:snapshot,outputUpdated:false})});
        revision=result.revision;baseline=fingerprint(snapshot);loaded=true;if(stylesCommit&&fingerprint(adapter.read())!==baseline)userChanged=true;
        return {profileId:saveProfileId,appId:saveAppId,revision:result.revision,config:snapshot};
      };
      const actions=adapter.outputActions;
      if(actions?.workflow==='saved-copy-preview'&&typeof actions.withSavedCommit==='function'){
        try{await actions.withSavedCommit(commit);}
        catch(error){
          if(error?.code==='OUTPUT_UPDATE_FAILED'&&error.settingsSaved===true)throw Error('Nastavení bylo uloženo do Eduvize. Aktualizace veřejného výstupu se nezdařila; výstup nemusí odpovídat uloženému nastavení.');
          throw error;
        }
      }else await commit();
      say(settingsDirty()?'Během ukládání vznikly další neuložené změny.':'Uloženo do Eduvize.',settingsDirty()?'dirty':'saved');
    },{propagate:adapter.app==='styles'});};
    save.onclick=()=>saveProfileWork();
    // Styles combines its own theme write with this existing profile-save path.
    if(['styles','documents'].includes(adapter.app)){
      adapter.saveProfile=async(options={})=>{
      if(busy)throw Error('Probíhá jiná operace s profilem. Počkejte na její dokončení.');
      if(!ready||!initialized||!identityVerified||needsReload)throw Error('Nejprve načtěte aktuální nastavení profilu.');
      const before={revision,profileId,schoolId:auth()?.status().schoolId||''};
      if(!before.profileId||activeId()!==before.profileId)throw Error('Nejprve vyberte a načtěte profil.');
      let commit=null;
      if(options.config!==undefined){
        if(options.expectedProfileId!==before.profileId||options.expectedSchoolId!==before.schoolId)throw Error('Účet nebo profil neodpovídá uloženému stylu.');
        const config=structuredClone(options.config);
        if(config?.schemaVersion!==1||!config.data?.theme||typeof config.data.selected!=='string'||typeof config.data.name!=='string')throw Error('Chybí platný snímek uloženého stylu.');
        commit={config,expectedProfileId:before.profileId,expectedSchoolId:before.schoolId};
      }
      try{
      await saveProfileWork(commit);
      if(errorText)throw Error(errorText);
      if(needsLogin||needsReload||!loaded||!Number.isSafeInteger(revision)||revision<=before.revision)throw Error('Uložení konfigurace profilu nebylo potvrzeno. Změny stylu mohou být uložené samostatně.');
      if(profileId!==before.profileId||activeId()!==before.profileId||(auth()?.status().schoolId||'')!==before.schoolId)throw Error('Během ukládání se změnil účet nebo profil. Konfiguraci ověřte v příslušném profilu.');
      return {settingsSaved:true,profileId,appId:adapter.app,revision,config:JSON.parse(baseline),pendingEdits:fingerprint(adapter.read())!==baseline};
      }catch(error){
        if(profileId===before.profileId&&activeId()===before.profileId&&(auth()?.status().schoolId||'')===before.schoolId){
          try{editBaseline=baseline;userChanged=fingerprint(adapter.read())!==baseline;showEditState();}catch{}
        }
        throw error;
      }
    };
      if(adapter.app==='styles'){
      adapter.mountStyleActions?.({saveProfile:adapter.saveProfile,local,profileSaveButton:save,profilePanel:panel,registerDeparture,consumeDepartureApproval:event=>consumeDepartureApproval(event),getState:()=>({dirty:dirty(),busy,errorText,needsLogin,needsReload})});
      }else adapter.mountDocumentActions?.({saveProfile:adapter.saveProfile,registerDeparture,consumeDepartureApproval:event=>consumeDepartureApproval(event)});
    }
    manage.onclick=event=>{event.preventDefault();work('Otevírám výběr profilu…',async()=>login());};
    undo.onclick=()=>work('Vracím místní nastavení…',async()=>{if(!backup)return;const previous=backup;backup=structuredClone(adapter.read());await adapter.apply(previous);userChanged=true;showEditState();say('Místní nastavení obnoveno.','dirty');});
    function changed(event){
      if(adapter.app==='documents'&&event.type==='eduvize-profile-change'&&event.detail?.source==='material-autosave'){
        const d=event.detail,s=auth()?.status();
        if(d.app!=='documents'||!identityVerified||!s?.schoolId||!profileId||d.schoolId!==s.schoolId||d.profileId!==profileId||activeId()!==profileId||typeof d.materialId!=='string'||!d.materialId)return;
        // Status-only notification: native getter is authoritative; never a user edit or action retry.
        if(!busy&&!errorText)showEditState();
        return;
      }
      if(!panel.contains(event.target)&&event.target!==save&&event.target!==local){
        const field=['input','change'].includes(event.type)&&event.target.matches?.('input,select,textarea,[contenteditable]')&&!event.target.readOnly&&!event.target.disabled;
        const action=event.type==='click'&&event.target.closest?.('button')&&!event.target.closest('.edu-output-actions,.toolbar,.theme-action-buttons,.sis-admin-actions,.day-actions');
        if((event.isTrusted&&(field||action))||event.type==='eduvize-profile-change'){userChanged=true;adminStatus.edit();}
        if(!userChanged&&editBaseline&&!event.isTrusted&&event.type!=='click')editBaseline=fingerprint(adapter.read());
        showEditState();
      }
      if(panel.contains(event.target)||event.target===save||busy||needsReload)return;clearTimeout(timer);timer=setTimeout(()=>{if(!baseline)return;if(dirty()){if(!errorText)say('Změny nejsou uložené do Eduvize.','dirty');}else if(!errorText)say(loaded?'Uloženo do Eduvize.':'Dosud neuloženo do Eduvize.',loaded?'saved':'');},200);}
    for(const event of ['input','change','click','eduvize-profile-change'])document.addEventListener(event,changed);
    document.addEventListener('eduvize-configuration-saved',()=>{if(!busy)resetEditState('Uloženo v prohlížeči.');});
    // Automatic preview/profile refreshes must never create an exit warning.
    if(['kiosk','transport'].includes(adapter.app)){
      document.addEventListener('eduvize-profile-change',event=>{if(!panel.contains(event.target))kioskEdited=true;});
      const edited=event=>{if(!event.isTrusted||panel.contains(event.target)||event.target.readOnly||event.target.disabled)return;if(adapter.app==='transport'&&!event.target.matches('#source,#minutes,#limit,#pageSeconds,#nearbyKm,#viewMode,#transport input'))return;kioskEdited=true;};
      for(const type of ['input','change'])document.addEventListener(type,edited,true);
      document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('#addButton,#newPage,#deletePage,.edu-item-editor__actions'))kioskEdited=true;},true);
      if(adapter.app==='transport')document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('#selected button,#suggestions button,#nearby button[data-stop],#selectedStops,#selected-stops,.selected-stops,.stop-chip'))kioskEdited=true;},true);
      document.addEventListener('eduvize-configuration-saved',()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;});
      local.addEventListener('click',()=>queueMicrotask(()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;}));
      // The kiosk's share handler saves the native local configuration before copying.
      if(adapter.app==='kiosk'&&copy)copy.addEventListener('click',()=>queueMicrotask(()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;}));
    }
    root.addEventListener('beforeunload',event=>{
      if(stylesDeparture&&consumeDepartureApproval(event,'shared'))return;
      if(!stylesDeparture&&newsStatus&&approvedDeparture){
        const approval=approvedDeparture;approvedDeparture=null;
        try{if(Date.now()<=approval.expiresAt&&profileId===approval.profileId&&activeId()===approval.profileId&&(auth()?.status().schoolId||'')===approval.schoolId&&fingerprint(adapter.read())===approval.config)return;}catch{}
      }
      if(!userChanged||!profileId||!baseline||(['kiosk','transport'].includes(adapter.app)&&!kioskEdited))return;
      const current=departureFingerprint(adapter.read()),saved=departureFingerprint(JSON.parse(baseline));if(current!==saved&&current!==browserBaseline){event.preventDefault();event.returnValue='';}
    });
    root.addEventListener('eduvize-admin-auth-change',()=>{if(verifiedIdentity?.valid())return;identityVerified=false;profileTitle='';state();if(ready&&initialized&&!busy)work('Ověřuji aktivní profil…',()=>list(false));});
    watchAuth(()=>{state();if(ready&&initialized&&!busy)work('Ověřuji aktivní profil…',()=>list(false));});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready&&!busy)auth()?.refresh();});
    const picker=make('section',null,'edu-profile-panel edu-admin__card');picker.setAttribute('aria-label','Aktivní profil školy');
    const header=main.querySelector('.edu-admin-session')||main.querySelector('.edu-page-header');if(header)header.after(picker);else main.prepend(picker);
    profilePicker=controls(picker);profilePicker.reload.textContent='Správa profilů';profilePicker.reload.onclick=()=>{location.assign(manageUrl(profileId));};
    async function refreshPicker(){try{await auth()?.ready;if(!canSave()){picker.hidden=true;return;}const result=await request('');options(profilePicker.select,result.items,profileId||auth().status().profileId);picker.hidden=false;}catch{picker.hidden=true;}}
    root.addEventListener('eduvize-profile-updated',event=>{
      if(!ready||!initialized)return;
      work('Načítám změnu profilu…',async()=>{
        if(event.detail?.id===profileId)await readProfile(!!event.detail.restore,{fresh:true,replace:!!event.detail.restore});
        await refreshPicker();
      });
    });
    root.EduvizeProfileBeforeSwitch=async({navigation=false}={})=>{
      const leaving=!!stylesDeparture||(newsStatus&&navigation);
      if(leaving&&(busy||needsLogin||needsReload))return false;
      if(!dirty()&&!stylesDeparture?.dirty())return true;
      if(styleDecisionPending)return false;
      styleDecisionPending=true;
      try{
      const session=captureStyleDepartureSession();if(!session.valid())return false;
      if(!leaving){
        if(confirm('Před přepnutím profilu uložit rozpracované změny do Eduvize?')){await save.onclick();return !dirty()&&!errorText;}
        if(!confirm('Přepnout profil a zahodit rozpracované změny?'))return false;
        userChanged=false;return true;
      }
      const before={profileId,schoolId:auth()?.status().schoolId||'',revision,epoch:departureEpoch,config:fingerprint(adapter.read()),nativeConfig:stylesDeparture?fingerprint(stylesDeparture.read()):null};
      const choice=await askNewsDeparture();if(choice==='cancel')return false;
      if(!session.valid()||busy||needsLogin||needsReload||departureEpoch!==before.epoch||revision!==before.revision||profileId!==before.profileId||activeId()!==before.profileId||(auth()?.status().schoolId||'')!==before.schoolId)return false;
      if(choice==='save'){
        try{if(stylesDeparture)await stylesDeparture.save();else await save.onclick();}catch(error){errorText=error.message||'Uložení nebylo potvrzené.';adminStatus.result(errorText,'error');return false;}
        return session.valid()&&departureEpoch===before.epoch&&!busy&&revision>before.revision&&!dirty()&&!stylesDeparture?.dirty()&&!errorText&&!needsLogin&&!needsReload&&profileId===before.profileId&&activeId()===before.profileId&&(auth()?.status().schoolId||'')===before.schoolId;
      }
      if(choice!=='discard'||fingerprint(adapter.read())!==before.config||(stylesDeparture&&fingerprint(stylesDeparture.read())!==before.nativeConfig))return false;
      if(navigation)approvedDeparture={profileId,schoolId:before.schoolId,revision,session,epoch:before.epoch,config:before.config,nativeConfig:before.nativeConfig,expiresAt:Date.now()+2000};
      return true;
      }finally{styleDecisionPending=false;}
    };
    profilePicker.select.onchange=async()=>{
      const next=profilePicker.select.value;if(!next||next===profileId)return;
      if(!await root.EduvizeProfileBeforeSwitch()){profilePicker.select.value=profileId;return;}
      await work('Přepínám profil…',async()=>{await auth().selectProfile(next);select(next);profileId=next;revision=0;tracked='';baseline='';userChanged=false;manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}backup=null;undo.hidden=true;if(!loaded)say('Tento profil zatím nemá nastavení této aplikace. Upravte výchozí hodnoty a uložte je.');});
    };
    state();refreshPicker();try{const initialIdentity=await profileReadiness();if(initialIdentity?.valid()){verifiedIdentity=initialIdentity;identityVerified=true;profileId=initialIdentity.id;profileTitle=initialIdentity.title;state();}await waitAdapter(adapter);ready=true;resetEditState();baseline=fingerprint(adapter.read());const resume=false;await auth()?.ready;const currentIdentity=await profileReadiness();if(currentIdentity?.valid()){verifiedIdentity=currentIdentity;identityVerified=true;profileId=currentIdentity.id;profileTitle=currentIdentity.title;state();}await work('Načítám nastavení profilu…',()=>list(!resume),{warm:!!currentIdentity?.valid()&&currentIdentity.settingsWarm});initialized=true;await refreshPicker();}catch(e){say(e.message,'error');state();}
    return {refresh:()=>work('Ověřuji aktivní profil…',()=>list(false))};
  }
  function fields(ids){
    const controls=()=>ids.map(id=>document.getElementById(id)).filter(Boolean);
    return {read:()=>Object.fromEntries(controls().map(e=>[e.id,e.type==='checkbox'?e.checked:e.value])),apply(values){
      if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Neplatné nastavení formuláře.');
      for(const e of controls())if(Object.hasOwn(values,e.id)){const v=values[e.id];if(e.type==='checkbox'&&typeof v!=='boolean')throw Error('Neplatná volba '+e.id);if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===String(v)))throw Error('Nepodporovaná volba '+e.id);}
      const updated=[];for(const e of controls())if(Object.hasOwn(values,e.id)){if(e.type==='checkbox')e.checked=values[e.id];else e.value=String(values[e.id]);updated.push(e);}for(const e of updated){e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
    }};
  }
  function segment(){return root.EduvizeSegmentSelection?.params?.()||null;}
  function applySegment(value){if(value)root.EduvizeSegmentSelection?.set?.(value);}
  let schoolConfigurationPromise;
  async function schoolConfiguration(){
    if(schoolConfigurationPromise)return schoolConfigurationPromise;
    schoolConfigurationPromise=(async()=>{
      const data=await request('');
      const active=root.EduvizeAdminAuth.status().profileId,query=new URL(location.href).searchParams.get('edu-profile');
      let item=data.items.find(p=>p.id===query)||data.items.find(p=>p.id===active)||data.items[0];
      if(!item)item=await request('',{method:'POST',body:JSON.stringify({name:'Nastavení školy'})});
      if(root.EduvizeAdminAuth.status().profileId!==item.id)await root.EduvizeAdminAuth.selectProfile(item.id);
      select(item.id);return item.id;
    })();
    try{return await schoolConfigurationPromise;}finally{schoolConfigurationPromise=null;}
  }
  async function manager(host){
    if(!host||host.dataset.mounted)return;host.dataset.mounted='1';host.hidden=true;host.classList.add('edu-admin__flow');
    host.replaceChildren(make('h2','Profily školy'));
    const intro=make('p','Každá budova nebo pracoviště může mít vlastní nastavení aplikací, barvy a odkazy. Dokumenty a fotografie sdílí celá škola.','edu-admin__hint');host.append(intro);
    const ui=controls(host),row=make('div',null,'edu-admin__actions'),name=make('input');name.type='text';name.maxLength=80;name.placeholder='Např. ZŠ – hlavní budova';name.setAttribute('aria-label','Název nového profilu');
    const copyLabel=make('label','Zkopírovat nastavení vybraného profilu'),copy=make('input');copy.type='checkbox';copy.checked=true;copyLabel.prepend(copy);
    const create=button('Vytvořit profil',false),rename=button('Přejmenovat profil'),history=button('Historie a obnova');row.append(create,rename,history);host.append(name,copyLabel,row);
    const versions=make('div',null,'edu-profile-versions');host.append(versions);
    // Separate target: inspecting or restoring an archive never switches the
    // profile used by the open administration or its unsaved configuration.
    const archivePanel=make('details',null,'edu-profile-archive'),archiveBody=make('div',null,'edu-admin__flow');
    archivePanel.append(make('summary','Archivace a obnova profilů'),archiveBody);host.append(archivePanel);
    const archiveHelp=make('p','Archivace zachová nastavení i historii. Používaný profil a profil s navázanými výstupy nelze archivovat. Obnovení profil znovu zpřístupní, ale nepřepne právě otevřené nastavení.','edu-admin__hint');
    const archiveLabel=make('label','Profil k archivaci nebo obnově','edu-admin__field'),archiveSelect=make('select');archiveSelect.setAttribute('aria-label','Profil k archivaci nebo obnově');archiveLabel.append(archiveSelect);
    const archiveActions=make('div',null,'edu-admin__actions'),checkArchive=button('Zkontrolovat vazby'),archiveProfile=button('Archivovat profil'),unarchiveProfile=button('Obnovit profil');archiveActions.append(checkArchive,archiveProfile,unarchiveProfile);
    const archiveStatus=make('p',null,'edu-admin__hint');archiveStatus.setAttribute('role','status');archiveStatus.setAttribute('aria-live','polite');archiveBody.append(archiveHelp,archiveLabel,archiveActions,archiveStatus);
    let archiveItems=[],archiveBusy=false,managerBusy=false;
    const archiveTarget=()=>archiveItems.find(p=>p.id===archiveSelect.value);
    function archiveButtons(){const p=archiveTarget(),busy=archiveBusy||managerBusy;archiveSelect.disabled=busy;checkArchive.disabled=busy||!p||p.archived===true;archiveProfile.disabled=busy||!p||p.archived===true;unarchiveProfile.disabled=busy||!p||p.archived!==true;}
    async function refreshArchive(selected=archiveSelect.value){
      archiveItems=[];archiveSelect.replaceChildren();archiveButtons();
      const [active,archived]=await Promise.all([request('',{fresh:true}),request('?archived=1',{fresh:true})]);
      if(!Array.isArray(active.items)||!Array.isArray(archived.items))throw Error('Seznam archivovaných profilů se nepodařilo ověřit.');
      const combined=[...active.items.map(p=>({...p,archived:false})),...archived.items.map(p=>({...p,archived:true}))];
      if(combined.some(p=>!/^[a-f0-9]{32}$/.test(p.id)||typeof p.name!=='string'||!Number.isInteger(p.revision)||p.revision<1)||new Set(combined.map(p=>p.id)).size!==combined.length)throw Error('Stav archivace profilů se nepodařilo ověřit.');
      archiveItems=combined;
      archiveSelect.replaceChildren(new Option('Vyberte profil…',''));
      for(const p of archiveItems)archiveSelect.add(new Option(p.name+(p.archived?' · archivovaný':''),p.id));
      archiveSelect.value=archiveItems.some(p=>p.id===selected)?selected:'';archiveButtons();
    }
    async function archiveAct(fn){if(archiveBusy||managerBusy)return;archiveBusy=true;archiveButtons();for(const c of [create,rename,history,ui.select,ui.reload])c.disabled=true;try{await fn();}catch(e){archiveStatus.textContent=e.message;}finally{archiveBusy=false;for(const c of [create,rename,history,ui.select,ui.reload])c.disabled=false;archiveButtons();}}
    async function archiveCheck(id){
      const result=await request('/'+id+'/archive-check',{fresh:true});
      if(result.profileId!==id||!Number.isInteger(result.revision)||result.revision<1||typeof result.complete!=='boolean'||!Array.isArray(result.blockers)||!Array.isArray(result.outputs))throw Error('Kontrola vazeb není úplná. Profil nelze archivovat.');
      const labels=[...result.blockers,...result.outputs].map(item=>typeof item.label==='string'?item.label:'Neupřesněná vazba');
      const allowed=result.complete===true&&result.canArchive===true&&labels.length===0;
      archiveStatus.textContent=allowed?'Kontrola dokončena. Profil nemá vazby bránící archivaci.':(result.complete?'Profil nelze archivovat. ':'Kontrola vazeb není úplná. Profil nelze archivovat. ')+(labels.join('; ')||'Server archivaci nepovolil.');
      return {...result,allowed};
    }
    archiveSelect.onchange=()=>{archiveStatus.textContent='';archiveButtons();};
    archivePanel.ontoggle=()=>{if(archivePanel.open)return archiveAct(refreshArchive);};
    checkArchive.onclick=()=>archiveAct(async()=>{const p=archiveTarget();if(p&&!p.archived)await archiveCheck(p.id);});
    archiveProfile.onclick=()=>archiveAct(async()=>{
      const p=archiveTarget();if(!p||p.archived)return;
      const check=await archiveCheck(p.id);if(!check.allowed)return;
      if(!confirm('Archivovat profil „'+p.name+'“? Nastavení a historie zůstanou zachované a profil bude možné obnovit.'))return;
      await request('/'+p.id+'/archive',{method:'POST',body:JSON.stringify({expectedRevision:check.revision})});
      await refresh();await refreshArchive();archiveStatus.textContent='Profil byl archivován. Nastavení a historie zůstaly zachované.';
      root.dispatchEvent(new CustomEvent('eduvize-profile-updated',{detail:{id:p.id,archived:true}}));
    });
    unarchiveProfile.onclick=()=>archiveAct(async()=>{
      const p=archiveTarget();if(!p?.archived)return;
      await request('/'+p.id+'/unarchive',{method:'POST',body:JSON.stringify({expectedRevision:p.revision})});
      await refresh();await refreshArchive();archiveStatus.textContent='Profil byl obnoven. Aktivní profil se nezměnil.';
      root.dispatchEvent(new CustomEvent('eduvize-profile-updated',{detail:{id:p.id,archived:false}}));
    });
    archiveButtons();
    let items=[];
    async function refresh(){try{await root.EduvizeAdminAuth?.ready;host.hidden=!root.EduvizeAdminAuth?.status().connected;const archiveSelected=archiveSelect.value;archiveItems=[];archiveSelect.replaceChildren();archiveButtons();if(host.hidden)return;const result=await request('',{fresh:true});items=result.items;options(ui.select,items,root.EduvizeAdminAuth.status().profileId);ui.status.textContent=items.length+' '+(items.length===1?'profil školy':items.length<5?'profily školy':'profilů školy');if(archivePanel.open)await refreshArchive(archiveSelected);}catch(e){ui.status.textContent=e.message;}}
    async function act(fn){if(managerBusy||archiveBusy)return;managerBusy=true;archiveButtons();for(const c of [create,rename,history,ui.select,ui.reload])c.disabled=true;try{await fn();}catch(e){ui.status.textContent=e.message;}finally{managerBusy=false;for(const c of [create,rename,history,ui.select,ui.reload])c.disabled=false;archiveButtons();}}
    ui.reload.onclick=refresh;
    ui.select.onchange=()=>act(async()=>{if(!ui.select.value)return;if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch()){ui.select.value=root.EduvizeAdminAuth.status().profileId;return;}await root.EduvizeAdminAuth.selectProfile(ui.select.value);select(ui.select.value);ui.status.textContent='Aktivní profil: '+items.find(p=>p.id===ui.select.value)?.name;root.dispatchEvent(new Event('eduvize-profile-selected'));});
    create.onclick=()=>act(async()=>{const title=name.value.trim();if(!title)throw Error('Vyplňte název profilu.');if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch())return;const result=await request('',{method:'POST',body:JSON.stringify({name:title,...(copy.checked&&ui.select.value?{copyFrom:ui.select.value}:{})})});name.value='';await root.EduvizeAdminAuth.selectProfile(result.id);select(result.id);await refresh();});
    rename.onclick=()=>act(async()=>{const selected=items.find(p=>p.id===ui.select.value);if(!selected)throw Error('Vyberte profil.');const title=prompt('Nový název profilu',selected.name);if(title===null)return;await request('/'+selected.id,{method:'PATCH',body:JSON.stringify({name:title,expectedRevision:selected.revision})});await refresh();root.dispatchEvent(new CustomEvent('eduvize-profile-updated',{detail:{id:selected.id}}));});
    history.onclick=()=>act(async()=>{if(!ui.select.value)throw Error('Vyberte profil.');const id=ui.select.value,result=await request('/'+id+'/history');versions.replaceChildren();for(const entry of result.items){const restore=button('Obnovit verzi '+entry.revision+' · '+entry.updatedAt);restore.onclick=()=>act(async()=>{if(!confirm('Obnovit uloženou verzi profilu? Současná verze zůstane v historii.'))return;if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch())return;const current=await request('/'+id,{fresh:true});await request('/'+id+'/restore',{method:'POST',body:JSON.stringify({revision:entry.revision,expectedRevision:current.revision})});versions.replaceChildren();await refresh();root.dispatchEvent(new CustomEvent('eduvize-profile-updated',{detail:{id,restore:true}}));});versions.append(restore);}if(!result.items.length)versions.textContent='Historie je zatím prázdná.';});
    watchAuth(refresh);await refresh();
  }
  async function picker(host){
    if(!host||host.dataset.mounted)return;host.dataset.mounted='1';host.hidden=true;
    const ui=controls(host);ui.reload.textContent='Správa profilů';ui.reload.onclick=()=>location.assign(manageUrl(selection()));
    async function refresh(){try{await root.EduvizeAdminAuth?.ready;host.hidden=!root.EduvizeAdminAuth?.status().connected;if(host.hidden)return;const result=await request('');options(ui.select,result.items,root.EduvizeAdminAuth.status().profileId);ui.status.textContent='Nastavení zobrazení platí pro vybraný profil. Knihovna souborů je společná celé škole.';}catch(e){ui.status.textContent=e.message;}}
    ui.select.onchange=async()=>{const id=ui.select.value;if(!id)return;ui.select.disabled=true;try{if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch()){ui.select.value=root.EduvizeAdminAuth.status().profileId;return;}await root.EduvizeAdminAuth.selectProfile(id);select(id);}catch(e){ui.status.textContent=e.message;}finally{ui.select.disabled=false;}};
    watchAuth(refresh);await refresh();
  }
  function schoolSuggestion(adapter){
    if(!['weather','transport'].includes(adapter?.app)||document.getElementById('edu-school-suggestion'))return;
    const input=document.getElementById(adapter.app==='weather'?'address-search-input':'search');
    if(!input)return;
    const panel=make('section',null,'edu-admin__card edu-admin__flow');panel.id='edu-school-suggestion';panel.hidden=true;
    const info=make('p'),actions=make('div',null,'edu-admin__actions'),go=button('Vyhledat školu'),dismiss=button('Pokračovat s vlastním nastavením');actions.append(go,dismiss);panel.append(info,actions);
    input.closest('form').before(panel);let school=null,seq=0;
    function show(value){school=value&&typeof value==='object'&&typeof value.name==='string'&&value.name.trim()?value:null;panel.hidden=!school;if(school)info.textContent='Na kartě školy je uložena škola: '+school.name+([school.address,school.municipality].filter(Boolean).length?' · '+[school.address,school.municipality].filter(Boolean).join(', '):'')+'. Chcete ji vyhledat?';}
    go.onclick=()=>{if(!school)return;input.value=[school.name,school.municipality].filter(Boolean).join(' ');input.dispatchEvent(new Event('input',{bubbles:true}));if(adapter.app==='weather')document.getElementById('address-search-button')?.click();input.scrollIntoView({block:'center',behavior:'smooth'});input.focus();};
    dismiss.onclick=()=>{panel.hidden=true;};
    async function refresh(){const current=++seq;panel.hidden=true;try{await root.EduvizeAdminAuth?.ready;const id=root.EduvizeAdminAuth?.status().profileId||selection();if(id){const profile=await request('/'+id);if(current!==seq)return;show(profile.apps?.['school-identity']?.config?.data);return;}let local;try{local=JSON.parse(localStorage.getItem('eduvize-school-card-preview-v1')||'null');}catch{}if(current===seq)show(local);}catch{panel.hidden=true;}}
    watchAuth(refresh);refresh();
  }
  root.EduvizeProfiles=Object.freeze({createStatus,statusFor:app=>statusSinks.get(app)||null,departureChoice:askNewsDeparture,mount,manager,picker,fields,segment,applySegment,apps,request,fingerprint});
  function start(){manager(document.getElementById('configurations'));if(root.EduvizeProfileAdapter){mount(root.EduvizeProfileAdapter);schoolSuggestion(root.EduvizeProfileAdapter);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.addEventListener('eduvize-profile-adapter-ready',()=>{mount(root.EduvizeProfileAdapter);schoolSuggestion(root.EduvizeProfileAdapter);});
  root.addEventListener('eduvize-admin-auth-change',()=>{if(root.EduvizeProfileAdapter?.app==='school-identity'&&root.EduvizeAdminAuth?.status().schoolId)mount(root.EduvizeProfileAdapter);});
})(window);
