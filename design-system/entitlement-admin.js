/* Versioned license plans. No tokens, codes or school data are persisted here. */
(function(root){
 'use strict';
 const client=root.EduvizeLicensing;if(!client)return;
 const {request,text,operator}=client;
 let catalogPromise;
 const catalog=()=>catalogPromise||(catalogPromise=request('/api/operator/entitlement-catalog',{},'operator').catch(error=>{catalogPromise=null;throw error;}));
 const button=label=>{const node=text('button',label);node.type='button';node.className='edu-admin__button edu-admin__button--secondary';return node;};
 function field(label,input){const node=text('label',label);node.className='edu-admin__field';node.append(input);return node;}
 function input(type,value=''){const node=document.createElement('input');node.type=type;node.value=value;return node;}
 function choices(data,grants=[]){
  const host=document.createElement('div');host.className='edu-admin__flow';const rows=[];
  const options=data.packageVersions.map(v=>({key:v.id,label:v.name+' · verze '+v.version,packageVersionId:v.id})).concat(data.capabilities.map(c=>({key:c.code,label:c.name,capability:c.code,capacity:c.kind==='capacity'})));
  for(const option of options){
   const current=grants.find(g=>g.packageVersionId===option.key||g.capability===option.key),row=document.createElement('div');row.className='edu-license-renew';
   const check=input('checkbox');check.checked=!!current;const label=text('label',option.label);label.prepend(check);row.append(label);
   const quantity=input('number',current?.quantity||1);quantity.min='1';quantity.max='100000';quantity.style.maxWidth='100px';if(option.capacity)row.append(field('Počet míst',quantity));
   const starts=input('datetime-local',localTime(current?.startsAt)),ends=input('datetime-local',localTime(current?.endsAt));
   const dates=document.createElement('details');dates.append(text('summary','Platnost doplňku (volitelné)'),field('Platí od',starts),field('Platí do',ends));dates.hidden=!check.checked;check.addEventListener('change',()=>{dates.hidden=!check.checked;});row.append(dates);host.append(row);
   rows.push(()=>check.checked?{...(option.packageVersionId?{packageVersionId:option.packageVersionId}:{capability:option.capability}),quantity:option.capacity?Number(quantity.value):1,startsAt:starts.value?new Date(starts.value).getTime()/1000:null,endsAt:ends.value?new Date(ends.value).getTime()/1000:null}:null);
  }
  return {host,values:()=>rows.map(fn=>fn()).filter(Boolean)};
 }
 function localTime(stamp){if(stamp==null)return '';const date=new Date(stamp*1000);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 function bind(host,item){
  const details=document.createElement('details');details.append(text('summary','Balíčky, aplikace, integrace a obrazovky'));host.append(details);let loaded=false;
  details.addEventListener('toggle',async()=>{
   if(!details.open||loaded||!operator())return;loaded=true;const body=document.createElement('div');body.className='edu-admin__flow';details.append(body);const status=text('p','Načítám oprávnění…');status.setAttribute('role','status');body.append(status);
   try{
    const [data,plan,screens]=await Promise.all([catalog(),request('/api/operator/licenses/'+item.id+'/entitlements',{},'operator'),request('/api/operator/licenses/'+item.id+'/screens',{},'operator')]);if(!operator())return;
    status.textContent=plan.mode==='legacy'?'Dosavadní rozsah je zachovaný. Úpravou níže jej výslovně nahradíte.':'Licence používá přiřazené balíčky a doplňky.';
    const effective=text('p','Aktuálně účinná oprávnění: '+(Object.keys(plan.effective).map(code=>data.capabilities.find(c=>c.code===code)?.name||code).join(', ')||'žádná (zkontrolujte také aktivaci a platnost licence)'));body.append(effective);
    const editor=choices(data,plan.grants),form=document.createElement('form');form.className='edu-admin__flow';const reason=input('text');reason.required=true;reason.maxLength=120;const save=button('Uložit oprávnění');save.type='submit';form.append(editor.host,field('Důvod změny',reason),save);body.append(form);
    const feedback=text('p','');feedback.setAttribute('role','status');body.append(feedback);let revision=plan.revision,pending=null;
    form.onsubmit=async event=>{event.preventDefault();const payload={expectedRevision:revision,grants:editor.values(),reason:reason.value.trim()},json=JSON.stringify(payload);if(!pending||pending.json!==json)pending={json,key:crypto.randomUUID()};save.disabled=true;
     try{const result=await request('/api/operator/licenses/'+item.id+'/entitlements',{method:'PUT',headers:{'Idempotency-Key':pending.key},body:pending.json},'operator');revision=result.revision;pending=null;feedback.textContent='Oprávnění uložena. Nová revize '+revision+'.';effective.textContent='Aktuálně účinná oprávnění: '+(Object.keys(result.effective).map(code=>data.capabilities.find(c=>c.code===code)?.name||code).join(', ')||'žádná');}
     catch(error){feedback.textContent=error.message;}finally{save.disabled=false;}};
    body.append(text('h4','Evidence obrazovek'),text('p','Ručně evidováno: '+screens.declaredCount+' · Licencovaná místa: '+(screens.licensedSlots??'neurčeno')+'. Limit se nevynucuje; záznamy nejsou ověřená zařízení.'));
    const list=document.createElement('ul');for(const screen of screens.items){const row=text('li',screen.name+' · '+(screen.role==='kiosk'?'Kiosek':'Obrazovka')+' · '+(screen.state==='retired'?'Vyřazená':'Evidovaná'));if(screen.state!=='retired'){const retire=button('Vyřadit z evidence');row.append(retire);retire.onclick=async()=>{retire.disabled=true;try{await request('/api/operator/licenses/'+item.id+'/screens/'+screen.id,{method:'PUT',body:JSON.stringify({name:screen.name,role:screen.role,profileId:screen.profileId,state:'retired',expectedRevision:screen.revision})},'operator');row.textContent=screen.name+' · Vyřazená';}catch(error){feedback.textContent=error.message;retire.disabled=false;}};}list.append(row);}body.append(list);
    if(item.schoolId){const screenForm=document.createElement('form');screenForm.className='edu-admin__flow';const name=input('text');name.required=true;name.maxLength=120;const role=document.createElement('select');for(const [value,label] of [['display','Obrazovka'],['kiosk','Kiosek']]){const o=text('option',label);o.value=value;role.append(o);}const add=button('Přidat do evidence');add.type='submit';screenForm.append(field('Název obrazovky',name),field('Role',role),add);body.append(screenForm);
     screenForm.onsubmit=async event=>{event.preventDefault();add.disabled=true;try{await request('/api/operator/licenses/'+item.id+'/screens',{method:'POST',body:JSON.stringify({name:name.value,role:role.value})},'operator');feedback.textContent='Obrazovka byla přidána do evidence. Limit se nevynucuje.';list.append(text('li',name.value+' · '+role.selectedOptions[0].textContent));name.value='';}catch(error){feedback.textContent=error.message;}finally{add.disabled=false;}};
    }
   }catch(error){status.textContent=error.message;loaded=false;}
  });
 }
 async function builder(){
  const host=document.getElementById('license-package-builder');if(!host||!operator())return;host.replaceChildren();
  try{const data=await catalog();if(!operator())return;host.append(text('p','Nová verze nezmění dříve přiřazené licence. Balíček integrací může vyžadovat základní aplikaci v jiném balíčku. Kód a název existujícího balíčku zachovejte.'));
   const form=document.createElement('form');form.className='edu-admin__flow';const code=input('text'),name=input('text');code.required=name.required=true;code.pattern='[a-z][a-z0-9-]{1,63}';code.maxLength=64;name.maxLength=120;
   const selections=[];for(const capability of data.capabilities){const check=input('checkbox'),row=text('label',capability.name),quantity=input('number',1);quantity.min='1';quantity.max='100000';row.prepend(check);if(capability.kind==='capacity')row.append(field('Počet míst',quantity));form.append(row);selections.push(()=>check.checked?{capability:capability.code,quantity:capability.kind==='capacity'?Number(quantity.value):1}:null);}
   const save=button('Vydat novou verzi balíčku');save.type='submit';const status=text('p','');status.setAttribute('role','status');form.prepend(field('Kód balíčku',code),field('Název balíčku',name));form.append(save,status);host.append(form);
   form.onsubmit=async event=>{event.preventDefault();save.disabled=true;const versions=data.packageVersions.filter(v=>v.packageId===code.value);try{const result=await request('/api/operator/package-versions',{method:'POST',body:JSON.stringify({packageId:code.value,name:name.value,expectedVersion:Math.max(0,...versions.map(v=>v.version)),items:selections.map(fn=>fn()).filter(Boolean)})},'operator');data.packageVersions.push({...result,items:selections.map(fn=>fn()).filter(Boolean)});catalogPromise=null;status.textContent='Vydán balíček '+result.name+', verze '+result.version+'. Vyberte jej v detailu licence.';}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
  }catch(error){host.append(text('p',error.message));}
 }
 root.EduvizeEntitlementAdmin={bind};root.addEventListener('eduvize-admin-auth-change',()=>{catalogPromise=null;builder();});client.auth.ready.then(builder);
})(window);
