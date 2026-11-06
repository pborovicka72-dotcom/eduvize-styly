(function(){
 'use strict';
 const api=new URL('/api/design-system/branding',location.origin).href;
 const fallback=new URL('assets/eduvize-logo-compact-animated.svg',document.currentScript.src).href;
 const main=document.querySelector('main.edu-admin-page');if(!main)return;
 const host=document.createElement('section');host.className='edu-admin__card';host.id='edu-branding-settings';
 host.innerHTML=`<h2>Logo Eduvize</h2><p class="edu-admin__hint">Nahrané logo nahradí standardní logo Eduvize ve všech aplikacích a kioscích. Vlastní loga škol zůstanou zachovaná.</p>
 <form class="edu-branding-form"><label class="edu-admin__field">Nahrát logo Eduvize<input type="file" name="logoFile" accept="image/png,image/gif,image/webp,image/svg+xml" aria-describedby="edu-branding-hint"></label>
 <p class="edu-admin__hint" id="edu-branding-hint">PNG, GIF, WebP nebo statické SVG, nejvýše 2 MB. Pro animované logo použijte GIF nebo WebP. Soubor se uloží do Eduvize po potvrzení.</p>
 <details><summary>Použít odkaz na logo</summary><div style="display:grid;gap:12px;margin-top:12px"><label class="edu-admin__field">Adresa loga (HTTPS)<input type="url" name="logoUrl" placeholder="https://…"></label><p class="edu-admin__hint">Druhotná možnost pro veřejně dostupný obrázek. Vybraný soubor má přednost.</p></div></details>
 <div style="background:white;border:1px solid var(--ev-border);border-radius:var(--ev-card-radius);padding:24px;max-width:560px"><img data-edu-brand-preview alt="Náhled loga Eduvize" width="440" height="115" style="display:block;width:100%;height:auto;max-height:150px;object-fit:contain"></div>
 <div class="edu-admin__actions"><button class="edu-admin__button" type="submit">Použít logo ve všech aplikacích</button><button class="edu-admin__button edu-admin__button--secondary" type="button" data-default>Obnovit standardní logo</button></div><p role="status" aria-live="polite" style="margin:0"></p></form>`;
 main.querySelector('.edu-page-header').after(host);
 const form=host.querySelector('form'),file=form.elements.logoFile,input=form.elements.logoUrl,preview=host.querySelector('img'),status=host.querySelector('[role=status]'),save=form.querySelector('[type=submit]'),reset=form.querySelector('[data-default]');
 form.style.display=host.style.display='grid';form.style.gap=host.style.gap='20px';
 host.querySelectorAll('h2,p').forEach(node=>node.style.margin='0');
 let saved='',objectUrl='',busy=false,dirty=false;
 function valid(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&value.length<=2048&&(!['skola.eduvize.cz','test.skola.eduvize.cz'].includes(u.hostname)||u.origin===location.origin)&&!/(^|\.)onrender\.com$/i.test(u.hostname);}catch{return false;}}
 function release(){if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}}
 function lock(){const allowed=!!window.EduvizeAdminAuth?.getToken('styles');input.disabled=file.disabled=save.disabled=reset.disabled=busy||!allowed;if(!allowed)status.textContent='Změnu loga může uložit pouze správce Eduvize.';}
 function update(){
  release();const selected=file.files[0];file.setCustomValidity('');input.setCustomValidity('');
  if(selected){
   if(!['image/png','image/gif','image/webp','image/svg+xml'].includes(selected.type)||!selected.size||selected.size>2*1024*1024){file.setCustomValidity('Vyberte PNG, GIF, WebP nebo SVG do 2 MB.');preview.removeAttribute('src');status.textContent=file.validationMessage;return;}
   objectUrl=URL.createObjectURL(selected);preview.src=objectUrl;
  }else{const value=input.value.trim();if(value&&!valid(value)){input.setCustomValidity('Zadejte HTTPS adresu bez přihlašovacích údajů a bez závislosti na Renderu.');preview.removeAttribute('src');return;}preview.src=value||saved||fallback;}
 }
 file.addEventListener('change',()=>{dirty=true;update();});input.addEventListener('input',()=>{dirty=true;update();});
 reset.onclick=()=>{dirty=true;saved='';file.value=input.value='';update();status.textContent='Připraveno standardní logo. Změnu potvrďte tlačítkem Použít logo ve všech aplikacích.';};
 preview.onerror=()=>{status.textContent='Obrázek se nepodařilo načíst. Vyberte jiný soubor nebo zkontrolujte odkaz.';};
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;busy=true;lock();status.textContent='Ukládám společné logo…';
  try{
   if(!preview.complete||!preview.naturalWidth)throw Error('Nejprve počkejte na načtení náhledu platného obrázku.');
   const selected=file.files[0];const options=selected?{method:'POST',headers:{'Content-Type':selected.type},body:selected}:{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({logoUrl:input.value.trim()||saved})};
   const response=await window.EduvizeAdminAuth.fetch(api+(selected?'/logo':''),options,'styles');const data=await response.json();
   if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:'Logo se nepodařilo uložit.');
   saved=data.logoUrl||'';file.value=input.value='';dirty=false;update();window.EduvizeBranding?.apply(data);status.textContent='Logo uloženo. Otevřené aplikace převezmou změnu nejpozději do jedné minuty.';
  }catch(error){status.textContent=error.message;}finally{busy=false;lock();}
 };
 async function init(){update();lock();try{const response=await fetch(api,{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(!dirty){saved=data.logoUrl||'';update();}}catch{status.textContent='Centrální nastavení loga zatím není dostupné.';}await window.EduvizeAdminAuth?.ready;lock();}
 window.addEventListener('pagehide',release);window.addEventListener('eduvize-admin-auth-change',lock);init();
})();
