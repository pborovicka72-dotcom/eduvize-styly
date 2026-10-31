/* One profile component for every administration. No credentials are serialized. */
(function(root){
  'use strict';
  if(root.EduvizeProfiles)return;
  const ACCOUNT='https://pborovicka72-dotcom.github.io/eduvize-styly/ucet.html';
  const DOCS='https://eduvize-dokumenty-api.onrender.com';
  const API=DOCS+'/api/admin/configuration-profiles',SELECTION='eduvize-profile-selection-v1';
  const apps=Object.freeze([
    {id:'kiosk',name:'Kiosek',url:'https://pborovicka72-dotcom.github.io/eduvize-kiosek/config.html'},
    {id:'documents',name:'Dokumenty',url:DOCS+'/config'},
    {id:'weather',name:'Počasí',url:'https://eduvize-weather.onrender.com/config'},
    {id:'holidays',name:'Svátky',url:'https://pborovicka72-dotcom.github.io/eduvize-svatky/config.html'},
    {id:'transport',name:'Jízdní řády',url:'https://pborovicka72-dotcom.github.io/eduvize-jizdni-rady/config.html'},
    {id:'wisdom',name:'Moudrost dne',url:'https://pborovicka72-dotcom.github.io/eduvize-moudrost-dne/config.html'},
    {id:'news',name:'Aktuality',url:'https://eduvize-aktuality.onrender.com/config'},
    {id:'styles',name:'Styly',url:'https://eduvize-design-system-api.onrender.com/'},
    {id:'school-systems',name:'Školní informační systémy · místní test',url:'http://127.0.0.1:8789/config.html'}
  ]);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const button=(text,secondary=true)=>{const e=make('button',text,'edu-admin__button'+(secondary?' edu-admin__button--secondary':''));e.type='button';return e;};
  const fingerprint=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
  function selection(){const query=new URL(location.href).searchParams.get('edu-profile');if(query&&/^[a-f0-9]{32}$/.test(query))return query;try{const id=localStorage.getItem(SELECTION);return /^[a-f0-9]{32}$/.test(id||'')?id:'';}catch{return '';}}
  function select(id){try{if(id)localStorage.setItem(SELECTION,id);else localStorage.removeItem(SELECTION);}catch{}const u=new URL(location.href);if(id)u.searchParams.set('edu-profile',id);else u.searchParams.delete('edu-profile');history.replaceState(null,'',u.href);}
  function manageUrl(id){const u=new URL(ACCOUNT);if(id)u.searchParams.set('edu-profile',id);u.hash='configurations';return u.href;}
  async function request(path='',options={}){
    const auth=root.EduvizeAdminAuth;if(!auth)throw Error('Společné přihlášení se nepodařilo načíst.');await auth.ready;
    const scope=auth.getToken('configurations')?'configurations':'documents';
    if(!auth.getToken(scope))throw Error('Přihlaste se na stránce Účet a konfigurace pro přístup k profilům na OneDrive.');
    const response=await auth.fetch(API+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}},scope);
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=Error(typeof data.detail==='string'?data.detail:'OneDrive není dostupný ('+response.status+').');e.status=response.status;throw e;}return data;
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
    const panel=make('section',null,'edu-admin__card edu-profile-panel');panel.dataset.eduProfilePanel=adapter.app;panel.id='edu-profile-save';panel.append(make('h2','Uložit konfiguraci'));
    const footer=main.querySelector(':scope > footer');if(footer)footer.before(panel);else main.append(panel);
    panel.append(make('p','Vyberte cílový profil a uložte nastavení na připojený OneDrive. Výběr profilu sám nepřepisuje rozpracované nastavení.','edu-admin__hint'));
    const ui=controls(panel),save=button('Uložit na OneDrive',false),load=button('Načíst z OneDrive'),undo=button('Vrátit před načtením');undo.hidden=true;
    const manage=make('a','Správa konfigurací','edu-admin__button edu-admin__button--secondary');manage.href=manageUrl(selection());manage.target='_blank';manage.rel='noopener';
    ui.actions.prepend(save,load);ui.actions.append(undo,manage);
    const help=make('p','Nový profil vytvoříte ve Správě konfigurací. Potom zde použijte Obnovit seznam.','edu-admin__hint');panel.append(help);
    for(const local of main.querySelectorAll('button'))if(/uložit v prohlížeči/i.test(local.textContent)){local.textContent='Uložit pouze v tomto prohlížeči';local.classList.add('edu-admin__button--secondary');}
    const draftKey='eduvize-profile-save-draft-v1:'+adapter.app+':'+location.pathname;
    let busy=false,profileId=selection(),revision=0,baseline='',backup=null,errorText='',loaded=false,ready=false,tracked='',needsLogin=false,restored=false;
    const canSave=()=>!!(root.EduvizeAdminAuth?.getToken('configurations')||root.EduvizeAdminAuth?.getToken('documents'));
    function profileName(){return ui.select.selectedOptions[0]?.textContent||'vybraný profil';}
    function say(text,state=''){ui.status.textContent=text;ui.status.dataset.state=state;}
    function dirty(){return baseline&&fingerprint(adapter.read())!==baseline;}
    function state(){save.disabled=busy||!ready;save.textContent=!canSave()?'Přihlásit a uložit':needsLogin?'Připojit OneDrive a uložit':'Uložit na OneDrive';load.disabled=busy||!ready||!profileId||!canSave()||needsLogin;undo.disabled=busy;ui.select.disabled=busy;ui.reload.disabled=busy||!canSave();manage.href=manageUrl(profileId);}
    async function work(text,fn){if(busy)return;clearTimeout(timer);busy=true;state();say(text);try{errorText='';await fn();}catch(e){errorText=e.message;needsLogin=[401,403].includes(e.status)||(e.status===503&&/OneDrive|Microsoft|připojení/i.test(e.message));say(e.message+(needsLogin?' Rozpracované nastavení zůstává na stránce. Obnovte připojení tlačítkem níže.':''),'error');}finally{busy=false;state();}}
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
      const p=await request('/'+profileId),entry=p.apps[adapter.app],incoming=entry?.revision||0;
      if(!apply&&tracked===profileId){if(incoming!==revision){say('Na OneDrive je novější verze. Před uložením ji načtěte.','dirty');return;}say(dirty()?'Neuložené změny.':loaded?'Uloženo na OneDrive.':'Tato aplikace zatím není v profilu uložená.',dirty()?'dirty':'saved');return;}
      revision=incoming;tracked=profileId;
      if(!entry||entry.config.empty){loaded=false;baseline=fingerprint(adapter.read());say('Tato aplikace zatím v profilu nemá uložené nastavení.');return;}
      if(apply){const before=structuredClone(adapter.read());try{await adapter.apply(structuredClone(entry.config));}catch(error){try{await adapter.apply(before);}catch{}throw error;}backup=before;undo.hidden=false;}
      baseline=fingerprint(apply?adapter.read():entry.config);loaded=true;say(apply?(adapter.loadedMessage||'Nastavení načteno z OneDrive.'):dirty()?'Neuložené změny oproti profilu.':'Uloženo na OneDrive.',dirty()?'dirty':'saved');
    }
    async function list(initial=false){
      if(!canSave()){options(ui.select,[],profileId);say('Nastavení můžete upravovat. Pro uložení na OneDrive použijte Přihlásit a uložit.');return;}
      const data=await request();needsLogin=false;options(ui.select,data.items,profileId);profileId=ui.select.value;
      if(profileId){select(profileId);await readProfile(initial);}else say('Vyberte cílový profil. Nový můžete vytvořit ve Správě konfigurací.');
      if(restored){say('Rozpracované nastavení je obnoveno. '+(profileId?'Zkontrolujte cílový profil a potvrďte Uložit na OneDrive.':'Vyberte cílový profil a potvrďte Uložit na OneDrive.'),'dirty');restored=false;requestAnimationFrame(()=>panel.scrollIntoView({block:'start'}));}
    }
    ui.reload.onclick=()=>work('Načítám profily…',()=>list(false));
    ui.select.onchange=()=>work('Ověřuji cílový profil…',async()=>{profileId=ui.select.value;select(profileId);revision=0;loaded=false;tracked='';if(profileId)await readProfile(false);else say('Vyberte cílový profil.');});
    load.onclick=()=>work('Načítám nastavení…',async()=>{if(dirty()&&!confirm('Nahradit neuložené změny nastavením z OneDrive?'))return;await readProfile(true);});
    save.onclick=()=>work('Připravuji uložení…',async()=>{
      await root.EduvizeAdminAuth?.ready;
      if(!canSave()||needsLogin){login();return;}
      if(!profileId){say('Nejprve vyberte cílový profil. Pokud ještě žádný nemáte, otevřete Správu konfigurací.');ui.select.focus();return;}
      const snapshot=structuredClone(adapter.read());say('Ukládám nastavení na OneDrive…');
      const result=await request('/'+profileId+'/apps/'+adapter.app,{method:'PUT',body:JSON.stringify({expectedRevision:revision,config:snapshot})});revision=result.revision;baseline=fingerprint(snapshot);loaded=true;
      say(dirty()?'Během ukládání vznikly další neuložené změny.':'Uloženo na OneDrive do profilu „'+profileName()+'“.',dirty()?'dirty':'saved');
    });
    undo.onclick=()=>work('Vracím předchozí místní nastavení…',async()=>{if(!backup)return;const previous=backup;backup=structuredClone(adapter.read());await adapter.apply(previous);say('Místní nastavení obnoveno. Pro změnu profilu použijte Uložit na OneDrive.','dirty');});
    let timer;function changed(event){if(panel.contains(event.target)||busy)return;clearTimeout(timer);timer=setTimeout(()=>{if(!baseline)return;if(dirty()){errorText='';say(profileId?'Neuložené změny.':'Změny nejsou přiřazené k profilu.','dirty');}else if(!errorText)say(loaded?'Uloženo na OneDrive.':'Tato aplikace zatím není v profilu uložená.',loaded?'saved':'');},200);}
    for(const event of ['input','change','click','eduvize-profile-change'])document.addEventListener(event,changed);
    root.addEventListener('beforeunload',event=>{if(profileId&&dirty()){event.preventDefault();event.returnValue='';}});
    root.addEventListener('eduvize-admin-auth-change',()=>{state();if(ready&&!busy)work('Načítám profily…',()=>list(false));});
    state();try{await waitAdapter(adapter);ready=true;baseline=fingerprint(adapter.read());const resume=await restoreDraft();await root.EduvizeAdminAuth?.ready;await work('Načítám profily…',()=>list(!resume));}catch(e){say(e.message,'error');state();}
    return {refresh:()=>work('Načítám profily…',()=>list(false))};
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
    if(!host||host.dataset.mounted)return;host.dataset.mounted='';host.classList.add('edu-profile-panel');host.append(make('h2','Správa konfigurací'));host.append(make('p','Profily nastavení všech aplikací se ukládají na připojený OneDrive. Jednotlivá nastavení upravujete v administracích aplikací.'));
    const ui=controls(host),form=make('form',null,'edu-profile-panel__row'),nameLabel=make('label','Název nového profilu'),nameInput=make('input');nameInput.maxLength=80;nameInput.required=true;nameLabel.append(nameInput);const create=button('Vytvořit profil',false),copy=button('Kopírovat vybraný profil');create.type='submit';form.append(nameLabel,create,copy);host.append(form);
    const grid=make('div',null,'edu-profile-apps');host.append(grid);
    const history=make('div',null,'edu-profile-history'),historyLabel=make('label','Předchozí verze celého profilu'),historySelect=make('select'),restore=button('Obnovit vybranou verzi');historyLabel.append(historySelect);history.append(historyLabel,restore);history.hidden=true;host.append(history);
    const legacy=document.createElement('details');legacy.className='edu-profile-history';const legacyTitle=make('summary','Starší konfigurace kiosku');const legacySelect=make('select');legacySelect.setAttribute('aria-label','Starší konfigurace kiosku');const legacyList=button('Načíst starší konfigurace'),legacyImport=button('Převést do vybraného profilu');legacy.append(legacyTitle,legacySelect,legacyList,legacyImport);host.append(legacy);
    async function legacyRequest(path=''){const auth=root.EduvizeAdminAuth;await auth.ready;if(!auth.getToken('documents'))throw Error('Starší konfigurace vyžadují přihlášení Dokumentů na stránce Účet a konfigurace.');const response=await auth.fetch(DOCS+'/api/admin/kiosk-configurations'+path,{},'documents'),data=await response.json();if(!response.ok)throw Error(data.detail||'Starší konfigurace nejsou dostupné.');return data;}
    let id=selection(),current=null,busy=false;
    async function work(text,fn){if(busy)return;busy=true;for(const e of [ui.select,ui.reload,create,copy,restore,legacyList,legacyImport])e.disabled=true;ui.status.textContent=text;try{await fn();}catch(e){ui.status.textContent=e.message;}finally{busy=false;for(const e of [ui.select,ui.reload,create,copy,legacyList,legacyImport])e.disabled=false;restore.disabled=!historySelect.options.length;}}
    async function draw(){grid.replaceChildren();history.hidden=!id;if(!id){current=null;ui.status.textContent='Vytvořte profil školy nebo vyberte existující.';return;}select(id);current=await request('/'+id);const versions=await request('/'+id+'/history');historySelect.replaceChildren();for(const v of versions.items)historySelect.add(new Option('Verze '+v.revision+' · '+new Date(v.updatedAt).toLocaleString('cs-CZ'),v.revision));restore.disabled=!versions.items.length;
      for(const app of apps){const entry=current.apps[app.id],card=make('article',null,'edu-profile-app'),link=make('a','Otevřít administraci','edu-admin__button edu-admin__button--secondary'),u=new URL(app.url);u.searchParams.set('edu-profile',id);link.href=u.href;link.onclick=async event=>{if(event.metaKey||event.ctrlKey||event.shiftKey)return;event.preventDefault();await work('Otevírám administraci…',async()=>{const target=await root.EduvizeAdminAuth.handoff(u.href);location.assign(target);});};card.append(make('h3',app.name),make('p',entry&&!entry.config.empty?'Uloženo · '+new Date(entry.updatedAt).toLocaleString('cs-CZ'):'Nastavení zatím není uloženo'),link);grid.append(card);}ui.status.textContent='Profil „'+current.name+'“ · verze '+current.revision+'.';
    }
    async function list(){const data=await request();options(ui.select,data.items,id);id=ui.select.value;await draw();}
    ui.select.onchange=()=>work('Načítám profil…',async()=>{id=ui.select.value;await draw();});ui.reload.onclick=()=>work('Načítám profily…',list);
    form.onsubmit=event=>{event.preventDefault();work('Vytvářím profil na OneDrive…',async()=>{const value=await request('',{method:'POST',body:JSON.stringify({name:nameInput.value})});id=value.id;nameInput.value='';await list();});};
    copy.onclick=()=>work('Kopíruji profil…',async()=>{if(!id)throw Error('Nejprve vyberte profil.');if(!nameInput.value.trim())throw Error('Vyplňte název kopie v poli Název nového profilu.');const value=await request('',{method:'POST',body:JSON.stringify({name:nameInput.value,copyFrom:id})});id=value.id;nameInput.value='';await list();});
    restore.onclick=()=>work('Obnovuji profil…',async()=>{if(!current||!historySelect.value)return;if(!confirm('Obnovit nastavení všech aplikací ve vybraném profilu? Současná verze zůstane v historii.'))return;await request('/'+id+'/restore',{method:'POST',body:JSON.stringify({revision:Number(historySelect.value),expectedRevision:current.revision})});await draw();});
    legacyList.onclick=()=>work('Načítám starší konfigurace kiosku…',async()=>{const data=await legacyRequest();legacySelect.replaceChildren();for(const item of data.items)legacySelect.add(new Option(item.name,item.name));ui.status.textContent=data.items.length?'Vyberte konfiguraci a cílový profil. Původní soubor zůstane zachován.':'Žádné starší konfigurace kiosku nebyly nalezeny.';});
    legacyImport.onclick=()=>work('Převádím konfiguraci kiosku…',async()=>{if(!id||!legacySelect.value)throw Error('Vyberte profil i starší konfiguraci kiosku.');const profile=await request('/'+id);if(profile.apps.kiosk&&!profile.apps.kiosk.config.empty&&!confirm('Nahradit nastavení kiosku ve vybraném profilu? Současná verze zůstane v historii.'))return;const data=await legacyRequest('/'+encodeURIComponent(legacySelect.value));if(data.format!=='eduvize-kiosk'||data.version!==1||!data.config)throw Error('Nepodporovaná starší konfigurace.');await request('/'+id+'/apps/kiosk',{method:'PUT',body:JSON.stringify({expectedRevision:profile.apps.kiosk?.revision||0,config:{schemaVersion:1,data:data.config}})});await draw();ui.status.textContent='Konfigurace kiosku převedena do profilu. Původní soubor zůstal zachován.';});
    root.addEventListener('eduvize-admin-auth-change',()=>work('Načítám profily…',list));await work('Načítám profily…',list);
  }
  root.EduvizeProfiles=Object.freeze({mount,manager,fields,segment,applySegment,apps,request,fingerprint});
  function start(){manager(document.getElementById('configurations'));if(root.EduvizeProfileAdapter)mount(root.EduvizeProfileAdapter);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  root.addEventListener('eduvize-profile-adapter-ready',()=>mount(root.EduvizeProfileAdapter));
})(window);
