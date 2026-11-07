/* One profile component for every administration. No credentials are serialized. */
(function(root){
  'use strict';
  if(root.EduvizeProfiles)return;
  const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
  const DOCS='https://eduvize-dokumenty-api.onrender.com';
  const API=DOCS+'/api/admin/configuration-profiles',SELECTION='eduvize-profile-selection-v1';
  const apps=Object.freeze([
    {id:'school-calendar',name:'Školní kalendář',url:'https://skola.eduvize.cz/eduvize-skolni-kalendar/config.html'},
    {id:'school-identity',name:'Karta školy',url:ACCOUNT+'#school-card'},
    {id:'kiosk',name:'Kiosek',url:'https://pborovicka72-dotcom.github.io/eduvize-kiosek/config.html'},
    {id:'documents',name:'Dokumenty',url:DOCS+'/config'},
    {id:'weather',name:'Počasí',url:'https://eduvize-weather.onrender.com/config'},
    {id:'holidays',name:'Svátky',url:'https://pborovicka72-dotcom.github.io/eduvize-svatky/config.html'},
    {id:'menu',name:'Jídelníček',url:'https://eduvize-jidelnicek.onrender.com/config.html'},
    {id:'transport',name:'Jízdní řády',url:'https://pborovicka72-dotcom.github.io/eduvize-jizdni-rady/config.html'},
    {id:'wisdom',name:'Moudrost dne',url:'https://pborovicka72-dotcom.github.io/eduvize-moudrost-dne/config.html'},
    {id:'news',name:'Aktuality',url:'https://eduvize-aktuality.onrender.com/config'},
    {id:'styles',name:'Styly',url:'https://eduvize-design-system-api.onrender.com/'},
    {id:'day-progress',name:'Průběh dne',url:'https://eduvize-prubeh-dne.onrender.com/config.html'},
    {id:'school-systems',name:'Školní informační systémy',url:'https://eduvize-skolni-systemy.onrender.com/config.html'}
  ]);
  let updatesScript;
  let linkAuditScript;
  function mountLinkAudit(host){
    if(!linkAuditScript)linkAuditScript=(async()=>{
      for(const file of ['link-contract.js','link-compatibility.js'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/'+file+'?v=20261104-shared-notice-1';script.onload=resolve;script.onerror=reject;document.head.append(script);});
    })();
    linkAuditScript.then(()=>root.EduvizeLinkCompatibility.mount(host)).catch(()=>{const note=document.createElement('p');note.textContent='Kontrola kompatibility odkazů se nepodařila načíst. Nastavení aplikace zůstává dostupné.';host.append(note);});
  }
  function mountUpdates(app,host){
    if(!updatesScript)updatesScript=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/update-settings.js?v=20261103-1';
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
  // Short-lived read cache survives navigation in this tab. Never caches credentials.
  const CACHE_KEY='eduvize-profile-reads-v1',CACHE_TTL=90000;
  let reads={identity:0,entries:{}};
  try{const value=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(value&&['number','string'].includes(typeof value.identity)&&value.entries&&typeof value.entries==='object')reads=value;}catch{}
  function readCache(identity,path){if(reads.identity!==identity){reads={identity,entries:{}};return;}const entry=reads.entries[path];if(entry&&Date.now()-entry.time>=0&&Date.now()-entry.time<CACHE_TTL)return structuredClone(entry.value);}
  function remember(identity,path,value){if(reads.identity!==identity)reads={identity,entries:{}};reads.entries[path]={time:Date.now(),value:structuredClone(value)};const ordered=Object.entries(reads.entries).sort((a,b)=>b[1].time-a[1].time);reads.entries=Object.fromEntries(ordered.slice(0,9));try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(reads));}catch{}}
  function forgetReads(){reads={identity:0,entries:{}};try{sessionStorage.removeItem(CACHE_KEY);}catch{}}
  function watchAuth(callback){const signature=()=>{const s=root.EduvizeAdminAuth?.status();return JSON.stringify([s?.connected,s?.profileId,s?.expiresAt,s?.scopes]);};let previous=signature();root.addEventListener('eduvize-admin-auth-change',()=>{const next=signature();if(next===previous)return;previous=next;callback();});}
  async function request(path='',options={}){
    const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Společné přihlášení se nepodařilo načíst.');await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope))throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k nastavení školy do Eduvize.');
    const {fresh=false,...fetchOptions}=options,method=(fetchOptions.method||'GET').toUpperCase(),identity=auth.status().schoolId+':'+auth.status().expiresAt;
    const cacheable=method==='GET'&&(path===''||/^\/[a-f0-9]{32}$/.test(path));
    if(cacheable&&!fresh){const value=readCache(identity,path);if(value!==undefined)return value;}
    const response=await auth.fetch(API+path,{...fetchOptions,headers:{...(fetchOptions.body?{'Content-Type':'application/json'}:{}),...fetchOptions.headers}},scope);
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=Error(typeof data.detail==='string'?data.detail:'Úložiště Eduvize není dostupné ('+response.status+').');e.status=response.status;throw e;}if(cacheable)remember(identity,path,data);else if(method!=='GET')forgetReads();return data;
  }
  function controls(host){
    const row=make('div',null,'edu-profile-panel__row'),label=make('label','Profil školy / obrazovky'),select=make('select');select.setAttribute('aria-label','Profil školy nebo obrazovky');label.append(select);
    const actions=make('div',null,'edu-admin__actions'),reload=button('Obnovit seznam');row.append(label,actions);actions.append(reload);
    const status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(row,status);return {select,actions,reload,status};
  }
  function options(select,items,id){select.replaceChildren(new Option('Vyberte profil…',''));for(const p of items)select.add(new Option(p.name,p.id));select.value=items.some(p=>p.id===id)?id:'';}
  async function waitAdapter(adapter){if(adapter.ready)await adapter.ready;for(let i=0;i<100;i++){if(adapter.read())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Nastavení aplikace se dosud nepodařilo načíst.');}
  async function mount(adapter){
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
      local.onclick=()=>{try{
        if(adapter.app==='wisdom')document.getElementById('audience')?.dispatchEvent(new Event('change',{bubbles:true}));
        else localStorage.setItem(localKey,JSON.stringify(adapter.read()));
        const feedback=document.querySelector('[data-edu-profile-panel] .edu-profile-panel__status')||document.getElementById('status')||document.getElementById('save-feedback');if(feedback)feedback.textContent='Nastavení je uloženo v tomto prohlížeči.';
      }catch(error){alert('Nastavení se nepodařilo uložit: '+error.message);}};
    }
    if(adapter.app==='kiosk'){const primary=make('div',null,'edu-output-actions');row.before(primary);row=primary;}
    local.textContent='Uložit v prohlížeči';
    const save=button('Uložit do Eduvize',false);save.dataset.eduProfileSave='';
    for(const control of [save,local,copy,open].filter(Boolean)){const saving=control===save||control===local;control.className='edu-admin__button'+(saving?'':' edu-admin__button--secondary');control.dataset.eduOutputAction=saving?'save':'secondary';if(saving)control.dataset.eduSave='';}
    // Move existing controls so their original handlers and submit behavior survive.
    row.prepend(...[...(adapter.app==='school-identity'?[document.getElementById('school-edit')]:[]),save,local,copy,open].filter(Boolean));
    if(adapter.app==='styles'){const publish=document.getElementById('save');if(publish){publish.textContent='Použít změny ve sdíleném stylu';publish.title='Aktualizuje centrální styl Eduvize. Konfiguraci svého profilu uložíte tlačítkem Uložit do Eduvize.';}}
    if(open){open.textContent='Otevřít výstup';open.dataset.eduOpenOutput='';window.EduvizeAdminNavigation?.normalize(open);}
    if(copy)copy.textContent='Kopírovat odkaz';
    const panel=make('div',null,'edu-profile-current');panel.dataset.eduProfilePanel=adapter.app;panel.id='edu-profile-save';
    const profileText=make('p','Profil není vybrán.','edu-profile-current__name'),status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const manage=make('a','Účet a připojení','edu-admin__button edu-admin__button--secondary');manage.href=manageUrl('');const actions=make('div',null,'edu-admin__actions'),load=button('Načíst uložené nastavení'),undo=button('Vrátit před načtením');undo.hidden=true;load.hidden=true;actions.append(load,undo);panel.append(profileText,status,manage,actions);if(row)row.after(panel);else save.after(panel);
    if(adapter.app!=='school-identity')mountUpdates(adapter.app,panel);
    if(adapter.app!=='school-identity')mountLinkAudit(panel);
    const changeStatus=make('p','Bez neuložených změn.','edu-profile-change-status');changeStatus.dataset.eduChangeStatus='';changeStatus.setAttribute('role','status');changeStatus.setAttribute('aria-live','polite');panel.prepend(changeStatus);
    let editBaseline='',userChanged=false;
    function resetEditState(message='Bez neuložených změn.'){changeStatus.hidden=false;userChanged=false;editBaseline=fingerprint(adapter.read());changeStatus.textContent=message;changeStatus.dataset.state='saved';}
    function showEditState(){if(!editBaseline)return;changeStatus.hidden=false;const changed=fingerprint(adapter.read())!==editBaseline;changeStatus.textContent=userChanged&&changed?'Neuložené změny.':'Bez neuložených změn.';changeStatus.dataset.state=userChanged&&changed?'dirty':'saved';}
    const ui={status};
    const draftKey='eduvize-profile-save-draft-v1:'+adapter.app+':'+location.pathname;
    let busy=false,profileId='',profileTitle='',revision=0,baseline='',backup=null,errorText='',loaded=false,ready=false,initialized=false,tracked='',needsLogin=false,restored=false,needsReload=false,manualLoad=false,timer,kioskEdited=false,browserBaseline='';
    const auth=()=>root.EduvizeAdminAuth;
    const canSave=()=>!!(auth()?.getToken('configurations')||auth()?.getToken('documents'));
    const activeId=()=>auth()?.status().profileId||'';
    function profileName(){return profileTitle||'vybraný profil';}
    function say(text,state=''){status.textContent=text;status.dataset.state=state;changeStatus.hidden=state==='saved'&&/^Uloženo do Eduvize/.test(text);}
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
    function state(){save.disabled=busy||!ready||needsReload;load.disabled=busy||!ready||!canSave();load.hidden=!needsReload;undo.disabled=busy;actions.hidden=load.hidden&&undo.hidden;manage.hidden=true;profileText.hidden=false;profileText.textContent='Profil: '+(profileTitle||'není vybrán');if(profilePicker){profilePicker.select.disabled=busy||!ready;profilePicker.select.value=profileId;}}
    async function work(text,fn){if(busy)return;clearTimeout(timer);busy=true;state();say(text);try{errorText='';await fn();}catch(e){errorText=e.message;needsLogin=[401,403].includes(e.status);if(e.status===409)needsReload=true;say(e.message,'error');}finally{busy=false;state();}}
    function login(){
      const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Přihlášení se nepodařilo načíst. Obnovte stránku.');
      const nonce=crypto.randomUUID(),url=new URL(location.href);url.searchParams.set('edu-resume-save',nonce);url.searchParams.delete('edu-require-drive');url.hash='edu-profile-save';
      const draft={nonce,app:adapter.app,path:location.pathname,createdAt:Date.now(),config:structuredClone(adapter.read()),profileId,revision,baseline,loaded,tracked};
      try{sessionStorage.setItem(draftKey,JSON.stringify(draft));}catch{throw Error('Prohlížeč nepovolil bezpečné zachování rozpracovaného nastavení. Přihlášení otevřete v nové kartě a pak se sem vraťte.');}
      // A stored draft is required before leaving; never serialize login credentials.
      baseline=fingerprint(adapter.read());location.assign(auth.loginUrl(url.href));
    }
    async function restoreDraft(){
      const url=new URL(location.href),nonce=url.searchParams.get('edu-resume-save');if(!nonce)return false;
      let d;try{d=JSON.parse(sessionStorage.getItem(draftKey)||'null');}catch{}
      if(!d||d.nonce!==nonce||d.app!==adapter.app||d.path!==location.pathname||Date.now()-d.createdAt>2*60*60*1000||!d.config){say('Rozpracované nastavení pro návrat z přihlášení nebylo nalezeno. Načtení profilu je pozastavené.','error');return true;}
      await adapter.apply(structuredClone(d.config));userChanged=true;showEditState();profileId=d.profileId||'';revision=Number(d.revision)||0;baseline=typeof d.baseline==='string'?d.baseline:fingerprint(adapter.read());loaded=!!d.loaded;tracked=d.tracked||'';select(profileId);restored=true;
      // Keep the draft until the restored state has been applied successfully.
      sessionStorage.removeItem(draftKey);url.searchParams.delete('edu-resume-save');url.searchParams.delete('edu-require-drive');history.replaceState(null,'',url.href);return true;
    }
    async function readProfile(apply=false,{fresh=false,replace=false}={}){
      const beforeRestore=replace&&apply?fingerprint(adapter.read()):'';
      const p=await request('/'+profileId,{fresh:manualLoad||fresh}),entry=p.apps[adapter.app],incoming=entry?.revision||0;profileTitle=p.name;
      // An explicit history restore replaces the confirmed draft, but not edits
      // made while its fresh read was in flight.
      const preserveEditing=apply&&(replace?fingerprint(adapter.read())!==beforeRestore:!manualLoad&&adapter.app==='school-identity'&&adapter.isEditing?.());
      if(!apply&&tracked===profileId){if(incoming!==revision){needsReload=true;say('Na Eduvize je novější nastavení. Před uložením je načtěte.','error');return;}say(dirty()?'Změny nejsou uložené do Eduvize.':loaded?'Uloženo do Eduvize.':'Dosud neuloženo do Eduvize.',dirty()?'dirty':'saved');return;}
      if(entry&&!entry.config.empty&&apply&&!preserveEditing){const before=structuredClone(adapter.read());try{await adapter.apply(structuredClone(entry.config));}catch(error){try{await adapter.apply(before);}catch{}throw error;}if(manualLoad){backup=before;undo.hidden=false;}}
      if(!entry&&apply&&!preserveEditing&&adapter.app==='school-identity')await adapter.apply({schemaVersion:1,data:{}});
      if(apply&&!preserveEditing){userChanged=false;resetEditState();}
      revision=incoming;tracked=profileId;needsReload=false;loaded=!!entry&&!entry.config.empty;baseline=fingerprint(preserveEditing?(loaded?entry.config:{schemaVersion:1,data:{}}):(apply||!loaded?adapter.read():entry.config));
      if(replace&&preserveEditing){needsReload=true;say('Verze byla obnovena v Eduvizi. Před načtením zkontrolujte nově rozepsané změny.','dirty');return;}
      say(loaded?(apply&&!preserveEditing?(adapter.loadedMessage||'Nastavení načteno z Eduvize.'):dirty()?'Změny nejsou uložené do Eduvize.':'Uloženo do Eduvize.'):'Dosud neuloženo do Eduvize.',dirty()?'dirty':'saved');
    }
    async function list(initial=false){
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId){profileId='';return;}
      if(!canSave()){say('Pro uložení do Eduvize se přihlaste. Rozpracované změny zůstanou zachované.');return;}
      const active=await schoolConfiguration();
      if(!active){profileId='';profileTitle='';say('Přihlaste se k účtu školy.');return;}
      if(tracked&&active!==profileId&&!restored){if(dirty()){needsReload=true;say('Změnil se vybraný profil. Uložte rozpracované změny před načtením jiného profilu.','error');return;}profileId=active;revision=0;tracked='';select(profileId);manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}backup=null;undo.hidden=true;return;}
      if(active!==profileId){profileId=active;revision=0;tracked='';}
      needsLogin=false;select(profileId);await readProfile(initial);
      if(restored){if(!needsReload)say('Rozpracované změny obnoveny. Uloží se do nastavení školy.','dirty');restored=false;requestAnimationFrame(()=>panel.scrollIntoView({block:'nearest'}));}
    }
    load.onclick=()=>work('Načítám uložené nastavení…',async()=>{if(dirty()&&!confirm('Nahradit rozpracované změny uloženým nastavením? Původní místní stav půjde vrátit.'))return;await auth().refresh();if(!activeId())throw Error('Nejprve připojte účet školy na stránce Účet a konfigurace.');profileId=activeId();tracked='';manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}});
    save.onclick=()=>work('Připravuji uložení…',async()=>{
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId)return;
      adapter.validate?.();
      // Keep both the shared recovery snapshot and each app's native local format.
      localStorage.setItem(localKey,JSON.stringify(adapter.read()));
      local.click();
      await auth()?.ready;if(!canSave()||needsLogin){login();return;}
      await auth().refresh();if(!canSave()){login();return;}
      if(!activeId())await schoolConfiguration();
      if(activeId()!==profileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
      const snapshot=structuredClone(adapter.read());say('Ukládám do Eduvize…');const result=await request('/'+profileId+'/apps/'+adapter.app,{method:'PUT',body:JSON.stringify({expectedRevision:revision,config:snapshot})});revision=result.revision;baseline=fingerprint(snapshot);loaded=true;say(dirty()?'Během ukládání vznikly další neuložené změny.':'Uloženo do Eduvize i v prohlížeči.',dirty()?'dirty':'saved');
    });
    manage.onclick=event=>{event.preventDefault();work('Otevírám výběr profilu…',async()=>login());};
    undo.onclick=()=>work('Vracím místní nastavení…',async()=>{if(!backup)return;const previous=backup;backup=structuredClone(adapter.read());await adapter.apply(previous);userChanged=true;showEditState();say('Místní nastavení obnoveno.','dirty');});
    function changed(event){
      if(!panel.contains(event.target)&&event.target!==save&&event.target!==local){
        const field=['input','change'].includes(event.type)&&event.target.matches?.('input,select,textarea,[contenteditable]')&&!event.target.readOnly&&!event.target.disabled;
        const action=event.type==='click'&&event.target.closest?.('button')&&!event.target.closest('.edu-output-actions,.toolbar,.theme-action-buttons,.sis-admin-actions,.day-actions');
        if((event.isTrusted&&(field||action))||event.type==='eduvize-profile-change')userChanged=true;
        if(!userChanged&&editBaseline&&!event.isTrusted&&event.type!=='click')editBaseline=fingerprint(adapter.read());
        showEditState();
      }
      if(panel.contains(event.target)||event.target===save||busy||needsReload)return;clearTimeout(timer);timer=setTimeout(()=>{if(!baseline)return;if(dirty()){errorText='';say('Změny nejsou uložené do Eduvize.','dirty');}else if(!errorText)say(loaded?'Uloženo do Eduvize.':'Dosud neuloženo do Eduvize.',loaded?'saved':'');},200);}
    for(const event of ['input','change','click','eduvize-profile-change'])document.addEventListener(event,changed);
    local.addEventListener('click',()=>queueMicrotask(()=>{try{adapter.validate?.();const value=adapter.read();localStorage.setItem(localKey,JSON.stringify(value));resetEditState('Uloženo v prohlížeči.');}catch(error){changeStatus.textContent=error.message;changeStatus.dataset.state='error';}}));
    document.addEventListener('eduvize-configuration-saved',()=>resetEditState('Uloženo v prohlížeči.'));
    // Automatic preview/profile refreshes must never create an exit warning.
    if(['kiosk','transport'].includes(adapter.app)){
      const edited=event=>{if(!event.isTrusted||panel.contains(event.target)||event.target.readOnly||event.target.disabled)return;if(adapter.app==='transport'&&!event.target.matches('#source,#minutes,#limit,#pageSeconds,#nearbyKm,#viewMode,#transport input'))return;kioskEdited=true;};
      for(const type of ['input','change'])document.addEventListener(type,edited,true);
      document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('#addButton,#newPage,#deletePage,.edu-item-editor__actions'))kioskEdited=true;},true);
      if(adapter.app==='transport')document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('#selected button,#suggestions button,#nearby button[data-stop],#selectedStops,#selected-stops,.selected-stops,.stop-chip'))kioskEdited=true;},true);
      document.addEventListener('eduvize-configuration-saved',()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;});
      local.addEventListener('click',()=>queueMicrotask(()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;}));
      // The kiosk's share handler saves the native local configuration before copying.
      if(adapter.app==='kiosk'&&copy)copy.addEventListener('click',()=>queueMicrotask(()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;}));
    }
    root.addEventListener('beforeunload',event=>{if(!profileId||!baseline||(['kiosk','transport'].includes(adapter.app)&&!kioskEdited))return;const current=departureFingerprint(adapter.read()),saved=departureFingerprint(JSON.parse(baseline));if(current!==saved&&current!==browserBaseline){event.preventDefault();event.returnValue='';}});
    watchAuth(()=>{state();if(ready&&initialized&&!busy)work('Ověřuji aktivní profil…',()=>list(false));});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready&&!busy)auth()?.refresh();});
    const picker=make('section',null,'edu-profile-panel edu-admin__card');picker.setAttribute('aria-label','Aktivní profil školy');
    const header=main.querySelector('.edu-page-header');if(header)header.after(picker);else main.prepend(picker);
    profilePicker=controls(picker);profilePicker.reload.textContent='Správa profilů';profilePicker.reload.onclick=()=>{location.assign(manageUrl(profileId));};
    async function refreshPicker(){try{await auth()?.ready;if(!canSave()){picker.hidden=true;return;}const result=await request('');options(profilePicker.select,result.items,profileId||auth().status().profileId);picker.hidden=false;}catch{picker.hidden=true;}}
    root.addEventListener('eduvize-profile-updated',event=>{
      if(!ready||!initialized)return;
      work('Načítám změnu profilu…',async()=>{
        if(event.detail?.id===profileId)await readProfile(!!event.detail.restore,{fresh:true,replace:!!event.detail.restore});
        await refreshPicker();
      });
    });
    root.EduvizeProfileBeforeSwitch=async()=>{
      if(!dirty())return true;
      if(confirm('Před přepnutím profilu uložit rozpracované změny do Eduvize?')){await save.onclick();return !dirty()&&!errorText;}
      if(!confirm('Přepnout profil a zahodit rozpracované změny?'))return false;
      userChanged=false;return true;
    };
    profilePicker.select.onchange=async()=>{
      const next=profilePicker.select.value;if(!next||next===profileId)return;
      if(!await root.EduvizeProfileBeforeSwitch()){profilePicker.select.value=profileId;return;}
      await work('Přepínám profil…',async()=>{await auth().selectProfile(next);select(next);profileId=next;revision=0;tracked='';baseline='';userChanged=false;manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}backup=null;undo.hidden=true;if(!loaded)say('Tento profil zatím nemá nastavení této aplikace. Upravte výchozí hodnoty a uložte je.');});
    };
    state();refreshPicker();try{await waitAdapter(adapter);if(adapter.app==='styles'){try{const saved=JSON.parse(localStorage.getItem(localKey)||'null');if(saved)await adapter.apply(saved);}catch{}}ready=true;resetEditState();baseline=fingerprint(adapter.read());const resume=await restoreDraft();await auth()?.ready;await work('Načítám nastavení profilu…',()=>list(!resume));initialized=true;await refreshPicker();}catch(e){say(e.message,'error');state();}
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
      if(result.profileId!==id||!Number.isInteger(result.revision)||result.revision<1||result.complete!==true||!Array.isArray(result.blockers)||!Array.isArray(result.outputs))throw Error('Kontrola vazeb není úplná. Profil nelze archivovat.');
      const labels=[...result.blockers,...result.outputs].map(item=>typeof item.label==='string'?item.label:'Neupřesněná vazba');
      const allowed=result.canArchive===true&&labels.length===0;
      archiveStatus.textContent=allowed?'Kontrola dokončena. Profil nemá vazby bránící archivaci.':'Profil nelze archivovat. '+(labels.join('; ')||'Server archivaci nepovolil.');
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
  root.EduvizeProfiles=Object.freeze({mount,manager,picker,fields,segment,applySegment,apps,request,fingerprint});
  function start(){manager(document.getElementById('configurations'));if(root.EduvizeProfileAdapter){mount(root.EduvizeProfileAdapter);schoolSuggestion(root.EduvizeProfileAdapter);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.addEventListener('eduvize-profile-adapter-ready',()=>{mount(root.EduvizeProfileAdapter);schoolSuggestion(root.EduvizeProfileAdapter);});
  root.addEventListener('eduvize-admin-auth-change',()=>{if(root.EduvizeProfileAdapter?.app==='school-identity'&&root.EduvizeAdminAuth?.status().schoolId)mount(root.EduvizeProfileAdapter);});
})(window);
