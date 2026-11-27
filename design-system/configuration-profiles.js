/* One profile component for every administration. No credentials are serialized. */
(function(root){
  'use strict';
  if(root.EduvizeProfiles)return;
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
  let linkAuditScript;
  function mountLinkAudit(host){
    if(!linkAuditScript)linkAuditScript=(async()=>{
      for(const file of ['link-contract.js','link-compatibility.js'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=ORIGIN+'/eduvize-styly/design-system/'+file+'?v=20261104-shared-notice-1';script.onload=resolve;script.onerror=reject;document.head.append(script);});
    })();
    linkAuditScript.then(()=>root.EduvizeLinkCompatibility.mount(host)).catch(()=>{const note=document.createElement('p');note.textContent='Kontrola kompatibility odkazů se nepodařila načíst. Nastavení aplikace zůstává dostupné.';host.append(note);});
  }
  function mountUpdates(app,host,allowed=()=>true){
    if(!allowed())return;
    if(!updatesScript)updatesScript=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=ORIGIN+'/eduvize-styly/design-system/update-settings.js?v=71d22a46bba8006dd932';
      script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    updatesScript.then(()=>{if(allowed())root.EduvizeUpdateSettings.mount(app,host);}).catch(()=>{if(!allowed())return;const message=document.createElement('p');message.className='edu-admin__hint';message.textContent='Modul aktualizací se nepodařilo načíst.';host.append(message);});
  }
  // Cheap filter uses the served service-admin UI predicate; protected operatorProfile verifies root authority.
  function mountServiceUpdates(app,host){
    let region=null,generation=0;
    function eligible(auth){const state=auth?.status();return !!(state?.connected&&state.scopes?.includes('styles')&&!state.schoolId&&auth.getToken('styles')&&(auth.getToken('configurations')||auth.getToken('documents')));}
    async function refresh(){
      const ticket=++generation,auth=root.EduvizeAdminAuth;
      if(region){region.hidden=true;region.inert=true;}
      try{
        await auth?.ready;
        if(ticket!==generation||root.EduvizeAdminAuth!==auth||!eligible(auth)||typeof auth.operatorProfile!=='function')return;
        const operatorToken=auth.getToken('styles'),scope=auth.getToken('configurations')?'configurations':'documents',planToken=auth.getToken(scope),signature=JSON.stringify(auth.status());
        const allowed=()=>ticket===generation&&root.EduvizeAdminAuth===auth&&eligible(auth)&&auth.getToken('styles')===operatorToken&&auth.getToken(scope)===planToken&&JSON.stringify(auth.status())===signature;
        await auth.operatorProfile(); // Existing protected GET; personal fields are not retained or displayed.
        if(!allowed())return;
        if(!region){region=make('div',null,'edu-service-update-region');host.append(region);}
        region.hidden=false;region.inert=false;
        mountUpdates(app,region,allowed);
      }catch{} // A denied/failed authority check never becomes an output action result.
    }
    root.addEventListener('eduvize-admin-auth-change',()=>{void refresh();});
    void refresh();
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
    const sameIdentity=()=>!!auth.getToken(scope)&&authSignature(auth.status())===signature;
    const valid=()=>sameIdentity()&&auth.getToken(scope)===token;
    const changed=()=>{const error=Error('Přihlášení nebo vybraný profil se během načítání změnil.');if(sameIdentity()){error.code='PROFILE_READ_SUPERSEDED';error.retrySafe=sameIdentity;}return error;};
    if(!valid())throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k nastavení školy do Eduvize.');
    // The digest partitions cached reads; it never grants permission.
    if(!root.crypto?.subtle||typeof TextEncoder==='undefined')return {identity:'',cacheable:false,valid};
    const origin=location.origin;let bytes;
    try{bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode('eduvize-profile-reads-v2\0'+origin+'\0'+token));}catch{if(!valid())throw changed();return {identity:'',cacheable:false,valid,sameIdentity};}
    if(!valid())throw changed();
    const principal=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
    return {identity:JSON.stringify([origin,state.schoolId||'',state.profileId||'',scope,[...(state.scopes||[])].sort(),principal]),cacheable:true,valid,sameIdentity};
  }
  const readPrincipal=()=>{const auth=root.EduvizeAdminAuth,state=auth?.status?.();return JSON.stringify([auth?.getToken?.()||'',authSignature(state)]);};
  let observedReadPrincipal=readPrincipal();
  async function checkReadIdentity(event){
    const auth=root.EduvizeAdminAuth;if(!auth)return;
    const principal=readPrincipal();
    if(event?.type==='eduvize-profile-selected'||principal!==observedReadPrincipal)authObservation++;
    observedReadPrincipal=principal;
    const version=authObservation;await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope)){forgetReads();return;}
    try{const context=await readContext(auth,scope);if(version===authObservation&&context.valid()&&(!context.cacheable||reads.identity&&reads.identity!==context.identity))forgetReads();}catch{if(version===authObservation)forgetReads();}
  }
  root.addEventListener('eduvize-admin-auth-change',checkReadIdentity);
  root.addEventListener('eduvize-profile-selected',checkReadIdentity);
  root.addEventListener('eduvize-profile-updated',forgetReads);
  function watchAuth(callback){const signature=()=>authSignature(root.EduvizeAdminAuth?.status());let previous=signature();root.addEventListener('eduvize-admin-auth-change',()=>{const next=signature();if(next===previous)return;previous=next;callback();});}
  const requestAcknowledgementObservers=new WeakMap(),requestOperationGuards=new WeakMap();
  function freezeAcknowledgedSnapshot(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freezeAcknowledgedSnapshot(child);Object.freeze(value);}return value;}
  function guardedRequestOptions(fetchOptions,headers,guard){
    const result={...fetchOptions};
    if(!guard){result.headers=headers;return result;}
    // Actual authorizedFetch awaits ready before reading headers; this private getter checks at that boundary too.
    Object.defineProperty(result,'headers',{enumerable:true,get(){if(!guard())throw Object.assign(Error('Přihlášení se před odesláním změnilo.'),{code:'DOCUMENTS_SESSION_CHANGED',settingsSaved:false});return headers;}});
    return result;
  }
  async function request(path='',options={}){
    for(let attempt=0;attempt<3;attempt++){
      try{return await requestOnce(path,attempt?{...options,fresh:true}:options);}
      catch(error){if(error?.code!=='PROFILE_READ_SUPERSEDED'||attempt===2||!error.retrySafe?.())throw error;}
    }
  }
  async function requestOnce(path='',options={}){
    const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Společné přihlášení se nepodařilo načíst.');await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope)){forgetReads();throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k nastavení školy do Eduvize.');}
    const {fresh=false,...fetchOptions}=options,method=(fetchOptions.method||'GET').toUpperCase();
    const context=await readContext(auth,scope),cacheable=context.cacheable&&method==='GET'&&(path===''||/^\/[a-f0-9]{32}$/.test(path));
    if(method!=='GET')forgetReads();
    const epoch=readEpoch,key=context.identity+'\0'+path;
    const readChanged=()=>{const error=Error('Přihlášení, profil nebo uložené nastavení se během načítání změnilo. Načtěte je znovu.');if(context.sameIdentity()&&method==='GET'){error.code='PROFILE_READ_SUPERSEDED';error.retrySafe=context.sameIdentity;}return error;};
    const finalRead=value=>{if(!context.valid()||method==='GET'&&epoch!==readEpoch)throw readChanged();return structuredClone(value);};
    if(cacheable&&!fresh){const value=readCache(context.identity,path);if(value!==undefined)return finalRead(value);}
    if(cacheable&&pendingReads.has(key))return finalRead(await pendingReads.get(key));
    const operation=(async()=>{
      const guard=requestOperationGuards.get(options)||(method!=='GET'?()=>context.valid():null),authorizedOptions=guardedRequestOptions(fetchOptions,{...(fetchOptions.body?{'Content-Type':'application/json'}:{}),...fetchOptions.headers},guard);
      const response=await auth.fetch(API+path,authorizedOptions,scope);
      const data=await response.json().catch(()=>({}));
      if(response.ok)requestAcknowledgementObservers.get(options)?.(data);
      if(guard&&!guard())throw Error('Přihlášení se během ukládání změnilo.');
      if(!context.valid()||method==='GET'&&epoch!==readEpoch)throw readChanged();
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
    return {id,title:item?.name||'',settingsWarm:!!item&&profile?.id===id,valid,sameIdentity:context.sameIdentity};
  }
  function controls(host){
    const row=make('div',null,'edu-profile-panel__row'),label=make('label','Profil školy / obrazovky'),select=make('select');select.setAttribute('aria-label','Profil školy nebo obrazovky');label.append(select);
    const actions=make('div',null,'edu-admin__actions'),reload=button('Obnovit seznam');row.append(label,actions);actions.append(reload);
    const status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(row,status);return {select,actions,reload,status};
  }
  function options(select,items,id){select.replaceChildren(new Option('Vyberte profil…',''));for(const p of items)select.add(new Option(p.name,p.id));select.value=items.some(p=>p.id===id)?id:'';}
  async function waitAdapter(adapter){if(adapter.ready)await adapter.ready;for(let i=0;i<100;i++){if(adapter.read())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Nastavení aplikace se dosud nepodařilo načíst.');}
  const recoverySinks=new Map(),outputProfileContexts=new WeakMap();
  function assertOutputContext(expected){
    const adapter=root.EduvizeProfileAdapter,state=adapter&&outputProfileContexts.get(adapter)?.();
    if(!state||adapter.app!==expected.appId||state.appId!==expected.appId||!state.ready||!state.initialized||!state.identityVerified||state.needsReload||state.profileApplyFailed||state.pending||!state.schoolId||state.schoolId!==expected.schoolId||state.profileId!==expected.profileId||state.tracked!==state.profileId||state.activeProfileId!==state.profileId)throw Object.assign(Error('Vybraný profil ještě není načtený ve formuláři. Načtěte jeho nastavení a zkuste akci znovu.'),{code:'OUTPUT_PROFILE_NOT_APPLIED'});
    return true;
  }
  const statusMessages=Object.freeze({
    loaded:'Nastavení načteno z Eduvize. Případné změny uložte do Eduvize.',
    dirty:'Máte neuložené změny. Uložte je do Eduvize.',
    saved(outputUpdated){
      if(outputUpdated===true)return 'Nastavení uloženo do Eduvize a existující veřejný výstup aktualizován.';
      if(outputUpdated===false)return 'Nastavení uloženo do Eduvize. Odkaz na veřejný výstup můžete vytvořit nebo zkopírovat tlačítkem Kopírovat odkaz.';
      return 'Nastavení uloženo do Eduvize.';
    },
    copied:'Odkaz na veřejný výstup zkopírován.',
    preview:'Náhled rozpracovaného nastavení otevřen v nové záložce.'
  });
  function publicationFailureMessage(error){
    const cause=error?.cause?.code==='OUTPUT_UPDATE_FAILED'?error.cause.cause:error?.cause;
    const temporary=[408,425,429,500,502,503,504].includes(Number(cause?.status))||cause?.code==='REQUEST_ABORTED'||cause?.name==='AbortError'||
      cause?.name==='TypeError'&&/^(?:Failed to fetch|Load failed|NetworkError|Network request failed)/i.test(cause.message||'');
    const detail=temporary?'Spojení se serverem selhalo i při opakování. Zkuste uložení znovu.':
      typeof cause?.code==='string'&&typeof cause?.message==='string'?cause.message.replace(/\s+/g,' ').slice(0,180):
      'Zkuste uložení znovu; nastavení zůstalo uložené.';
    return 'Nastavení bylo uloženo do Eduvize. Veřejný výstup se nepodařilo aktualizovat. '+detail;
  }
  function contextualStatus(text){
    if(text==='Uloženo do Eduvize.')return statusMessages.saved();
    if(text==='Nastavení načteno z Eduvize.')return statusMessages.loaded;
    if(text==='Máte neuložené změny.'||text==='Změny nejsou uložené do Eduvize.')return statusMessages.dirty;
    if(text==='Dosud neuloženo do Eduvize.')return 'Tento profil zatím nemá uložené nastavení aplikace. Upravte je a uložte do Eduvize.';
    if(text==='Odkaz zkopírován.')return statusMessages.copied;
    if(text==='Náhled otevřen v nové záložce.')return statusMessages.preview;
    return text;
  }
  function createStatus({app,panel,profileNode,settingsNode,resultNode}){
    if(recoverySinks.has(app))return recoverySinks.get(app);
    const profile=profileNode||make('p'),settings=settingsNode||make('p');let result=resultNode||make('p');
    panel.classList.add('edu-admin-status-region');profile.classList.add('edu-profile-current__name');
    function decorate(node){node.classList.add('edu-admin__status');node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');}
    decorate(settings);decorate(result);settings.dataset.eduSettingsStatus='';result.dataset.eduActionResult='';panel.prepend(profile,settings,result);
    document.body.classList.add('edu-admin-status-context');
    if(!document.querySelector('link[data-edu-admin-status]')){const link=make('link');link.rel='stylesheet';link.dataset.eduAdminStatus='';link.href=ORIGIN+'/eduvize-styly/design-system/admin-status.css?v=20261116-admin-recovery-1';document.head.append(link);}
    const sink=Object.freeze({setProfile(name){profile.textContent='Profil: '+(name||'ověřuji výběr…');profile.hidden=false;},settings(text,state=''){text=contextualStatus(text);if(settings.textContent!==text)settings.textContent=text;if(settings.dataset.state!==state)settings.dataset.state=state;if(settings.hidden)settings.hidden=false;},result(text,state='success'){text=contextualStatus(text);result.textContent=text;result.dataset.state=state;result.hidden=!text;},edit(){if(result.dataset.state==='success'){result.textContent='';result.hidden=true;result.dataset.state='';}},beginAction(){result.textContent='';result.hidden=true;result.dataset.state='';},useResult(node){if(!node||node===result)return;const old=result;result=node;decorate(result);result.dataset.eduActionResult='';settings.after(result);old.remove();result.hidden=!result.textContent;}});
    recoverySinks.set(app,sink);return sink;
  }
  function departureChoice(){return root.EduvizeAdminNavigation?.departureChoice?.()||Promise.resolve('cancel');}
  function orderProfileSessionNodes(main,picker){
    if(!main||!picker||picker.parentElement!==main)return;
    const header=main.querySelector(':scope > .edu-page-header');if(!header)return;
    if(header.nextElementSibling!==picker)header.after(picker);
    const session=[...main.children].find(node=>node.classList?.contains('edu-admin-session'));
    if(session&&picker.nextElementSibling!==session)picker.after(session);
  }
  // Native applications use this one decision/session implementation; no profile DTO is inferred.
  function mountNativeDeparture(hooks){
    if(hooks?.mounted!==true||!['gallery','school-identity'].includes(hooks.appId)||!['read','dirty','getState','save','report'].every(key=>typeof hooks[key]==='function'))throw Error('Nativní ochrana změn není úplná.');
    let active=false,pending=false,saving=false,approval=null;const events=new WeakMap();
    const state=()=>hooks.getState(),content=()=>fingerprint(hooks.read());
    const identity=s=>fingerprint([s.schoolId||'',s.profileId||'',s.selectionId||'']);
    const context=()=>{const s=state();return fingerprint([identity(s),s.revision,content(),authObservation]);};
    const blocked=s=>s.ready!==true||s.busy||s.needsLogin||s.needsReload;
    async function session(){
      const instance=root.EduvizeAdminAuth,generation=authObservation,scope=instance?.getToken('configurations')?'configurations':'documents',token=instance?.getToken(scope),documentsToken=instance?.getToken('documents'),signature=authSignature(instance?.status());
      if(!instance||!token)throw Error('Přihlášení pro bezpečné uložení není ověřené.');
      const unchanged=()=>root.EduvizeAdminAuth===instance&&authObservation===generation&&instance.getToken(scope)===token&&instance.getToken('documents')===documentsToken&&authSignature(instance.status())===signature;
      await instance.ready;if(!unchanged())throw Error('Přihlášení se během přípravy změnilo.');
      const verified=await readContext(instance,scope);const valid=()=>unchanged()&&verified.valid();
      if(!valid())throw Error('Přihlášení se během přípravy změnilo.');return Object.freeze({valid});
    }
    async function save(){
      if(saving)throw Error('Ukládání již probíhá.');
      if(!active||blocked(state())){const error=Error('Nejprve dokončete načtení nebo probíhající operaci.');hooks.report(error.message,'error');throw error;}
      saving=true;approval=null;let committed=null;
      try{
        const before=state(),beforeIdentity=identity(before),beforeContent=content(),beforeRevision=before.revision,verified=await session();
        const valid=()=>verified.valid()&&identity(state())===beforeIdentity&&state().revision===beforeRevision;
        if(!valid()||blocked(state())||content()!==beforeContent)throw Error('Kontext nebo rozpracované změny se během přípravy změnily.');
        const operation=Object.freeze({valid,recordAcknowledgement(value){
          if(value?.settingsSaved===true&&Number.isSafeInteger(value.revision)&&value.revision>beforeRevision)committed=freezeAcknowledgedSnapshot(structuredClone(value));
        }});
        const result=await hooks.save(operation);
        if(result?.settingsSaved===true)operation.recordAcknowledgement(result);
        if(!verified.valid()||identity(state())!==beforeIdentity||!result?.settingsSaved||!Number.isSafeInteger(result.revision)||result.revision<=beforeRevision)throw Error('Úplné uložení v původním přihlášení nebylo potvrzené.');
        return result;
      }catch(error){
        if(committed){error.message='Nastavení bylo uloženo do Eduvize, dokončení operace ale nebylo potvrzené. '+error.message;error.settingsSaved=true;error.committed=committed;error.outputUpdated=typeof committed.outputUpdated==='boolean'?committed.outputUpdated:null;}
        hooks.report(error.message,error.settingsSaved?'partial':'error');throw error;
      }finally{saving=false;}
    }
    async function beforeSwitch(){
      if(!active||pending||saving)return false;pending=true;approval=null;
      try{
        if(state().busy)return false;if(!hooks.dirty())return true;if(blocked(state()))return false;
        const before=context(),beforeContent=content(),beforeRevision=state().revision,verified=await session();
        if(!verified.valid()||blocked(state())||context()!==before)return false;
        const choice=await departureChoice();if(!verified.valid()||blocked(state())||context()!==before)return false;
        if(choice==='cancel')return false;
        if(choice==='save'){
          try{await save();}catch{return false;}
          return verified.valid()&&!blocked(state())&&state().revision>beforeRevision&&content()===beforeContent&&!hooks.dirty();
        }
        if(choice!=='discard')return false;approval={context:before,expires:Date.now()+2000,session:verified};return true;
      }catch(error){hooks.report(error.message,'error');return false;}finally{pending=false;}
    }
    function consume(event,channel='shared'){
      if(!active||!event||event.type!=='beforeunload'||!['shared','native'].includes(channel))return false;
      let seen=events.get(event);if(!seen){const allowed=approval;approval=null;if(!allowed||allowed.expires<Date.now()||!allowed.session.valid()||allowed.context!==context())return false;seen={...allowed,used:new Set()};events.set(event,seen);}
      if(seen.expires<Date.now()||!seen.session.valid()||seen.context!==context()||seen.used.has(channel))return false;seen.used.add(channel);return true;
    }
    const mounted=Object.freeze({mounted:true,appId:hooks.appId,read:hooks.read,dirty:hooks.dirty,save,beforeSwitch,consume,activate(){
      if(active)return mounted;active=true;
      if(hooks.appId==='gallery'){const order=()=>{const panel=document.getElementById?.('gallery-school-profile');orderProfileSessionNodes(panel?.parentElement,panel);};order();root.addEventListener('eduvize-admin-auth-change',order);}
      root.addEventListener('beforeunload',event=>{if(consume(event,'shared'))return;if(hooks.dirty()){event.preventDefault();event.returnValue='';}});
      return mounted;
    }});return mounted;
  }
  async function mount(adapter){
    if(adapter?.app==='school-identity'){await root.EduvizeAdminAuth?.ready;if(!root.EduvizeAdminAuth?.status().schoolId)return;}
    if(!adapter||document.querySelector('[data-edu-profile-panel]'))return;
    if(root.EduvizeOutputModes&&!adapter.outputInteractionWrapped){const read=adapter.read.bind(adapter),apply=adapter.apply.bind(adapter);adapter.read=()=>{const value=read();return value?{...value,outputInteraction:root.EduvizeOutputModes.selection(),outputKioskLayout:root.EduvizeOutputModes.layoutSelection?.()}:value;};adapter.apply=async value=>{if(adapter.app!=='transport'){if(value.outputKioskLayout)root.EduvizeOutputModes.setKioskLayout?.(value.outputKioskLayout,{notify:false});if(value.outputInteraction)root.EduvizeOutputModes.setInteraction(value.outputInteraction,{notify:false});}await apply(value);if(value.outputKioskLayout)root.EduvizeOutputModes.setKioskLayout?.(value.outputKioskLayout);if(value.outputInteraction)root.EduvizeOutputModes.setInteraction(value.outputInteraction);};adapter.outputInteractionWrapped=true;}
    const main=document.querySelector('main.edu-admin-page,main .edu-admin-page,.edu-admin-page');if(!main)return;
    const ids={'school-calendar':'save','school-identity':'schoolSaveLocal','day-progress':'save',menu:'saveLocal',kiosk:'save',documents:'save-settings',weather:'weather-save-settings',holidays:'saveSettings',transport:'saveSettings',news:'saveLocal',wisdom:'saveLocal',styles:'saveLocal','school-systems':'save'};
    const opens={'school-calendar':'#open','day-progress':'#open',menu:'#open',kiosk:'#openKiosk',documents:'#open',weather:'button[form="location-settings"][type="submit"]',holidays:'#save',transport:'button[form="form"][type="submit"]',news:'#save',wisdom:'#openOutput','school-systems':'#open'};
    const copies={'school-calendar':'copy','day-progress':'copy',menu:'copy',kiosk:'shareTouch',documents:'copy',weather:'location-settings-cancel',holidays:'openOutput',transport:'copy',news:'copyUrl',wisdom:'copyOutput','school-systems':'copy'};
    const localKey='eduvize-local-configuration-v1:'+adapter.app;
    let local=document.getElementById(ids[adapter.app]);
    const copy=document.getElementById(copies[adapter.app]),open=document.querySelector(opens[adapter.app]||':not(*)');
    let row=(local||copy)?.closest('.edu-output-actions,.toolbar,.theme-action-buttons,.sis-admin-actions')||(local||copy)?.parentElement;
    if(adapter.app==='styles'){const nativeSave=document.getElementById('save');if(nativeSave)row=nativeSave.closest('.theme-action-buttons')||nativeSave.parentElement;}
    if(!row){row=make('div',null,'edu-output-actions');const server=document.getElementById('save');if(adapter.app==='styles'&&server)server.closest('.theme-action-panel').before(row);else main.append(row);}
    if(!local){local=button('Uložit v prohlížeči');local.id=ids[adapter.app];}
    // Retain native handlers for cloud adapters, but never invoke a local save.
    local.hidden=true;local.style.setProperty('display','none','important');local.setAttribute('aria-hidden','true');
    try{localStorage.removeItem(localKey);sessionStorage.removeItem('eduvize-profile-save-draft-v1:'+adapter.app+':'+location.pathname);}catch{}
    if(adapter.app==='kiosk'){const primary=make('div',null,'edu-output-actions');row.before(primary);row=primary;}
    local.textContent='Uložit v prohlížeči';
    const save=button(['styles','school-identity'].includes(adapter.app)?'Uložit do Eduvize':'Uložit nastavení',false);save.dataset.eduProfileSave='';
    for(const control of [save,local,copy,open].filter(Boolean)){const saving=control===save||control===local;control.className='edu-admin__button'+(saving?'':' edu-admin__button--secondary');control.dataset.eduOutputAction=saving?'save':'secondary';if(saving)control.dataset.eduSave='';}
    // Move existing controls so their original handlers and submit behavior survive.
    row.prepend(...[...(adapter.app==='school-identity'?[document.getElementById('school-edit')]:[]),save,local,copy,open].filter(Boolean));
    // Styles owns native labels and atomic theme+profile actions.
    if(open){open.textContent='Otevřít náhled';open.dataset.eduOpenOutput='';window.EduvizeAdminNavigation?.normalize(open);}
    if(copy)copy.textContent='Kopírovat odkaz';
    const panel=make('div',null,'edu-profile-current');panel.dataset.eduProfilePanel=adapter.app;panel.id='edu-profile-save';
    const profileText=make('p','Profil: ověřuji výběr…','edu-profile-current__name'),status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const manage=make('a','Účet a připojení','edu-admin__button edu-admin__button--secondary');manage.href=manageUrl('');const actions=make('div',null,'edu-admin__actions'),load=button('Načíst uložené nastavení'),undo=button('Vrátit před načtením');undo.hidden=true;load.hidden=true;actions.append(load,undo);panel.append(profileText,status,manage,actions);if(row)row.after(panel);else save.after(panel);
    if(adapter.app!=='school-identity'&&adapter.app!=='styles')mountServiceUpdates(adapter.app,panel);
    // Compatibility diagnostics are not part of administration action controls.
    let documentsNativeReady=adapter.app!=='documents';
    let recoveryEnabled=['news','school-calendar','weather','menu','kiosk','transport','wisdom','holidays','day-progress','school-systems','styles'].includes(adapter.app);
    const resultIds={news:'result','school-calendar':'status',weather:'weather-copy-status',menu:'output-status',kiosk:'status',transport:'status',wisdom:'outputStatus',holidays:'status','day-progress':'status','school-systems':'status',styles:'save-feedback',documents:'document-output-status'};
    const recoveryStatus=(recoveryEnabled||adapter.app==='documents')?createStatus({app:adapter.app,panel,profileNode:profileText,settingsNode:status,resultNode:document.getElementById(resultIds[adapter.app])}):null;
    let approvedDeparture=null,nativeDeparture=null;const departureEvents=new WeakMap();
    function registerDeparture(hooks){if(nativeDeparture||typeof hooks?.dirty!=='function'||typeof hooks?.read!=='function'||typeof hooks?.save!=='function')throw Error('Neplatná ochrana změn stylu.');if(adapter.app==='documents'&&(hooks.mounted!==true||hooks.appId!=='documents'))throw Error('Nativní ochrana Dokumentů nebyla potvrzena.');nativeDeparture=hooks;}
    let nativeSaveOperation=null,nativeSavePending=false,observedAuth=null;
    async function captureDocumentsSession(){
      const authInstance=auth(),generation=authObservation,state=authInstance.status(),schoolId=state.schoolId||'',capturedProfileId=state.profileId||'',scope=authInstance.getToken('configurations')?'configurations':'documents';
      const verified=await readContext(authInstance,scope);
      const valid=()=>auth()===authInstance&&authObservation===generation&&verified.valid()&&(authInstance.status().schoolId||'')===schoolId&&(authInstance.status().profileId||'')===capturedProfileId;
      if(!valid())throw Object.assign(Error('Přihlášení se během přípravy změnilo.'),{code:'DOCUMENTS_SESSION_CHANGED',settingsSaved:false});
      return Object.freeze({valid});
    }
    function observeDepartureAuth(){
      const scope=auth()?.getToken('configurations')?'configurations':'documents',token=auth()?.getToken(scope),signature=authSignature(auth()?.status());
      if(observedAuth&&(observedAuth.scope!==scope||observedAuth.token!==token||observedAuth.signature!==signature)){departureEpoch++;approvedDeparture=null;}
      observedAuth={scope,token,signature};
    }
    async function runNativeSave(){
      if(adapter.app!=='documents')return nativeDeparture.save();
      if(!documentsNativeReady||!recoveryEnabled||!nativeDeparture)throw Error('Souhrnné ukládání Dokumentů není potvrzené.');
      if(nativeSaveOperation||nativeSavePending)throw Error('Souhrnné ukládání Dokumentů již probíhá.');
      nativeSavePending=true;lastProfileCommit=null;let verifiedSession;try{verifiedSession=await captureDocumentsSession();}catch(error){nativeSavePending=false;throw error;}
      observeDepartureAuth();
      const epoch=departureEpoch,scope=observedAuth.scope,token=observedAuth.token,signature=observedAuth.signature,operationProfileId=profileId,operationSchoolId=auth()?.status().schoolId||'';
      const operation={expectedRevision:revision,valid:()=>{observeDepartureAuth();return verifiedSession.valid()&&!!token&&departureEpoch===epoch&&observedAuth.scope===scope&&observedAuth.token===token&&observedAuth.signature===signature&&profileId===operationProfileId&&activeId()===operationProfileId&&(auth()?.status().schoolId||'')===operationSchoolId;}};
      nativeSaveOperation=operation;nativeSavePending=false;
      try{
        const result=await nativeDeparture.save();
        if(!operation.valid())throw Object.assign(Error('Přihlášení se během ukládání Dokumentů změnilo.'),{settingsSaved:result?.settingsSaved===true,committed:result?.settingsSaved===true?structuredClone(result):null,outputUpdated:typeof result?.outputUpdated==='boolean'?result.outputUpdated:null});
        return result;
      }catch(error){if(error.settingsSaved===true&&lastProfileCommit&&!error.committed){error.committed=structuredClone(lastProfileCommit);error.outputUpdated=lastProfileCommit.outputUpdated??null;}throw error;}finally{nativeSaveOperation=null;}
    }
    const incompleteLegacyCommits=new Map();
    const legacyCommitScope=(schoolId=auth()?.status().schoolId||'',id=profileId)=>fingerprint([adapter.app,schoolId,id]);
    function legacyIncompleteCommit(){return incompleteLegacyCommits.get(legacyCommitScope())||null;}
    function rememberLegacyIncompleteCommit(ack){
      if(ack?.settingsSaved!==true||ack.appId!==adapter.app||!ack.schoolId||!ack.profileId||!Number.isSafeInteger(ack.revision)||ack.revision<0)return;
      const key=legacyCommitScope(ack.schoolId,ack.profileId),previous=incompleteLegacyCommits.get(key);
      if(!previous||previous.revision<=ack.revision)incompleteLegacyCommits.set(key,Object.freeze({schoolId:ack.schoolId,profileId:ack.profileId,appId:ack.appId,revision:ack.revision}));
    }
    function clearLegacyIncompleteCommit(schoolId=auth()?.status().schoolId||'',id=profileId,completedRevision=null){
      const key=legacyCommitScope(schoolId,id),pending=incompleteLegacyCommits.get(key);
      if(pending&&(completedRevision===null||Number.isSafeInteger(completedRevision)&&completedRevision>=pending.revision))incompleteLegacyCommits.delete(key);
    }
    function recoveryDirty(){return dirty()||!!nativeDeparture?.dirty()||!!legacyIncompleteCommit();}
    const changeStatus=make('p','Bez neuložených změn.','edu-profile-change-status');changeStatus.dataset.eduChangeStatus='';changeStatus.setAttribute('role','status');changeStatus.setAttribute('aria-live','polite');panel.prepend(changeStatus);
    let editBaseline='',userChanged=false;
    function resetEditState(message='Bez neuložených změn.'){changeStatus.hidden=!!recoveryStatus;userChanged=false;editBaseline=fingerprint(adapter.read());changeStatus.textContent=message;changeStatus.dataset.state='saved';}
    function showEditState(){if(!editBaseline)return;if(recoveryStatus){changeStatus.hidden=true;if(!busy&&!errorText)recoveryStatus.settings((adapter.app==='documents'?recoveryDirty():dirty())?'Máte neuložené změny.':loaded?'Všechny změny jsou uložené.':'Načítání nastavení…',(adapter.app==='documents'?recoveryDirty():dirty())?'dirty':loaded?'saved':'loading');return;}changeStatus.hidden=false;const changed=fingerprint(adapter.read())!==editBaseline;changeStatus.textContent=userChanged&&changed?'Neuložené změny.':'Bez neuložených změn.';changeStatus.dataset.state=userChanged&&changed?'dirty':'saved';}
    const ui={status};
    let verifiedIdentity=null,identityVerified=false,visualBusy=false,busy=false,profileId='',profileTitle='',revision=0,baseline='',backup=null,errorText='',loaded=false,ready=false,initialized=false,tracked='',needsLogin=false,restored=false,needsReload=false,profileApplyFailed=false,manualLoad=false,timer,kioskEdited=false,browserBaseline='';
    let outputProfileSchoolId='',outputReadGeneration=0,outputReadPending=false,outputApplyTail=Promise.resolve();
    const auth=()=>root.EduvizeAdminAuth;
    const canSave=()=>!!(auth()?.getToken('configurations')||auth()?.getToken('documents'));
    const activeId=()=>auth()?.status().profileId||'';
    outputProfileContexts.set(adapter,((appId)=>()=>({appId,schoolId:outputProfileSchoolId,profileId,tracked,ready,initialized,identityVerified,needsReload,profileApplyFailed,pending:outputReadPending,activeProfileId:activeId()}))(adapter.app));
    function profileName(){return profileTitle||'vybraný profil';}
    function say(text,state=''){text=contextualStatus(text);if(recoveryStatus){changeStatus.hidden=true;recoveryStatus.settings(text,state);return;}status.textContent=text;status.dataset.state=state;changeStatus.hidden=state==='saved'&&text.startsWith('Nastavení uloženo do Eduvize');}
    let segmentEdited=false,profilePicker=null;
    function dirty(){
      if(!baseline||(!userChanged&&adapter.app!=='news'))return false;
      const current=adapter.read(),saved=JSON.parse(baseline);
      if(!userChanged&&fingerprint(current.segment)===fingerprint(saved.segment))return false;
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
    function state(){save.disabled=visualBusy||!ready||needsReload||!documentsNativeReady;load.disabled=visualBusy||!ready||!canSave();load.hidden=!needsReload;undo.disabled=visualBusy;actions.hidden=load.hidden&&undo.hidden;manage.hidden=true;profileText.hidden=false;profileText.textContent='Profil: '+(profileTitle||(identityVerified?(profileId?'vybraný profil':'není vybrán'):'ověřuji výběr…'));if(profilePicker){profilePicker.select.disabled=visualBusy||!ready||!canSave();profilePicker.select.value=profileId;}}
    async function work(text,fn,{warm=false}={}){if(busy)return;clearTimeout(timer);busy=true;let loadingTimer;const loading=()=>{visualBusy=true;state();say(text);};if(warm)loadingTimer=setTimeout(loading,120);else loading();try{errorText='';await fn();}catch(e){errorText=e.message;needsLogin=[401,403].includes(e.status);if(e.status===409)needsReload=true;say(e.message,e.settingsSaved===true?'partial':'error');if(adapter.app==='school-identity')root.dispatchEvent(new CustomEvent('eduvize-school-card-error',{detail:{schoolId:auth()?.status().schoolId||'',profileId:activeId(),message:e.message}}));}finally{clearTimeout(loadingTimer);busy=false;visualBusy=false;state();}}
    function login(){
      const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Přihlášení se nepodařilo načíst. Obnovte stránku.');
      // No local draft or baseline reset: the existing unsaved-change guard remains active.
      if(baseline){userChanged=fingerprint(adapter.read())!==baseline;editBaseline=baseline;showEditState();}
      const url=new URL(location.href);url.searchParams.delete('edu-resume-save');url.searchParams.delete('edu-require-drive');url.hash='edu-profile-save';
      location.assign(auth.loginUrl(url.href));
    }
    async function readProfile(apply=false,{fresh=false,replace=false}={}){
      if(profileApplyFailed&&(!manualLoad||!apply))throw Object.assign(Error('Načtení nastavení selhalo. Použijte Načíst uložené nastavení nebo obnovte stránku.'),{code:'PROFILE_APPLY_FAILED'});
      const outputTicket=++outputReadGeneration,outputAuth=auth(),outputTarget=profileId,outputScope=outputAuth?.getToken('configurations')?'configurations':'documents',outputSchool=String(outputAuth?.status().schoolId||''),outputSignature=authSignature(outputAuth?.status());
      const outputCurrent=()=>outputTicket===outputReadGeneration&&auth()===outputAuth&&!!outputAuth.getToken(outputScope)&&authSignature(outputAuth.status())===outputSignature&&profileId===outputTarget&&activeId()===outputTarget;
      const checkOutputLoad=()=>{if(!outputCurrent())throw Object.assign(Error('Profil se během načítání změnil. Načtěte aktuálně vybraný profil.'),{code:'OUTPUT_PROFILE_NOT_APPLIED'});};
      const applyOutputConfig=config=>{
        const execute=async()=>{checkOutputLoad();const before=structuredClone(adapter.read());try{await adapter.apply(config);checkOutputLoad();return before;}catch(error){if(!outputCurrent())throw error;profileApplyFailed=true;needsReload=true;identityVerified=false;if(adapter.app==='transport'&&error?.code==='PROFILE_APPLY_SUPERSEDED')throw error;try{checkOutputLoad();await adapter.apply(before);checkOutputLoad();}catch{}throw Object.assign(Error('Nastavení se nepodařilo načíst. Použijte Načíst uložené nastavení. '+(error?.message||'')),{code:'PROFILE_APPLY_FAILED',cause:error});}};
        const queued=outputApplyTail.then(execute,execute);outputApplyTail=queued.then(()=>undefined,()=>undefined);return queued;
      };
      if(apply)outputReadPending=true;
      try{checkOutputLoad();
      const beforeRestore=replace&&apply?fingerprint(adapter.read()):'';
      const p=await request('/'+outputTarget,{fresh:manualLoad||fresh||adapter.app==='school-identity'&&apply});checkOutputLoad();if(p.id!==undefined&&p.id!==outputTarget)throw Error('Server vrátil jiný profil.');const entry=p.apps[adapter.app],incoming=entry?.revision||0;identityVerified=true;profileTitle=p.name;
      if(profilePicker&&!pickerListLoaded)options(profilePicker.select,[{id:profileId,name:profileTitle||'Aktivní profil'}],profileId);
      // An explicit history restore replaces the confirmed draft, but not edits
      // made while its fresh read was in flight.
      const preserveEditing=apply&&(replace?fingerprint(adapter.read())!==beforeRestore:!manualLoad&&(userChanged||dirty()||adapter.app==='school-identity'&&adapter.isEditing?.()));
      if(!apply&&tracked!==outputTarget){needsReload=true;say('Nejprve načtěte nastavení vybraného profilu.','error');return;}
      if(!apply&&tracked===profileId){if(incoming!==revision){needsReload=true;say('Na Eduvize je novější nastavení. Před uložením je načtěte.','error');return;}say(dirty()?'Změny nejsou uložené do Eduvize.':loaded?'Uloženo do Eduvize.':'Dosud neuloženo do Eduvize.',dirty()?'dirty':'saved');return;}
      if(entry&&!entry.config.empty&&apply&&!preserveEditing){const before=await applyOutputConfig(structuredClone(entry.config));if(manualLoad){backup=before;undo.hidden=false;}}
      if(!entry&&apply&&!preserveEditing&&adapter.app==='school-identity')await applyOutputConfig({schemaVersion:1,data:{}});
      if(apply&&!preserveEditing){profileApplyFailed=false;userChanged=false;resetEditState();}
      checkOutputLoad();outputProfileSchoolId=outputSchool;revision=incoming;tracked=profileId;needsReload=false;loaded=!!entry&&!entry.config.empty;baseline=fingerprint(preserveEditing?(loaded?entry.config:{schemaVersion:1,data:{}}):(apply||!loaded?adapter.read():entry.config));
      if(apply&&!preserveEditing)adapter.onProfileReady?.();
      if(replace&&preserveEditing){needsReload=true;say('Verze byla obnovena v Eduvizi. Před načtením zkontrolujte nově rozepsané změny.','dirty');return;}
      say(loaded?(apply&&!preserveEditing?(adapter.loadedMessage||statusMessages.loaded):dirty()?statusMessages.dirty:statusMessages.saved()):'Tento profil zatím nemá uložené nastavení aplikace. Upravte je a uložte do Eduvize.',dirty()?'dirty':'saved');
      if(adapter.app==='school-identity'&&apply&&!preserveEditing)root.dispatchEvent(new CustomEvent('eduvize-school-card-ready',{detail:{schoolId:outputSchool,profileId:outputTarget,revision:incoming}}));
      }finally{if(outputTicket===outputReadGeneration){outputReadPending=false;if(!outputCurrent()){needsReload=true;identityVerified=false;}}}
    }
    async function list(initial=false){
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId){profileId='';return;}
      if(!canSave()){const state=auth()?.status();say(!state?.connected&&state?.expiresAt?(state.message||'Ověřuji přihlášení…'):'Pro uložení do Eduvize se přihlaste. Rozpracované změny zůstanou zachované.');return;}
      // The validated session owns the active profile. The editor needs only
      // that profile's configuration; the full list belongs to the picker.
      const active=auth()?.status().profileId;
      if(!active){profileId='';profileTitle='';say('Přihlaste se k účtu školy.');return;}
      if(tracked&&active!==profileId&&!restored){if(dirty()){needsReload=true;say('Změnil se vybraný profil. Uložte rozpracované změny před načtením jiného profilu.','error');return;}profileId=active;revision=0;tracked='';select(profileId);manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}backup=null;undo.hidden=true;return;}
      if(active!==profileId){profileId=active;revision=0;tracked='';}
      needsLogin=false;select(profileId);await readProfile(initial);
      if(restored){if(!needsReload)say('Rozpracované změny obnoveny. Uloží se do nastavení školy.','dirty');restored=false;requestAnimationFrame(()=>panel.scrollIntoView({block:'nearest'}));}
    }
    load.onclick=()=>work('Načítám uložené nastavení…',async()=>{if(dirty()&&!confirm('Nahradit rozpracované změny uloženým nastavením? Původní místní stav půjde vrátit.'))return;await auth().refresh();if(!activeId())throw Error('Nejprve připojte účet školy na stránce Účet a konfigurace.');profileId=activeId();tracked='';manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}});
    let lastProfileCommit=null;
    const legacySaveProfileWork=(stylesCommit=null)=>work('Připravuji uložení…',async()=>{
      const requiredOutput=['news','menu','gallery','transport','kiosk','wisdom','weather','day-progress','holidays','school-calendar','school-systems'].includes(adapter.app),verifiedActions=adapter.outputActions,verifiedSave=adapter.outputActions?.withSavedCommit;
      const workflowReady=()=>!requiredOutput||(adapter.outputActions===verifiedActions&&verifiedActions?.workflow==='saved-copy-preview'&&typeof verifiedSave==='function'&&verifiedActions.withSavedCommit===verifiedSave);
      if(!workflowReady())throw Object.assign(Error('Ovládání uloženého výstupu se ještě nenačetlo. Obnovte stránku a zkuste uložit znovu.'),{code:'OUTPUT_WORKFLOW_REQUIRED',settingsSaved:false});
      let operationContext=null,operationAuth=null,operationEpoch=0,acknowledged=null;
      const operationValid=()=>!requiredOutput||(auth()===operationAuth&&authObservation===operationEpoch&&operationContext?.valid()&&workflowReady());
      const partialError=cause=>Object.assign(Error(cause?.message||'Uložení a výstup nebylo možné úplně potvrdit.'),{code:cause?.code||'OUTPUT_SAVE_UNCONFIRMED',status:cause?.status,settingsSaved:!!acknowledged,committed:acknowledged?structuredClone(acknowledged):null,outputUpdated:acknowledged?.outputUpdated??null,cause});
      const checkOperation=()=>{if(!operationValid())throw partialError(Object.assign(Error('Přihlášení nebo ovládání výstupu se během ukládání změnily.'),{code:'CONTEXT_CHANGED'}));};
      if(profileApplyFailed)throw Object.assign(Error('Nastavení se nepodařilo načíst. Před uložením použijte Načíst uložené nastavení.'),{code:'PROFILE_APPLY_FAILED'});
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId)return;
      adapter.validate?.();
      await auth()?.ready;if(!canSave()||needsLogin){login();return;}
      await auth().refresh();if(!canSave()){login();return;}
      if(!activeId())await schoolConfiguration();
      if(activeId()!==profileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
      if(requiredOutput){operationAuth=auth();operationEpoch=authObservation;operationContext=await readContext(operationAuth,operationAuth.getToken('configurations')?'configurations':'documents');}
      const saveProfileId=profileId,saveSchoolId=auth().status().schoolId||'';
      const commit=async()=>{
        checkOperation();
        if(!canSave()||(auth().status().schoolId||'')!==saveSchoolId)throw Object.assign(Error('Přihlášení se během přípravy uložení změnilo.'),{status:403});
        if(activeId()!==saveProfileId||profileId!==saveProfileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
        adapter.validate?.();
        if(stylesCommit&&(adapter.app!=='styles'||stylesCommit.expectedProfileId!==saveProfileId||stylesCommit.expectedSchoolId!==saveSchoolId))throw Error('Účet nebo profil uloženého stylu se změnily.');
        const snapshot=structuredClone(stylesCommit?stylesCommit.config:adapter.read());say('Ukládání…','saving');
        const expectedCommitRevision=revision,requestOptions={method:'PUT',body:JSON.stringify({expectedRevision:revision,config:snapshot})};
        const currentCommit=()=>operationValid()&&activeId()===saveProfileId&&profileId===saveProfileId&&(auth().status().schoolId||'')===saveSchoolId&&revision===expectedCommitRevision;
        if(requiredOutput){requestOperationGuards.set(requestOptions,currentCommit);requestAcknowledgementObservers.set(requestOptions,ack=>{if(Number.isSafeInteger(ack?.revision)&&ack.revision===expectedCommitRevision+1)acknowledged=freezeAcknowledgedSnapshot({settingsSaved:true,schoolId:saveSchoolId,profileId:saveProfileId,appId:adapter.app,revision:ack.revision,config:structuredClone(snapshot),outputUpdated:null});});}
        let result;try{result=await request('/'+saveProfileId+'/apps/'+adapter.app,requestOptions);}catch(cause){if(requiredOutput)throw partialError(cause);throw cause;}finally{requestAcknowledgementObservers.delete(requestOptions);requestOperationGuards.delete(requestOptions);}
        if(requiredOutput){if(!currentCommit())throw partialError(Object.assign(Error('Kontext se po potvrzení uložení změnil.'),{code:'CONTEXT_CHANGED'}));if(!Number.isSafeInteger(result?.revision)||result.revision!==expectedCommitRevision+1)throw partialError(Error('Server nepotvrdil platnou revizi uloženého nastavení.'));}
        revision=result.revision;baseline=fingerprint(snapshot);loaded=true;
        if(adapter.app==='day-progress'&&typeof adapter.afterSaved==='function'){
          try{await adapter.afterSaved(result);}
          catch(cause){throw Object.assign(new Error('Nastavení bylo uloženo, potvrzení hodin a aktualizace výstupu se nezdařily. '+(cause?.message||'')),{code:'SETTINGS_SAVED_ACK_FAILED',settingsSaved:true,cause});}
        }
        return {profileId:saveProfileId,appId:adapter.app,revision:result.revision,config:snapshot};
      };
      checkOperation();const outputActions=requiredOutput?verifiedActions:adapter.outputActions;
      if(outputActions?.workflow==='saved-copy-preview'&&typeof outputActions.withSavedCommit==='function'){
        try{const published=await outputActions.withSavedCommit(commit);if(requiredOutput){if(published?.settingsSaved!==true||typeof published.outputUpdated!=='boolean')throw partialError(Error('Uložení nastavení a výstupu nebylo potvrzené.'));if(acknowledged)acknowledged=freezeAcknowledgedSnapshot({...acknowledged,outputUpdated:published.outputUpdated});checkOperation();}}
        catch(error){
          if(requiredOutput&&acknowledged)rememberLegacyIncompleteCommit(acknowledged);
          if(error?.code==='OUTPUT_UPDATE_FAILED'&&error.settingsSaved===true)throw Object.assign(Error(publicationFailureMessage(error)),{code:error.code,settingsSaved:true,committed:acknowledged?structuredClone(acknowledged):error.savedCommit||null,outputUpdated:acknowledged?.outputUpdated??null,cause:error});
          if(requiredOutput&&acknowledged)throw partialError(error);throw error;
        }
      }else await commit();
      checkOperation();
      if(requiredOutput&&acknowledged&&legacyCommitScope(saveSchoolId,saveProfileId)===legacyCommitScope())clearLegacyIncompleteCommit(saveSchoolId,saveProfileId,acknowledged.revision);
      say(dirty()?'Nastavení bylo uloženo, ale ve formuláři vznikly další neuložené změny.':statusMessages.saved(acknowledged?.outputUpdated),dirty()?'dirty':'saved');
    });
    const saveDocumentsProfileWork=(stylesCommit=null)=>work('Připravuji uložení…',async()=>{
      lastProfileCommit=null;
      if(adapter.app==='school-identity'&&!auth()?.status().schoolId)return;
      adapter.validate?.();
      await auth()?.ready;if(!canSave()||needsLogin){login();return;}
      await auth().refresh();if(!canSave()){login();return;}
      if(!activeId())await schoolConfiguration();
      if(activeId()!==profileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
      const saveProfileId=profileId,saveSchoolId=auth().status().schoolId||'';
      const commit=async()=>{
        if(!canSave()||(auth().status().schoolId||'')!==saveSchoolId)throw Object.assign(Error('Přihlášení se během přípravy uložení změnilo.'),{status:403});
        if(activeId()!==saveProfileId||profileId!==saveProfileId){needsReload=true;throw Error('Nastavení školy se změnilo. Před uložením je načtěte.');}
        adapter.validate?.();
        if(stylesCommit&&(!['styles','documents'].includes(adapter.app)||stylesCommit.expectedProfileId!==saveProfileId||stylesCommit.expectedSchoolId!==saveSchoolId||(adapter.app==='documents'&&stylesCommit.expectedRevision!==revision)))throw Error('Účet nebo profil uloženého stylu se změnily.');
        if(adapter.app==='documents'&&stylesCommit&&(!stylesCommit.currentContext()||fingerprint(adapter.read())!==fingerprint(stylesCommit.config)))throw Error('Během přípravy uložení se změnila konfigurace Dokumentů.');
        const snapshot=structuredClone(stylesCommit?stylesCommit.config:adapter.read());say('Ukládání…','saving');
        const expectedCommitRevision=revision,requestOptions={method:'PUT',body:JSON.stringify({expectedRevision:revision,config:snapshot})};
        if(adapter.app==='documents'){requestOperationGuards.set(requestOptions,stylesCommit.currentContext);requestAcknowledgementObservers.set(requestOptions,ack=>{if(Number.isSafeInteger(ack?.revision)&&ack.revision>expectedCommitRevision)lastProfileCommit=Object.freeze({settingsSaved:true,schoolId:saveSchoolId,profileId:saveProfileId,appId:adapter.app,revision:ack.revision,config:freezeAcknowledgedSnapshot(structuredClone(snapshot)),publicationConfirmed:false,outputUpdated:null});});}
        let result;try{result=await request('/'+saveProfileId+'/apps/'+adapter.app,requestOptions);}finally{requestAcknowledgementObservers.delete(requestOptions);requestOperationGuards.delete(requestOptions);}
        if(adapter.app!=='documents')lastProfileCommit={settingsSaved:true,schoolId:saveSchoolId,profileId:saveProfileId,appId:adapter.app,revision:result.revision,config:structuredClone(snapshot),publicationConfirmed:false,outputUpdated:null};
        if(adapter.app==='documents'&&(!stylesCommit?.currentContext()||activeId()!==saveProfileId||profileId!==saveProfileId||(auth()?.status().schoolId||'')!==saveSchoolId||revision!==stylesCommit.expectedRevision||!Number.isSafeInteger(result.revision)||result.revision<=stylesCommit.expectedRevision))throw Object.assign(Error('Kontext nebo revize odpovědi se změnily; úplné uložení nebylo potvrzené.'),{settingsSaved:true});
        revision=result.revision;baseline=fingerprint(snapshot);loaded=true;
        if(adapter.app==='day-progress'&&typeof adapter.afterSaved==='function'){
          try{await adapter.afterSaved(result);}
          catch(cause){throw Object.assign(new Error('Nastavení bylo uloženo, potvrzení hodin a aktualizace výstupu se nezdařily. '+(cause?.message||'')),{code:'SETTINGS_SAVED_ACK_FAILED',settingsSaved:true,cause});}
        }
        return {profileId:saveProfileId,appId:adapter.app,revision:result.revision,config:snapshot};
      };
      const outputActions=adapter.outputActions;
      if(outputActions?.workflow==='saved-copy-preview'&&typeof outputActions.withSavedCommit==='function'){
        try{const published=await outputActions.withSavedCommit(commit);if(lastProfileCommit&&published?.settingsSaved===true&&typeof published.outputUpdated==='boolean'){lastProfileCommit=Object.freeze({...lastProfileCommit,publicationConfirmed:true,outputUpdated:published.outputUpdated});}}
        catch(error){
          if(error?.code==='OUTPUT_UPDATE_FAILED'&&error.settingsSaved===true)throw Error(publicationFailureMessage(error));
          throw error;
        }
      }else await commit();
      say(dirty()?'Nastavení bylo uloženo, ale ve formuláři vznikly další neuložené změny.':statusMessages.saved(copy?lastProfileCommit?.outputUpdated:null),dirty()?'dirty':'saved');
    });
    const saveProfileWork=(options=null)=>adapter.app==='documents'?saveDocumentsProfileWork(options):legacySaveProfileWork(options);
    save.onclick=adapter.app==='documents'?null:()=>saveProfileWork();
    if(adapter.app==='documents'){
      const saveProfile=async(options={})=>{
        if(busy||!ready||!initialized||!identityVerified||needsLogin||needsReload)throw Error('Nejprve načtěte aktuální školní profil.');
        const before={profileId,schoolId:auth()?.status().schoolId||'',revision};
        const contextScope=auth()?.getToken('configurations')?'configurations':'documents',contextToken=auth()?.getToken(contextScope),contextSignature=authSignature(auth()?.status()),contextEpoch=departureEpoch;
        const currentContext=()=>!!contextToken&&(adapter.app!=='documents'||!!nativeSaveOperation&&nativeSaveOperation.expectedRevision===options.expectedRevision&&nativeSaveOperation.valid())&&auth()?.getToken(contextScope)===contextToken&&authSignature(auth()?.status())===contextSignature&&departureEpoch===contextEpoch;
        if(adapter.app==='documents'){if(!Number.isSafeInteger(options.expectedRevision)||options.expectedRevision<0||options.expectedRevision!==before.revision)throw Object.assign(Error('Revize konfigurace Dokumentů se změnila.'),{code:'REVISION_CONFLICT',settingsSaved:false});if(adapter.outputActions?.workflow!=='saved-copy-preview'||typeof adapter.outputActions.withSavedCommit!=='function')throw Object.assign(Error('Ovládání publikovaného výstupu Dokumentů není dostupné.'),{code:'DEPENDENCY_UNAVAILABLE',settingsSaved:false});}
        if(!before.profileId||activeId()!==before.profileId||options.expectedProfileId!==before.profileId||options.expectedSchoolId!==before.schoolId)throw Error('Účet nebo profil uloženého stylu se změnily.');
        const config=structuredClone(options.config);
        if(adapter.app==='styles'&&(config?.schemaVersion!==1||!config.data?.theme||typeof config.data.selected!=='string'||typeof config.data.name!=='string'))throw Error('Chybí platný snímek uloženého stylu.');
        if(adapter.app==='documents'&&(config?.schemaVersion!==1||!config.values||typeof config.values!=='object'||Array.isArray(config.values)||!config.presentation))throw Error('Chybí platný snímek konfigurace Dokumentů.');
        if(!currentContext())throw Error('Přihlašovací kontext se změnil.');
        await saveProfileWork({...options,config,currentContext});
        if(!currentContext()||errorText||needsLogin||needsReload||!loaded||!Number.isSafeInteger(revision)||revision<=before.revision||profileId!==before.profileId||activeId()!==before.profileId||(auth()?.status().schoolId||'')!==before.schoolId||(adapter.app==='documents'&&(!lastProfileCommit?.publicationConfirmed||fingerprint(lastProfileCommit.config)!==fingerprint(config))))throw Object.assign(Error(errorText||'Uložení konfigurace a výstupu nebylo potvrzené.'),{code:lastProfileCommit?'PROFILE_SAVED_OUTPUT_UNCONFIRMED':'PROFILE_SAVE_UNCONFIRMED',settingsSaved:!!lastProfileCommit,committed:lastProfileCommit?structuredClone(lastProfileCommit):null,outputUpdated:lastProfileCommit?.outputUpdated??null});
        return {settingsSaved:true,schoolId:before.schoolId,profileId,appId:adapter.app,revision,config:JSON.parse(baseline),pendingEdits:fingerprint(adapter.read())!==baseline,outputUpdated:lastProfileCommit?.outputUpdated??null,...(adapter.app==='documents'?{publicationConfirmed:lastProfileCommit.publicationConfirmed}:{} )};
      };
      const nativeActions={saveProfile,local,profileSaveButton:save,profilePanel:panel,getState:()=>({dirty:dirty(),busy,errorText,needsLogin,needsReload,revision,profileId,schoolId:auth()?.status().schoolId||''}),registerDeparture,consumeDepartureApproval:event=>consumeRecoveryApproval(event,'native')};
      if(adapter.app==='styles')adapter.mountStyleActions?.(nativeActions);else{try{if(typeof adapter.mountDocumentActions!=='function')throw Error('Nativní souhrnné ukládání Dokumentů není připojené.');const mounted=adapter.mountDocumentActions(nativeActions);if(!mounted||mounted.mounted!==true||mounted.appId!=='documents'||mounted!==nativeDeparture)throw Error('Souhrnná ochrana Dokumentů nebyla potvrzena.');documentsNativeReady=true;recoveryEnabled=true;save.onclick=async()=>{try{await runNativeSave();}catch(error){errorText=error.message;say(error.message,error.settingsSaved?'partial':'error');}};}catch(error){nativeDeparture=null;recoveryEnabled=false;documentsNativeReady=false;errorText=error.message;say(error.message,'error');save.onclick=()=>{say('Nejprve obnovte úplné souhrnné ukládání Dokumentů.','error');};}}
    }
    if(adapter.app==='styles'){
      const saveProfile=async(options={})=>{
        if(busy||!ready||!initialized||!identityVerified||needsLogin||needsReload)throw Error('Nejprve načtěte aktuální školní profil.');
        const before={profileId,schoolId:auth()?.status().schoolId||'',revision};
        if(!before.profileId||activeId()!==before.profileId||options.expectedProfileId!==before.profileId||options.expectedSchoolId!==before.schoolId)throw Error('Účet nebo profil uloženého stylu se změnily.');
        const config=structuredClone(options.config);
        if(config?.schemaVersion!==1||!config.data?.theme||typeof config.data.selected!=='string'||typeof config.data.name!=='string')throw Error('Chybí platný snímek uloženého stylu.');
        await saveProfileWork({...options,config});
        if(errorText||needsLogin||needsReload||!loaded||!Number.isSafeInteger(revision)||revision<=before.revision||profileId!==before.profileId||activeId()!==before.profileId||(auth()?.status().schoolId||'')!==before.schoolId)throw Error(errorText||'Uložení konfigurace profilu nebylo potvrzené.');
        return {settingsSaved:true,profileId,appId:adapter.app,revision,config:JSON.parse(baseline),pendingEdits:fingerprint(adapter.read())!==baseline};
      };
      adapter.mountStyleActions?.({saveProfile,local,profileSaveButton:save,profilePanel:panel,getState:()=>({dirty:dirty(),busy,errorText,needsLogin,needsReload}),registerDeparture,consumeDepartureApproval:event=>consumeRecoveryApproval(event,'native')});
    }
    let cardDeparture=null;
    if(adapter.app==='school-identity'){
      save.onclick=null;let registered=null;
      const saveCard=async(options,operation)=>{
        if(busy||!ready||!initialized||!identityVerified||needsLogin||needsReload||!operation.valid())throw Error('Nejprve načtěte aktuální kartu školy.');
        const expected={schoolId:auth()?.status().schoolId||'',profileId,revision};
        if(!expected.schoolId||!expected.profileId||activeId()!==expected.profileId||options.expectedSchoolId!==expected.schoolId||options.expectedProfileId!==expected.profileId||options.expectedRevision!==expected.revision)throw Error('Profil nebo revize karty školy se změnily.');
        const config=structuredClone(options.config);adapter.validate?.();
        if(config?.schemaVersion!==1||!config.data||fingerprint(config)!==fingerprint(adapter.read()))throw Error('Snímek karty školy se změnil.');
        const current=()=>operation.valid()&&profileId===expected.profileId&&activeId()===expected.profileId&&revision===expected.revision&&(auth()?.status().schoolId||'')===expected.schoolId;
        if(!current())throw Error('Přihlášení se změnilo.');
        const requestOptions={method:'PUT',body:JSON.stringify({expectedRevision:expected.revision,config})};
        requestOperationGuards.set(requestOptions,current);requestAcknowledgementObservers.set(requestOptions,ack=>operation.recordAcknowledgement({settingsSaved:true,appId:'school-identity',schoolId:expected.schoolId,profileId:expected.profileId,revision:ack?.revision,config,outputUpdated:false}));
        clearTimeout(timer);busy=true;state();say('Ukládání karty školy…','saving');let result;
        try{result=await request('/'+expected.profileId+'/apps/school-identity',requestOptions);}
        finally{requestAcknowledgementObservers.delete(requestOptions);requestOperationGuards.delete(requestOptions);busy=false;state();}
        if(!current()||!Number.isSafeInteger(result?.revision)||result.revision<=expected.revision)throw Error('Kontext nebo revize potvrzení karty školy se změnily.');
        // A card has no published output. Only this confirmed server snapshot becomes its baseline.
        revision=result.revision;baseline=fingerprint(config);loaded=true;errorText='';
        const pendingEdits=fingerprint(adapter.read())!==baseline;
        adapter.confirmCardSaved?.(config);showEditState();say(pendingEdits?'Během ukládání vznikly další neuložené změny.':'Karta školy uložena do Eduvize.',pendingEdits?'dirty':'saved');
        return {settingsSaved:true,appId:'school-identity',schoolId:expected.schoolId,profileId:expected.profileId,revision,config,pendingEdits,outputUpdated:false};
      };
      try{
        if(typeof adapter.mountCardDeparture!=='function')throw Error('Nativní ochrana karty školy není připojená.');
        const mounted=adapter.mountCardDeparture({mountDeparture:hooks=>{if(registered)throw Error('Ochrana karty školy je již registrovaná.');registered=mountNativeDeparture(hooks);return registered;},saveProfile:saveCard,getState:()=>({ready:ready&&initialized&&identityVerified,dirty:dirty(),busy,needsLogin,needsReload,revision,profileId,schoolId:auth()?.status().schoolId||'',selectionId:'school-card'}),report:(text,kind)=>{errorText=text;say(text,kind);}});
        if(!mounted||mounted!==registered||mounted.mounted!==true||mounted.appId!=='school-identity'||!['read','dirty','save','beforeSwitch','consume','activate'].every(key=>typeof mounted[key]==='function'))throw Error('Zapojení ochrany karty školy nebylo potvrzené.');
        cardDeparture=mounted;mounted.activate();save.onclick=async()=>{try{await mounted.save();}catch{}};
      }catch(error){cardDeparture=null;errorText=error.message;say(error.message,'error');save.onclick=()=>say('Nejprve obnovte nativní ochranu karty školy.','error');}
    }
    manage.onclick=event=>{event.preventDefault();work('Otevírám výběr profilu…',async()=>login());};
    undo.onclick=()=>work('Vracím místní nastavení…',async()=>{if(!backup)return;const previous=backup;backup=structuredClone(adapter.read());await adapter.apply(previous);userChanged=true;showEditState();say('Místní nastavení obnoveno.','dirty');});
    function changed(event){
      if(!panel.contains(event.target)&&event.target!==save&&event.target!==local){
        const field=['input','change'].includes(event.type)&&event.target.matches?.('input,select,textarea,[contenteditable]')&&!event.target.readOnly&&!event.target.disabled;
        const action=event.type==='click'&&event.target.closest?.('button')&&!event.target.closest('.edu-output-actions,.toolbar,.theme-action-buttons,.sis-admin-actions,.day-actions');
        const segment=event.type==='click'&&!!event.target.closest?.('#ev-segments .ev-box');
        if((event.isTrusted&&(field||action||segment))||event.type==='eduvize-profile-change'){userChanged=true;recoveryStatus?.edit();}
        if(!userChanged&&editBaseline&&!event.isTrusted&&event.type!=='click')editBaseline=fingerprint(adapter.read());
        showEditState();
      }
      if(panel.contains(event.target)||event.target===save||busy||needsReload)return;clearTimeout(timer);timer=setTimeout(()=>{if(!baseline)return;if(dirty()){if(!errorText)say('Máte neuložené změny.','dirty');}else if(!errorText)say(loaded?'Uloženo do Eduvize.':'Dosud neuloženo do Eduvize.',loaded?'saved':'');},200);}
    for(const event of ['input','change','click','eduvize-profile-change'])document.addEventListener(event,changed);
    // Automatic preview/profile refreshes must never create an exit warning.
    if(['kiosk','transport'].includes(adapter.app)){
      const edited=event=>{if(!event.isTrusted||panel.contains(event.target)||event.target.readOnly||event.target.disabled)return;if(adapter.app==='transport'&&!event.target.matches('#source,#minutes,#limit,#pageSeconds,#nearbyKm,#viewMode,#transport input'))return;kioskEdited=true;};
      for(const type of ['input','change'])document.addEventListener(type,edited,true);
      document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('#addButton,#newPage,#deletePage,.edu-item-editor__actions'))kioskEdited=true;},true);
      if(adapter.app==='transport')document.addEventListener('click',event=>{if(event.isTrusted&&event.target.closest('#selected button,#suggestions button,#nearby button[data-stop],#selectedStops,#selected-stops,.selected-stops,.stop-chip'))kioskEdited=true;},true);
      document.addEventListener('eduvize-configuration-saved',()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;});
      if(!recoveryEnabled)local.addEventListener('click',()=>queueMicrotask(()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;}));
      // The kiosk's share handler saves the native local configuration before copying.
      if(!recoveryEnabled&&adapter.app==='kiosk'&&copy)copy.addEventListener('click',()=>queueMicrotask(()=>{browserBaseline=departureFingerprint(adapter.read());kioskEdited=false;}));
    }
    root.addEventListener('beforeunload',event=>{if(adapter.app==='school-identity'&&cardDeparture)return;if(recoveryEnabled&&consumeRecoveryApproval(event,'shared'))return;if(legacyIncompleteCommit()){event.preventDefault();event.returnValue='';return;}if(!profileId||!baseline||(['kiosk','transport'].includes(adapter.app)&&!kioskEdited))return;const current=departureFingerprint(adapter.read()),saved=departureFingerprint(JSON.parse(baseline));if(current!==saved&&current!==browserBaseline){event.preventDefault();event.returnValue='';}});
    root.addEventListener('eduvize-admin-auth-change',()=>{if(verifiedIdentity?.valid()||verifiedIdentity?.sameIdentity?.())return;identityVerified=false;profileTitle='';state();if(ready&&initialized&&!busy)work('Ověřuji aktivní profil…',()=>list(false));});
    watchAuth(()=>{state();if(ready&&initialized&&!busy)work('Ověřuji aktivní profil…',()=>list(false));});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready&&!busy)auth()?.refresh();});
    const picker=make('section',null,'edu-profile-panel edu-admin__card');picker.setAttribute('aria-label','Aktivní profil školy');const globalPicker=!!document.getElementById('workflow-profile-select');
    const header=main.querySelector('.edu-page-header');if(header)header.after(picker);else main.prepend(picker);
    profilePicker=controls(picker);profilePicker.reload.textContent='Správa profilů';profilePicker.reload.onclick=()=>{location.assign(manageUrl(profileId));};
    function orderProfileAndSession(){if(adapter.app==='styles'||adapter.app==='school-identity')return;orderProfileSessionNodes(main,picker); }
    orderProfileAndSession();root.addEventListener('eduvize-admin-auth-change',orderProfileAndSession);
    let pickerListLoaded=false,pickerLoad=null;
    async function refreshPicker(){
      if(globalPicker||!canSave())return;
      if(pickerLoad)return pickerLoad;
      pickerLoad=(async()=>{try{const result=await request('');options(profilePicker.select,result.items,profileId||auth().status().profileId);pickerListLoaded=true;profilePicker.status.textContent='';}catch(error){profilePicker.status.textContent='Seznam profilů se nepodařilo načíst: '+error.message;}finally{pickerLoad=null;}})();
      return pickerLoad;
    }
    picker.hidden=globalPicker;
    profilePicker.select.addEventListener('pointerdown',event=>{if(pickerListLoaded||!canSave())return;event.preventDefault();profilePicker.status.textContent='Načítám profily…';void refreshPicker();});
    profilePicker.select.addEventListener('focus',()=>{if(!pickerListLoaded&&canSave())void refreshPicker();});
    root.addEventListener('eduvize-profile-updated',event=>{
      if(!ready||!initialized)return;
      work('Načítám změnu profilu…',async()=>{
        if(event.detail?.id===profileId)await readProfile(!!event.detail.restore,{fresh:true,replace:!!event.detail.restore});
        if(pickerListLoaded)await refreshPicker();
      });
    });
    let departureEpoch=0;
    root.addEventListener('eduvize-admin-auth-change',()=>{if(adapter.app==='documents'){departureEpoch++;approvedDeparture=null;}});
    root.addEventListener('eduvize-profile-selected',()=>{if(adapter.app==='documents'){departureEpoch++;approvedDeparture=null;}});
    function recoveryContent(){observeDepartureAuth();return fingerprint([authObservation,departureEpoch,profileId,activeId(),auth()?.status().schoolId||'',adapter.read(),nativeDeparture?nativeDeparture.read():null]);}
    function documentsRecoveryContext(){return fingerprint([revision,recoveryContent()]);}
    function consumeDocumentsApproval(event,channel='shared'){if(!event||typeof event!=='object'||event.type!=='beforeunload')return false;let seen=departureEvents.get(event);if(!seen){const approval=approvedDeparture;approvedDeparture=null;if(!approval||approval.expires<Date.now()||approval.context!==recoveryContext())return false;seen={context:approval.context,expires:approval.expires,used:new Set()};departureEvents.set(event,seen);}if(seen.expires<Date.now()||seen.context!==recoveryContext()||seen.used.has(channel))return false;seen.used.add(channel);return true;}
    const documentsBeforeSwitch=async()=>{
      if(!recoveryEnabled){      if(!dirty())return true;
      if(confirm('Před přepnutím profilu uložit rozpracované změny do Eduvize?')){await save.onclick();return !dirty()&&!errorText;}
      if(!confirm('Přepnout profil a zahodit rozpracované změny?'))return false;
      userChanged=false;return true;
      }
      approvedDeparture=null;if(busy||needsLogin||needsReload)return false;if(!recoveryDirty())return true;
      const before=recoveryContext(),beforeContent=recoveryContent(),beforeRevision=revision,choice=await departureChoice();if(before!==recoveryContext())return false;
      if(choice==='cancel')return false;
      if(choice==='save'){try{if(nativeDeparture)await runNativeSave();else await save.onclick();}catch(error){errorText=error.message;say(error.message,error.settingsSaved?'partial':'error');return false;}return !busy&&!errorText&&!needsLogin&&!needsReload&&revision>beforeRevision&&beforeContent===recoveryContent()&&!recoveryDirty()&&!['error','partial'].includes(panel.querySelector('[data-edu-action-result]')?.dataset.state);}
      if(choice!=='discard')return false;approvedDeparture={context:before,expires:Date.now()+2000};return true;
    };
    async function captureLegacyDepartureSession(){
      const instance=auth(),generation=authObservation,scope=instance?.getToken('configurations')?'configurations':'documents',token=instance?.getToken(scope),signature=authSignature(instance?.status());
      if(!instance||!token)throw Error('Přihlášení pro bezpečný odchod není ověřené.');
      const unchanged=()=>auth()===instance&&authObservation===generation&&instance.getToken(scope)===token&&authSignature(instance.status())===signature;
      await instance.ready;if(!unchanged())throw Error('Přihlášení se během přípravy odchodu změnilo.');
      const verified=await readContext(instance,scope);
      const valid=()=>unchanged()&&verified.valid();if(!valid())throw Error('Přihlášení se během přípravy odchodu změnilo.');
      return Object.freeze({valid});
    }
    function legacyRecoveryContent(){observeDepartureAuth();return fingerprint([authObservation,departureEpoch,profileId,activeId(),auth()?.status().schoolId||'',adapter.read(),nativeDeparture?nativeDeparture.read():null]);}
    function legacyRecoveryContext(){return fingerprint([revision,legacyRecoveryContent(),legacyIncompleteCommit()]);}
    function consumeLegacyApproval(event,channel='shared'){if(!event||typeof event!=='object'||event.type!=='beforeunload')return false;let seen=departureEvents.get(event);if(!seen){const approval=approvedDeparture;approvedDeparture=null;if(!approval||approval.expires<Date.now()||!approval.session?.valid()||approval.context!==recoveryContext())return false;seen={context:approval.context,expires:approval.expires,session:approval.session,used:new Set()};departureEvents.set(event,seen);}if(seen.expires<Date.now()||!seen.session.valid()||seen.context!==recoveryContext()||seen.used.has(channel))return false;seen.used.add(channel);return true;}
    let legacyDeparturePending=false;
    const legacyBeforeSwitch=async()=>{
      if(legacyDeparturePending)return false;legacyDeparturePending=true;
      try{
        if(!recoveryEnabled){if(!dirty()&&!legacyIncompleteCommit())return true;
          if(confirm('Před přepnutím profilu uložit rozpracované změny do Eduvize?')){await save.onclick();return !dirty()&&!legacyIncompleteCommit()&&!errorText;}
          if(!confirm('Přepnout profil a zahodit rozpracované změny?'))return false;
          clearLegacyIncompleteCommit();userChanged=false;return true;
        }
        approvedDeparture=null;if(busy||needsLogin)return false;
        // A failed SIS profile load must not trap the administrator on this page.
        // Discarding is explicit and changes no server data.
        if(needsReload&&adapter.app==='school-systems'){
          if(await departureChoice()!=='discard')return false;
          clearLegacyIncompleteCommit();userChanged=false;baseline='';editBaseline='';needsReload=false;return true;
        }
        if(needsReload)return false;if(!recoveryDirty())return true;
        const beforeContent=legacyRecoveryContent(),beforeRevision=revision,session=await captureLegacyDepartureSession();
        if(busy||needsLogin||needsReload||!session.valid()||beforeRevision!==revision||beforeContent!==legacyRecoveryContent())return false;
        const before=recoveryContext(),choice=await departureChoice();if(busy||needsLogin||needsReload||!session.valid()||before!==recoveryContext())return false;
        if(choice==='cancel')return false;
        if(choice==='save'){
          try{if(nativeDeparture)await nativeDeparture.save();else await save.onclick();}
          catch(error){errorText=error.message;say(error.message,error.settingsSaved?'partial':'error');return false;}
          return session.valid()&&!busy&&!errorText&&!needsLogin&&!needsReload&&revision>beforeRevision&&beforeContent===legacyRecoveryContent()&&!recoveryDirty()&&!['error','partial'].includes(panel.querySelector('[data-edu-action-result]')?.dataset.state);
        }
        if(choice!=='discard')return false;clearLegacyIncompleteCommit();approvedDeparture={context:recoveryContext(),expires:Date.now()+2000,session};return true;
      }catch(error){approvedDeparture=null;say(error.message,'error');return false;}
      finally{legacyDeparturePending=false;}
    };
    function recoveryContext(){return adapter.app==='documents'?documentsRecoveryContext():legacyRecoveryContext();}
    function consumeRecoveryApproval(event,channel='shared'){return adapter.app==='documents'?consumeDocumentsApproval(event,channel):consumeLegacyApproval(event,channel);}
    root.EduvizeProfileBeforeSwitch=()=>adapter.app==='school-identity'?(cardDeparture?cardDeparture.beforeSwitch():Promise.resolve(false)):adapter.app==='documents'?documentsBeforeSwitch():legacyBeforeSwitch();

    profilePicker.select.onchange=async()=>{
      const next=profilePicker.select.value;if(!next||next===profileId)return;
      if(!await root.EduvizeProfileBeforeSwitch()){profilePicker.select.value=profileId;return;}
      await work('Přepínám profil…',async()=>{await auth().selectProfile(next);select(next);profileId=next;revision=0;tracked='';baseline='';userChanged=false;manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}backup=null;undo.hidden=true;if(!loaded)say('Tento profil zatím nemá nastavení této aplikace. Upravte výchozí hodnoty a uložte je.');});
    };
    state();try{const initialIdentity=await profileReadiness();if(initialIdentity?.valid()){verifiedIdentity=initialIdentity;identityVerified=true;profileId=initialIdentity.id;profileTitle=initialIdentity.title;state();}await waitAdapter(adapter);ready=true;resetEditState();baseline=fingerprint(adapter.read());await auth()?.ready;const currentIdentity=await profileReadiness();if(currentIdentity?.valid()){verifiedIdentity=currentIdentity;identityVerified=true;profileId=currentIdentity.id;profileTitle=currentIdentity.title;state();}await work('Načítám nastavení profilu…',()=>list(true),{warm:!!currentIdentity?.valid()&&currentIdentity.settingsWarm});initialized=true;root.EduvizeProfileHydration?.finish(errorText?Error(errorText):null);}catch(e){say(e.message,'error');state();root.EduvizeProfileHydration?.finish(e);}
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
  async function schoolConfiguration(){
    await root.EduvizeAdminAuth?.ready;
    const state=root.EduvizeAdminAuth?.status();
    if(!state?.connected||!state.schoolId)return '';
    const active=state.profileId||'';
    if(active)select(active);
    return active;
  }
  async function manager(host){
    if(!host||host.dataset.mounted)return;host.dataset.mounted='1';host.hidden=true;host.classList.add('edu-admin__flow');
    host.replaceChildren(make('h2','Profily školy'));
    const count=make('span',null,'workflow-account-pill workflow-profile-count');host.append(count);
    host.append(make('p','Každá budova nebo pracoviště může mít vlastní nastavení aplikací, barvy a odkazy. Dokumenty a fotografie sdílí celá škola.','edu-admin__hint'));
    const ui=controls(host),profileList=make('div',null,'workflow-profile-list'),row=make('div',null,'edu-admin__actions'),name=make('input');
    host.querySelector('.edu-profile-panel__row').after(profileList);
    name.type='text';name.maxLength=80;name.placeholder='Např. ZŠ – hlavní budova';name.setAttribute('aria-label','Název nového profilu');
    const copyLabel=make('label','Zkopírovat nastavení vybraného profilu'),copy=make('input');copy.type='checkbox';copy.checked=true;copyLabel.prepend(copy);
    const create=button('Vytvořit profil',false);row.append(create);host.append(name,copyLabel,row);
    let items=[],busy=false;
    const status=message=>{ui.status.textContent=message};
    async function act(fn){
      if(busy)return;busy=true;const controls=[...host.querySelectorAll('button,select')].filter(control=>!control.disabled);
      controls.forEach(control=>control.disabled=true);
      try{await fn()}catch(error){status(error.message)}finally{controls.forEach(control=>control.disabled=false);busy=false}
    }
    async function refresh({force=false}={}){
      try{
        await root.EduvizeAdminAuth?.ready;
        host.hidden=!root.EduvizeAdminAuth?.status().connected;if(host.hidden)return;
        const result=await request('',{fresh:force});items=result.items;
        const active=root.EduvizeAdminAuth.status().profileId;
        options(ui.select,items,active);
        profileList.replaceChildren(...items.map(item=>{
          const entry=make('div',null,'workflow-profile-row'),pick=make('button',null,'workflow-profile-pick'),title=make('strong',item.name),actions=make('span',null,'workflow-profile-row-actions');
          pick.type='button';pick.append(title);pick.setAttribute('aria-current',String(item.id===active));
          if(item.id===active){const badge=make('span','Aktivní','workflow-profile-active');pick.append(badge)}
          pick.onclick=()=>{if(item.id!==active){ui.select.value=item.id;ui.select.dispatchEvent(new Event('change',{bubbles:true}))}};
          const rename=button('Přejmenovat');rename.type='button';rename.classList.add('edu-admin__button--secondary');rename.setAttribute('aria-label','Přejmenovat '+item.name);
          rename.onclick=()=>act(async()=>{
            const title=prompt('Nový název profilu',item.name);
            if(title===null||title.trim()===item.name)return;
            const current=await request('/'+item.id,{fresh:true});
            if(current.name!==item.name){
              await refresh({force:true});
              throw Error('Název profilu se mezitím změnil. Zkontrolujte nový název a zkuste přejmenování znovu.');
            }
            try{
              await request('/'+item.id,{method:'PATCH',body:JSON.stringify({name:title,expectedRevision:current.revision})});
            }catch(error){
              if(error.status===409){
                await refresh({force:true});
                throw Error('Profil se mezitím změnil. Zkontrolujte jeho aktuální stav a zkuste přejmenování znovu.');
              }
              throw error;
            }
            await refresh({force:true});
            status('Profil přejmenován.');
            root.dispatchEvent(new CustomEvent('eduvize-profile-updated',{detail:{id:item.id}}));
          });
          const remove=button('Odstranit');remove.type='button';remove.classList.add('edu-admin__button--secondary');remove.setAttribute('aria-label','Odstranit '+item.name);
          remove.onclick=()=>act(async()=>{
            const check=await request('/'+item.id+'/archive-check',{fresh:true});
            const labels=[...(check.blockers||[]),...(check.outputs||[])].map(value=>value.label).filter(Boolean);
            if(check.profileId!==item.id||check.complete!==true||check.canArchive!==true||labels.length){throw Error('Profil nelze odstranit. '+(labels.join('; ')||'Nejprve uvolněte jeho vazby.'))}
            if(!confirm('Odstranit profil „'+item.name+'“ a jeho uloženou verzi? Tuto akci v Eduvize nelze vrátit.'))return;
            await request('/'+item.id,{method:'DELETE',body:JSON.stringify({expectedRevision:check.revision})});
            await refresh();status('Profil odstraněn.');root.dispatchEvent(new CustomEvent('eduvize-profile-updated',{detail:{id:item.id,removed:true}}));
          });
          actions.append(rename,remove);entry.append(pick,actions);return entry;
        }));
        count.textContent=items.length+' '+(items.length===1?'profil':items.length<5?'profily':'profilů');status('');
      }catch(error){status(error.message)}
    }
    ui.reload.onclick=()=>act(()=>refresh({force:true}));
    ui.select.onchange=()=>act(async()=>{if(!ui.select.value)return;if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch()){ui.select.value=root.EduvizeAdminAuth.status().profileId;return}await root.EduvizeAdminAuth.selectProfile(ui.select.value);select(ui.select.value);await refresh();root.dispatchEvent(new Event('eduvize-profile-selected'))});
    create.onclick=()=>act(async()=>{const title=name.value.trim();if(!title)throw Error('Vyplňte název profilu.');if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch())return;const result=await request('',{method:'POST',body:JSON.stringify({name:title,...(copy.checked&&ui.select.value?{copyFrom:ui.select.value}:{})})});name.value='';await root.EduvizeAdminAuth.selectProfile(result.id);select(result.id);await refresh()});
    watchAuth(refresh);await refresh();
  }
  async function picker(host){
    if(!host||host.dataset.mounted)return;host.dataset.mounted='1';host.hidden=true;
    const ui=controls(host);ui.reload.textContent='Správa profilů';ui.reload.onclick=()=>location.assign(manageUrl(selection()));
    let listLoaded=false,loading=null;
    const hint='Nastavení zobrazení platí pro vybraný profil. Knihovna souborů je společná celé škole.';
    async function refresh(loadList=false){
      try{
        await root.EduvizeAdminAuth?.ready;
        const state=root.EduvizeAdminAuth?.status();host.hidden=!state?.connected;
        if(host.hidden)return;
        if(!loadList&&!listLoaded){
          const active=state.profileId||'';
          options(ui.select,active?[{id:active,name:'Aktivní profil školy'}]:[],active);
          ui.status.textContent=hint;
          return;
        }
        if(loading)return loading;
        loading=(async()=>{const result=await request('');options(ui.select,result.items,state.profileId);listLoaded=true;ui.status.textContent=hint;})();
        try{await loading;}finally{loading=null;}
      }catch(e){ui.status.textContent=e.message;return e;}
    }
    ui.select.addEventListener('pointerdown',event=>{if(listLoaded)return;event.preventDefault();ui.status.textContent='Načítám profily…';void refresh(true);});
    ui.select.addEventListener('focus',()=>{if(!listLoaded)void refresh(true);});
    ui.select.onchange=async()=>{const id=ui.select.value;if(!id)return;ui.select.disabled=true;try{if(root.EduvizeProfileBeforeSwitch&&!await root.EduvizeProfileBeforeSwitch()){ui.select.value=root.EduvizeAdminAuth.status().profileId;return;}await root.EduvizeAdminAuth.selectProfile(id);select(id);}catch(e){ui.status.textContent=e.message;}finally{ui.select.disabled=false;}};
    watchAuth(refresh);const initialError=await refresh();root.EduvizeProfileHydration?.finish(initialError||null);
  }
  root.EduvizeProfiles=Object.freeze({assertOutputContext,outputContextVersion:'profile-applied-v1',transportApplyBoundary:'superseded-v1',statusMessages,createStatus,statusFor:app=>recoverySinks.get(app)||null,departureChoice,mountNativeDeparture,mount,manager,picker,fields,segment,applySegment,apps,request,fingerprint});
  function start(){const profiles=document.getElementById('configurations');if(profiles)manager(profiles);if(root.EduvizeProfileAdapter){mount(root.EduvizeProfileAdapter);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.addEventListener('eduvize-profile-adapter-ready',()=>{mount(root.EduvizeProfileAdapter);});
  root.addEventListener('eduvize-admin-auth-change',()=>{if(root.EduvizeProfileAdapter?.app==='school-identity'&&root.EduvizeAdminAuth?.status().schoolId)mount(root.EduvizeProfileAdapter);});
})(window);
