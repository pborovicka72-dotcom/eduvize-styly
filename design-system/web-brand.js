/* Shared animated Eduvize identity for ordinary pages and administration. */
(function(root){
 'use strict';
 const source=new URL('assets/eduvize-logo-compact-animated.svg?v=1',document.currentScript.src).href;
 function logo(){const image=document.createElement('img');image.src=source;image.alt='Eduvize';image.className='edu-brand-logo';image.width=220;image.height=64;return image;}
 function mount(){
  const html=document.documentElement,app=html.dataset.kioskApp;
  const admin=/\/(?:config(?:\.html)?|editor\.html|aplikace\.html)\/?$/.test(location.pathname)||(!app&&!!document.querySelector('.edu-admin-page'));
  if(admin){const header=document.querySelector('.edu-page-header,header');if(!header||header.querySelector('.edu-brand-logo'))return;const identity=header.querySelector('.edu-page-header__identity')||header;const icon=identity.querySelector('.edu-page-header__icon,.edu-app-icon,.brandmark,.mark');if(icon){icon.replaceChildren(logo());icon.classList.add('edu-brand-identity');icon.removeAttribute('data-edu-app-icon');}else{identity.prepend(logo());}return;}
  if(!app||app==='kiosk'||root.EduvizeOutputModes?.mode()!=='web')return;
  let header=document.querySelector('.edu-web-header,.web-header,.site-header');
  if(!header){header=document.createElement('header');document.body.prepend(header);}
  header.classList.add('edu-web-header');header.replaceChildren(logo());
  const title=document.createElement('span');title.className='edu-web-heading';
  title.textContent=({weather:'Počasí ČHMÚ',transport:'Jízdní řády',documents:'Dokumenty školy',news:'Aktuality školy',wisdom:'Moudrost dne',holidays:'Svátky a jmeniny'})[app]||'';header.append(title);
 }
 root.EduvizeBrand=Object.freeze({mount,source});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
