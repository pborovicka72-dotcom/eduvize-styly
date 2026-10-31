/* Transport-specific content sizing. Shared header geometry remains the authority. */
(function(root){
 function apply(body,{web=false}={},width=root.innerWidth,height=root.innerHeight){
  const geometry=root.EduvizeSegmentProfile.resolve(width,height);
  const text=web?Math.max(16,Math.min(26,width/42)):Math.max(24,Math.min(64,width/30,height/19));
  const px={text,time:text*1.1,route:text*.9,stop:text*.8,label:text*.66,footer:Math.max(12,Math.min(28,geometry.short*.025)),gap:Math.max(6,text*.3),pad:Math.max(8,Math.min(30,geometry.short*.014)),rowPad:text*.18,rowGap:Math.max(3,text*.08),'route-icon':text*.72};
  for(const [key,value] of Object.entries(px))body.style.setProperty('--transport-'+key,value+'px');
  body.dataset.transportLayout=width<1400?'stacked':'table';
  body.dataset.segmentLayout=geometry.kind;
  const heading=body.querySelector('.destination-heading');if(heading)heading.textContent=width<1400?'Směr / zastávka':'Směr';
  return Object.freeze({geometry,px:Object.freeze(px)});
 }
 root.EduvizeTransportLayout=Object.freeze({apply});
})(window);
