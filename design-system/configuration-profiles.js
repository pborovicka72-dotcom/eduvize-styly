/* One profile component for every administration. No credentials are serialized. */
(function(root){
  'use strict';
  if(root.EduvizeProfiles)return;
  const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
  const DOCS='https://eduvize-dokumenty-api.onrender.com';
  const API=DOCS+'/api/admin/configuration-profiles',SELECTION='eduvize-profile-selection-v1';
  const apps=Object.freeze([
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
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,secondary=true)=>{const e=make('button',text,'edu-admin__button'+(secondary?' edu-admin__button--secondary':''));e.type='button';return e;};
  const fingerprint=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function selection(){const query=new URL(location.href).searchParams.get('edu-profile');if(query&&/^[a-f0-9]{32}$/.test(query))return query;try{const id=localStorage.getItem(SELECTION);return /^[a-f0-9]{32}$/.test(id||'')?id:'';}catch{return '';}}
  function select(id){try{if(id)localStorage.setItem(SELECTION,id);else localStorage.removeItem(SELECTION);}catch{}const u=new URL(location.href);if(id)u.searchParams.set('edu-profile',id);else u.searchParams.delete('edu-profile');history.replaceState(null,'',u.href);}
  function manageUrl(id){const u=new URL(ACCOUNT);if(id)u.searchParams.set('edu-profile',id);u.hash='configurations';return u.href;}
  // Short-lived read cache survives navigation in this tab. Never caches credentials.
  const CACHE_KEY='eduvize-profile-reads-v1',CACHE_TTL=90000;
  let reads={identity:0,entries:{}};
  try{const value=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(value&&typeof value.identity==='number'&&value.entries&&typeof value.entries==='object')reads=value;}catch{}
  function readCache(identity,path){if(reads.identity!==identity){reads={identity,entries:{}};return;}const entry=reads.entries[path];if(entry&&Date.now()-entry.time>=0&&Date.now()-entry.time<CACHE_TTL)return structuredClone(entry.value);}
  function remember(identity,path,value){if(reads.identity!==identity)reads={identity,entries:{}};reads.entries[path]={time:Date.now(),value:structuredClone(value)};const ordered=Object.entries(reads.entries).sort((a,b)=>b[1].time-a[1].time);reads.entries=Object.fromEntries(ordered.slice(0,9));try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(reads));}catch{}}
  function forgetReads(){reads={identity:0,entries:{}};try{sessionStorage.removeItem(CACHE_KEY);}catch{}}
  function watchAuth(callback){const signature=()=>{const s=root.EduvizeAdminAuth?.status();return JSON.stringify([s?.connected,s?.profileId,s?.expiresAt,s?.scopes]);};let previous=signature();root.addEventListener('eduvize-admin-auth-change',()=>{const next=signature();if(next===previous)return;previous=next;callback();});}
  async function request(path='',options={}){
    const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Společné přihlášení se nepodařilo načíst.');await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope))throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k profilům na OneDrive.');
    const {fresh=false,...fetchOptions}=options,method=(fetchOptions.method||'GET').toUpperCase(),identity=auth.status().expiresAt;
    const cacheable=method==='GET'&&(path===''||/^\/[a-f0-9]{32}$/.test(path));
    if(cacheable&&!fresh){const value=readCache(identity,path);if(value!==undefined)return value;}
    const response=await auth.fetch(API+path,{...fetchOptions,headers:{...(fetchOptions.body?{'Content-Type':'application/json'}:{}),...fetchOptions.headers}},scope);
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=Error(typeof data.detail==='string'?data.detail:'OneDrive není dostupný ('+response.status+').');e.status=response.status;throw e;}if(cacheable)remember(identity,path,data);else if(method!=='GET')forgetReads();return data;
  }
  function controls(host){
    const row=make('div',null,'edu-profile-panel__row'),label=make('label','Profil školy / obrazovky'),select=make('select');select.setAttribute('aria-label','Profil školy nebo obrazovky');label.append(select);
    const actions=make('div',null,'edu-admin__actions'),reload=button('Obnovit seznam');row.append(label,actions);actions.append(reload);
    const status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.append(row,status);return {select,actions,reload,status};
  }
  function options(select,items,id){select.replaceChildren(new Option('Vyberte profil…',''));for(const p of items)select.add(new Option(p.name,p.id));select.value=items.some(p=>p.id===id)?id:'';}
  async function waitAdapter(adapter){if(adapter.ready)await adapter.ready;for(let i=0;i<100;i++){if(adapter.read())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Nastavení aplikace se dosud nepodařilo načíst.');}
  async function mount(adapter){
    if(!adapter||document.querySelector('[data-edu-profile-panel]'))return;
    const main=document.querySelector('main.edu-admin-page,main .edu-admin-page,.edu-admin-page');if(!main)return;
    const ids={'school-identity':'schoolSaveLocal','day-progress':'save',menu:'saveLocal',kiosk:'save',documents:'save-settings',weather:'weather-save-settings',holidays:'saveSettings',transport:'saveSettings',news:'saveLocal',wisdom:'saveLocal',styles:'saveLocal','school-systems':'save'};
    const opens={'day-progress':'#open',menu:'#open',kiosk:'#openKiosk',documents:'#open',weather:'button[form="location-settings"][type="submit"]',holidays:'#save',transport:'button[form="form"][type="submit"]',news:'#save',wisdom:'#openOutput','school-systems':'#open'};
    const copies={'day-progress':'copy',menu:'copy',kiosk:'shareTouch',documents:'copy',weather:'location-settings-cancel',holidays:'openOutput',transport:'copy',news:'copyUrl',wisdom:'copyOutput','school-systems':'copy'};
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
    const save=button('Uložit na OneDrive',false);save.dataset.eduProfileSave='';
    for(const control of [save,local,copy,open].filter(Boolean)){const saving=control===save||control===local;control.className='edu-admin__button'+(saving?'':' edu-admin__button--secondary');control.dataset.eduOutputAction=saving?'save':'secondary';if(saving)control.dataset.eduSave='';}
    // Move existing controls so their original handlers and submit behavior survive.
    row.prepend(...[save,local,copy,open].filter(Boolean));
    if(adapter.app==='styles'){const publish=document.getElementById('save');if(publish){publish.textContent='Použít změny ve sdíleném stylu';publish.title='Aktualizuje centrální styl Eduvize. Konfiguraci svého profilu uložíte tlačítkem Uložit na OneDrive.';}}
    if(open)open.textContent='Otevřít výstup';
    if(copy)copy.textContent='Kopírovat odkaz';
    const panel=make('div',null,'edu-profile-current');panel.dataset.eduProfilePanel=adapter.app;panel.id='edu-profile-save';
    const profileText=make('p','Profil není vybrán.','edu-profile-current__name'),status=make('p',null,'edu-profile-panel__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const manage=make('a','Vybrat profil','edu-admin__button edu-admin__button--secondary');manage.href=manageUrl('');const actions=make('div',null,'edu-admin__actions'),load=button('Načíst uložené nastavení'),undo=button('Vrátit před načtením');undo.hidden=true;load.hidden=true;actions.append(load,undo);panel.append(profileText,status,manage,actions);if(row)row.after(panel);else save.after(panel);
    const ui={status};
    const draftKey='eduvize-profile-save-draft-v1:'+adapter.app+':'+location.pathname;
    let busy=false,profileId='',profileTitle='',revision=0,baseline='',backup=null,errorText='',loaded=false,ready=false,tracked='',needsLogin=false,restored=false,needsReload=false,manualLoad=false,timer,kioskEdited=false,browserBaseline='';
    const auth=()=>root.EduvizeAdminAuth;
    const canSave=()=>!!(auth()?.getToken('configurations')||auth()?.getToken('documents'));
    const activeId=()=>auth()?.status().profileId||'';
    function profileName(){return profileTitle||'vybraný profil';}
    function say(text,state=''){status.textContent=text;status.dataset.state=state;}
    function dirty(){return baseline&&fingerprint(adapter.read())!==baseline;}
    // Choosing a preview segment is persisted, but is not a reason to block navigation.
    function departureFingerprint(value){if(!value||typeof value!=='object')return fingerprint(value);const {segment,...content}=value;if(adapter.app==='kiosk'&&content.data){const {newsSources,layoutOrientation,layoutStyle,layoutBlock,previewPage,previewView,previewRevision,previewReset,...data}=content.data;content.data=data;}return fingerprint(content);}
    function state(){save.disabled=busy||!ready||needsReload;load.disabled=busy||!ready||!canSave();load.hidden=!needsReload;undo.disabled=busy;actions.hidden=load.hidden&&undo.hidden;manage.hidden=!!profileId;profileText.textContent=profileTitle?'Profil: '+profileTitle:'Profil není vybrán.';}
    async function work(text,fn){if(busy)return;clearTimeout(timer);busy=true;state();say(text);try{errorText='';await fn();}catch(e){errorText=e.message;needsLogin=[401,403].includes(e.status)||(e.status===503&&/OneDrive|Microsoft|připojení/i.test(e.message));if(e.status===409)needsReload=true;say(e.message,'error');}finally{busy=false;state();}}
    function login(){
      const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Přihlášení se nepodařilo načíst. Obnovte stránku.');
      const nonce=crypto.randomUUID(),url=new URL(location.href);url.searchParams.set('edu-resume-save',nonce);url.searchParams.set('edu-require-drive','1');url.hash='edu-profile-save';
      const draft={nonce,app:adapter.app,path:location.pathname,createdAt:Date.now(),config:structuredClone(adapter.read()),profileId,revision,baseline,loaded,tracked};
      try{sessionStorage.setItem(draftKey,JSON.stringify(draft));}catch{throw Error('Prohlížeč nepovolil bezpečné zachování rozpracovaného nastavení. Přihlášení otevřete v nové kartě a pak se sem vraťte.');}
      // A stored draft is required before leaving; never serialize login credentials.
      baseline=fingerprint(adapter.read());location.assign(auth.loginUrl(url.href));
    }
    async function restoreDraft(){
      const url=new URL(location.href),nonce=url.searchParams.get('edu-resume-save');if(!nonce)return false;
      let d;try{d=JSON.parse(sessionStorage.getItem(draftKey)||'null');}catch{}
      if(!d||d.nonce!==nonce||d.app!==adapter.app||d.path!==location.pathname||Date.now()-d.createdAt>2*60*60*1000||!d.config){say('Rozpracované nastavení pro návrat z přihlášení nebylo nalezeno. Načtení profilu je pozastavené.','error');return true;}
      await adapter.apply(structuredClone(d.config));profileId=d.profileId||'';revision=Number(d.revision)||0;baseline=typeof d.baseline==='string'?d.baseline:fingerprint(adapter.read());loaded=!!d.loaded;tracked=d.tracked||'';select(profileId);restored=true;
      // Keep the draft until the restored state has been applied successfully.
      sessionStorage.removeItem(draftKey);url.searchParams.delete('edu-resume-save');url.searchParams.delete('edu-require-drive');history.replaceState(null,'',url.href);return true;
    }
    async function readProfile(apply=false){
      const p=await request('/'+profileId,{fresh:manualLoad}),entry=p.apps[adapter.app],incoming=entry?.revision||0;profileTitle=p.name;
      if(!apply&&tracked===profileId){if(incoming!==revision){needsReload=true;say('Na OneDrive je novější nastavení. Před uložením je načtěte.','error');return;}say(dirty()?'Neuložené změny.':loaded?'Uloženo na OneDrive.':'Dosud neuloženo na OneDrive.',dirty()?'dirty':'saved');return;}
      if(entry&&!entry.config.empty&&apply){const before=structuredClone(adapter.read());try{await adapter.apply(structuredClone(entry.config));}catch(error){try{await adapter.apply(before);}catch{}throw error;}if(manualLoad){backup=before;undo.hidden=false;}}
      revision=incoming;tracked=profileId;needsReload=false;loaded=!!entry&&!entry.config.empty;baseline=fingerprint(apply||!loaded?adapter.read():entry.config);
      say(loaded?(apply?(adapter.loadedMessage||'Nastavení načteno z OneDrive.'):dirty()?'Neuložené změny.':'Uloženo na OneDrive.'):'Dosud neuloženo na OneDrive.',dirty()?'dirty':'saved');
    }
    async function list(initial=false){
      if(!canSave()){say('Pro uložení na OneDrive se přihlaste. Rozpracované změny zůstanou zachované.');return;}
      const active=activeId();
      if(!active){profileId='';profileTitle='';say('Vyberte profil na stránce Účet a konfigurace.');return;}
      if(tracked&&active!==profileId&&!restored){needsReload=true;say('Na stránce účtu byl zvolen jiný profil. Před uložením načtěte jeho nastavení.','error');return;}
      if(active!==profileId){profileId=active;revision=0;tracked='';}
      needsLogin=false;select(profileId);await readProfile(initial);
      if(restored){if(!needsReload)say('Rozpracované změny obnoveny. Uloží se do profilu „'+profileName()+'“.','dirty');restored=false;requestAnimationFrame(()=>panel.scrollIntoView({block:'nearest'}));}
    }
    load.onclick=()=>work('Načítám uložené nastavení…',async()=>{if(dirty()&&!confirm('Nahradit rozpracované změny uloženým nastavením? Původní místní stav půjde vrátit.'))return;await auth().refresh();if(!activeId())throw Error('Nejprve vyberte profil na stránce Účet a konfigurace.');profileId=activeId();tracked='';manualLoad=true;try{await readProfile(true);}finally{manualLoad=false;}});
    save.onclick=()=>work('Připravuji uložení…',async()=>{
      adapter.validate?.();
      // Keep both the shared recovery snapshot and each app's native local format.
      localStorage.setItem(localKey,JSON.stringify(adapter.read()));
      local.click();
      await auth()?.ready;if(!canSave()||needsLogin){login();return;}
      await auth().refresh();if(!canSave()){login();return;}
      if(!activeId()){login();return;}
      if(activeId()!==profileId){needsReload=true;throw Error('Aktivní profil se změnil. Před uložením načtěte jeho nastavení.');}
      const snapshot=structuredClone(adapter.read());say('Ukládám na OneDrive…');const result=await request('/'+profileId+'/apps/'+adapter.app,{method:'PUT',body:JSON.stringify({expectedRevision:revision,config:snapshot})});revision=result.revision;baseline=fingerprint(snapshot);loaded=true;say(dirty()?'Během ukládání vznikly další neuložené změny.':'Uloženo na OneDrive i v prohlížeči.',dirty()?'dirty':'saved');
    });
    manage.onclick=event=>{event.preventDefault();work('Otevírám výběr profilu…',async()=>login());};
    undo.onclick=()=>work('Vracím místní nastavení…',async()=>{if(!backup)return;const previous=backup;backup=structuredClone(adapter.read());await adapter.apply(previous);say('Místní nastavení obnoveno.','dirty');});
    function changed(event){if(panel.contains(event.target)||event.target===save||busy||needsReload)return;clearTimeout(timer);timer=setTimeout(()=>{if(!baseline)return;if(dirty()){errorText='';say('Neuložené změny.','dirty');}else if(!errorText)say(loaded?'Uloženo na OneDrive.':'Dosud neuloženo na OneDrive.',loaded?'saved':'');},200);}
    for(const event of ['input','change','click','eduvize-profile-change'])document.addEventListener(event,changed);
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
    watchAuth(()=>{state();if(ready&&!busy)work('Ověřuji aktivní profil…',()=>list(false));});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ready&&!busy)auth()?.refresh();});
    state();try{await waitAdapter(adapter);if(adapter.app==='styles'){try{const saved=JSON.parse(localStorage.getItem(localKey)||'null');if(saved)await adapter.apply(saved);}catch{}}ready=true;baseline=fingerprint(adapter.read());const resume=await restoreDraft();await auth()?.ready;await work('Načítám nastavení profilu…',()=>list(!resume));}catch(e){say(e.message,'error');state();}
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
  async function manager(host){
    if(!host||host.dataset.mounted)return;host.dataset.mounted='';host.classList.add('edu-profile-panel');host.append(make('h2','Aktivní profil'),make('p','Zvolený profil se používá při ukládání nastavení ve všech administracích.'));
    const ui=controls(host),add=button('Nový profil'),appsLink=make('a','Přejít na aplikace','edu-admin__button edu-admin__button--secondary');appsLink.href='https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html';ui.actions.prepend(add);ui.actions.append(appsLink);
    const form=make('form',null,'edu-profile-panel__row'),label=make('label','Název profilu'),input=make('input'),create=button('Vytvořit profil',false),cancel=button('Zrušit');input.required=true;input.maxLength=80;label.append(input);create.type='submit';form.append(label,create,cancel);form.hidden=true;host.append(form);
    const advanced=make('details',null,'edu-profile-advanced');advanced.append(make('summary','Další možnosti'));const copyForm=make('form',null,'edu-profile-panel__row'),copyLabel=make('label','Název kopie profilu'),copyName=make('input'),copy=button('Vytvořit kopii');copyName.required=true;copyName.maxLength=80;copyLabel.append(copyName);copy.type='submit';copyForm.append(copyLabel,copy);advanced.append(copyForm);
    const history=make('details',null,'edu-profile-backup');history.hidden=true;history.append(make('summary','Obnovit zálohu'));history.append(make('p','Obnoví nastavení všech aplikací v tomto profilu. Současné nastavení zůstane zálohované.','edu-admin__hint'));const historyRow=make('div',null,'edu-profile-panel__row'),historyLabel=make('label','Uložená záloha'),historySelect=make('select'),restore=button('Obnovit zálohu');historyLabel.append(historySelect);historyRow.append(historyLabel,restore);history.append(historyRow);advanced.append(history);advanced.hidden=true;host.append(advanced);
    let id='',current=null,busy=false;
    const authenticated=()=>!!(root.EduvizeAdminAuth?.getToken('documents')||root.EduvizeAdminAuth?.getToken('configurations'));
    async function work(text,fn){if(busy)return;busy=true;for(const e of [ui.select,ui.reload,add,create,copy,restore])e.disabled=true;ui.status.textContent=text;try{await fn();}catch(error){ui.status.textContent=error.message;}finally{busy=false;for(const e of [ui.select,ui.reload,add,create,copy])e.disabled=!authenticated();restore.disabled=!historySelect.options.length||!authenticated();}}
    async function draw(fresh=false){history.hidden=true;advanced.hidden=!id;advanced.open=false;historySelect.replaceChildren();if(!id){current=null;ui.status.textContent='Vyberte profil nebo vytvořte nový.';return;}current=await request('/'+id,{fresh});if(root.EduvizeAdminAuth.status().profileId!==id)await root.EduvizeAdminAuth.selectProfile(id);select(id);const count=Object.values(current.apps).filter(entry=>!entry.config.empty).length;ui.status.textContent='Aktivní profil: '+current.name+'. '+(count?'Uložené nastavení aplikací: '+count+'.':'Nastavení přidáte tlačítkem Uložit na OneDrive v příslušné administraci.');}
    async function list(preferred='',fresh=false){await root.EduvizeAdminAuth?.ready;const data=await request('',{fresh});const chosen=preferred||root.EduvizeAdminAuth.status().profileId||selection();options(ui.select,data.items,chosen);id=ui.select.value;if(!id&&data.items.length===1){id=data.items[0].id;ui.select.value=id;}await draw(fresh);}
    ui.select.onchange=()=>work('Nastavuji aktivní profil…',async()=>{id=ui.select.value;if(!id){await root.EduvizeAdminAuth.selectProfile('');select('');}await draw();});ui.reload.onclick=()=>work('Načítám profily…',()=>list('',true));
    add.onclick=()=>{form.hidden=false;input.focus();};cancel.onclick=()=>{form.hidden=true;input.value='';};
    form.onsubmit=event=>{event.preventDefault();work('Vytvářím profil…',async()=>{const result=await request('',{method:'POST',body:JSON.stringify({name:input.value})});input.value='';form.hidden=true;await list(result.id);});};
    copyForm.onsubmit=event=>{event.preventDefault();work('Vytvářím kopii…',async()=>{if(!id)throw Error('Nejprve vyberte profil.');const result=await request('',{method:'POST',body:JSON.stringify({name:copyName.value,copyFrom:id})});copyName.value='';await list(result.id);});};
    advanced.addEventListener('toggle',()=>{if(!advanced.open||!id||busy)return;work('Načítám dostupné zálohy…',async()=>{const data=await request('/'+id+'/history');historySelect.replaceChildren();for(const item of data.items)historySelect.add(new Option(new Date(item.updatedAt).toLocaleString('cs-CZ'),item.revision));history.hidden=!data.items.length;ui.status.textContent=data.items.length?'Zálohy jsou dostupné v části Obnovit zálohu.':'Pro tento profil zatím nejsou žádné zálohy.';});});
    restore.onclick=()=>work('Obnovuji zálohu…',async()=>{if(!current||!historySelect.value)return;if(!confirm('Obnovit nastavení všech aplikací ve vybraném profilu? Současné nastavení zůstane zálohované.'))return;await request('/'+id+'/restore',{method:'POST',body:JSON.stringify({revision:Number(historySelect.value),expectedRevision:current.revision})});await draw();});
    watchAuth(()=>{if(!busy)work('Načítám profily…',()=>list());});await work('Načítám profily…',()=>list());
  }
  root.EduvizeProfiles=Object.freeze({mount,manager,fields,segment,applySegment,apps,request,fingerprint});
  function start(){manager(document.getElementById('configurations'));if(root.EduvizeProfileAdapter)mount(root.EduvizeProfileAdapter);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.addEventListener('eduvize-profile-adapter-ready',()=>mount(root.EduvizeProfileAdapter));
})(window);
