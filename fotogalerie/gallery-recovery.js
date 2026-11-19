/* Pure gallery-native recovery whitelist. Shared Accounts owns persistence/restore UI. */
(function(root){'use strict';
 const ID=/^[a-f0-9]{32}$/;
 function clean(value){
  if(value?.schemaVersion!==1||!ID.test(value.albumId)||!value.settings||typeof value.settings!=='object')throw Error('Neplatný koncept galerie.');
  const input=value.settings,s={};
  for(const [key,low,high] of [['videoMaxSeconds',0,3600],['count',1,6],['seconds',3,120],['crop',0,15],['volume',0,100]]){if(!Number.isInteger(input[key])||input[key]<low||input[key]>high)throw Error('Neplatné nastavení galerie.');s[key]=input[key];}
  for(const [key,allowed] of [['captionMode',['off','manual','auto']],['style',['mosaic','rows','single']],['transition',['fade','slide','none']],['sort',['date','name']],['viewMode',['web','nsp','kiosk']]]){if(!allowed.includes(input[key]))throw Error('Neplatná volba galerie.');s[key]=input[key];}
  for(const key of ['smart','header','videos','videoSound','whole']){if(typeof input[key]!=='boolean')throw Error('Neplatná volba galerie.');s[key]=input[key];}
  if(typeof input.displayName!=='string'||input.displayName.length>120)throw Error('Neplatný zobrazovaný název.');s.displayName=input.displayName;
  if(input.music!==''&&!ID.test(input.music))throw Error('Neplatná hudba.');s.music=input.music;
  if(!Array.isArray(input.selection)||input.selection.length>1000||input.selection.some(x=>!ID.test(x)))throw Error('Neplatný výběr.');s.selection=[...new Set(input.selection)];
  s.captions={};if(!input.captions||typeof input.captions!=='object'||Array.isArray(input.captions)||Object.keys(input.captions).length>1000)throw Error('Neplatné titulky.');
  for(const [id,text] of Object.entries(input.captions)){if(!ID.test(id)||typeof text!=='string'||text.length>180)throw Error('Neplatný titulek.');s.captions[id]=text;}
  const seg=input.segment;if(!seg||!['landscape','portrait'].includes(seg.orientation)||!Number.isInteger(Number(seg.style))||!Number.isInteger(Number(seg.block))||!root.EduvizeNSPLayouts?.layouts?.[seg.orientation]?.[Number(seg.style)]?.[Number(seg.block)-1])throw Error('Neplatný segment.');
  s.segment={orientation:seg.orientation,style:Number(seg.style),block:Number(seg.block)};
  const p=input.presentation;if(p===null)s.presentation=null;else{
   root.EduvizeOutputActions.canonicalSlot(p);
   if(p.mode!==s.viewMode||!['display','interactive'].includes(p.interaction)||p.mode==='kiosk'&&p.interaction!=='interactive')throw Error('Neplatné zobrazení.');
   if(p.mode==='kiosk'?!['menu','tiles'].includes(p.kioskLayout):p.kioskLayout!==null)throw Error('Neplatné rozložení kiosku.');
   const geometry=p.geometry?Object.fromEntries(['registryId','registryVersion','orientation','layoutId','segmentId','width','height'].filter(k=>p.geometry[k]!==undefined).map(k=>[k,p.geometry[k]])):null;
   s.presentation={mode:p.mode,geometry,interaction:p.interaction,kioskLayout:p.kioskLayout};
  }
  return {schemaVersion:1,albumId:value.albumId,settings:s};
 }
 root.EduvizeGalleryRecovery=Object.freeze({clean});
})(window);
