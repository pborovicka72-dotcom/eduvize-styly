/* Protected same-origin transport preview host, matching the Weather preview flow. */
(function(root){'use strict';
 const document=root.document,status=document.getElementById('preview-status'),host=document.getElementById('preview-host');let frame,viewport;
 function fail(){viewport?.destroy();frame?.remove();host.style.visibility='hidden';status.hidden=false;status.textContent='Náhled jízdních řádů se nepodařilo otevřít. Ověřte přihlášení v původní správě a otevřete náhled znovu.';}
 try{
  root.opener=null;
  const q=new URL(root.location.href).searchParams,allowed=['native','width','height','profile'];
  if([...q.keys()].some(key=>!allowed.includes(key))||allowed.some(key=>q.getAll(key).length!==1))throw Error('Invalid host');
  const width=Number(q.get('width')),height=Number(q.get('height')),profile=q.get('profile'),url=new URL(q.get('native'));
  if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=8192)||!/^\d+$/.test(q.get('width'))||!/^\d+$/.test(q.get('height'))||!/^([a-f0-9]{32})$/.test(profile)||url.origin!==root.location.origin||url.username||url.password||url.hash||url.pathname!=='/eduvize-jizdni-rady/index.html'||url.searchParams.has('edu-output')||url.searchParams.getAll('preview').length!==1||url.searchParams.get('preview')!=='1'||url.searchParams.getAll('edu-profile').length!==1||url.searchParams.get('edu-profile')!==profile||url.searchParams.getAll('ev_inner').length!==1||url.searchParams.get('ev_inner')!=='1'||url.searchParams.getAll('viewMode').length!==1||!['nsp','kiosk'].includes(url.searchParams.get('viewMode'))||typeof root.EduvizePreviewViewport?.mount!=='function')throw Error('Invalid preview');
  frame=document.createElement('iframe');frame.title='Náhled rozpracovaných jízdních řádů';frame.referrerPolicy='no-referrer';host.append(frame);
  frame.addEventListener('load',()=>{try{const actual=new URL(frame.contentWindow.location.href);if(actual.href==='about:blank')return;if(actual.origin!==url.origin||actual.pathname!==url.pathname||actual.search!==url.search||actual.hash)throw Error('Redirected preview');viewport.fit();status.hidden=true;host.style.visibility='visible';}catch{fail();}});
  viewport=root.EduvizePreviewViewport.mount(frame,{host,width,height,aspect:false});frame.src=url.href;
 }catch{fail();}
})(window);
