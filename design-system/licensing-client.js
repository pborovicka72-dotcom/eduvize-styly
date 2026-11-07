/* Shared license and school-account API client. No license codes are stored. */
(function(root){
 'use strict';
 const auth=root.EduvizeAdminAuth,API=location.origin,$=id=>document.getElementById(id);
 if(!auth)return;
 const names={issued:'Čeká na aktivaci',active:'Platná',expiring:'Platnost brzy končí',expired:'Platnost skončila',perpetual:'Trvalá'};
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
 const date=value=>value?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeZone:'Europe/Prague'}).format(new Date(value*1000)):'—';
 const operator=()=>auth.status().connected&&auth.status().scopes.includes('styles')&&!auth.status().schoolId;
 function say(id,value){if($(id))$(id).textContent=value;}
 async function request(path,options={},protectedRequest=false){
  const token=auth.getToken(protectedRequest==='operator'?'styles':'configurations');
  if(protectedRequest&&!token)throw Error('Pro tuto funkci se přihlaste příslušným účtem.');
  const response=await fetch(API+path,{...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000),
   headers:{'Content-Type':'application/json',...(options.headers||{}),...(protectedRequest?{Authorization:'Bearer '+token}:{})}});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(Error(typeof result.detail==='string'?result.detail:'Služba nyní není dostupná ('+response.status+').'),{status:response.status});
  return result;
 }
 function work(form,status,action){if(!form)return;form.addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter||form.querySelector('button[type=submit]');button.disabled=true;say(status,'Zpracovávám…');try{await action();}catch(e){say(status,e.name==='TimeoutError'?'Požadavek se nepodařilo dokončit včas. Zkuste to znovu.':e.message);}finally{button.disabled=false;}});}
 function lookup(inputId,listId,onSelect){let timer,version=0;const input=$(inputId),list=$(listId);if(!input||!list)return;input.addEventListener('input',()=>{onSelect('');clearTimeout(timer);const current=++version;list.replaceChildren();if(input.value.trim().length<2)return;timer=setTimeout(async()=>{try{const data=await request('/api/registration/schools?q='+encodeURIComponent(input.value.trim()));if(current!==version)return;list.replaceChildren();for(const item of data.items){const button=text('button',item.name+' · '+item.municipality+' · RED IZO '+item.red_izo);button.type='button';button.className='edu-license-result';button.onclick=()=>{++version;input.value=item.name;onSelect(item.red_izo);list.replaceChildren();};list.append(button);}if(!data.items.length)list.append(text('p','Žádná škola nenalezena.'));}catch(e){if(current===version)list.replaceChildren(text('p',e.message));}},250);});}
 function validIco(input){
  const value=input.value.trim();input.setCustomValidity('');
  if(!/^[0-9]{8}$/.test(value)||value==='00000000'||Number(value[7])!==(11-[...value.slice(0,7)].reduce((sum,n,i)=>sum+Number(n)*(8-i),0)%11)%10){
   input.setCustomValidity('Zadejte platné osmimístné IČO včetně počátečních nul.');input.reportValidity();throw Error('Zkontrolujte IČO organizace.');
  }return value;
 }
 root.EduvizeLicensing=Object.freeze({auth,$,names,date,operator,text,say,request,work,lookup,validIco});
})(window);
