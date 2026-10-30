/* Optional shared brand, date and time panel. No application configuration is stored. */
(function(root){
  function mount(host){
    const logo=document.createElement('img'),date=document.createElement('time'),clock=document.createElement('time'),details=document.createElement('div');
    host.classList.add('edu-status-panel');details.className='edu-status-panel__details';date.className='edu-status-panel__date';clock.className='edu-status-panel__clock';
    logo.src='https://pborovicka72-dotcom.github.io/eduvize-svatky/assets/eduvize-logo.svg';logo.alt='Eduvize';logo.className='edu-status-panel__logo';
    details.append(date,clock);host.replaceChildren(logo,details);
    const dates=new Intl.DateTimeFormat('cs-CZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),times=new Intl.DateTimeFormat('cs-CZ',{hour:'2-digit',minute:'2-digit'});
    function update(){const now=new Date();date.dateTime=now.toISOString();clock.dateTime=now.toISOString();date.textContent=dates.format(now);clock.textContent=times.format(now);}
    update();const interval=setInterval(update,15000);
    return {refresh:update,destroy:()=>clearInterval(interval)};
  }
  root.EduvizeStatusPanel=Object.freeze({mount});
})(window);
