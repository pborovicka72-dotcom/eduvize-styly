(async()=>{
 const G=EduvizeGallery,$=id=>document.getElementById(id),fields=['displayName','captionMode','videoMaxSeconds','style','count','seconds','crop','transition','smart','header','videos','videoSound','music','volume','whole','viewMode','sort'];
 let albums=[],album=null,busy=false,picker=null,previewFrame=null,previewFingerprint='',previewMediaVisible=false,loadedProfile=null;const observers=new Set();const status=t=>{$('status').textContent=t;};
 let nativeDeparture=null;const departureBaselines=new Map(),departureSavedViews=new Map();
 function departureContent(settings){const result=structuredClone(settings);delete result.presentation;result.outputInteraction=settings.presentation?.interaction||window.EduvizeOutputModes?.selection?.()||(settings.viewMode==='nsp'?'display':'interactive');result.outputKioskLayout=settings.presentation?.kioskLayout??(settings.viewMode==='kiosk'?window.EduvizeOutputModes?.layoutSelection?.():null);return result;}
 function departureRead(){
  if(!album)return null;let snapshot;
  try{snapshot=values({allowPending:true});}catch{snapshot={...album.settings,...Object.fromEntries(fields.map(id=>{const e=$(id);return [id,e.type==='checkbox'?e.checked:e.value];})),segment:null,presentation:null,pendingGeometry:[...previewHost.querySelectorAll('input,select,textarea')].map(e=>[e.id,e.value])};}
  snapshot.captions={...snapshot.captions};for(const input of $('thumbs').querySelectorAll('input[data-gallery-caption-item-id]')){const text=input.value.trim().slice(0,180),id=input.dataset.galleryCaptionItemId;if(text)snapshot.captions[id]=text;else delete snapshot.captions[id];}
  return departureContent(snapshot);
 }

 const departureDirty=()=>!!album&&(album.outputUpdatePending===true||(departureBaselines.has(album.id)&&window.EduvizeProfiles.fingerprint(departureRead())!==departureBaselines.get(album.id)));
 async function selectAlbum(a){
  if(album&&album.id!==a.id&&nativeDeparture){if(!await nativeDeparture.beforeSwitch())return;if(departureDirty()){album.settings=structuredClone(departureSavedViews.get(album.id)||album.cloudSavedSettings);apply(album.settings);}}
  await work(()=>choose(a));
 }
 const values=({allowPending=false}={})=>({...G.defaults,...Object.fromEntries(fields.map(id=>{const e=$(id);return [id,e.type==='checkbox'?e.checked:['count','seconds','crop','volume','videoMaxSeconds'].includes(id)?Number(e.value):e.value];})),captions:album?.settings.captions||{},selection:album?.settings.selection||[],segment:picker?.get()||album?.settings.segment||G.defaults.segment,presentation:allowPending?pendingPresentation():presentation()});
 function apply(s){for(const id of fields)$(id).type==='checkbox'?$(id).checked=s[id]:$(id).value=s[id];$('volume-label').textContent=$('volume').value+' %';picker?.setMode(s.viewMode);picker?.set(s.segment||G.defaults.segment);if(s.presentation){window.EduvizeOutputModes?.setInteraction?.(s.presentation.interaction,{notify:false});if(s.presentation.kioskLayout)window.EduvizeOutputModes?.setKioskLayout?.(s.presentation.kioskLayout,{notify:false});}}
 async function work(fn,feedback='status'){if(busy)return;busy=true;document.querySelector('main').setAttribute('aria-busy','true');try{await fn();}catch(e){$(feedback).textContent=e.message;}finally{busy=false;document.querySelector('main').removeAttribute('aria-busy');}}
 function list(){const host=$('albums');host.replaceChildren();for(const a of albums){const b=document.createElement('button');b.className='edu-admin__button edu-admin__button--secondary';b.textContent=a.name+(a.local?' · místní':'');b.setAttribute('aria-pressed',String(a.id===album?.id));b.onclick=()=>selectAlbum(a);host.append(b);}}
 async function saveDraft(changes){const saved=await G.request('/'+album.id,{method:'PUT',body:JSON.stringify({...changes,expectedRevision:album.revision??0})});album.revision=saved.revision;return saved;}
 function captureForm(){if(!album)return;album.settings=values({allowPending:true});if(departureDirty()){$('save-status').textContent='Neuložené změny. Uložte nastavení do Eduvize.';$('save-status').dataset.state='dirty';}}
 async function load(){status('Připravuji školní alba…');await EduvizeAdminAuth.ready;departureBaselines.clear();departureSavedViews.clear();albums=[];loadedProfile=EduvizeAdminAuth.status().profileId||'';if(EduvizeAdminAuth.getToken('documents')){try{status('Načítám alba z Eduvize…');const remote=await G.request('');const profile=EduvizeAdminAuth.status().profileId;albums=[];for(const a of remote.albums){a.profile=profile;a.settings={...G.defaults,...a.settings};a.cloudSavedSettings=structuredClone(a.settings);a.cloudBaseline=window.EduvizeProfiles.fingerprint(a.settings);albums=albums.filter(x=>x.id!==a.id);albums.push(a);}status('Alba načtena z Eduvize.');}catch(e){status(e.message);}}else {albums=[];album=null;$('editor').hidden=$('playback').hidden=$('output-section').hidden=$('album-management').hidden=true;$('welcome').hidden=false;$('thumbs').replaceChildren();status('Pro práci s alby se přihlaste přes Účet a připojení.');}list();const id=localStorage.getItem('eduvize-gallery-active');if(albums.length)await choose(albums.find(a=>a.id===id)||albums[0]);else{album=null;$('editor').hidden=$('playback').hidden=$('output-section').hidden=$('album-management').hidden=true;$('welcome').hidden=false;$('thumbs').replaceChildren();}}
 async function choose(a){if(album&&album.id!==a.id)await captureForm();$('welcome').hidden=true;album=a;localStorage.setItem('eduvize-gallery-active',a.id);album.settings={...G.defaults,...album.settings};$('title').textContent=a.name;$('editor').hidden=$('playback').hidden=$('output-section').hidden=$('album-management').hidden=false;$('rename-form').hidden=true;const music=$('music');music.replaceChildren(new Option('Bez hudby',''));for(const i of a.items.filter(i=>i.mime.startsWith('audio/')))music.add(new Option(i.name,i.id));apply(album.settings);if(album.settings.viewMode==='kiosk')mountPreviewPicker();if(!departureBaselines.has(album.id)){departureBaselines.set(album.id,window.EduvizeProfiles.fingerprint(departureRead()));departureSavedViews.set(album.id,structuredClone(values({allowPending:true})));}list();await thumbs();await preview();await publications?.selectAlbum(album);}
 function selectedState(){
  const selected=new Set(album?.settings.selection||[]),whole=album?.settings.whole;
  for(const button of $('thumbs').querySelectorAll('[data-select-item]')){const checked=whole||selected.has(button.dataset.selectItem);button.setAttribute('aria-pressed',String(checked));button.setAttribute('aria-label',(checked?'Odebrat z výběru: ':'Vybrat: ')+button.dataset.name);}
  const media=album?.items.filter(i=>!i.mime.startsWith('audio/'))||[];
  $('selected-count').textContent=whole?'Celé album · '+media.length+' souborů':media.filter(i=>selected.has(i.id)).length+' vybraných souborů';
 }
 async function thumbs(){
  for(const observer of observers)observer.disconnect();observers.clear();
  const host=$('thumbs');host.replaceChildren();
  const items=[...album.items].sort((a,b)=>$('sort').value==='name'?a.name.localeCompare(b.name,'cs'):(a.date||'').localeCompare(b.date||'')),thisAlbum=album;
  for(const item of items){
   const card=document.createElement('article');card.className='gallery-media-card';
   const b=document.createElement('button');b.type='button';b.className='gallery-thumb';b.dataset.selectItem=item.id;b.dataset.name=item.name;
   const audio=item.mime.startsWith('audio/');
   const visual=document.createElement(audio?'div':item.mime.startsWith('video/')?'video':'img');
   if(audio){visual.className='gallery-audio';visual.textContent='♫';b.disabled=true;b.setAttribute('aria-label','Hudba: '+item.name);}else{visual.alt=item.name;visual.muted=true;visual.preload='metadata';if(visual.tagName==='IMG')visual.loading='eager';}
   b.append(visual);const title=document.createElement('span');title.textContent=item.name;title.title=item.name;b.append(title);
   const detail=document.createElement('small');detail.textContent=audio?'Hudební podkres':(item.mime.startsWith('video/')?'Video':'Fotografie')+' · '+item.width+' × '+item.height;b.append(detail);
   const remove=document.createElement('button');remove.type='button';remove.className='edu-admin__button edu-admin__button--secondary';remove.textContent='Odstranit';remove.setAttribute('aria-label','Odstranit soubor: '+item.name);remove.onclick=()=>work(()=>deleteItem(item));const caption=document.createElement('label');caption.className='edu-admin__field gallery-caption-field';if(!audio){caption.textContent='Titulek';const input=document.createElement('input');input.type='text';input.dataset.galleryCaptionItemId=item.id;input.maxLength=180;input.value=album.settings.captions?.[item.id]||'';input.placeholder='Vlastní nebo automatický';input.setAttribute('aria-label','Titulek: '+item.name);input.onchange=()=>work(async()=>{const text=input.value.trim().slice(0,180);album.settings.captions={...album.settings.captions};if(text)album.settings.captions[item.id]=text;else delete album.settings.captions[item.id];await captureForm();preview();});caption.append(input);}else caption.setAttribute('aria-hidden','true');card.append(b,caption,remove);host.append(card);
   if(!audio){const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();observers.delete(observer);G.mediaUrl(thisAlbum,item,true,true).then(url=>{if(b.isConnected)visual.src=url;}).catch(()=>{detail.textContent+=' · náhled není dostupný';});},{rootMargin:'2400px'});observers.add(observer);observer.observe(b);}
   b.onclick=()=>work(async()=>{if(album.settings.whole){album.settings.selection=album.items.filter(i=>!i.mime.startsWith('audio/')).map(i=>i.id);album.settings.whole=false;$('whole').checked=false;}const selected=new Set(album.settings.selection);selected.has(item.id)?selected.delete(item.id):selected.add(item.id);album.settings.selection=[...selected];selectedState();await captureForm();preview();});
  }
  selectedState();
 }
 function previewUrl(){const url=new URL('index.html',location.href);url.searchParams.set('preview','1');url.searchParams.set('ev_inner','1');url.searchParams.set('viewMode',$('viewMode').value);return url.href;}
 function sendPreview(frame){if(!previewMediaVisible||!frame||!album)return;const data=structuredClone(album);data.settings=values({allowPending:true});data.preview=true;const fingerprint=JSON.stringify(data);if(frame===previewFrame&&fingerprint===previewFingerprint)return;previewFrame=frame;previewFingerprint=fingerprint;frame.contentWindow.postMessage({type:'eduvize-gallery-preview',album:data,presentation:pendingPresentation()},location.origin);}
 function preview(){if(album)sendPreview(previewHost.querySelector('iframe'));}
 function setPreviewMediaVisible(visible){const changed=previewMediaVisible!==visible;previewMediaVisible=visible;if(visible&&changed){previewFrame=null;previewFingerprint='';preview();}}
 const previewHost=$('preview-picker');
 function mountPreviewPicker(){if(picker)return picker;picker=EduvizeNSPPicker.mount(previewHost,{preservePreview:true,interactivePreview:true,previewUrl,onPreviewLoad:frame=>{previewFrame=null;sendPreview(frame);},onChange:()=>preview()});if(album){picker.setMode($('viewMode').value);picker.set(album.settings.segment||G.defaults.segment);}return picker;}
 // Keep the iframe shell and real geometry eager; defer only album media transfer.
 if(typeof IntersectionObserver==='function'){const previewMediaObserver=new IntersectionObserver(entries=>{const entry=entries[entries.length-1];if(!entry)return;if(entry.isIntersecting)mountPreviewPicker();setPreviewMediaVisible(entry.isIntersecting);},{rootMargin:'200px'});previewMediaObserver.observe(previewHost);}else{mountPreviewPicker();setPreviewMediaVisible(true);}
 $('viewMode').onchange=()=>work(async()=>{mountPreviewPicker().setMode($('viewMode').value);if(album)await captureForm();preview();});
 function pendingPresentation(){try{return presentation();}catch{return null;}}
 function presentation(){
  const mode=$('viewMode').value,interaction=window.EduvizeOutputModes?.selection?.()||(mode==='nsp'?'display':'interactive');let geometry=null;
  if(mode==='nsp'){const g=picker?.get()||album?.settings.segment||G.defaults.segment;geometry={registryId:'nsp-4k',registryVersion:1,orientation:g.orientation,layoutId:Number(g.style),segmentId:Number(g.block),width:null,height:null};}
  if(mode==='kiosk'){const frame=previewHost.querySelector('iframe'),width=frame?.contentWindow.innerWidth,height=frame?.contentWindow.innerHeight;if(!width||!height)throw Error('Nejprve načtěte náhled kiosku.');geometry={registryId:'kiosk-viewport',registryVersion:1,orientation:height>width?'portrait':'landscape',layoutId:null,segmentId:null,width,height};}
  return {mode,geometry,interaction,kioskLayout:mode==='kiosk'?window.EduvizeOutputModes.layoutSelection():null};
 }
 function nativePreviewUrl(){
  if(!album||album.local)throw Error('Vyberte uložené školní album.');
  const auth=EduvizeAdminAuth.status(),source=structuredClone(album),selected=album.id;
  if(!auth.connected||!auth.schoolId||auth.profileId!==album.profile)throw Error('Vyberte album v přihlášeném školním profilu.');
  return window.EduvizeGalleryDraftPreview.create({album:source,settings:values(),presentation:presentation(),isCurrent:()=>{const next=EduvizeAdminAuth.status();return next.connected&&next.schoolId===auth.schoolId&&next.profileId===auth.profileId&&album?.id===selected;},mediaUrl:item=>G.mediaUrl(source,item,true)});
 }
 const publications=window.EduvizeGalleryPublication?.mount({presentation,previewDraftUrl:nativePreviewUrl});
 $('rename').onclick=()=>{$('rename-form').hidden=false;$('rename-name').value=album.name;$('rename-name').focus();};
 $('cancel-rename').onclick=()=>{$('rename-form').hidden=true;};
 $('rename-form').onsubmit=e=>{e.preventDefault();work(async()=>{const name=$('rename-name').value.trim();if(!name||name.length>120)throw Error('Zadejte název alba do 120 znaků.');status('Přejmenovávám album…');if(!album.local)await saveDraft({name});album.name=name;await captureForm();$('title').textContent=name;list();$('rename-form').hidden=true;preview();status('Album bylo přejmenováno.');});};
 $('delete-album').onclick=()=>work(async()=>{
  if(!confirm('Skutečně chcete smazat album „'+album.name+'“? Publikované album nelze odstranit. U nepublikovaného alba zůstanou soubory uchované pro obnovu.'))return;
  status('Odstraňuji album…');const removed=album;
  if(!removed.local)await G.request('/'+removed.id,{method:'DELETE'});
  if(removed.local)for(const item of removed.items){if(!item.external&&!item.src)await G.op('files','delete',item.id);G.releaseMedia?.(removed,item);}
  albums=albums.filter(a=>a.id!==removed.id);album=null;localStorage.removeItem('eduvize-gallery-active');list();
  if(albums.length)await choose(albums[0]);else{$('editor').hidden=$('playback').hidden=$('output-section').hidden=$('album-management').hidden=true;$('welcome').hidden=false;$('title').textContent='Správa alb';$('thumbs').replaceChildren();for(const observer of observers)observer.disconnect();observers.clear();if(picker)picker.set(picker.get());}
  status('Album bylo odstraněno.');
 });
 async function deleteItem(item){
  if(!confirm('Skutečně chcete smazat soubor „'+item.name+'“ z alba?'+(!album.local&&!item.drive&&!item.external?' Soubor používaný publikací zůstane uchovaný.':'')))return;
  status('Odstraňuji soubor…');album.settings=values({allowPending:true});
  if(!album.local){const pending=structuredClone(album.settings);const updated=await G.request('/'+album.id+'/files/'+item.id,{method:'DELETE'});Object.assign(album,updated);album.cloudSavedSettings=structuredClone(updated.settings);album.cloudBaseline=window.EduvizeProfiles.fingerprint(updated.settings);pending.selection=(pending.selection||[]).filter(id=>id!==item.id);if(pending.music===item.id)pending.music='';pending.captions={...pending.captions};delete pending.captions[item.id];album.settings=pending;}else{if(!item.external&&!item.src)await G.op('files','delete',item.id);album.items=album.items.filter(i=>i.id!==item.id);album.settings.selection=album.settings.selection.filter(id=>id!==item.id);if(album.settings.music===item.id)album.settings.music='';}
  G.releaseMedia?.(album,item);await choose(album);status('Soubor byl odstraněn z alba.');
 }
 $('new').onclick=()=>{$('create').hidden=false;$('album-name').focus();};$('cancel-create').onclick=()=>{$('create').hidden=true;};
 $('create').onsubmit=e=>{e.preventDefault();work(async()=>{const name=$('album-name').value.trim();if(!name||name.length>120)throw Error('Zadejte název alba do 120 znaků.');const a=await G.request('',{method:'POST',body:JSON.stringify({name})});a.profile=EduvizeAdminAuth.status().profileId;albums.push(a);$('create').hidden=true;await choose(a);status('Album vytvořeno v Eduvizi.');});};
 async function uploadFiles(files){
  if(!album)throw Error('Nejprve vyberte nebo vytvořte album.');
  if(files.some(file=>file.size>100*1024*1024))throw Error('Největší povolená velikost souboru je 100 MB.');
  const accepted=new Set($('files').accept.split(',').map(type=>type.trim()));
  const rejected=files.filter(file=>!accepted.has(file.type));
  if(rejected.length)throw Error('Nepodporované soubory: '+rejected.map(file=>file.name).join(', ')+'. Použijte JPG, PNG, WebP, MP4, WebM, MP3, M4A nebo WAV.');
  let added=0;
  try{for(const file of files){status('Nahrávám '+file.name+'…');const url=URL.createObjectURL(file);let meta;try{meta=await G.metadata(file,url);}finally{URL.revokeObjectURL(url);}meta.date=await G.takenDate(file);if(album.local){const id=crypto.randomUUID();await G.op('files','put',file,id);album.items.push({id,name:file.name,...meta});}else{const form=new FormData();form.append('file',file);form.append('metadata',JSON.stringify(meta));const uploaded=await G.request('/'+album.id+'/files',{method:'POST',body:form});album.revision=uploaded.draftRevision;delete uploaded.draftRevision;album.items.push(uploaded);}added++;}}
  finally{if(added)await choose(album);}
  status('Soubory byly přidány do alba.');
 }
 function receiveFiles(list){const files=Array.from(list||[]);if(!files.length)return;if(busy){status('Probíhá práce s albem. Počkejte na její dokončení a soubory přidejte znovu.');return;}return work(()=>uploadFiles(files));}
 $('files').onchange=async()=>{try{await receiveFiles($('files').files);}finally{$('files').value='';}};
 const dropTarget=$('gallery-drop-target');let dragDepth=0;
 const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files')||!!e.dataTransfer?.files?.length;
 const clearDrag=()=>{dragDepth=0;dropTarget.classList.remove('is-dragover');};
 dropTarget.addEventListener('dragenter',e=>{if(hasFiles(e)&&album&&!busy){dragDepth++;dropTarget.classList.add('is-dragover');}});
 dropTarget.addEventListener('dragleave',()=>{if(--dragDepth<=0)clearDrag();});
 document.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect=album&&!busy&&dropTarget.contains(e.target)?'copy':'none';});
 document.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();clearDrag();if(!dropTarget.contains(e.target)){status(album?'Přetáhněte soubory do části Obsah alba.':'Nejprve vyberte nebo vytvořte album.');return;}return receiveFiles(e.dataTransfer.files);});
 document.addEventListener('dragend',clearDrag);
 $('import-toggle').onclick=()=>{$('import').hidden=!$('import').hidden;};$('import').onsubmit=e=>{e.preventDefault();work(async()=>{if(album.local)throw Error('Složku OneDrive připojte do alba založeného po přihlášení.');status('Načítám soubory OneDrive…');const a=await G.request('/'+album.id+'/import',{method:'POST',body:JSON.stringify({url:$('folder-url').value})});Object.assign(album,a);await choose(album);status('Soubory ze složky byly přidány.');});};
 $('web').onsubmit=e=>{e.preventDefault();work(async()=>{const items=[];for(const line of $('web-urls').value.split(/\n/).map(s=>s.trim()).filter(Boolean)){const url=new URL(line);if(url.protocol!=='https:')throw Error('Použijte HTTPS odkazy na média.');const name=decodeURIComponent(url.pathname.split('/').pop()||'Fotografie');const meta=await G.metadata({name},url.href);items.push({id:crypto.randomUUID(),name,external:url.href,url:url.href,...meta,date:new Date().toISOString()});}if(album.local)album.items.push(...items);else Object.assign(album,await G.request('/'+album.id+'/links',{method:'POST',body:JSON.stringify({items})}));await choose(album);status('Webové soubory byly přidány.');});};
 $('whole').onchange=()=>work(async()=>{album.settings=values();selectedState();await captureForm();preview();});$('sort').onchange=()=>work(async()=>{await captureForm();await thumbs();preview();});$('volume').oninput=()=>{$('volume-label').textContent=$('volume').value+' %';};
 $('upload').onclick=()=>$('files').click();
 async function saveSettings(operation){
  if(!album||album.local)throw Error('Vyberte školní album.');
  if(!operation?.valid()||publications?.outputActions?.workflow!=='saved-copy-preview'||typeof publications.outputActions.withSavedCommit!=='function')throw Error('Společné ukládání a ovládání výstupu není dostupné.');
  window.EduvizeProfiles.statusFor?.('gallery')?.beginAction();
  album.settings={...album.settings,captions:{...departureRead().captions}};
  const selectedAlbum=album,identity=EduvizeAdminAuth.status(),selected=album.id,expectedRevision=album.revision??0,snapshot=structuredClone(values());let acknowledged=null;
  const current=()=>operation.valid()&&album===selectedAlbum&&album.id===selected&&album.revision===expectedRevision;
  if(!identity.connected||!identity.schoolId||album.profile!==identity.profileId)throw Error('Vyberte správný školní profil.');
  let result;try{result=await publications.saveSettings(async()=>{
   if(!current())throw Error('Kontext alba se během přípravy změnil.');
   const saved=await G.request('/'+selected,{method:'PUT',body:JSON.stringify({settings:snapshot,expectedRevision}),requestGuard:current});
   if(!Number.isSafeInteger(saved?.revision)||saved.revision<=expectedRevision)throw Error('Server nepotvrdil platnou revizi alba.');
   acknowledged={settingsSaved:true,schoolId:identity.schoolId,profileId:identity.profileId,appId:'gallery',revision:saved.revision,config:{albumId:selected,albumRevision:saved.revision,settings:structuredClone(saved.settings)},outputUpdated:null};
   operation.recordAcknowledgement(acknowledged);
   if(!current())throw Error('Přihlášení, školní profil nebo album se během ukládání změnily.');
   return {profileId:identity.profileId,appId:'gallery',revision:saved.revision,config:acknowledged.config};
  });}catch(error){
   // Reuse only this principal's actual album ACK; publication/baseline remain unconfirmed.
   if(acknowledged&&current()){album.revision=acknowledged.revision;album.outputUpdatePending=true;}
   throw error;
  }
  const complete={...acknowledged,outputUpdated:result.outputUpdated,pendingEdits:window.EduvizeProfiles.fingerprint(values({allowPending:true}))!==window.EduvizeProfiles.fingerprint(snapshot)};
  operation.recordAcknowledgement(complete);
  if(!current()||result.settingsSaved!==true||typeof result.outputUpdated!=='boolean')throw Error('Úplné uložení alba a výstupu nebylo potvrzené.');
  // Adopt only after the same principal and complete publication have been checked.
  album.outputUpdatePending=false;album.revision=acknowledged.revision;album.cloudSavedSettings=structuredClone(acknowledged.config.settings);album.cloudBaseline=window.EduvizeProfiles.fingerprint(album.cloudSavedSettings);
  departureSavedViews.set(selected,structuredClone(acknowledged.config.settings));departureBaselines.set(selected,window.EduvizeProfiles.fingerprint(departureContent(acknowledged.config.settings)));captureForm();
  $('save-status').textContent=result.outputUpdated?'Nastavení uloženo a existující výstup aktualizován.':'Nastavení uloženo do Eduvize. Odkaz vytvoříte pomocí Kopírovat odkaz.';
  if(departureDirty())$('save-status').textContent+=' Ve formuláři jsou další neuložené změny.';$('save-status').dataset.state=departureDirty()?'dirty':'saved';return complete;
 }
 try{
  const mounted=window.EduvizeProfiles.mountNativeDeparture({mounted:true,appId:'gallery',read:departureRead,dirty:departureDirty,getState:()=>{const who=EduvizeAdminAuth.status();return {ready:!!who.connected&&!!who.schoolId&&!!who.profileId,busy,schoolId:who.schoolId,profileId:who.profileId,selectionId:album?.id||'',revision:album?.revision??0};},save:async operation=>{if(busy)throw Error('Nejprve dokončete operaci s albem.');busy=true;$('save-status').textContent='Ukládání…';$('save-status').dataset.state='saving';document.querySelector('main').setAttribute('aria-busy','true');try{return await saveSettings(operation);}finally{busy=false;document.querySelector('main').removeAttribute('aria-busy');}},report:(text,kind)=>{$('save-status').textContent=text;$('save-status').dataset.state=kind;}});
  if(mounted?.mounted!==true||mounted.appId!=='gallery'||!['read','dirty','save','beforeSwitch','consume','activate'].every(key=>typeof mounted[key]==='function'))throw Error('Nativní ochrana alba nebyla potvrzená.');
  nativeDeparture=mounted;mounted.activate();$('save-drive').onclick=async()=>{try{await mounted.save();}catch{}};window.EduvizeProfileBeforeSwitch=mounted.beforeSwitch;
 }catch(error){$('save-drive').disabled=true;$('save-status').textContent=error.message;window.EduvizeProfileBeforeSwitch=async()=>!departureDirty()&&!busy;}
 addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==previewHost.querySelector('iframe')?.contentWindow||e.data?.type!=='eduvize-gallery-media-request')return;const item=album?.items.find(i=>i.id===e.data.itemId);if(!item)return;G.mediaUrl(album,item,true).then(url=>e.source.postMessage({type:'eduvize-gallery-media-response',requestId:e.data.requestId,url},location.origin)).catch(error=>e.source.postMessage({type:'eduvize-gallery-media-response',requestId:e.data.requestId,error:error.message},location.origin));});
 $('reload').onclick=async()=>{if(nativeDeparture&&await nativeDeparture.beforeSwitch())await work(load);};
 addEventListener('eduvize-admin-auth-change',()=>{if(!busy&&(EduvizeAdminAuth.status().profileId||'')!==loadedProfile)work(load);});await work(load);
 $('playback').addEventListener('change',()=>{if(album&&!busy)work(async()=>{await captureForm();preview();});});
})();
