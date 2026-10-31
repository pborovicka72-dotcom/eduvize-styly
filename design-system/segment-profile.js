/* Geometry-first display policy. No template numbers or theme colors belong here. */
(function(root){
 function resolve(width,height){
  if(!(Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0))throw Error('Neplatné rozměry segmentu');
  const short=Math.min(width,height),ratio=width/height;
  const kind=ratio>=2.7?'panoramic':short<720?'compact':ratio<.8?'portrait':ratio<1.4?'square':'landscape';
  return Object.freeze({width,height,short,ratio,kind,scale:short/720});
 }
 function header(geometry,mode='nsp'){
  const height=mode==='web'?96:geometry.short<=720?192:geometry.short<=1200?288:Math.round(geometry.short*.22/32)*32;
  return Object.freeze({height,icon:height*.64,title:height*.36,meta:height*.18,padding:height*.05,gap:height*.08});
 }
 function text(geometry,mode='nsp'){
  const stripBoost=geometry.ratio>=3&&geometry.short<=600?48:40;
  const body=mode==='web'?18:Math.max(stripBoost,Math.min(112,geometry.short*.052));
  return Object.freeze({body,title:body*1.35,label:mode==='web'?17:Math.max(32,body*.95),caption:mode==='web'?16:Math.max(28,body*.85),value:body*1.65});
 }
 function holidays(geometry,options={}){
  const g=geometry,s=g.short,strip=g.kind==='panoramic',compact=g.kind==='compact';
  const requested=Math.max(0,Math.min(6,Math.trunc(Number(options.days)||0)));
  const stripDays=g.ratio<4.5?2:3;
  const upcomingDays=Math.min(requested,compact?0:strip?stripDays:g.width<960&&g.kind==='portrait'?4:6);
  const columns=strip?Math.min(3,upcomingDays):g.kind==='portrait'?2:3;
  const shared=header(g),head=shared.height;
  const px={head,icon:shared.icon,'date-size':shared.title,'date-meta':shared.meta,'head-pad':shared.padding,'head-side':shared.padding,'head-gap':shared.gap,'small-icon':s*.05,subtitle:Math.max(18,s*.035),name:Math.max(32,s*(strip||compact?.26:g.kind==='portrait'?.12:.09)),note:Math.max(14,s*(strip||compact?.04:.028)),'day-label':Math.max(16,s*(strip?.05:.036)),'day-name':Math.max(26,s*(strip?.17:.075)),'day-event':Math.max(14,s*(strip?.045:.032)),'card-pad':s*.022,gap:s*.016,'today-height':s*.18,'name-gap':s*.014,'event-pad':s*.012};
  return Object.freeze({geometry:g,upcomingDays,columns:Math.max(1,Math.min(columns,upcomingDays||1)),minFont:Math.max(10,s*.014),showToday:true,showUpcoming:upcomingDays>0,showUpcomingHeading:!strip,metricsColumns:compact||strip||g.kind==='portrait'?1:2,px:Object.freeze(px)});
 }
 root.EduvizeSegmentProfile=Object.freeze({resolve,header,text,holidays});
})(typeof window==='undefined'?globalThis:window);
