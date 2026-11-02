(function(root){
 const day=value=>new Date(value+'T00:00:00Z');
 const iso=date=>date.toISOString().slice(0,10);
 function select(data,school,category=''){
  if(!school?.school_type)return [];
  const events=data.events.filter(e=>e.types.includes(school.school_type));
  const spring=data.spring[school.calendar_district||school.district];
  if(spring&&['ZS','SS','ZUS','KON'].includes(school.school_type))events.push({id:'spring-'+school.district,title:'Jarní prázdniny',...spring,category:'school',source:'https://msmt.gov.cz/organizace-skolniho-roku',verifiedAt:data.verifiedAt,status:'confirmed',note:school.district});
  return events.filter(e=>!category||e.category===category).sort((a,b)=>a.start.localeCompare(b.start)||a.title.localeCompare(b.title,'cs'));
 }
 const escape=value=>String(value||'').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
 function fold(line){let lines=[],part='',length=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(length+bytes>75){lines.push(part);part=' ';length=1;}part+=char;length+=bytes;}return [...lines,part].join('\r\n');}
 function ics(events){const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Eduvize//School calendar preview//CS','CALSCALE:GREGORIAN'];for(const e of events){const end=day(e.end);end.setUTCDate(end.getUTCDate()+1);lines.push('BEGIN:VEVENT','UID:'+e.id+'-2026-2027@calendar.eduvize.cz','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+e.start.replaceAll('-',''),'DTEND;VALUE=DATE:'+iso(end).replaceAll('-',''),'SUMMARY:'+escape(e.title),'DESCRIPTION:'+escape((e.note?e.note+'\n':'')+'Zdroj: '+e.source+'\nOvěřeno: '+e.verifiedAt),'URL:'+e.source,'END:VEVENT');}lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';}
 root.EduvizeCalendar={select,ics,day,iso};
})(typeof window==='undefined'?globalThis:window);
