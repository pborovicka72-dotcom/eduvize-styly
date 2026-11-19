/* Existing registry actions; saved-copy-preview is explicit opt-in. Output/preview opens preserve the configuration tab. */
(function(root){'use strict';
 const ID=/^[a-f0-9]{32}$/;
 const clone=value=>JSON.parse(JSON.stringify(value));
 let authGeneration=0;
 const actionValidators=new WeakMap();
 const authIdentity=()=>{const auth=root.EduvizeAdminAuth,state=auth?.status?.();return JSON.stringify([auth?.getToken?.()||'',state?.connected,state?.schoolId||'',state?.profileId||'',state?.scopes||[]]);};
 let observedAuthIdentity=authIdentity();
 root.addEventListener?.('eduvize-admin-auth-change',()=>{const next=authIdentity();if(next!==observedAuthIdentity){observedAuthIdentity=next;authGeneration++;}});
 root.addEventListener?.('eduvize-profile-selected',()=>{authGeneration++;});
 function capturePrincipal(c){
  const auth=root.EduvizeAdminAuth,generation=authGeneration,scope=auth?.getToken?.('configurations')?'configurations':'documents',token=auth?.getToken?.(scope);
  const signature=()=>{const state=auth?.status?.();return JSON.stringify([state?.connected,state?.schoolId||'',state?.profileId||'',state?.scopes||[]]);},before=signature();
  const valid=()=>{const state=auth?.status?.();return !!token&&root.EduvizeAdminAuth===auth&&authGeneration===generation&&auth.getToken(scope)===token&&signature()===before&&state?.connected===true&&state.schoolId===c.schoolId&&state.profileId===c.profileId;};
  if(!valid())fail('CONTEXT_REQUIRED','Nejprve ověřte přihlášení a školní profil.');
  return Object.freeze({valid});
 }

 function fail(code,message){const e=new Error(message);e.code=code;throw e;}
 function transientPublicationError(error){
  return [408,425,429,500,502,503,504].includes(Number(error?.status))||error?.code==='REQUEST_ABORTED'||error?.name==='AbortError';
 }
 function interactionOf(p){
  if(!['display','interactive'].includes(p?.interaction))fail('INVALID_INTERACTION','Vyberte dotykovou nebo nedotykovou verzi výstupu.');
  return p.interaction;
 }
 function variantMatches(c,draft){
  return canonicalSlot(draft?.presentation)===c.slotId&&interactionOf(draft.presentation)===c.interaction&&
   (c.appId!=='gallery'||!c.sourceId||draft?.payload?.albumId===c.sourceId)&&
   (c.appId!=='weather'||draft?.payload?.weatherStyle===c.sourceId)&&
   (c.appId!=='school-systems'||draft?.payload?.provider+':'+(draft?.payload?.target==='teacher'?'teacher_':'')+draft?.payload?.view===c.sourceId);
 }
 function canonicalSlot(p){
  if(!p||!['web','nsp','kiosk'].includes(p.mode))fail('INVALID_GEOMETRY','Vyberte platný režim výstupu.');
  const g=p.geometry;
  if(p.mode==='web'){if(g!==null)fail('INVALID_GEOMETRY','Běžná stránka nemá geometrii segmentu.');return JSON.stringify(['web']);}
  if(!g||g.registryVersion!==1||!['landscape','portrait'].includes(g.orientation))fail('INVALID_GEOMETRY','Vyberte platnou geometrii výstupu.');
  if(p.mode==='nsp'){
   if(g.registryId!=='nsp-4k'||!Number.isInteger(g.layoutId)||!Number.isInteger(g.segmentId)||g.width!=null||g.height!=null||!root.EduvizeNSPLayouts?.layouts?.[g.orientation]?.[g.layoutId]?.[g.segmentId-1])fail('INVALID_GEOMETRY','Vyberte existující segment NSP.');
   return JSON.stringify(['nsp',1,g.orientation,g.layoutId,g.segmentId]);
  }
  if(g.registryId!=='kiosk-viewport'||g.layoutId!=null||g.segmentId!=null||![g.width,g.height].every(n=>Number.isInteger(n)&&n>=240&&n<=8192)||(g.orientation==='portrait')!==(g.height>g.width))fail('INVALID_GEOMETRY','Vyberte platné rozměry kiosku.');
  return JSON.stringify(['kiosk',1,g.orientation,g.width,g.height]);
 }
 function reserveOutputTab(){
  const tab=root.open('about:blank','_blank');
  if(!tab)fail('POPUP_BLOCKED','Nová záložka byla zablokována. Povolte ji pro Eduvize a zkuste otevření znovu.');
  try{tab.opener=null;}catch(error){tab.close();fail('POPUP_UNSAFE','Novou záložku nelze bezpečně otevřít.');}
  return tab;
 }
 async function openResolved(resolveUrl,presentation=null,validate=()=>{}){
  const tab=reserveOutputTab();
  try{const url=await resolveUrl();if(tab.closed)fail('POPUP_CLOSED','Nová záložka byla zavřena. Zkuste otevření znovu.');validate();
   if(presentation&&presentation.mode!=='web'){
    canonicalSlot(presentation);const g=presentation.geometry;
    const size=presentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
    if(!root.EduvizePreviewViewport?.mount||!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné. Obnovte stránku a zkuste náhled znovu.');
    const doc=tab.document;if(!doc?.body)fail('PREVIEW_VIEWPORT_REQUIRED','Okno náhledu se nepodařilo připravit.');
    doc.title='Náhled výstupu';doc.body.replaceChildren();doc.body.style.margin='0';doc.body.style.overflow='hidden';
    const host=doc.createElement('div'),frame=doc.createElement('iframe');host.style.width='100vw';host.style.height='100vh';host.style.position='relative';frame.title='Náhled rozpracovaného výstupu';doc.body.append(host);host.append(frame);
    root.EduvizePreviewViewport.mount(frame,{host,width:size[0],height:size[1],aspect:false});
    validate();if(tab.closed)fail('POPUP_CLOSED','Nová záložka byla zavřena.');frame.src=url;
   }else tab.location.replace(url);
   return url;}
  catch(error){if(!tab.closed)tab.close();throw error;}
 }
 function create(options){
  const client=options.client,storage=options.journal||root.localStorage,origin=options.origin||root.location?.origin;
  if(!['https://test.skola.eduvize.cz','https://skola.eduvize.cz'].includes(origin))throw new TypeError('Explicit Eduvize origin required');
  const lock=options.lock||((key,fn)=>{
   if(!root.navigator?.locks)fail('LOCK_UNAVAILABLE','Pro vytvoření odkazu je potřeba prohlížeč s podporou bezpečného souběhu.');
   return root.navigator.locks.request(key,{mode:'exclusive'},fn);
  });
  if(!client||!storage||typeof client.lookupOutputSlot!=='function')throw new TypeError('Client with shared slot lookup and durable journal required');
  function context(){
   const c=clone(options.context());
   if(typeof c.schoolId!=='string'||!c.schoolId||c.schoolId.length>128||!ID.test(c.profileId)||!/^[a-z][a-z0-9-]{0,47}$/.test(c.appId))fail('CONTEXT_REQUIRED','Nejprve vyberte uložený školní profil a výstup.');
   const value={schoolId:c.schoolId,profileId:c.profileId,appId:c.appId,slotId:canonicalSlot(c.presentation),interaction:interactionOf(c.presentation)};
   if(Object.prototype.hasOwnProperty.call(c,'sourceId')){
    if(!(c.appId==='news'&&typeof c.sourceId==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(c.sourceId)||c.appId==='gallery'&&typeof c.sourceId==='string'&&ID.test(c.sourceId)||c.appId==='weather'&&['standard','station'].includes(c.sourceId)||c.appId==='school-systems'&&/^(?:bakalari|edupage|edookit|skolaonline):(?:teacher_)?(?:timetable|permanent|changes|staffchanges|guards|events|notices|overview|substitution_overview)$/.test(c.sourceId)))fail('INVALID_SOURCE','Vyberte platnou variantu výstupu.');
    value.sourceId=c.sourceId;
   }
   if(c.appId!=='gallery'){if(root.EduvizeProfiles?.outputContextVersion!=='profile-applied-v1'||typeof root.EduvizeProfiles.assertOutputContext!=='function')fail('OUTPUT_PROFILE_NOT_APPLIED','Ověření načteného profilu se ještě nepřipravilo. Obnovte stránku.');root.EduvizeProfiles.assertOutputContext(value);}
   principalGuards.set(value,capturePrincipal(value));return value;
  }
  const scope=c=>'edu-output-action-v2:'+encodeURIComponent(JSON.stringify(c));
  const requestGuards=new WeakMap(),principalGuards=new WeakMap(),legacyBindings=new WeakMap();
  function current(c){const live=requestGuards.get(c)||c,principal=principalGuards.get(live);if(!principal?.valid()||JSON.stringify(context())!==JSON.stringify(live))fail('CONTEXT_CHANGED','Přihlášení, školní profil nebo výstup se změnily. Zkuste akci znovu.');}
  function read(key){const raw=storage.getItem(key);if(!raw)return {version:1};let value;try{value=JSON.parse(raw);}catch{fail('INVALID_JOURNAL','Nelze bezpečně obnovit rozpracovanou změnu odkazu.');}if(value.version!==1)fail('INVALID_JOURNAL','Nelze bezpečně obnovit rozpracovanou změnu odkazu.');return value;}
  function write(key,state){storage.setItem(key,JSON.stringify(state));}
  function record(value,c){
   if(!value||!ID.test(value.id)||value.profileId!==c.profileId||value.appId!==c.appId||!Number.isInteger(value.revision)||value.revision<0)fail('INVALID_RECORD','Server vrátil jiný nebo neplatný výstup.');
   return value;
  }
  async function call(c,fn){current(c);const value=await fn();current(c);return value;}
  function publicUrl(value,id){
   if(value!==origin+'/o/'+id)fail('INVALID_RESPONSE','Server vrátil neplatný odkaz.');
   return value;
  }
  async function stableKey(c,action){
   c=legacyBindings.get(c)||c;
   const parts=['edu-output-slot-v2',origin,c.schoolId,c.profileId,c.appId,c.slotId,action];
   if(Object.prototype.hasOwnProperty.call(c,'interaction'))parts.push('output-interaction-v1',c.interaction);
   if(Object.prototype.hasOwnProperty.call(c,'sourceId'))parts.push(c.appId==='gallery'?'gallery-album-v1':c.appId==='weather'?'weather-style-v1':c.appId==='school-systems'?'sis-view-v1':'news-source-v1',c.sourceId);
   const bytes=new root.TextEncoder().encode(JSON.stringify(parts));
   const digest=await root.crypto.subtle.digest('SHA-256',bytes);
   return Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,32);
  }
  async function lookup(c){
   legacyBindings.delete(c);
   const assemblyKey=await stableKey(c,'assembly');
   let value=await call(c,()=>client.lookupOutputSlot({appId:c.appId,profileId:c.profileId,assemblyKey}));
   if(value?.assemblyId===null&&value?.output===null&&(value.generation===undefined||value.generation===0)){
    const legacy={...c};delete legacy.interaction;
    if(c.appId==='weather'||c.appId==='school-systems')delete legacy.sourceId;
    const candidates=[legacy];
    if(c.appId==='gallery'&&c.sourceId){const oldest={...legacy};delete oldest.sourceId;candidates.push(oldest);}
    for(const prior of candidates){
     const legacyKey=await stableKey(prior,'assembly');
     const candidate=await call(c,()=>client.lookupOutputSlot({appId:c.appId,profileId:c.profileId,assemblyKey:legacyKey}));
     if(!candidate||!(candidate.assemblyId===null||ID.test(candidate.assemblyId))||!(candidate.output===null||candidate.output&&ID.test(candidate.output.id))||!Number.isSafeInteger(candidate.generation??0)||(candidate.generation??0)<0)fail('INVALID_RECORD','Server vrátil neplatné původní přiřazení výstupu.');
     if(!candidate.output)continue;
     const old=record(candidate.output,c);
     if(old.assemblyId!==candidate.assemblyId)fail('BINDING_CHANGED','Původní přiřazení výstupu není platné.');
     if(old.state!=='published')continue;
     const authenticated=record(await call(c,()=>client.getOutput(old.id)),c);
     const published=await call(c,()=>client.getPublicOutput(old.id));
     const same=['id','profileId','appId','assemblyId','revision','state','publishedRevision'].every(k=>authenticated[k]===old[k]);
     if(!same||published?.schemaVersion!==1||published.id!==old.id||published.appId!==c.appId||published.publishedRevision!==old.publishedRevision)fail('BINDING_UNCONFIRMED','Původní výstup se změnil. Obnovte stránku a zkuste akci znovu.');
     if(!variantMatches(c,authenticated.draft)||!variantMatches(c,published))continue;
     legacyBindings.set(c,prior);value=candidate;break;
    }
   }
   if(!value||!(value.assemblyId===null||ID.test(value.assemblyId))||!(value.output===null||value.output&&ID.test(value.output.id)))fail('INVALID_RECORD','Server vrátil neplatné přiřazení výstupu.');
   if(value.output){record(value.output,c);if(value.output.assemblyId!==value.assemblyId)fail('BINDING_CHANGED','Přiřazení výstupu není platné.');}
   const generation=value.generation===undefined?0:value.generation;if(!Number.isSafeInteger(generation)||generation<0)fail('INVALID_RECORD','Server vrátil neplatnou generaci výstupu.');
   return {...value,generation};
  }
  async function resolve(c){
   return (await lookup(c)).output;
  }
  function serialized(fn){const c=context();return lock(scope(c),async()=>{current(c);return fn(c);});}
  async function generate({draft}){return serialized(c=>generateHeld(c,draft));}
  async function generateHeld(c,draft){
   const key=scope(c),requested=clone(draft);
   if(!variantMatches(c,requested))fail('CONTEXT_CHANGED','Uložený formát nebo varianta výstupu se změnily. Uložte nastavení a zkuste akci znovu.');
    try{
    current(c);const state=read(key);let flow=state.pending;
    if(!flow){
     const binding=await lookup(c),existing=binding.output;
     if(existing?.state==='revoked')fail('OUTPUT_REVOKED','Tento odkaz byl odvolán. Nejdříve ověřte, který výstup chcete používat.');
     flow={draft:requested,outputId:existing?.id||null,assemblyId:existing?.assemblyId||null,revision:existing?.revision??null,
      generation:binding.generation,assemblyKey:await stableKey(c,'assembly'),outputKey:await stableKey(c,binding.generation?'output:'+binding.generation:'output'),saveKey:client.newOperation(),publishKey:client.newOperation(),stage:existing?'save':'assembly'};
     state.pending=flow;write(key,state); // Must succeed before the first mutation.
    }
    if(flow.generation!==undefined&&(!Number.isSafeInteger(flow.generation)||flow.generation<0))fail('INVALID_JOURNAL','Neplatná generace rozpracované operace.');
    if(flow.assemblyKey!==await stableKey(c,'assembly')||flow.outputKey!==await stableKey(c,flow.generation?'output:'+flow.generation:'output'))fail('INVALID_JOURNAL','Nelze bezpečně obnovit rozpracovanou změnu odkazu.');
    if((await lookup(c)).generation!==(flow.generation??0))fail('OUTPUT_DELETED','Původní výstup byl odstraněn. Obnovte stránku a znovu použijte Kopírovat odkaz.');
    if(!variantMatches(c,flow.draft))fail('INVALID_JOURNAL','Varianta rozpracované změny neodpovídá výstupu.');
    async function verifyBinding(){
     const value=record(await call(c,()=>client.getOutput(flow.outputId)),c);
     if(!ID.test(flow.assemblyId)||value.assemblyId!==flow.assemblyId)fail('BINDING_CHANGED','Přiřazení výstupu se změnilo. Nejdříve ověřte výstup.');
     const resolved=await lookup(c);
     if(resolved.generation!==(flow.generation??0)||resolved.assemblyId!==flow.assemblyId||resolved.output?.id!==value.id)fail('BINDING_CHANGED','Přiřazení výstupu k obsahu se změnilo. Nejdříve ověřte výstup.');
     return value;
    }
    if(flow.outputId&&flow.stage!=='save'&&flow.stage!=='publish')await verifyBinding(); // Save/publish verify the same binding immediately before their mutation below; a journal never authorizes a target.
    const recovered=JSON.stringify(flow.draft)!==JSON.stringify(requested);
    if(flow.stage==='assembly'){
     const a=await call(c,()=>client.createAssembly({schemaVersion:1,appId:c.appId,profileId:c.profileId},flow.assemblyKey));
     if(!ID.test(a?.id))fail('INVALID_RECORD','Server vrátil neplatný výstup.');
     flow.assemblyId=a.id;flow.stage='discover';write(key,state);
    }
    async function discover(){
     const slot=await lookup(c);
     if(slot.assemblyId!==flow.assemblyId)fail('BINDING_CHANGED','Přiřazení výstupu se změnilo.');
     if(slot.output){
      const r=record(slot.output,c);
      if(r.assemblyId!==flow.assemblyId||r.state==='revoked')fail('BINDING_CHANGED','Uložený odkaz se změnil. Nejdříve ověřte výstup.');
      flow.outputId=r.id;flow.revision=r.revision;flow.stage='save';
     }else flow.stage='create';
     write(key,state);
    }
    if(flow.stage==='discover')await discover();
    if(flow.stage==='create'){
     const slot=await lookup(c);
     if(slot.assemblyId!==flow.assemblyId)fail('BINDING_CHANGED','Přiřazení výstupu se změnilo. Nejdříve ověřte výstup.');
     try{
      const r=record(await call(c,()=>client.createOutput({schemaVersion:1,appId:c.appId,profileId:c.profileId,assemblyId:flow.assemblyId,draft:flow.draft,...(flow.generation?{slotGeneration:flow.generation}:{})},flow.outputKey)),c);
      flow.outputId=r.id;flow.revision=r.revision;flow.stage='publish';write(key,state);
     }catch(error){
      if(error.status!==409||error.code!=='IDEMPOTENCY_CONFLICT')throw error;
      // A different device won first creation with different content. Reuse its ID;
      // save/publish below still enforce current revision and normal server guards.
      flow.stage='discover';write(key,state);await discover();
      if(flow.stage==='create')throw error;
     }
    }
    if(flow.stage==='save'){
     await verifyBinding();
     const r=record(await call(c,()=>client.saveDraft(flow.outputId,{expectedRevision:flow.revision,draft:flow.draft},flow.saveKey)),c);
     if(r.id!==flow.outputId)fail('INVALID_RECORD','Server vrátil jiný výstup.');
     flow.revision=r.revision;flow.stage='publish';write(key,state);
    }
    if(flow.stage==='publish'){
     await verifyBinding();
     const r=record(await call(c,()=>client.publishOutput(flow.outputId,{expectedRevision:flow.revision},flow.publishKey)),c);
     if(r.id!==flow.outputId||r.state!=='published'||r.publishedRevision!==flow.revision+1||r.revision!==r.publishedRevision)fail('PUBLISH_UNCONFIRMED','Změnu výstupu se nepodařilo potvrdit. Zkuste stejnou akci znovu.');
     flow.publishedRevision=r.publishedRevision;flow.stage='link';write(key,state);
    }
    if(flow.stage!=='link')fail('INVALID_JOURNAL','Nelze bezpečně dokončit změnu odkazu.');
    const result=await call(c,()=>client.getOutputLink(flow.outputId));
    if(result.id!==flow.outputId||result.state!=='published'||!result.url)fail('PUBLISH_UNCONFIRMED','Změnu výstupu se nepodařilo potvrdit. Zkuste stejnou akci znovu.');
    publicUrl(result.url,flow.outputId);
    if(result.publishedRevision!==flow.publishedRevision)throw Object.assign(new Error('Výstup mezitím změnil jiný uživatel. Ověřte aktuální obsah a změnu případně znovu aktualizujte.'),{status:409,code:'REVISION_CONFLICT'});
    state.outputId=flow.outputId;state.lastLink=result.url;delete state.pending;write(key,state);
    return {...result,recoveredPreviousChange:recovered};
    }catch(error){
    if(error.code==='OUTPUT_DELETED'||(error.status===410&&error.code==='DELETED')||(error.status===409&&error.code==='SLOT_GENERATION_CHANGED')){
     const state=read(key);if(state.pending){delete state.pending;delete state.outputId;delete state.lastLink;write(key,state);}
    }else if(error.status===422||(error.status===409&&['REVISION_CONFLICT','MEDIA_CHANGED'].includes(error.code))){
     const state=read(key);
     if(state.pending){if(state.pending.outputId)state.outputId=state.pending.outputId;delete state.pending;write(key,state);}
    }
    throw error;
    }
  }
  async function link(){return linkHeld(context());}
  async function linkHeld(c){
   // Copy/Open are GET-only, even if creation or publication is incomplete.
   const r=await resolve(c);
   if(!r||r.state!=='published')fail('NO_OUTPUT','Nejprve použijte Vygenerovat odkaz.');
   const value=await call(c,()=>client.getOutputLink(r.id));
   if(value.id!==r.id||value.state!=='published'||!value.url)fail('NO_OUTPUT','Odkaz není dostupný.');
   return publicUrl(value.url,r.id);
  }
  const legacy={generate,link,state:async()=>lookup(context())};
  if(options.workflow!=='saved-copy-preview')return Object.freeze(legacy);
  if(typeof options.draft!=='function'||typeof options.previewDraftUrl!=='function')throw new TypeError('Saved DTO reader and native draft preview URL required');
  async function publishSaved(c,savedCommit){
   const draft=await call(c,()=>options.draft({savedCommit}));
   let result=await generateHeld(c,draft);
   // Recover an older operation first, then publish the exact requested saved snapshot.
   if(result.recoveredPreviousChange)result=await generateHeld(c,draft);
   return result;
  }
  async function ensurePublishedFromSaved(){
   const live=context();
   const first=await call(live,()=>options.draft({savedCommit:null,purpose:'copy'}));
   const c={...live,slotId:canonicalSlot(first?.presentation)};requestGuards.set(c,live);
   return lock(scope(c),async()=>{
    current(c);
    const draft=await call(c,()=>options.draft({savedCommit:null,purpose:'copy'}));
    if(!variantMatches(c,draft))fail('CONTEXT_CHANGED','Uložený formát nebo varianta výstupu se změnily. Uložte nastavení a zkuste kopírování znovu.');
    const existing=await resolve(c);
    if(existing?.state==='revoked')fail('OUTPUT_REVOKED','Tento odkaz byl odvolán. Ověřte používaný výstup.');
    if(existing?.state==='published')return linkHeld(c);
    if(existing&&!read(scope(c)).pending)fail('PUBLISH_UNCONFIRMED','Existující výstup není zveřejněný. Uložte nastavení znovu.');
    let result=await generateHeld(c,draft);
    if(result.recoveredPreviousChange)result=await generateHeld(c,draft);
    return publicUrl(result.url,result.id);
   });
  }
  async function withSavedCommit(saveFn){
   if(typeof saveFn!=='function')throw new TypeError('Confirmed settings commit callback required');
   return serialized(async c=>{
    // The lock is held before the first settings PUT; Save and Copy share its identity.
    const confirmed=await saveFn();let savedCommit;
    try{
     savedCommit=clone(confirmed);
     current(c);
     if(savedCommit.profileId!==c.profileId||savedCommit.appId!==c.appId||!Number.isSafeInteger(savedCommit.revision)||savedCommit.revision<0||!savedCommit.config)fail('INVALID_SAVED_COMMIT','Nelze ověřit uložené nastavení.');
     const confirmedDraft=await call(c,()=>options.draft({savedCommit}));
     if(!variantMatches(c,confirmedDraft))fail('INVALID_SAVED_COMMIT','Potvrzené uložení neodpovídá vybrané variantě a formátu výstupu.');
     // The settings PUT is acknowledged once. A transient output API failure may
     // be resumed with its durable idempotency journal, without saving settings again.
     for(let attempt=0;attempt<3;attempt++){
      try{
       current(c);
       const existing=await resolve(c);
       if(!existing)return {settingsSaved:true,outputUpdated:false,savedCommit};
       if(existing.state==='revoked')fail('OUTPUT_REVOKED','Tento odkaz byl odvolán. Ověřte používaný výstup.');
       const output=await publishSaved(c,savedCommit);
       return {settingsSaved:true,outputUpdated:true,savedCommit,output};
      }catch(error){
       if(attempt===2||!transientPublicationError(error))throw error;
       await new Promise(resolve=>root.setTimeout(resolve,attempt===0?400:1200));
      }
     }
    }catch(cause){throw Object.assign(new Error('Nastavení bylo uloženo, aktualizace výstupu se nezdařila.'),{code:'OUTPUT_UPDATE_FAILED',settingsSaved:true,savedCommit,cause});}
   });
  }
  async function previewDraft(){
   const c=context(),previewPresentation=clone(options.context().presentation),menuNativeHost=c.appId==='menu'&&previewPresentation.mode!=='web'&&options.previewHost==='menu-native-physical-v1',newsNativeHost=c.appId==='news'&&previewPresentation.mode!=='web'&&options.previewHost==='news-protected-physical-v1',documentsNativeHost=c.appId==='documents'&&previewPresentation.mode!=='web'&&options.previewHost==='documents-protected-physical-v1',galleryNativeHost=c.appId==='gallery'&&previewPresentation.mode!=='web'&&options.previewHost==='gallery-protected-physical-v1',weatherNativeHost=c.appId==='weather'&&previewPresentation.mode!=='web'&&options.previewHost==='weather-protected-physical-v1',transportNativeHost=c.appId==='transport'&&previewPresentation.mode!=='web'&&options.previewHost==='transport-protected-physical-v1',wisdomNativeHost=c.appId==='wisdom'&&previewPresentation.mode!=='web'&&options.previewHost==='wisdom-protected-physical-v1',holidaysNativeHost=c.appId==='holidays'&&previewPresentation.mode!=='web'&&options.previewHost==='holidays-protected-physical-v1',calendarProtected=c.appId==='school-calendar'&&options.previewHost==='school-calendar-protected-preview-v1';
   const validate=()=>{current(c);if(JSON.stringify(options.context().presentation)!==JSON.stringify(previewPresentation))fail('CONTEXT_CHANGED','Zobrazení náhledu se během otevírání změnilo. Zkuste akci znovu.');};validate();
   if(wisdomNativeHost||holidaysNativeHost||calendarProtected){
    // These draft URLs are synchronous. Give Safari the destination in the original click stack.
    const value=options.previewDraftUrl();
    if(value&&typeof value.then==='function')fail('INVALID_PREVIEW','Náhled není připravený.');
    const url=new URL(String(value),origin);
    const pathValid=wisdomNativeHost?['/eduvize-moudrost-dne/signage.html','/eduvize-moudrost-dne/index.html'].includes(url.pathname):holidaysNativeHost?url.pathname==='/eduvize-svatky/index.html':url.pathname==='/eduvize-skolni-kalendar/index.html';
    const calendarModeValid=!calendarProtected||(url.searchParams.getAll('viewMode').length===1&&url.searchParams.get('viewMode')===previewPresentation.mode&&(
     previewPresentation.mode==='web'||previewPresentation.mode==='nsp'&&url.searchParams.getAll('ev_inner').length===1&&url.searchParams.get('ev_inner')==='1'&&url.searchParams.get('segment_orientation')===previewPresentation.geometry.orientation&&Number(url.searchParams.get('segment_style'))===previewPresentation.geometry.layoutId&&Number(url.searchParams.get('segment_block'))===previewPresentation.geometry.segmentId||previewPresentation.mode==='kiosk'&&url.searchParams.getAll('calendar_preview_inner').length===1&&url.searchParams.get('calendar_preview_inner')==='1'&&Number(url.searchParams.get('calendar_preview_width'))===previewPresentation.geometry.width&&Number(url.searchParams.get('calendar_preview_height'))===previewPresentation.geometry.height));
    if(url.origin!==origin||url.username||url.password||!pathValid||url.searchParams.has('edu-output')||url.hash||url.searchParams.getAll('preview').length!==1||url.searchParams.get('preview')!=='1'||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==c.profileId||(holidaysNativeHost&&(url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||url.searchParams.get('viewMode')!==previewPresentation.mode))||!calendarModeValid)fail('INVALID_PREVIEW','Náhled musí použít aktuální školní profil a rozpracované nastavení.');
    canonicalSlot(previewPresentation);
    if(calendarProtected&&previewPresentation.mode==='web'){validate();const tab=reserveOutputTab();try{tab.location.replace(url.href);}catch(error){tab.close();fail('PREVIEW_OPEN_FAILED','Náhled se nepodařilo otevřít v nové záložce.');}return url.href;}
    const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
    if(!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné.');
    const host=new URL('/eduvize-styly/design-system/news-preview.html',origin);host.searchParams.set('native',url.href);host.searchParams.set('width',String(size[0]));host.searchParams.set('height',String(size[1]));host.searchParams.set('profile',c.profileId);host.searchParams.set('app',wisdomNativeHost?'wisdom':holidaysNativeHost?'holidays':'school-calendar');validate();
    const tab=reserveOutputTab();
    try{tab.location.replace(host.href);}catch(error){tab.close();fail('PREVIEW_OPEN_FAILED','Náhled se nepodařilo otevřít v nové záložce.');}
    return host.href;
   }
   return openResolved(async()=>{
    const value=await call(c,()=>options.previewDraftUrl()),url=new URL(String(value),origin);
    if(url.origin!==origin||url.username||url.password||url.searchParams.get('preview')!=='1')fail('INVALID_PREVIEW','Náhled musí zůstat v aplikaci Eduvize.');
    if(menuNativeHost){
     if(!['/jidelnicek/index.html','/eduvize-jidelnicek/index.html'].includes(url.pathname)||url.searchParams.has('edu-output')||['edu-menu-preview-viewport','edu-menu-preview-width','edu-menu-preview-height'].some(key=>url.searchParams.has(key)))fail('INVALID_PREVIEW','Náhled jídelníčku musí použít jeho aktuální rozpracovaná data.');
     canonicalSlot(previewPresentation);const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
     if(!root.EduvizePreviewViewport?.mount||!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné. Obnovte stránku a zkuste náhled znovu.');
     url.searchParams.set('ev_inner','1');url.searchParams.set('edu-menu-preview-viewport','1');url.searchParams.set('edu-menu-preview-width',String(size[0]));url.searchParams.set('edu-menu-preview-height',String(size[1]));
    }
    if(newsNativeHost){
     if(!['/aktuality/','/aktuality/index.html','/eduvize-aktuality/','/eduvize-aktuality/index.html'].includes(url.pathname)||url.searchParams.has('edu-output')||url.hash||url.searchParams.getAll('preview').length!==1||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==c.profileId)fail('INVALID_PREVIEW','Náhled Aktualit musí použít aktuální školní profil a rozpracovaná data.');
     canonicalSlot(previewPresentation);const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
     if(!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné.');
     const host=new URL('/eduvize-styly/design-system/news-preview.html',origin);host.searchParams.set('native',url.href);host.searchParams.set('width',String(size[0]));host.searchParams.set('height',String(size[1]));host.searchParams.set('profile',c.profileId);return host.href;
    }
    if(documentsNativeHost){
     if(url.pathname!=='/display'||url.searchParams.has('edu-output')||url.hash||url.searchParams.getAll('preview').length!==1||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==c.profileId)fail('INVALID_PREVIEW','Náhled Dokumentů musí použít aktuální školní profil a rozpracovaná data.');
     canonicalSlot(previewPresentation);const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
     if(!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné.');
     const host=new URL('/eduvize-styly/design-system/news-preview.html',origin);host.searchParams.set('native',url.href);host.searchParams.set('width',String(size[0]));host.searchParams.set('height',String(size[1]));host.searchParams.set('profile',c.profileId);host.searchParams.set('app','documents');return host.href;
    }
    if(galleryNativeHost){
     if(!['/eduvize-styly/fotogalerie/index.html','/eduvize-fotogalerie/index.html'].includes(url.pathname)||url.searchParams.has('edu-output')||url.hash||url.searchParams.getAll('preview').length!==1||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==c.profileId||url.searchParams.getAll('draft-preview').length!==1||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(url.searchParams.get('draft-preview'))||url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||url.searchParams.get('viewMode')!==previewPresentation.mode)fail('INVALID_PREVIEW','Náhled Fotogalerie musí použít aktuální školní profil a rozpracované album.');
     canonicalSlot(previewPresentation);const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
     if(!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné.');
     const host=new URL('/eduvize-styly/design-system/news-preview.html',origin);host.searchParams.set('native',url.href);host.searchParams.set('width',String(size[0]));host.searchParams.set('height',String(size[1]));host.searchParams.set('profile',c.profileId);host.searchParams.set('app','gallery');return host.href;
    }
    if(weatherNativeHost){
     if(url.pathname!=='/pocasi/display'||url.searchParams.has('edu-output')||url.hash||url.searchParams.getAll('preview').length!==1||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==c.profileId||url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||url.searchParams.get('viewMode')!==previewPresentation.mode)fail('INVALID_PREVIEW','Náhled Počasí musí použít aktuální školní profil a rozpracované nastavení.');
     canonicalSlot(previewPresentation);const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
     if(!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné.');
     const host=new URL('/eduvize-styly/design-system/news-preview.html',origin);host.searchParams.set('native',url.href);host.searchParams.set('width',String(size[0]));host.searchParams.set('height',String(size[1]));host.searchParams.set('profile',c.profileId);host.searchParams.set('app','weather');return host.href;
    }
    if(transportNativeHost){
     if(url.pathname!=='/eduvize-jizdni-rady/index.html'||url.searchParams.has('edu-output')||url.hash||url.searchParams.getAll('preview').length!==1||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==c.profileId||url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||url.searchParams.get('viewMode')!==previewPresentation.mode)fail('INVALID_PREVIEW','Náhled jízdních řádů musí použít aktuální profil a rozpracované zastávky.');
     canonicalSlot(previewPresentation);const g=previewPresentation.geometry,size=previewPresentation.mode==='nsp'?root.EduvizeNSPLayouts.layouts[g.orientation][g.layoutId][g.segmentId-1]:[g.width,g.height];
     if(!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0&&n<=8192))fail('PREVIEW_VIEWPORT_REQUIRED','Fyzické rozměry náhledu nyní nejsou dostupné.');
     const host=new URL('/eduvize-styly/design-system/transport-preview.html',origin);host.searchParams.set('native',url.href);host.searchParams.set('width',String(size[0]));host.searchParams.set('height',String(size[1]));host.searchParams.set('profile',c.profileId);return host.href;
    }
    return url.href;
   },menuNativeHost||newsNativeHost||documentsNativeHost||galleryNativeHost||weatherNativeHost||transportNativeHost||wisdomNativeHost||holidaysNativeHost||calendarProtected?null:previewPresentation,validate);
  }
  const savedActions=Object.freeze({...legacy,workflow:'saved-copy-preview',withSavedCommit,ensurePublishedFromSaved,previewDraft});
  actionValidators.set(savedActions,()=>{const captured=context();return ()=>current(captured);});
  return savedActions;
 }
 function mount(options){
  if(options.workflow==='saved-copy-preview')return mountSavedCopyPreview(options);
  const actions=create(options),{generateButton,copyButton,openButton,status}=options.elements;
  let busy=false;
  const message=text=>{status.textContent=text;};
  async function run(fn){if(busy)return;busy=true;generateButton.disabled=true;try{await fn();}catch(e){message((e.code||e.status)&&e.message?e.message:'Výsledek se nepodařilo potvrdit. Zkuste stejnou akci znovu.');}finally{busy=false;generateButton.disabled=false;}}
  generateButton.addEventListener('click',()=>run(async()=>{
   const before=JSON.stringify(options.context()),draft=await options.draft();
   if(before!==JSON.stringify(options.context()))fail('CONTEXT_CHANGED','Školní profil nebo výstup se změnil. Zkuste akci znovu.');
   const result=await actions.generate({draft});
   generateButton.textContent='Aktualizovat výstup';
   message(result.recoveredPreviousChange?'Předchozí změna je dokončena. Pro novější úpravy použijte Aktualizovat výstup.':'Odkaz je připravený.');
   options.onGenerated?.(result);
  }));
  copyButton.addEventListener('click',()=>run(async()=>{const url=await actions.link();await root.navigator.clipboard.writeText(url);message(root.EduvizeProfiles?.statusMessages?.copied||'Odkaz na veřejný výstup zkopírován.');}));
  openButton.addEventListener('click',()=>run(()=>openResolved(()=>actions.link())));
  return Object.freeze({...actions,async refresh(){
   const state=await actions.state();generateButton.textContent=state.output?'Aktualizovat výstup':'Vygenerovat odkaz';return state;
  }});
 }
 async function confirmClipboard(url){
  let timer;
  try{
   await Promise.race([
    Promise.resolve().then(()=>root.navigator.clipboard.writeText(url)),
    new Promise((_,reject)=>{timer=root.setTimeout(()=>reject(new Error('Clipboard confirmation deadline')),8000);})
   ]);
  }catch(cause){throw Object.assign(new Error('Odkaz je připravený, zkopírování do schránky se nepodařilo potvrdit.'),{code:'CLIPBOARD_UNCONFIRMED',cause});}
  finally{root.clearTimeout(timer);}
 }
 function reserveGestureClipboard(prepared,valid){
  let cancelled=false,pending;
  const data=prepared.then(url=>{valid();if(cancelled)fail('ACTION_CANCELLED','Kopírování bylo přerušeno změnou účtu nebo nastavení. Zkuste akci znovu.');return new root.Blob([url],{type:'text/plain'});});
  data.catch(()=>{}); // Unsupported/denied APIs may never consume the promised representation.
  try{
   if(typeof root.ClipboardItem!=='function'||typeof root.Blob!=='function'||typeof root.navigator?.clipboard?.write!=='function')throw new Error('Promised clipboard unavailable');
   // This call must stay in the original click stack, before saved-link work starts.
   pending=root.navigator.clipboard.write([new root.ClipboardItem({'text/plain':data})]);
   if(!pending||typeof pending.then!=='function')throw new Error('Clipboard confirmation unavailable');
  }catch(error){pending=Promise.reject(error);}
  const outcome=Promise.resolve(pending).then(()=>({ok:true}),cause=>({ok:false,cause}));
  return {cancel(){cancelled=true;},async confirm(){valid();if(cancelled)fail('ACTION_CANCELLED','Kopírování bylo přerušeno změnou účtu nebo nastavení. Zkuste akci znovu.');await confirmClipboardOutcome(outcome);valid();if(cancelled)fail('ACTION_CANCELLED','Kopírování bylo přerušeno změnou účtu nebo nastavení. Zkuste akci znovu.');}};
 }
 async function confirmClipboardOutcome(outcome){
  let timer;
  try{
   const value=await Promise.race([outcome,new Promise((_,reject)=>{timer=root.setTimeout(()=>reject(new Error('Clipboard confirmation deadline')),8000);})]);
   if(!value.ok)throw value.cause;
  }catch(cause){throw Object.assign(new Error('Odkaz je připravený, zkopírování do schránky se nepodařilo potvrdit.'),{code:'CLIPBOARD_UNCONFIRMED',cause});}
  finally{root.clearTimeout(timer);}
 }
 function mountSavedCopyPreview(options){
  const actions=create(options),{copyButton,openButton,status}=options.elements;
  function sink(){try{return root.EduvizeProfiles?.statusFor?.(options.context().appId)||null;}catch{return null;}}
  function result(message,state='success'){const target=sink();if(target){target.useResult(status);target.result(message,state);}else{status.textContent=message;if(status.dataset)status.dataset.state=state;}}
  let busy=false,fallback=null,clipboard=null,statusEpoch=0;
  function clearFallback(){if(fallback){fallback.active=false;fallback.url='';fallback.input.value='';fallback.host.remove();fallback=null;}}
  function invalidate(){statusEpoch++;clearFallback();clipboard?.cancel();}
  for(const event of ['eduvize-admin-auth-change','eduvize-profile-selected','input','change'])root.addEventListener?.(event,invalidate);
  root.addEventListener?.('click',event=>{if(event.target?.closest?.('[data-edu-save],[data-edu-profile-save]'))invalidate();},true);
  function canonicalUrl(url){
   const value=new URL(url),origin=options.origin||root.location?.origin;
   if(typeof url!=='string'||value.origin!==origin||value.username||value.password||value.search||value.hash||!/^\/o\/[a-f0-9]{32}$/.test(value.pathname)||value.href!==url)fail('INVALID_RESPONSE','Server vrátil neplatný odkaz.');
   return url;
  }
  function showFallback(url,valid){
   valid();clearFallback();
   const host=root.document.createElement('div');host.className='edu-admin__flow edu-output-clipboard-fallback';
   const label=root.document.createElement('label');label.className='edu-admin__field';label.textContent='Připravený odkaz';
   const input=root.document.createElement('input');input.type='text';input.readOnly=true;input.value=url;input.setAttribute('aria-label','Připravený odkaz ke zkopírování');label.append(input);
   const hint=root.document.createElement('p');hint.className='edu-admin__hint';hint.textContent='Odkaz můžete označit a zkopírovat pomocí Cmd/Ctrl+C. Opakované kopírování jej znovu nepublikuje.';
   const row=root.document.createElement('div');row.className='edu-admin__actions';const retry=root.document.createElement('button');retry.type='button';retry.className='edu-admin__button edu-admin__button--secondary';retry.textContent='Zkopírovat připravený odkaz';row.append(retry);host.append(label,hint,row);status.after(host);
   const entry={active:true,url,valid,host,input,retry};fallback=entry;
   input.addEventListener('click',()=>{try{if(!entry.active)return;entry.valid();input.select();}catch{invalidate();}});
   input.addEventListener('copy',event=>{try{if(!entry.active)throw new Error('Expired prepared URL');entry.valid();}catch{event.preventDefault();invalidate();}});
   retry.addEventListener('click',()=>retryPrepared(entry));
  }
  async function run(fn,keepFallback=false){
   if(busy)return;const ticket=++statusEpoch,active=()=>{if(ticket!==statusEpoch)fail('ACTION_CANCELLED','Kopírování bylo přerušeno novou akcí.');},report=(message,state)=>{if(ticket===statusEpoch)result(message,state);};busy=true;copyButton.disabled=openButton.disabled=true;if(fallback)fallback.retry.disabled=true;
   if(!keepFallback)clearFallback();
   try{const target=sink();if(target){target.useResult(status);target.beginAction();}else{status.textContent='';if(status.dataset)delete status.dataset.state;}await fn(report,active);}
   catch(error){if(ticket===statusEpoch){if(error.code!=='CLIPBOARD_UNCONFIRMED')clearFallback();report(error.message||'Výsledek se nepodařilo potvrdit.',error.settingsSaved===true?'partial':'error');}}
   finally{clipboard=null;busy=false;copyButton.disabled=openButton.disabled=false;if(fallback)fallback.retry.disabled=false;}
  }
  function retryPrepared(entry){return run(async(report,active)=>{
   if(!entry.active||fallback!==entry)return;entry.valid();active();let pending;
   try{
    if(typeof root.navigator?.clipboard?.writeText==='function')pending=root.navigator.clipboard.writeText(entry.url);
    else if(typeof root.navigator?.clipboard?.write==='function'&&typeof root.ClipboardItem==='function'&&typeof root.Blob==='function')pending=root.navigator.clipboard.write([new root.ClipboardItem({'text/plain':new root.Blob([entry.url],{type:'text/plain'})})]);
    else throw new Error('Clipboard unavailable');
    if(!pending||typeof pending.then!=='function')throw new Error('Clipboard confirmation unavailable');
   }catch(error){pending=Promise.reject(error);}
   const outcome=Promise.resolve(pending).then(()=>({ok:true}),cause=>({ok:false,cause}));
   await confirmClipboardOutcome(outcome);entry.valid();active();if(!entry.active||fallback!==entry)fail('ACTION_CANCELLED','Kopírování bylo přerušeno změnou účtu nebo nastavení. Zkuste akci znovu.');clearFallback();report(root.EduvizeProfiles?.statusMessages?.copied||'Odkaz na veřejný výstup zkopírován.');
  },true);}
  copyButton.addEventListener('click',()=>{
   if(fallback)return retryPrepared(fallback);
   return run(async(report,active)=>{
    const principal=actionValidators.get(actions)(),valid=()=>{principal();active();};valid();
    const prepared=Promise.resolve().then(()=>{valid();return actions.ensurePublishedFromSaved();}).then(url=>{valid();return canonicalUrl(url);});
    clipboard=reserveGestureClipboard(prepared,valid);
    try{
     const url=await prepared;valid();
     try{await clipboard.confirm();valid();clearFallback();report(root.EduvizeProfiles?.statusMessages?.copied||'Odkaz na veřejný výstup zkopírován.');}
     catch(error){valid();if(error.code==='CLIPBOARD_UNCONFIRMED')showFallback(url,principal);throw error;}
    }catch(error){clipboard?.cancel();throw error;}
   });
  });
  openButton.addEventListener('click',()=>run(async(report,active)=>{await actions.previewDraft();active();report(root.EduvizeProfiles?.statusMessages?.preview||'Náhled rozpracovaného nastavení otevřen v nové záložce.');}));
  return Object.freeze({...actions,withSavedCommit:saveFn=>{invalidate();return actions.withSavedCommit(saveFn);},contextChanged:()=>{invalidate();const target=sink();if(target)target.beginAction();else result('','');},refresh:async()=>actions.state()});
 }
 root.EduvizeOutputActions=Object.freeze({create,mount,canonicalSlot,schemaVersion:2,sourceDiscriminator:'news-source-v1',gallerySourceDiscriminator:'gallery-album-v1',galleryPreviewHost:'gallery-protected-physical-v1',weatherPreviewHost:'weather-protected-physical-v1',transportPreviewHost:'transport-protected-physical-v1',wisdomPreviewHost:'wisdom-protected-physical-v1',previewPresentation:'physical-viewport-v1',formContext:'profile-applied-v1',menuPreviewHost:'menu-native-physical-v1',newsPreviewHost:'news-protected-physical-v1',documentsPreviewHost:'documents-protected-physical-v1'});
})(typeof window==='undefined'?globalThis:window);
