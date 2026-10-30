/* Holiday-specific binding of the shared geometry policy to presentation tokens. */
(function(root){
 function apply(body,options,width,height){
  const policy=root.EduvizeSegmentProfile.holidays(root.EduvizeSegmentProfile.resolve(width,height),options);
  body.classList.add('ev-modern');body.dataset.segmentLayout=policy.geometry.kind;
  body.dataset.showUpcoming=String(policy.showUpcoming);body.dataset.upcomingHeading=String(policy.showUpcomingHeading);
  for(const [key,value] of Object.entries(policy.px))body.style.setProperty('--ev-'+key,value+'px');
  body.style.setProperty('--ev-columns',String(policy.columns));body.style.setProperty('--calendar-metrics-columns',String(policy.metricsColumns));
  const date=body.querySelector('#date'),year=body.querySelector('#year');
  if(date&&year&&!date.parentElement.classList.contains('calendar-date-year')){const row=document.createElement('div');row.className='calendar-date-year';date.before(row);row.append(date,year);}
  return policy;
 }
 root.EduvizeHolidaysLayout=Object.freeze({apply});
})(window);
