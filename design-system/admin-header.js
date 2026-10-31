/* Shared administration header: one accessible route back to the application hub. */
(function(){
 function mount(){if(location.pathname.replace(/\/$/,'')==='/eduvize-styly/aplikace.html')return;for(const header of [document.querySelector('main > .edu-page-header')].filter(Boolean)){
  if(header.querySelector('.edu-page-header__home'))continue;
  const link=document.createElement('a');link.className='edu-page-header__home';
  link.href='https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html';
  link.setAttribute('aria-label','Zpět do správy Eduvize');link.title='Zpět do správy';
  const logo=document.createElement('img');logo.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/assets/eduvize-symbol-white.svg';logo.alt='';logo.width=32;logo.height=32;
  const label=document.createElement('span');label.textContent='Zpět do správy';link.append(logo,label);header.append(link);
 }}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
