/* Shared Documents API uploader. Credentials are supplied by the caller only. */
(function(root){
  const accept='.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm';
  const maxSize=100*1024*1024;
  function validate(file){
    if(!file)return 'Vyberte soubor.';
    if(!file.size)return 'Soubor je prázdný. Vyberte neprázdný soubor.';
    if(file.size>maxSize)return 'Soubor musí mít velikost do 100 MB.';
    const ext='.'+file.name.split('.').pop().toLowerCase();
    if(!accept.split(',').includes(ext))return 'Povoleny jsou PDF, obrázky, MP4 a WebM. Word a PowerPoint nejprve exportujte do PDF.';
    return null;
  }
  function bind(options){
    const {form,file,category,button,progress,bar,message,getToken,onSuccess,onError}=options;
    form.classList.add('edu-document-upload');file.accept=accept;
    category.closest('label')?.classList.add('edu-admin__field');
    progress.classList.add('edu-upload-progress');message.classList.add('edu-upload-status');
    let busy=false;
    const showValidation=()=>{
      if(busy)return;
      const error=file.files[0]?validate(file.files[0]):null;
      file.setCustomValidity(error||'');
      if(error){bar.value=0;message.textContent=error;progress.hidden=false;}
      else {message.textContent='';progress.hidden=true;}
    };
    file.addEventListener('change',showValidation);
    form.onsubmit=async event=>{
      event.preventDefault();if(busy)return;busy=true;await root.EduvizeAdminAuth?.ready;
      const selected=file.files[0],error=validate(selected),token=getToken()?.trim();
      const fail=text=>{busy=false;message.textContent=text;progress.hidden=false;onError?.(text);};
      if(error){fail(error);return;}
      if(!token){fail(root.EduvizeAdminAuth?.need('documents')||'Přihlaste se na rozcestníku Eduvize.');return;}
      const data=new FormData();data.append('file',selected);data.append('category',category.value);data.append('scope',options.scope||'documents');
      const endpoint=new URL(options.endpoint||'/api/admin/documents',location.href);
      if(token.startsWith('edu_')&&(endpoint.origin!==root.EduvizeAdminAuth?.DOCS||!endpoint.pathname.startsWith('/api/admin/'))){fail('Nepovolená adresa pro nahrání dokumentu.');return;}
      const xhr=new XMLHttpRequest();xhr.open('POST',endpoint.href);
      xhr.setRequestHeader('Authorization','Bearer '+token);
      busy=true;button.disabled=true;progress.hidden=false;bar.value=0;message.textContent='Odesílání souboru: 0 %';
      xhr.timeout=180000;
      const finish=()=>{busy=false;button.disabled=false;};
      xhr.upload.onprogress=event=>{if(event.lengthComputable){bar.value=Math.round(event.loaded/event.total*100);message.textContent=bar.value<100?'Odesílání souboru: '+bar.value+' %':'Ukládám na OneDrive…';}};
      xhr.onload=async()=>{
        finish();let result={};try{result=JSON.parse(xhr.responseText);}catch{}
        if(xhr.status<200||xhr.status>=300){root.EduvizeAdminAuth?.failure(xhr.status,result.detail||'');fail(typeof result.detail==='string'?result.detail:'Chyba serveru '+xhr.status);return;}
        bar.value=100;file.value='';message.textContent='Dokument uložen na OneDrive.';
        try{await onSuccess?.(result);}catch{message.textContent='Dokument je uložen, ale seznam se nepodařilo obnovit.';}
      };
      xhr.onerror=()=>{finish();fail('Chyba připojení při nahrávání souboru.');};
      xhr.ontimeout=()=>{finish();fail('Nahrávání překročilo časový limit.');};
      xhr.send(data);
    };
  }
  root.EduvizeDocumentUpload=Object.freeze({bind,validate,accept,maxSize});
})(window);
