/* Optional shared brand, date and time panel. No application configuration is stored. */
(function(root){
  function mount(host){
    const brand=document.createElement('span'),logo=document.createElement('img'),date=document.createElement('time'),clock=document.createElement('time'),compact=document.createElement('time'),details=document.createElement('div');
    host.classList.add('edu-status-panel');details.className='edu-status-panel__details';date.className='edu-status-panel__date';clock.className='edu-status-panel__clock';
    const defaultLogo='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/assets/eduvize-logo-compact-animated.svg?v=1';logo.src=defaultLogo;brand.className='edu-status-panel__brand';brand.append(logo);logo.alt='Eduvize';logo.className='edu-status-panel__logo';
    function item(time,path){const wrap=document.createElement('span'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');wrap.className='edu-status-panel__item';svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('aria-hidden','true');svg.innerHTML=path;wrap.append(svg,time);return wrap;}
    compact.className='edu-status-panel__date edu-status-panel__date--compact';const dateItem=item(date,'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>');dateItem.append(compact);details.append(dateItem,item(clock,'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'));host.replaceChildren(details,brand);
    const dates=new Intl.DateTimeFormat('cs-CZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),shortDates=new Intl.DateTimeFormat('cs-CZ',{day:'numeric',month:'numeric',year:'numeric'}),times=new Intl.DateTimeFormat('cs-CZ',{hour:'2-digit',minute:'2-digit'});
    function compactLayout(){const w=host.clientWidth,h=host.clientHeight;if(w&&h)host.classList.toggle('edu-status-panel--compact',w/h<(brand.hidden?3.1:4.8));}
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(compactLayout):null;resize?.observe(host);
    function update(){compactLayout();const now=new Date();date.dateTime=now.toISOString();clock.dateTime=now.toISOString();compact.dateTime=now.toISOString();compact.textContent=shortDates.format(now);date.textContent=dates.format(now);clock.textContent=times.format(now);}
    update();const interval=setInterval(update,15000);
    return {refresh:update,setLogo:(show,url)=>{brand.hidden=!show;let src=defaultLogo;try{const custom=new URL(url);if(['https:','http:'].includes(custom.protocol))src=custom.href}catch{}logo.src=src;logo.alt=url?'Logo':'Eduvize';compactLayout();},destroy:()=>{clearInterval(interval);resize?.disconnect();}};
  }
  root.EduvizeStatusPanel=Object.freeze({mount});
})(window);
