/* Shared physical output metrics. Preview iframes provide the native segment viewport. */
(function(root){
 function update(){
  const api=root.EduvizeSegmentProfile;if(!api)return;
  const metrics=api.header(api.resolve(root.innerWidth,root.innerHeight));
  for(const [name,value] of Object.entries(metrics))document.documentElement.style.setProperty('--edu-header-'+name,value+'px');
 }
 update();root.addEventListener('resize',update);
 root.EduvizeOutputHeader=Object.freeze({update});
})(window);
