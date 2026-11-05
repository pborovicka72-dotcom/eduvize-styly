/* Sequential multipart uploads bound memory use and retain a result for each file. */
(function(root){
 const accept='.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm',maxSize=100*1024*1024;
 function validate(file){if(!file)return 'Vyberte soubor.';if(!file.size)return 'Soubor je prázdný.';if(file.size>maxSize)return 'Soubor musí mít velikost do 100 MB.';if(!accept.split(',').includes('.'+file.name.split('.').pop().toLowerCase()))return 'Povoleny jsou PDF, obrázky, MP4 a WebM. Word a PowerPoint nejprve exportujte do PDF.';return null;}
 function bind(options){
  const {form,file,category,button,progress,bar,message,getToken,onSuccess,onError}=options;
  form.classList.add('edu-document-upload');file.accept=accept;file.multiple=true;
  category.closest('label')?.classList.add('edu-admin__field');progress.classList.add('edu-upload-progress');message.classList.add('edu-upload-status');
  const results=document.createElement('ul');results.className='edu-upload-results';results.setAttribute('aria-live','polite');progress.after(results);
  let busy=false;
  file.addEventListener('change',()=>{if(busy)return;file.setCustomValidity('');results.replaceChildren();message.textContent=file.files.length?file.files.length+' vybraných souborů':'';progress.hidden=!file.files.length;bar.value=0;});
  function send(selected,token,endpoint,index,total,selectedCategory){return new Promise((resolve,reject)=>{
   const data=new FormData();data.append('file',selected);data.append('category',selectedCategory);data.append('scope',options.scope||'documents');
   const xhr=new XMLHttpRequest();xhr.open('POST',endpoint.href);xhr.setRequestHeader('Authorization','Bearer '+token);xhr.timeout=180000;
   xhr.upload.onprogress=e=>{if(e.lengthComputable){bar.value=Math.round(((index+e.loaded/e.total)/total)*100);message.textContent=(index+1)+'/'+total+' · '+selected.name+' · '+(e.loaded<e.total?'odesílám '+Math.round(e.loaded/e.total*100)+' %':'ukládám do Eduvize…');}};
   xhr.onload=()=>{let value={};try{value=JSON.parse(xhr.responseText);}catch{}if(xhr.status>=200&&xhr.status<300)resolve(value);else{root.EduvizeAdminAuth?.failure(xhr.status,value.detail||'');reject(Error(typeof value.detail==='string'?value.detail:'Chyba serveru '+xhr.status));}};
   xhr.onerror=()=>reject(Error('Přenos se přerušil. Ověřte seznam před dalším nahráním.'));xhr.ontimeout=()=>reject(Error('Časový limit vypršel. Ověřte seznam před dalším nahráním.'));xhr.send(data);
  });}
  form.onsubmit=async event=>{
   event.preventDefault();if(busy)return;busy=true;button.disabled=true;file.disabled=true;category.disabled=true;results.replaceChildren();progress.hidden=false;bar.value=0;
   const selected=[...file.files],selectedCategory=category.value;let success=0,failed=0;
   try{
    await root.EduvizeAdminAuth?.ready;const token=getToken()?.trim();if(!selected.length)throw Error('Vyberte alespoň jeden soubor.');if(selected.length>100)throw Error('Najednou lze nahrát nejvýše 100 souborů.');if(!token)throw Error(root.EduvizeAdminAuth?.need('documents')||'Přihlaste se do Eduvize.');
    const endpoint=new URL(options.endpoint||'/api/admin/documents',location.href);if(token.startsWith('edu_')&&(endpoint.origin!==root.EduvizeAdminAuth?.DOCS||!endpoint.pathname.startsWith('/api/admin/')))throw Error('Nepovolená adresa nahrávání.');
    for(let i=0;i<selected.length;i++){
     const item=selected[i],row=document.createElement('li');results.append(row);
     try{const error=validate(item);if(error)throw Error(error);await send(item,token,endpoint,i,selected.length,selectedCategory);success++;row.textContent=item.name+' · Uloženo do Eduvize';row.dataset.state='saved';}
     catch(e){failed++;row.textContent=item.name+' · '+e.message;row.dataset.state='error';}
    }
    file.value='';bar.value=100;
    if(success)try{await onSuccess?.({uploaded:success,failed});}catch{message.textContent='Soubory jsou uložené, seznam se nepodařilo obnovit.';}
    message.textContent='Uloženo: '+success+' · Neúspěšné: '+failed+'. Podrobnosti jsou uvedené u jednotlivých souborů.';
   }catch(e){message.textContent=e.message;onError?.(e.message);}
   finally{busy=false;button.disabled=false;file.disabled=false;category.disabled=false;}
  };
 }
 root.EduvizeDocumentUpload=Object.freeze({bind,validate,accept,maxSize});
})(window);
