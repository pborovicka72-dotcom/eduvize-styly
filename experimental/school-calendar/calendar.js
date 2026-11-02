(async function(){
 const $=id=>document.getElementById(id),key='eduvize-school-card-preview-v1',engine=window.EduvizeCalendar;
 let school={};try{school=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
 const data=await fetch('events.json').then(r=>{if(!r.ok)throw Error('Data kalendáře nejsou dostupná.');return r.json();}).catch(error=>{document.querySelector('main').append(Object.assign(document.createElement('p'),{textContent:error.message}));return null;});if(!data)return;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text||'';if(cls)e.className=cls;return e;};
 if($('schoolForm')){
  for(const district of Object.keys(data.spring).sort((a,b)=>a.localeCompare(b,'cs')))$('district').add(new Option(district,district));
  for(const field of $('schoolForm').querySelectorAll('input,select'))if(school[field.id]!==undefined)field.value=school[field.id];
  $('schoolForm').onsubmit=e=>{e.preventDefault();if(Boolean($('lat').value)!==Boolean($('lon').value)){$('status').textContent='Doplňte obě souřadnice, nebo ponechte obě prázdné.';return;}const next={};for(const field of $('schoolForm').querySelectorAll('input,select'))if(field.value.trim())next[field.id]=['lat','lon'].includes(field.id)?Number(field.value):field.value.trim();try{localStorage.setItem(key,JSON.stringify(next));$('status').textContent='Testovací karta uložena v prohlížeči. Kalendář převezme typ školy a okres.';}catch{$('status').textContent='Prohlížeč uložení nepovolil.';}};return;
 }
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Prague'}).format(new Date()),month=today.slice(0,7);$('month').value=month>='2026-09'&&month<='2027-09'?month:'2026-09';
 $('schoolHeading').textContent=school.name||'Nejprve vyplňte kartu školy';$('scope').textContent=[school.school_type,school.district,'Školní rok '+data.schoolYear].filter(Boolean).join(' · ');
 const labels={school:'Organizace školního roku',admissions:'Přijímací řízení',maturita:'Maturity'};
 const fmt=value=>new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeZone:'UTC'}).format(engine.day(value));
 function range(e){return e.start===e.end?fmt(e.start):fmt(e.start)+' – '+fmt(e.end);}
 function render(){const all=engine.select(data,school,$('category').value);$('warning').textContent=!school.school_type?'Bez karty školy se nevybírají termíny. Otevřete Kartu školy.':school.school_type==='MS'?'Pro MŠ se neuplatňuje běžný rozpis školních prázdnin.':!data.spring[school.district]?'Doplňte okres pro zobrazení jarních prázdnin.':'';
  const next=all.find(e=>e.end>=today);$('next').replaceChildren(make('span','NEJBLIŽŠÍ TERMÍN','eyebrow'),make('h2',next?next.title:'Žádný další termín v načteném školním roce'),make('p',next?range(next):'Pro další období nejsou v této verzi načtená data.'));
  const host=$('events');host.replaceChildren();const selected=$('month').value;if(!/^202[67]-\d{2}$/.test(selected))return;
  if($('view').value==='month'){host.className='month';for(const name of ['Po','Út','St','Čt','Pá','So','Ne'])host.append(make('strong',name));const first=engine.day(selected+'-01');first.setUTCDate(first.getUTCDate()-(first.getUTCDay()+6)%7);for(let i=0;i<42;i++){const d=new Date(first);d.setUTCDate(d.getUTCDate()+i);const value=engine.iso(d),cell=make('article','','day');cell.classList.toggle('outside',value.slice(0,7)!==selected);cell.classList.toggle('today',value===today);cell.append(make('strong',d.getUTCDate()));const ul=make('ul');for(const e of all.filter(e=>e.start<=value&&e.end>=value))ul.append(make('li',e.title));cell.append(ul);host.append(cell);}return;}
  host.className='events';let visible=all.filter(e=>e.end>=selected+'-01').slice(0,12);if(new URLSearchParams(location.search).get('display')==='1'){document.body.classList.add('display');document.body.classList.toggle('portrait',innerHeight>innerWidth);visible=all.filter(e=>e.end>=today).slice(0,6);}
  if(!visible.length)host.append(make('p','Žádné odpovídající termíny.','muted'));
  for(const e of visible){const card=make('article','','event'),date=make('strong',range(e)),body=make('div');body.append(make('span',labels[e.category],'tag'),make('h3',e.title));if(e.note)body.append(make('p',e.note,'muted'));const a=make('a','Ověřený zdroj · '+e.verifiedAt);a.href=e.source;a.rel='noopener';body.append(a);card.append(date,body);host.append(card);}
 }
 for(const id of ['view','category','month'])$(id).onchange=render;
 $('ics').onclick=()=>{const events=engine.select(data,school,$('category').value);if(!events.length){$('warning').textContent='Nejprve vyplňte kartu školy a vyberte oblast s termíny.';return;}const url=URL.createObjectURL(new Blob([engine.ics(events)],{type:'text/calendar;charset=utf-8'})),a=make('a');a.href=url;a.download='eduvize-kalendar-2026-2027.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};render();
})();
