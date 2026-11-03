(function(root){
 if(root.EduvizeUpdateSettings)return;
 const API='https://eduvize-dokumenty-api.onrender.com',mounted=new Set();
 const titles={weather:'Počasí',transport:'Jízdní řády',news:'Aktuality',menu:'Jídelníček',documents:'Dokumenty',kiosk:'Kiosek',wisdom:'Moudrost dne',holidays:'Svátky',styles:'Správa stylů','school-systems':'Školní systémy','day-progress':'Průběh dne'};
 const frequency={off:'Není plánována',weekly:'Každý týden',monthly:'Každý měsíc',quarterly:'Každé čtvrtletí',yearly:'Jednou ročně'};
 const date=value=>value?new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Prague'}).format(new Date(value)):'—';
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 async function request(app,options={}){
  const auth=root.EduvizeAdminAuth;await auth?.ready;
  const scope=auth?.getToken('configurations')?'configurations':'documents';
  if(!auth?.getToken(scope))throw Error('Pro zobrazení a změnu společného plánu se přihlaste k účtu školy.');
  const response=await auth.fetch(API+'/api/admin/update-plans/'+app,{...options,cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{})}},scope);
  const data=await response.json();if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:'Plán není dostupný ('+response.status+').');return data;
 }
 function mount(app,host){
  if(!titles[app]||mounted.has(app)||!host)return;mounted.add(app);
  const panel=node('details',null,'edu-update-settings');panel.dataset.eduUpdateApp=app;
  const summary=node('summary'),summaryText=node('span','Aktualizace'),brief=node('span','Ověřuji plán…','edu-update-settings__summary-state');summary.append(summaryText,brief);panel.append(summary);
  const body=node('div',null,'edu-update-settings__body'),content=node('section',null,'edu-update-settings__section'),maintenance=node('section',null,'edu-update-settings__section');
  function select(title,entries,parent){const label=node('label',title,'edu-admin__field'),input=node('select');for(const[value,text]of entries){const option=node('option',text);option.value=String(value);input.append(option);}label.append(input);parent.append(label);return input;}
  content.append(node('h3','Obnovování obsahu'),node('p','Probíhá při otevřeném výstupu. Čas, odpočty a stránkování zůstávají nezávislé.'));
  const refresh=select('Četnost obnovování',[['default','Výchozí intervaly aplikace'],[0,'Vypnuto'],[30,'Každých 30 sekund'],[60,'Každou minutu'],[120,'Každé 2 minuty'],[300,'Každých 5 minut'],[600,'Každých 10 minut'],[900,'Každých 15 minut'],[1800,'Každých 30 minut'],[3600,'Každou hodinu']],content);
  const refreshState=node('p','Stav načítám…');content.append(refreshState);
  maintenance.append(node('h3','Údržba zdrojů'),node('p',app==='holidays'?'Kontrola úplného kalendáře jmenin a import změn po ověření.':'Pravidelná kontrola dostupnosti a formátu zdrojů aplikace; případné změny se zveřejní po ověření.'));
  const cadence=select('Četnost kontroly',Object.entries(frequency),maintenance),next=node('p'),last=node('p');maintenance.append(next,last,node('p','Plánovač: Codex · kontroly v 9:00, časové pásmo Praha.','edu-update-settings__hint'));
  const actions=node('div',null,'edu-update-settings__actions'),save=node('button','Uložit plán','edu-admin__button'),status=node('span','','edu-update-settings__status'),reload=node('button','Obnovit stav','edu-admin__button edu-admin__button--secondary');
  save.type=reload.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');actions.append(save,reload,status);body.append(content,maintenance,actions);panel.append(body);host.append(panel);
  let plan=null,busy=false,unsaved=false,identity="";
  const activeIdentity=()=>JSON.stringify([root.EduvizeAdminAuth?.status().schoolId,root.EduvizeAdminAuth?.status().profileId]);
  function say(text,error=false){status.textContent=text;status.dataset.error=String(error);}
  function state(){save.disabled=busy||!plan;reload.disabled=busy;cadence.disabled=busy||!plan;refresh.disabled=busy||!plan||app==='styles';}
  function show(value){plan=value;refresh.value=value.refreshSeconds===null?'default':String(value.refreshSeconds);cadence.value=value.maintenanceFrequency;unsaved=false;
   const seconds=value.refreshSeconds===null?value.defaultRefreshSeconds:value.refreshSeconds;
   refreshState.textContent=seconds===0?'Automatické obnovování obsahu je vypnuté.':'Další obnova ve výstupu: podle jeho běžícího intervalu. Výchozí nejkratší interval: '+seconds+' s.';
   next.textContent=value.maintenanceNextRun?'Další kontrola: '+date(value.maintenanceNextRun)+'.':'Pravidelná údržba není naplánována.';
   last.textContent='Poslední úspěšná kontrola: '+date(value.lastMaintenanceCheck)+(value.maintenanceStatus==='error'?' · Poslední pokus selhal.':'');
   brief.textContent=(seconds===0?'Obsah: vypnuto':'Obsah: '+(value.refreshSeconds===null?'výchozí interval':seconds+' s'))+' · Údržba: '+frequency[value.maintenanceFrequency].toLocaleLowerCase('cs');
   if(app==='styles')refreshState.textContent='Správa stylů nemá vlastní datový výstup. Aktivní vzhled přebírají jednotlivé aplikace automaticky.';panel.dataset.revision=String(value.revision);state();
  }
  async function load(){if(busy)return;busy=true;plan=null;state();try{await root.EduvizeAdminAuth?.ready;const before=activeIdentity(),value=await request(app);if(before!==activeIdentity())throw Error('Změnil se účet školy. Obnovte stav.');identity=before;show(value);say('');}catch(error){brief.textContent='Plán nelze ověřit';say(error.message,true);}finally{busy=false;state();}}
  save.onclick=async()=>{if(busy||!plan)return;if(identity!==activeIdentity()){say('Změnil se účet školy. Nejprve obnovte stav.',true);return;}busy=true;state();say('Ukládám plán…');try{
   const value=await request(app,{method:'PUT',body:JSON.stringify({expectedRevision:plan.revision,refreshSeconds:refresh.value==='default'?null:Number(refresh.value),maintenanceFrequency:cadence.value})});
   show(value);say('Plán uložen pro školu. Běžící výstupy jej převezmou do minuty.');root.dispatchEvent(new CustomEvent('eduvize-update-plan-saved',{detail:value}));
  }catch(error){say(error.message,true);}finally{busy=false;state();}};
  reload.onclick=load;
  for(const input of [refresh,cadence])input.addEventListener('change',()=>{unsaved=true;say('Změna ještě není uložená.');});
  root.addEventListener('eduvize-admin-auth-change',()=>{if(identity&&identity!==activeIdentity()){unsaved=false;load();}else if(!unsaved)load();});
  root.addEventListener('message',event=>{
   if(event.data?.type!=='eduvize-refresh-state'||!event.data.nextRun||!plan)return;
   const frame=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow===event.source);if(!frame)return;
   refreshState.textContent='Další obnova v živém náhledu: '+date(event.data.nextRun)+(event.data.lastTriggered?' · naposledy spuštěno '+date(event.data.lastTriggered):'')+'.';
  });
  state();load();
 }
 const link=document.createElement('link');link.rel='stylesheet';link.href='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/update-settings.css?v=20261103-1';document.head.append(link);
 root.EduvizeUpdateSettings=Object.freeze({mount});
})(window);
