/* Operator contact profile, authorized independently of school accounts. */
(function(root){
 const auth=root.EduvizeAdminAuth,host=document.getElementById('operator-profile');if(!auth||!host)return;
 const field=id=>document.getElementById(id),form=field('operator-profile-form'),status=field('operator-profile-status');let revision=0,generation=0,busy=false;
 const owns=()=>{const s=auth.status();return s.connected&&!s.schoolId&&s.scopes.includes('styles');};
 function controls(disabled){for(const input of form.querySelectorAll('input,button'))input.disabled=disabled;}
 async function load(){const seq=++generation;host.hidden=!owns();if(!owns()){form.reset();status.textContent='';return;}controls(true);status.textContent='Načítám údaje správce…';try{const profile=await auth.operatorProfile();if(seq!==generation||!owns())return;revision=profile.revision;field('operator-name').value=profile.name;field('operator-email').value=profile.email;status.textContent='';controls(false);}catch(e){if(seq===generation)status.textContent=e.message;}}
 form.onsubmit=async event=>{event.preventDefault();if(busy||!owns())return;busy=true;controls(true);status.textContent='Ukládám údaje správce…';try{const result=await auth.operatorProfile({name:field('operator-name').value.trim(),email:field('operator-email').value.trim(),expectedRevision:revision});if(owns()){revision=result.revision;status.textContent='Údaje správce jsou uložené.';}}catch(e){status.textContent=e.message;}finally{busy=false;if(owns())controls(false);}};
 root.addEventListener('eduvize-admin-auth-change',load);auth.ready.then(load);
})(window);
