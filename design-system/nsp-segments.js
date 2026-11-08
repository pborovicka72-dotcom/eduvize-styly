(()=>{'use strict';const previewReady=window.EduvizePreviewViewport?Promise.resolve(window.EduvizePreviewViewport):new Promise((resolve,reject)=>{const base=new URL('.',document.currentScript.src);const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('preview-viewport.css?v=1',base);document.head.append(css);const script=document.createElement('script');script.src=new URL('preview-viewport.js?v=20261031-web-49',base);script.onload=()=>resolve(window.EduvizePreviewViewport);script.onerror=reject;document.head.append(script)});window.EduvizeNSPSelectorText=Object.freeze({title:'Šablona Newline Signage Pro',hint:'Vyberte orientaci a klikněte přímo na požadovaný segment ve vizuálu šablony, případně jej zvolte pod náhledy. Výsledný odkaz bude jednoznačný.'});window.addEventListener('message',event=>{if(event.data?.type!=='eduvize-web-content-height')return;const height=Number(event.data.height);if(!Number.isFinite(height)||height<1||height>100000)return;for(const frame of document.querySelectorAll('iframe[data-edu-web-preview]')){if(frame.contentWindow===event.source){frame.style.setProperty('height',Math.ceil(height)+'px');}}});
window.EduvizeNSPPicker={defaultSelection:Object.freeze({orientation:'landscape',style:1,block:1}),mount(host,options={}){
const {layouts:L,positions:P}=window.EduvizeNSPLayouts;
host.id='ev-segments';
host.innerHTML='<strong class="ev-picker-title"></strong><p class="ev-picker-hint"></p><div id="ev-tabs"><button type="button" data-o="landscape">Na šířku · 8 šablon</button><button type="button" data-o="portrait">Na výšku · 5 šablon</button></div><div id="ev-cards"></div><p id="ev-block-title"></p><div id="ev-blocks"></div><h3>Náhled celé obrazovky</h3><div id="ev-preview-wrap"><div id="ev-preview"></div></div>';
host.querySelector('.ev-picker-title').textContent=window.EduvizeNSPSelectorText.title;
host.querySelector('.ev-picker-hint').textContent=window.EduvizeNSPSelectorText.hint;
const q=x=>host.querySelector(x);const initialParams=new URLSearchParams(location.search);
let state={...window.EduvizeNSPPicker.defaultSelection},outputMode='nsp',persistentPreview=null,kioskViewport={width:3840,height:2160,orientation:'landscape'};
for(const field of ['orientation','style','block']){const value=initialParams.get('segment_'+field)||initialParams.get(field);if(value!==null)state[field]=field==='orientation'?value:Number(value);}

function allowed(w,h,o,st,b){return !options.allowed||options.allowed(w,h,o,st,b)}
function setKioskGeometry(next){const {width,height,orientation}=next||{};if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||orientation!==(width>=height?'landscape':'portrait'))return false;kioskViewport={width,height,orientation};if(outputMode==='kiosk')draw();return true;}
function choose(next){
 const x=window.scrollX,y=window.scrollY,wrap=q('#ev-preview-wrap'),height=wrap.getBoundingClientRect().height;
 wrap.style.minHeight=height+'px';state={...state,...next};draw();options.onChange?.({...state});
 requestAnimationFrame(()=>{wrap.style.minHeight='';window.scrollTo(x,y)});
}
function boxes(node,style){L[state.orientation][style].forEach(([w,h],i)=>{const [x,y]=P[state.orientation][style][i],W=state.orientation==='portrait'?2160:3840,H=state.orientation==='portrait'?3840:2160;const ok=allowed(w,h,state.orientation,style,i+1);const box=document.createElement('span');box.className='ev-box'+(state.style===style&&state.block===i+1?' active':'')+(!ok?' disabled':'');box.textContent=String(i+1);box.style.cssText='left:'+(x/W*100)+'%;top:'+(y/H*100)+'%;width:'+(w/W*100)+'%;height:'+(h/H*100)+'%';box.title=ok?'Segment '+(i+1)+' · '+w+' × '+h:'Segment není dostupný';box.tabIndex=ok?0:-1;box.onclick=e=>{e.stopPropagation();if(ok)choose({style,block:i+1})};box.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();box.click()}};node.append(box)})}
function draw(){
const kiosk=outputMode==='kiosk',web=outputMode!=='nsp',previewNode=q('#ev-preview');
q('.ev-picker-title').textContent=kiosk?'Náhled kiosku':web?'Náhled běžné stránky':window.EduvizeNSPSelectorText.title;
for(const selector of ['.ev-picker-hint','#ev-tabs','#ev-cards','#ev-block-title','#ev-blocks'])q(selector).hidden=web;
q('h3').hidden=web;
host.querySelectorAll('.edu-web-preview-controls').forEach(control=>control.remove());
previewNode.style.cssText='';
if(web){
persistentPreview=null;
previewNode.closest('#ev-segments')?.querySelector('.edu-web-preview-controls')?.remove();previewNode.querySelectorAll('iframe').forEach(frame=>window.EduvizePreviewViewport?.unmount(frame));previewNode.replaceChildren();previewNode.className='web-preview';previewNode.style.cssText='width:100%;max-width:none;aspect-ratio:auto';
if(options.previewUrl){const frame=document.createElement('iframe');frame.classList.add('ev-interactive-preview');frame.title=kiosk?'Náhled kiosku':'Náhled běžné stránky';frame.src=window.EduvizeOutputModes?.url(options.previewUrl({...state}),kiosk?'kiosk':'web').href||options.previewUrl({...state});frame.style.cssText='display:block;border:0;width:100%;height:420px;max-height:none';if(!kiosk){frame.dataset.eduWebPreview='';frame.setAttribute('scrolling','no');}frame.onload=()=>options.onPreviewLoad?.(frame);previewNode.append(frame);if(!kiosk){previewNode.style.setProperty('aspect-ratio','auto','important');previewNode.style.height='auto';frame.style.position='static';frame.style.transform='none';}if(kiosk){const toolbar=document.createElement('div');toolbar.className='edu-admin-preview__controls edu-web-preview-controls';for(const [label,width,height] of [['Na šířku',3840,2160],['Na výšku',2160,3840]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(width===kioskViewport.width&&height===kioskViewport.height));button.onclick=()=>{setKioskGeometry({width,height,orientation:width>=height?'landscape':'portrait'});};toolbar.append(button);}previewNode.parentElement.before(toolbar);previewNode.classList.remove('web-preview');previewNode.classList.add('kiosk-preview');previewNode.style.cssText='position:relative;width:100%;max-width:none;aspect-ratio:16 / 9;overflow:hidden';const {width,height}=kioskViewport;previewNode.style.setProperty('width',width<height?'31.640625%':'100%');previewNode.style.marginInline='auto';previewReady.then(api=>{if(frame.isConnected)api.mount(frame,{host:previewNode,width,height})});}}
return;
}
if(!L[state.orientation])state.orientation=window.EduvizeNSPPicker.defaultSelection.orientation;if(!L[state.orientation][state.style])state.style=1;if(!L[state.orientation][state.style].some((rect,i)=>allowed(...rect,state.orientation,state.style,i+1)))state.style=Number(Object.keys(L[state.orientation]).find(st=>L[state.orientation][st].some((rect,i)=>allowed(...rect,state.orientation,Number(st),i+1)))||1);const entries=L[state.orientation][state.style];if(!entries[state.block-1]||!allowed(...entries[state.block-1],state.orientation,state.style,state.block))state.block=entries.findIndex((r,i)=>allowed(...r,state.orientation,state.style,i+1))+1||1;
q('#ev-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.o===state.orientation));const cards=q('#ev-cards'),blocks=q('#ev-blocks'),preview=q('#ev-preview');cards.replaceChildren();blocks.replaceChildren();const keep=options.preservePreview===true&&persistentPreview?.host.parentNode===preview?persistentPreview:null;
preview.querySelectorAll('iframe').forEach(frame=>{if(frame!==keep?.frame)window.EduvizePreviewViewport?.unmount(frame)});
for(const node of [...preview.childNodes])if(node!==keep?.host)node.remove();
if(!keep)persistentPreview=null;
Object.entries(L[state.orientation]).forEach(([key,rects])=>{const st=+key,btn=document.createElement('button');btn.type='button';btn.className=st===state.style?'active':'';btn.disabled=!rects.some((rect,i)=>allowed(...rect,state.orientation,st,i+1));btn.append(document.createTextNode('Styl '+st));const mini=document.createElement('div');mini.className='ev-mini'+(state.orientation==='portrait'?' portrait':'');boxes(mini,st);btn.append(mini);btn.onclick=()=>{const first=rects.findIndex((rect,i)=>allowed(...rect,state.orientation,st,i+1));if(first>=0)choose({style:st,block:first+1})};cards.append(btn)});
q('#ev-block-title').textContent='Vyberte segment';entries.forEach(([w,h],i)=>{const btn=document.createElement('button');btn.type='button';btn.textContent='Segment '+(i+1)+': '+w+' × '+h+' px';btn.disabled=!allowed(w,h,state.orientation,state.style,i+1);btn.className=state.block===i+1?'active':'';btn.onclick=()=>choose({block:i+1});blocks.append(btn)});
preview.className=state.orientation==='portrait'?'portrait':'';boxes(preview,state.style);
const cell=preview.querySelectorAll(':scope > .ev-box')[state.block-1];
if(cell&&options.previewUrl){
 cell.textContent='';cell.tabIndex=-1;cell.onclick=null;cell.onkeydown=null;
 const previewUrl=new URL(options.previewUrl({...state}),location.href);previewUrl.searchParams.set('ev_inner','1');previewUrl.searchParams.set('viewMode','nsp');
 const [width,height]=entries[state.block-1];
 let frame,viewport=cell,reused=false;
 if(options.preservePreview===true){
  // Keep the browsing context attached to one parent while the selected segment moves.
  // Moving an iframe between the segment cells reloads its entire application tree.
  if(!persistentPreview){const overlay=document.createElement('div');overlay.className='ev-persistent-preview';preview.append(overlay);persistentPreview={host:overlay,frame:document.createElement('iframe'),key:''};overlay.append(persistentPreview.frame);}
  viewport=persistentPreview.host;frame=persistentPreview.frame;
  const [x,y]=P[state.orientation][state.style][state.block-1],W=state.orientation==='portrait'?2160:3840,H=state.orientation==='portrait'?3840:2160;
  viewport.style.cssText='position:absolute;z-index:3;left:'+(x/W*100)+'%;top:'+(y/H*100)+'%;width:'+(width/W*100)+'%;height:'+(height/H*100)+'%';
  const identity=new URL(previewUrl);for(const name of ['orientation','style','block','segment_orientation','segment_style','segment_block'])identity.searchParams.delete(name);
  reused=persistentPreview.key===identity.href;persistentPreview.key=identity.href;
 }else frame=document.createElement('iframe');
 frame.allowFullscreen=true;frame.allow='fullscreen';frame.title='Náhled vybraného segmentu';frame.classList.add('ev-interactive-preview');
 // Geometry-only reuse must preserve visibility even before the async viewport helper mounts.
 if(!frame.classList.contains('edu-preview-frame'))Object.assign(frame.style,{border:'0',display:'block',width:width+'px',height:height+'px'});
 if(!reused)frame.style.visibility='hidden';
 frame.onload=()=>{options.onPreviewLoad?.(frame);requestAnimationFrame(()=>{frame.style.visibility='visible'})};
 if(options.preservePreview!==true)cell.append(frame);
 const mountPreview=api=>{if(frame.isConnected)api.mount(frame,{host:viewport,width,height,aspect:false})};
 if(window.EduvizePreviewViewport)mountPreview(window.EduvizePreviewViewport);else previewReady.then(mountPreview);
 if(!reused)frame.src=previewUrl.href;
 else queueMicrotask(()=>options.onPreviewLoad?.(frame));
}}

q('#ev-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>choose({orientation:b.dataset.o,style:1,block:1}));draw();queueMicrotask(()=>options.onChange?.({...state}));return {setKioskGeometry,set(next){state={...state,...next};draw()},get(){return {...state}},setMode(next){const value=['web','kiosk'].includes(next)?next:'nsp';if(value!==outputMode){outputMode=value;if(value==='nsp')state={...window.EduvizeNSPPicker.defaultSelection};draw();if(value==='nsp')options.onChange?.({...state})}}}
}};function autoMount(){if(document.body.dataset.editorialAdmin==='true')return;const mode=document.getElementById('setting-output')||document.getElementById('viewMode')||document.getElementById('layout');if(!mode)return;
const isWeather=mode.id==='setting-output',isDocuments=mode.id==='layout',params=new URLSearchParams(location.search);
function isWeb(){return mode.value==='kiosk'||(isWeather?!mode.value.startsWith('signage'):mode.value==='normal'||mode.value==='web')}
const defaultMode=isWeather||isDocuments?'signage':'nsp';
if(window.EduvizeOutputModes?.isKiosk())mode.value='kiosk';else if(!mode.value)mode.value=defaultMode;
const key=isWeather?'eduvize-weather-segment':isDocuments?'eduvize-documents-segment':'eduvize-holidays-segment';
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const initial={orientation:params.get('segment_orientation')||window.EduvizeNSPPicker.defaultSelection.orientation,style:Number(params.get('segment_style')||1),block:Number(params.get('segment_block')||1)};
const root=document.createElement('section'),form=mode.closest('form');
if(mode.closest('.edu-output-section')){const actions=mode.closest('.edu-output-section').querySelector('.edu-output-actions');if(actions)actions.before(root);else mode.closest('.edu-output-mode-row')?.after(root)}else if(form)form.after(root);else mode.closest('label')?.after(root);
let picker;
function output(state){let url;if(isWeather){url=new URL('display',location.href).href;const preview=new URL(url);const lat=document.getElementById('setting-lat')?.value,lon=document.getElementById('setting-lon')?.value,place=document.getElementById('setting-place')?.value;if(lat&&lon){preview.searchParams.set('lat',lat);preview.searchParams.set('lon',lon)}if(place&&!['Určete lokalitu','Načítám obec…','Dosud nevybráno'].includes(place.trim()))preview.searchParams.set('misto',place);for(const [id,key] of [['setting-weather-style','weather_style'],['setting-region','region'],['setting-source','zdroj'],['setting-station','station'],['setting-page-seconds','page_seconds']]){const value=document.getElementById(id)?.value;if(value)preview.searchParams.set(key,value)}for(const [id,key] of [['setting-hourly-forecast','hourly'],['setting-daily-forecast','daily'],['setting-text-forecast','text']])preview.searchParams.set(key,document.getElementById(id)?.checked?'on':'off');if(!isWeb())preview.searchParams.set('layout','signage');else preview.searchParams.set('paging','off');url=preview.href}else if(isDocuments){url=typeof link==='function'?link():new URL('/display',location.origin).href}else{url=typeof outputUrl==='function'?outputUrl():new URL('index.html',location.href).href}const u=new URL(url);if(isWeb()){for(const key of ['segment_orientation','segment_style','segment_block','orientation','style','block','ev_inner'])u.searchParams.delete(key);if(isWeather)u.searchParams.delete('layout');else if(isDocuments)u.searchParams.set('layout','normal');else u.searchParams.set('viewMode',mode.value==='kiosk'?'kiosk':'web')}else{u.searchParams.set('segment_orientation',state.orientation);u.searchParams.set('segment_style',state.style);u.searchParams.set('segment_block',state.block);}if(!u.searchParams.has('v'))u.searchParams.set('v','20261031-nsp-kiosk-parity-4');return window.EduvizeOutputModes?window.EduvizeOutputModes.url(u,mode.value==='kiosk'?'kiosk':isWeb()?'web':'nsp').href:u.href}
function syncMode(){root.hidden=false;picker?.setMode(mode.value==='kiosk'?'kiosk':isWeb()?'web':'nsp')}
picker=window.EduvizeNSPPicker.mount(root,{initial,interactivePreview:true,preservePreview:isWeather,allowed:(w,h,o,st,b)=>!isWeather||document.getElementById('setting-weather-style')?.value!=='station'||isWeb()||(window.EduvizeNSPLayouts.kioskAllowed?.(w,h,o,st,b)??false),previewUrl:state=>{const u=new URL(output(state));u.searchParams.set('preview','1');return u.href},onChange:state=>{try{localStorage.setItem(key,JSON.stringify(state))}catch{}if(isWeather&&mode.value!=='kiosk'&&mode.value!=='off'){mode.value='signage';mode.dispatchEvent(new Event('change',{bubbles:true}))}else if(!isDocuments&&!isWeather){mode.value='nsp'}syncMode()}});
mode.addEventListener('change',syncMode);syncMode();
let previewRefresh;document.addEventListener('input',refreshPreview);document.addEventListener('change',refreshPreview);function refreshPreview(event){if(root.contains(event.target)||!event.target.matches('input:not([type=password]):not([type=file]),select,textarea'))return;clearTimeout(previewRefresh);previewRefresh=setTimeout(()=>{picker.set(picker.get());syncMode()},250)}
window.EduvizeSegmentSelection={setKioskGeometry:next=>picker.setKioskGeometry(next),kioskGeometry:()=>{if(mode.value!=='kiosk')return null;const frame=root.querySelector('#ev-preview.kiosk-preview iframe');if(!frame?.isConnected)return null;const width=Number(frame.getAttribute('data-preview-width')),height=Number(frame.getAttribute('data-preview-height'));if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;return {width,height,orientation:width>=height?'landscape':'portrait'};},params:()=>picker.get(),url:()=>output(picker.get()),set:next=>{picker.set(next);try{localStorage.setItem(key,JSON.stringify(picker.get()))}catch{}syncMode();}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoMount,{once:true});else autoMount();
})();