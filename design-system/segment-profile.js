/* Geometry-first display policy. No template numbers or theme colors belong here. */
(function(root){
 function resolve(width,height){
  if(!(Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0))throw Error('Neplatné rozměry segmentu');
  const short=Math.min(width,height),ratio=width/height;
  const kind=ratio>=2.7?'panoramic':short<720?'compact':ratio<.8?'portrait':ratio<1.4?'square':'landscape';
  return Object.freeze({width,height,short,ratio,kind,scale:short/720});
 }
 function holidays(geometry,options={}){
  const g=geometry,s=g.short,strip=g.kind==='panoramic',compact=g.kind==='compact';
  const requested=Math.max(0,Math.min(6,Math.trunc(Number(options.days)||0)));
  const upcomingDays=Math.min(requested,compact?0:strip?3:6);
  const columns=strip?Math.min(3,upcomingDays):g.kind==='portrait'?(g.width>=900?2:1):g.kind==='square'?3:6;
  const head=strip?g.height*.7:Math.min(g.height*.2,s*.24);
  const px={head,icon:strip?g.height*.24:head*.52,'date-size':strip?g.height*.14:s*.06,'date-meta':strip?g.height*.06:s*.023,'head-pad':s*.025,'head-side':s*.03,'head-gap':s*.018,'small-icon':s*.047,subtitle:Math.max(18,strip?g.height*.055:s*.032),name:Math.max(32,strip?g.height*.12:s*.065),note:Math.max(14,s*.019),'day-label':Math.max(16,s*.023),'day-name':Math.max(26,strip?g.height*.075:s*.038),'day-event':Math.max(14,strip?g.height*.038:s*.02),'card-pad':s*.022,gap:s*.012,'today-height':s*.14,'name-gap':s*.008,'event-pad':s*.008};
  return Object.freeze({geometry:g,upcomingDays,columns:Math.max(1,Math.min(columns,upcomingDays||1)),minFont:Math.max(10,s*.014),showToday:true,showUpcoming:upcomingDays>0,showUpcomingHeading:!strip,metricsColumns:compact||strip||g.kind==='portrait'?1:2,px:Object.freeze(px)});
 }
 root.EduvizeSegmentProfile=Object.freeze({resolve,holidays});
})(typeof window==='undefined'?globalThis:window);
