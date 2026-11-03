/* Operator-only license management; authorization is also enforced by the API. */
(function(root){
 'use strict';
 const client=root.EduvizeLicensing;if(!client||!document.getElementById('license-admin'))return;
 const {auth,$,names,date,operator,text,say,request,work,lookup,validIco}=client;
 let selectedIssue='',generation=0,loadedToken='',latestLoad=0;
 lookup('license-school-query','license-school-results',key=>{selectedIssue=key;});
 function recipientMode(){
  const manual=$('license-recipient-type').value==='organization';
  $('license-school-fields').hidden=manual;$('license-school-query').disabled=manual;
  $('license-organization-fields').hidden=!manual;$('license-organization-fields').disabled=!manual;
 }
 $('license-recipient-type').onchange=recipientMode;recipientMode();
 $('license-org-ico').addEventListener('input',()=>$('license-org-ico').setCustomValidity(''));
 function showCode(result){$('license-code-value').value=result.code;$('license-code-result').hidden=false;say('license-issue-status','Licence byla vytvořena. Kód se zobrazuje pouze nyní. Předejte jej správci školy.');}
 $('license-copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('license-code-value').value);say('license-issue-status','Licenční kód zkopírován.');}catch{say('license-issue-status','Označte a zkopírujte kód v poli.');}};
 async function loadLicenses(){
  if(!operator())return;const token=auth.getToken('styles'),version=generation,requestId=++latestLoad;
  say('license-list-status','Načítám licence…');
  let data;try{data=await request('/api/operator/licenses?q='+encodeURIComponent($('license-filter').value),{},'operator');}catch(error){if(version!==generation||requestId!==latestLoad||token!==auth.getToken('styles'))return;throw error;}
  if(version!==generation||requestId!==latestLoad||token!==auth.getToken('styles'))return;
  const host=$('license-items');host.replaceChildren();
  if(!data.items.length)host.append(text('p','Zatím nejsou evidované žádné licence.'));
  for(const item of data.items){
   const card=document.createElement('article');card.className='edu-license-card';
   const overview=document.createElement('div');overview.className='edu-license-overview';
   const identity=document.createElement('div');identity.className='edu-license-identity';identity.append(text('h4',item.school.name));overview.append(identity);
   const state=text('strong',names[item.status]||item.status);state.dataset.status=item.status;state.className='edu-license-state';overview.append(state);
   const validity=text('p',item.status==='issued'?(item.months===null?'Trvalá licence od aktivace':'Platnost '+item.months+' měsíců od aktivace'):'Aktivace '+date(item.activatedAt)+' · '+(item.expiresAt?'Platnost do '+date(item.expiresAt):'Bez konce platnosti'));validity.className='edu-license-validity';overview.append(validity);card.append(overview);
   const details=document.createElement('details');details.className='edu-license-details';details.append(text('summary','Podrobnosti a správa licence'));
   const body=document.createElement('div');body.className='edu-admin__flow';body.append(text('p',(item.school.entity_type==='organization'?'Organizace · IČO '+item.school.ico:'RED IZO '+item.schoolKey+' · IČO '+item.school.ico)+(item.school.address?' · '+item.school.address:'')+(item.school.municipality?' · '+item.school.municipality:'')));details.append(body);card.append(details);
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
  say('license-list-status','Načtené licence: '+data.items.length+'.');
 }
 work($('license-issue-form'),'license-issue-status',async()=>{
  const manual=$('license-recipient-type').value==='organization';
  if(!manual&&!selectedIssue)throw Error('Vyberte školu z nabídky rejstříku.');
  const recipient=manual?{organization:{name:$('license-org-name').value.trim(),ico:validIco($('license-org-ico')),address:$('license-org-address').value.trim(),municipality:$('license-org-municipality').value.trim(),postal_code:$('license-org-postal').value.trim()}}:{schoolKey:selectedIssue};const token=auth.getToken('styles');
  const result=await request('/api/operator/licenses',{method:'POST',body:JSON.stringify({...recipient,months:$('license-term').value==='permanent'?null:Number($('license-term').value)})},'operator');
  if(!operator()||token!==auth.getToken('styles'))return;showCode(result);await loadLicenses();
 });
 $('license-reload').onclick=()=>loadLicenses().catch(e=>say('license-list-status',e.message));
 let filterTimer;$('license-filter').oninput=()=>{clearTimeout(filterTimer);filterTimer=setTimeout(()=>$('license-reload').click(),250);};
 async function state(){
  const allowed=operator();$('license-admin').hidden=!allowed;$('license-access').hidden=allowed;
  $('license-code-value').value='';$('license-code-result').hidden=true;
  if(!allowed){++generation;++latestLoad;$('license-items').replaceChildren();loadedToken='';say('license-list-status','');return;}
  const token=auth.getToken('styles');if(token===loadedToken)return;loadedToken=token;const version=++generation;
  try{await loadLicenses();}catch(error){if(version===generation&&token===auth.getToken('styles')){loadedToken='';say('license-list-status',error.message);}}
 }
 root.addEventListener('eduvize-admin-auth-change',state);auth.ready.then(state);
})(window);
