/* Licensing and verified onboarding. License codes are never persisted in the browser. */
(function(root){
 'use strict';
 const auth=root.EduvizeAdminAuth,API='https://eduvize-admin.onrender.com',$=id=>document.getElementById(id);
 if(!auth||!$('license-admin'))return;
 const names={issued:'Čeká na aktivaci',active:'Platná',expiring:'Platnost brzy končí',expired:'Platnost skončila',perpetual:'Trvalá'};
 let selectedIssue='',selectedRegister='',loadedToken='',generation=0;
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
 const date=value=>value?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeZone:'Europe/Prague'}).format(new Date(value*1000)):'—';
 const operator=()=>auth.status().connected&&auth.status().scopes.includes('styles')&&!auth.status().schoolId;
 function say(id,value){$(id).textContent=value;}
 async function request(path,options={},protectedRequest=false){
  const token=auth.getToken(protectedRequest==='operator'?'styles':'configurations');
  if(protectedRequest&&!token)throw Error('Pro tuto funkci se přihlaste příslušným účtem.');
  const response=await fetch(API+path,{...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000),
   headers:{'Content-Type':'application/json',...(options.headers||{}),...(protectedRequest?{Authorization:'Bearer '+token}:{})}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(typeof result.detail==='string'?result.detail:'Služba nyní není dostupná ('+response.status+').');
  return result;
 }
 function work(form,status,action){form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter||form.querySelector('button[type=submit]');button.disabled=true;say(status,'Zpracovávám…');try{await action();}catch(e){say(status,e.name==='TimeoutError'?'Služba se probouzí. Zkuste to za chvíli znovu.':e.message);}finally{button.disabled=false;}});}
 function lookup(inputId,listId,onSelect){let timer,version=0;const input=$(inputId),list=$(listId);input.addEventListener('input',()=>{onSelect('');clearTimeout(timer);const current=++version;list.replaceChildren();if(input.value.trim().length<2)return;timer=setTimeout(async()=>{try{const data=await request('/api/registration/schools?q='+encodeURIComponent(input.value.trim()));if(current!==version)return;list.replaceChildren();for(const item of data.items){const button=text('button',item.name+' · '+item.municipality+' · RED IZO '+item.red_izo);button.type='button';button.className='edu-license-result';button.onclick=()=>{++version;input.value=item.name;onSelect(item.red_izo);list.replaceChildren();};list.append(button);}if(!data.items.length)list.append(text('p','Žádná škola nenalezena.'));}catch(e){if(current===version)list.replaceChildren(text('p',e.message));}},250);});}
 lookup('license-school-query','license-school-results',key=>{selectedIssue=key;});
 lookup('register-school-query','register-school-results',key=>{selectedRegister=key;});
 function showCode(result){$('license-code-value').value=result.code;$('license-code-result').hidden=false;say('license-issue-status','Licence byla vytvořena. Kód se zobrazuje pouze nyní. Předejte jej správci školy.');}
 $('license-copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('license-code-value').value);say('license-issue-status','Licenční kód zkopírován.');}catch{say('license-issue-status','Označte a zkopírujte kód v poli.');}};
 async function loadLicenses(){
  if(!operator())return;const token=auth.getToken('styles'),version=generation;
  const data=await request('/api/operator/licenses?q='+encodeURIComponent($('license-filter').value),{},'operator');
  if(version!==generation||token!==auth.getToken('styles'))return;
  const host=$('license-items');host.replaceChildren();
  if(!data.items.length)host.append(text('p','Zatím nejsou evidované žádné licence.'));
  for(const item of data.items){
   const card=document.createElement('article');card.className='edu-license-card';
   const overview=document.createElement('div');overview.className='edu-license-overview';
   const identity=document.createElement('div');identity.className='edu-license-identity';identity.append(text('h4',item.school.name));overview.append(identity);
   const state=text('strong',names[item.status]||item.status);state.dataset.status=item.status;state.className='edu-license-state';overview.append(state);
   const validity=text('p',item.status==='issued'?(item.months===null?'Trvalá licence od aktivace':'Platnost '+item.months+' měsíců od aktivace'):'Aktivace '+date(item.activatedAt)+' · '+(item.expiresAt?'Platnost do '+date(item.expiresAt):'Bez konce platnosti'));validity.className='edu-license-validity';overview.append(validity);card.append(overview);
   const details=document.createElement('details');details.className='edu-license-details';details.append(text('summary','Podrobnosti a správa licence'));
   const body=document.createElement('div');body.className='edu-admin__flow';body.append(text('p','RED IZO '+item.schoolKey+' · IČO '+item.school.ico));details.append(body);card.append(details);
   const feedback=text('p','');feedback.setAttribute('role','status');
   if(item.months!==null){
    const form=document.createElement('form'),label=text('label','Prodloužit o počet měsíců'),input=document.createElement('input'),button=text('button','Prodloužit');input.type='number';input.min='1';input.max='1200';input.required=true;input.value='12';button.type='submit';button.className='edu-admin__button edu-admin__button--secondary';label.append(input);form.className='edu-license-renew';form.append(label,button);
    form.onsubmit=async event=>{event.preventDefault();button.disabled=true;try{await request('/api/operator/licenses/'+item.id+'/extend',{method:'POST',body:JSON.stringify({months:Number(input.value)})},'operator');await loadLicenses();}catch(e){feedback.textContent=e.message;}finally{button.disabled=false;}};body.append(form);
   }
   if(item.status==='issued'){
    const button=text('button','Vystavit náhradní kód');button.type='button';button.className='edu-admin__button edu-admin__button--secondary';button.onclick=async()=>{button.disabled=true;try{const token=auth.getToken('styles'),result=await request('/api/operator/licenses/'+item.id+'/code',{method:'POST'},'operator');if(operator()&&token===auth.getToken('styles')){showCode(result);say('license-issue-status','Náhradní kód je připravený. Původní kód a rozpracované aktivace přestaly platit.');}}catch(e){feedback.textContent=e.message;}finally{button.disabled=false;}};body.append(button);
   }
   body.append(feedback);host.append(card);
  }
  say('license-list-status','Načteno '+data.items.length+' licencí.');
 }
 work($('license-issue-form'),'license-issue-status',async()=>{
  if(!selectedIssue)throw Error('Vyberte školu z nabídky rejstříku.');const token=auth.getToken('styles');
  const result=await request('/api/operator/licenses',{method:'POST',body:JSON.stringify({schoolKey:selectedIssue,months:$('license-term').value==='permanent'?null:Number($('license-term').value)})},'operator');
  if(!operator()||token!==auth.getToken('styles'))return;showCode(result);await loadLicenses();
 });
 $('license-reload').onclick=()=>loadLicenses().catch(e=>say('license-list-status',e.message));
 let filterTimer;$('license-filter').oninput=()=>{clearTimeout(filterTimer);filterTimer=setTimeout(()=>$('license-reload').click(),250);};
 work($('school-register-form'),'register-status',async()=>{
  if(!selectedRegister)throw Error('Vyberte školu z nabídky rejstříku.');
  await request('/api/registration',{method:'POST',body:JSON.stringify({schoolKey:selectedRegister,email:$('register-email').value,code:$('register-license').value})});
  $('register-license').value='';say('register-status','Potvrďte registraci odkazem v e-mailu. Licence se aktivuje až po potvrzení.');
 });
 work($('email-login-form'),'email-login-status',async()=>{
  const verifier=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));const proof=btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const pending=JSON.stringify({verifier,createdAt:Date.now()});sessionStorage.setItem('eduvize-email-login-v1',pending);try{localStorage.setItem('eduvize-email-login-v1',pending);}catch{}
  await request('/auth/email/start',{method:'POST',body:JSON.stringify({email:$('email-login-address').value,proof,remember:$('account-remember').checked})});
  say('email-login-status','Pokud je e-mail registrovaný, obdržíte přihlašovací odkaz. Otevřete ho v tomto prohlížeči.');
 });
 const fragment=new URLSearchParams(location.hash.slice(1)),confirmation=fragment.get('edu-confirm'),kind=fragment.get('edu-confirm-kind');
 if(confirmation){
  const clean=new URL(location.href);clean.hash='account';history.replaceState(null,'',clean.href);$('license-confirmation').hidden=false;
  $('license-confirm-button').onclick=async()=>{const button=$('license-confirm-button');button.disabled=true;try{const result=await request('/api/registration/confirm',{method:'POST',body:JSON.stringify({kind,token:confirmation})});if(result.registered){say('license-confirm-status','Registrace školy je dokončená a licence aktivovaná. Nyní se můžete přihlásit e-mailem nebo propojit Microsoft účet.');button.hidden=true;}else{location.replace(auth.ACCOUNT+'#'+new URLSearchParams(result.microsoftTicket?{'edu-ms-ticket':result.microsoftTicket}:{'edu-email-ticket':result.emailTicket}));}}catch(e){say('license-confirm-status',e.message);button.disabled=false;}};
 }
 async function state(){
  const s=auth.status(),version=++generation;$('license-admin').hidden=!operator();$('school-registration').hidden=s.connected;$('account-license').hidden=!s.schoolId;
  $('license-code-value').value='';$('license-code-result').hidden=true;
  if(new URL(location.href).searchParams.get('edu-link-pending')==='1')say('account-message','Propojení Microsoft účtu potvrďte odkazem v e-mailu správce školy.');
  const token=auth.getToken();if(token===loadedToken)return;loadedToken=token;
  if(operator())loadLicenses().catch(e=>say('license-list-status',e.message));
  if(s.schoolId){try{const data=await request('/api/account/license',{},true);if(version!==generation)return;const license=data.license;
    say('account-license-status',license?(names[license.status]+' · '+(license.expiresAt?'platnost do '+date(license.expiresAt):'bez konce platnosti')):'Stávající účet zatím nemá přiřazenou licenci. Kontaktujte správce Eduvize.');
    if(license&&['expiring','expired'].includes(license.status))$('account-license').dataset.warning='true';else delete $('account-license').dataset.warning;
    if(license&&!$('name')?.value&&root.EduvizeProfileAdapter?.app==='school-identity')root.EduvizeProfileAdapter.apply({schemaVersion:1,data:license.school});
   }catch(e){say('account-license-status',e.message);}}
 }
 root.addEventListener('eduvize-admin-auth-change',state);auth.ready.then(state);
 request('/api/registration/status').then(data=>{if(!data.emailConfigured)say('register-status','Potvrzovací e-maily čekají na nastavení Microsoft 365. Do té doby nelze dokončit novou registraci.');}).catch(e=>say('register-status',e.message));
})(window);
