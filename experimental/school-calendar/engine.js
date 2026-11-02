(function(root){
 'use strict';
 const day=value=>new Date(value+'T00:00:00Z'),iso=date=>date.toISOString().slice(0,10);
 function add(value,n){const d=day(value);d.setUTCDate(d.getUTCDate()+n);return iso(d);}
 function district(value){const m=/^Praha (\d+)$/.exec(value||'');return m?([1,2,3,4,5,11,12,13,16].includes(+m[1])?'Praha 1 až 5':'Praha 6 až 10'):value;}
 function select(data,school={},category=''){
  const types=school.school_types?.length?school.school_types:[school.school_type];
  const events=data.events.filter(e=>e.types.some(t=>types.includes(t))).map(e=>({...e}));
  const area=district(school.calendar_district||school.district),spring=data.spring[area];
  if(spring&&types.some(t=>['ZS','SS','ZUS','KON'].includes(t)))events.push({id:'spring-'+area,title:'Jarní prázdniny',...spring,category:'school',source:'https://msmt.gov.cz/organizace-skolniho-roku',verifiedAt:data.verifiedAt,note:area});
  return events.filter(e=>!category||e.category===category).sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title,'cs'));
 }
 function sharedEvents(calendar,start,end){const result=[];for(let date=start;date<=end;date=add(date,1)){const item=calendar?.cz?.[date];if(!item)continue;
  if(item.nameday_status!=='unavailable'&&item.nameday?.trim())result.push({id:'nameday-'+date,title:item.nameday,start:date,end:date,category:'nameday',source:item.nameday_source||'https://pborovicka72-dotcom.github.io/eduvize-svatky/',note:'Jmeniny'});
  for(const [i,event] of (item.holidays||[]).entries())result.push({id:'holiday-'+date+'-'+i,title:event.name,start:date,end:date,category:event.type==='significant'?'significant':'holiday',dayOff:!!event.day_off,source:'https://pborovicka72-dotcom.github.io/eduvize-svatky/',note:event.day_off?'Den pracovního klidu':''});
 }return result;}
 function filter(events,categories,start,end){return events.filter(e=>(!categories||categories.includes(e.category))&&e.start<=end&&e.end>=start).sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title,'cs'));}
 function range(start,view){if(view==='month'){const first=start.slice(0,7)+'-01',d=day(first);d.setUTCMonth(d.getUTCMonth()+1);return {start:first,end:add(iso(d),-1)};}return {start,end:add(start,29)};}
 const escape=value=>String(value||'').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
 function fold(line){let lines=[],part='',length=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(length+bytes>75){lines.push(part);part=' ';length=1;}part+=char;length+=bytes;}return [...lines,part].join('\r\n');}
 function ics(events){const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Eduvize//School calendar//CS','CALSCALE:GREGORIAN'];for(const e of events)lines.push('BEGIN:VEVENT','UID:'+e.id+'-'+e.start+'@calendar.eduvize.cz','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+e.start.replaceAll('-',''),'DTEND;VALUE=DATE:'+add(e.end,1).replaceAll('-',''),'SUMMARY:'+escape(e.title),'DESCRIPTION:'+escape((e.note?e.note+'\n':'')+'Zdroj: '+e.source+(e.verifiedAt?'\nOvěřeno: '+e.verifiedAt:'')),'URL:'+e.source,'END:VEVENT');lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';}
 root.EduvizeCalendar={select,sharedEvents,filter,range,district,ics,day,iso,add};
})(typeof window==='undefined'?globalThis:window);
