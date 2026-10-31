/* Shared administration header: one accessible route back to the application hub. */
(function(){
 function mount(){for(const header of document.querySelectorAll('main .edu-page-header')){
  if(header.querySelector('.edu-page-header__home'))continue;
  const link=document.createElement('a');link.className='edu-page-header__home';
  link.href='https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html';
  link.setAttribute('aria-label','Eduvize – rozcestník aplikací');link.title='Rozcestník aplikací Eduvize';
  const logo=document.createElement('img');logo.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/assets/eduvize-symbol-white.svg';logo.alt='';logo.width=32;logo.height=32;
  link.append(logo);header.append(link);
 }}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
