/* Gallery owns native DTOs; the shared controller owns every output mutation. */
(function(root){'use strict';
 const clone=value=>structuredClone(value),fail=message=>{throw Error(message);};
 function mount(options){
  const $=id=>document.getElementById(id),elements={copyButton:$('copy'),openButton:$('open'),status:$('output-status')};
  let album=null,generation=0;
  function identity(){const a=root.EduvizeAdminAuth.status();if(!a.connected||!a.schoolId||!a.profileId||!album||album.local||album.profile!==a.profileId)fail('Vyberte album v přihlášeném školním profilu.');return {schoolId:a.schoolId,profileId:a.profileId,appId:'gallery'};}
  function context(){const who=identity();if(!/^[a-f0-9]{32}$/.test(album.id||''))fail('Vyberte platné uložené album.');return {...who,sourceId:album.id,presentation:options.presentation()};}
  function dto(config){
   if(!config||config.albumId!==album.id||!Number.isSafeInteger(config.albumRevision)||config.albumRevision<0||!config.settings?.presentation)fail('Nejprve uložte nastavení tohoto alba do Eduvize.');
   const settings=clone(config.settings),presentation=settings.presentation;
   root.EduvizeOutputActions.canonicalSlot(presentation);
   delete settings.presentation;delete settings.viewMode;delete settings.segment;
   return {schemaVersion:1,payloadVersion:1,payload:{albumId:config.albumId,albumRevision:config.albumRevision,settings,name:'',items:[]},presentation};
  }
  let statusSink=root.EduvizeProfiles?.statusFor?.('gallery')||null;
  if(!statusSink&&root.EduvizeProfiles?.createStatus){
   const row=elements.copyButton.closest?.('.edu-output-actions'),settings=document.getElementById('save-status');
   if(row&&settings){const panel=document.createElement('div');panel.className='edu-profile-current';row.after(panel);statusSink=root.EduvizeProfiles.createStatus({app:'gallery',panel,settingsNode:settings,resultNode:elements.status});}
  }
  function updateProfileStatus(){
   if(!statusSink||!album)return;
   const who=root.EduvizeAdminAuth.status(),picker=document.getElementById('gallery-school-profile')?.querySelector('select');
   const name=picker?.value===who.profileId?picker.selectedOptions?.[0]?.textContent?.trim():'';
   statusSink.setProfile(name||'ověřuji výběr…');
  }
  const profileHost=document.getElementById('gallery-school-profile');
  if(statusSink&&profileHost&&root.MutationObserver){
   new root.MutationObserver(updateProfileStatus).observe(profileHost,{subtree:true,childList:true,characterData:true});
   profileHost.addEventListener('change',updateProfileStatus);
  }
  const unavailable=()=>{elements.copyButton.disabled=elements.openButton.disabled=true;};unavailable();
  if(!root.EduvizeOutputActions||root.EduvizeOutputActions.gallerySourceDiscriminator!=='gallery-album-v1'||root.EduvizeOutputActions.galleryPreviewHost!=='gallery-protected-physical-v1'||!root.EduvizeOutputClient){elements.status.textContent='Společné ovládání odkazů zatím není dostupné.';return {selectAlbum:async()=>{},saveSettings:async()=>{throw Object.assign(Error('Společné ukládání a publikování alba není dostupné. Obnovte stránku.'),{code:'OUTPUT_WORKFLOW_REQUIRED',settingsSaved:false});}};}
  const client=root.EduvizeOutputClient.create({getAuthorization:()=>{const token=root.EduvizeAdminAuth.getToken('documents');return token?'Bearer '+token:'';}});
  const actions=root.EduvizeOutputActions.mount({workflow:'saved-copy-preview',previewHost:'gallery-protected-physical-v1',client,context,
   draft:async({savedCommit=null}={})=>{
    const who=identity(),selected=album.id;
    if(savedCommit){if(savedCommit.appId!=='gallery'||savedCommit.profileId!==who.profileId)fail('Uložené nastavení patří jinému profilu.');return dto(savedCommit.config);}
    // Copy reads the authoritative saved album, never the current form or IndexedDB.
    const data=await root.EduvizeGallery.request(''),current=identity();
    if(current.schoolId!==who.schoolId||current.profileId!==who.profileId||album.id!==selected)fail('Vybrané album nebo školní profil se změnil.');
    const saved=data.albums.find(a=>a.id===selected);if(!saved)fail('Uložené album nebylo nalezeno.');
    return dto({albumId:saved.id,albumRevision:saved.revision,settings:saved.settings});
   },
   previewDraftUrl:()=>options.previewDraftUrl(),elements});
  if(actions.workflow!=='saved-copy-preview'||typeof actions.withSavedCommit!=='function')fail('Nové společné ovládání výstupů zatím není dostupné.');
  async function selectAlbum(value){const previous=album&&album.profile+':'+album.id;album=value;const ticket=++generation;unavailable();if(previous!==(album&&album.profile+':'+album.id))actions.contextChanged();try{identity();elements.copyButton.disabled=elements.openButton.disabled=false;if(statusSink){updateProfileStatus();statusSink.settings(album.outputUpdatePending?'Nastavení alba je načtené. Výstup čeká na aktualizaci; použijte Uložit nastavení.':'Nastavení alba načteno z Eduvize. Případné změny uložte tlačítkem Uložit nastavení.',album.outputUpdatePending?'dirty':'saved');}}catch(e){if(ticket===generation){if(statusSink)statusSink.result(e.message,'error');else elements.status.textContent=e.message;}}}
  return {selectAlbum,outputActions:actions,saveSettings:fn=>actions.withSavedCommit(fn)};
 }
 root.EduvizeGalleryPublication=Object.freeze({mount});
})(window);
