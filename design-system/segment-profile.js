/* Geometry-first display policy. No template numbers or theme colors belong here. */
(function(root){
 function resolve(width,height){
  if(!(Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0))throw Error('Neplatné rozměry segmentu');
  const short=Math.min(width,height),ratio=width/height;
  const kind=ratio>=2.7?'panoramic':short<720?'compact':ratio<.8?'portrait':ratio<1.4?'square':'landscape';
  return Object.freeze({width,height,short,ratio,kind,scale:short/720});
 }
 function header(geometry){
  const height=geometry.short*.16;
  return Object.freeze({height,icon:height*.60,title:height*.32,meta:height*.14,padding:height*.12,gap:height*.12});
 }
 function holidays(geometry,options={}){
  const g=geometry,s=g.short,strip=g.kind==='panoramic',compact=g.kind==='compact';
  const requested=Math.max(0,Math.min(6,Math.trunc(Number(options.days)||0)));
  const upcomingDays=Math.min(requested,compact?0:strip?3:g.width<960&&g.kind==='portrait'?4:6);
  const columns=strip?Math.min(3,upcomingDays):g.kind==='portrait'?2:3;
  const shared=header(g),head=shared.height;
  const px={head,icon:shared.icon,'date-size':shared.title,'date-meta':shared.meta,'head-pad':shared.padding,'head-side':shared.padding,'head-gap':shared.gap,'small-icon':s*.05,subtitle:Math.max(18,s*.035),name:Math.max(32,s*(strip?.26:g.kind==='portrait'?.12:.09)),note:Math.max(14,s*(strip?.04:.028)),'day-label':Math.max(16,s*(strip?.05:.036)),'day-name':Math.max(26,s*(strip?.17:.075)),'day-event':Math.max(14,s*(strip?.045:.032)),'card-pad':s*.022,gap:s*.016,'today-height':s*.18,'name-gap':s*.014,'event-pad':s*.012};
  return Object.freeze({geometry:g,upcomingDays,columns:Math.max(1,Math.min(columns,upcomingDays||1)),minFont:Math.max(10,s*.014),showToday:true,showUpcoming:upcomingDays>0,showUpcomingHeading:!strip,metricsColumns:compact||strip||g.kind==='portrait'?1:2,px:Object.freeze(px)});
 }
 root.EduvizeSegmentProfile=Object.freeze({resolve,header,holidays});
})(typeof window==='undefined'?globalThis:window);
