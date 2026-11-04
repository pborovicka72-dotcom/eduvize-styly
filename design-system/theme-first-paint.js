/* Apply only the selected school's cached theme before painting.
   A missing cache uses the shared CSS baseline immediately, never a blank page. */
(function(){
 var key='eduvize-active-theme-v1', map={background:'bg',text:'text',surface:'surface',muted:'muted',primary:'primary',primaryText:'primary-text',secondary:'secondary',secondaryText:'secondary-text',accent:'accent',border:'border'};
 try{
  if(document.documentElement.dataset.eduTheme==='standard')return;
  var profile=new URL(location.href).searchParams.get('edu-profile')||window.EduvizeAdminAuth?.status().profileId||localStorage.getItem('eduvize-profile-selection-v1')||'';
  profile=/^[a-f0-9]{32}$/.test(profile)?profile:'';
  var theme=JSON.parse(localStorage.getItem(key+':'+(profile||'global'))||'null');
  if(!theme?.colors)return;
  var style=document.documentElement.style;
  for(var name in map){var value=theme.colors[name];if(/^#[0-9a-f]{6}$/i.test(value||''))style.setProperty('--ev-'+map[name],value);}
  for(var item of [['controls','heightPx','control-height'],['controls','radiusPx','control-radius'],['cards','radiusPx','card-radius']]){
   var value=theme[item[0]]?.[item[1]];if(Number.isFinite(value))style.setProperty('--ev-'+item[2],value+'px');
  }
  var radius=theme.icons?.radiusPx;style.setProperty('--ev-icon-radius',(Number.isFinite(radius)?Math.max(0,Math.min(24,radius)):10)+'px');
 }catch(_){}
})();
