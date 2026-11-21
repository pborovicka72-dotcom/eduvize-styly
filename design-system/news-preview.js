/* Protected same-origin News preview host. No authentication or publication implementation. */
(function(root){'use strict';
 const document=root.document,status=document.getElementById('preview-status'),host=document.getElementById('preview-host');let frame,viewport,isDocuments=false,isGallery=false,isWeather=false,isWisdom=false,isHolidays=false,isCalendar=false;
 const appName=()=>isCalendar?'Školního kalendáře':isHolidays?'Svátků a jmenin':isWisdom?'Moudrosti dne':isWeather?'Počasí':isGallery?'Fotogalerie':isDocuments?'Dokumentů':'Aktualit';
 function fail(){if(viewport)viewport.destroy();if(frame)frame.remove();host.hidden=true;status.hidden=false;status.textContent='Náhled '+appName()+' se nepodařilo otevřít. Ověřte přihlášení v původní správě a otevřete náhled znovu.';}
 try{
  root.opener=null;
  const q=new URL(root.location.href).searchParams;isDocuments=q.getAll('app').length===1&&q.get('app')==='documents';isGallery=q.getAll('app').length===1&&q.get('app')==='gallery';isWeather=q.getAll('app').length===1&&q.get('app')==='weather';isWisdom=q.getAll('app').length===1&&q.get('app')==='wisdom';isHolidays=q.getAll('app').length===1&&q.get('app')==='holidays';isCalendar=q.getAll('app').length===1&&q.get('app')==='school-calendar';const allowed=isDocuments||isGallery||isWeather||isWisdom||isHolidays||isCalendar?['native','width','height','profile','app']:['native','width','height','profile'];
  if(isDocuments||isGallery||isWeather||isWisdom||isHolidays||isCalendar){document.title='Náhled '+appName();status.textContent='Připravuji náhled '+appName()+'…';}
  if([...q.keys()].some(k=>!allowed.includes(k))||allowed.some(k=>q.getAll(k).length!==1))throw Error('Invalid host');
  const width=Number(q.get('width')),height=Number(q.get('height')),profile=q.get('profile'),url=new URL(q.get('native'));
  if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=8192)||!/^\d+$/.test(q.get('width'))||!/^\d+$/.test(q.get('height'))||!/^([a-f0-9]{32})$/.test(profile)||url.origin!==root.location.origin||url.username||url.password||url.hash||!(isCalendar?url.pathname==='/eduvize-skolni-kalendar/index.html':isHolidays?url.pathname==='/eduvize-svatky/index.html':isWisdom?['/eduvize-moudrost-dne/signage.html','/eduvize-moudrost-dne/index.html'].includes(url.pathname):isWeather?url.pathname==='/pocasi/display':isGallery?['/eduvize-styly/fotogalerie/index.html','/eduvize-fotogalerie/index.html'].includes(url.pathname):isDocuments?url.pathname==='/display':['/aktuality/','/aktuality/index.html','/eduvize-aktuality/','/eduvize-aktuality/index.html'].includes(url.pathname))||url.searchParams.getAll('preview').length!==1||url.searchParams.get('preview')!=='1'||url.searchParams.has('edu-output')||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==profile||typeof root.EduvizePreviewViewport?.mount!=='function')throw Error('Invalid preview');
  if(isGallery&&(url.searchParams.getAll('draft-preview').length!==1||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(url.searchParams.get('draft-preview'))||url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||!['nsp','kiosk'].includes(url.searchParams.get('viewMode'))))throw Error('Invalid Gallery preview');
  if((isWeather||isHolidays)&&(url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||!['nsp','kiosk'].includes(url.searchParams.get('viewMode'))))throw Error('Invalid physical preview');
  if(isCalendar&&(url.searchParams.getAll('viewMode').length!==1||!['nsp','kiosk'].includes(url.searchParams.get('viewMode'))||(url.searchParams.get('viewMode')==='nsp'&&(url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'))||(url.searchParams.get('viewMode')==='kiosk'&&(url.searchParams.getAll('calendar_preview_inner').length!==1||url.searchParams.get('calendar_preview_inner')!=='1'))))throw Error('Invalid Calendar preview');
  frame=document.createElement('iframe');frame.title=isCalendar?'Náhled rozpracovaného Školního kalendáře':isHolidays?'Náhled rozpracovaných Svátků a jmenin':isWisdom?'Náhled rozpracované Moudrosti dne':isWeather?'Náhled rozpracovaného nastavení Počasí':'Náhled rozpracovaných '+appName();frame.referrerPolicy='no-referrer';host.append(frame);
  async function waitForNews(){
   const deadline=Date.now()+45000;
   while(Date.now()<deadline){
    const inner=frame.contentDocument?.querySelector('#edu-segment-host iframe'),page=inner?.contentDocument,loading=page?.getElementById('news-loading');
    if(page&&loading?.hidden===true&&!page.documentElement.hasAttribute('data-news-loading'))return;
    await new Promise(resolve=>root.setTimeout(resolve,100));
   }
   throw Error('News preview did not finish loading');
  }
  frame.addEventListener('load',async()=>{try{const actual=new URL(frame.contentWindow.location.href);if(actual.href==='about:blank')return;if(actual.origin!==url.origin||actual.pathname!==url.pathname||actual.search!==url.search||actual.hash)throw Error('Redirected preview');if(!isDocuments&&!isGallery&&!isWeather&&!isWisdom&&!isHolidays&&!isCalendar)await waitForNews();status.hidden=true;host.hidden=false;viewport.fit();}catch{fail();}});
  viewport=root.EduvizePreviewViewport.mount(frame,{host,width,height,aspect:false});frame.src=url.href;
 }catch{fail();}
})(window);
