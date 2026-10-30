/* Shared Documents API uploader. Credentials are supplied by the caller only. */
(function(root){
  const accept='.pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.docx,.pptx';
  const maxSize=20*1024*1024;
  function validate(file){
    if(!file)return 'Vyberte soubor.';
    if(!file.size||file.size>maxSize)return 'Soubor musí mít velikost od 1 B do 20 MB.';
    const ext='.'+file.name.split('.').pop().toLowerCase();
    if(!accept.split(',').includes(ext))return 'Povoleny jsou PDF, obrázky, MP4, WebM, DOCX a PPTX.';
    return null;
  }
  function bind(options){
    const {form,file,category,button,progress,bar,message,getToken,onSuccess,onError}=options;
    form.classList.add('edu-document-upload');file.accept=accept;
    category.closest('label')?.classList.add('edu-admin__field');
    progress.classList.add('edu-upload-progress');message.classList.add('edu-upload-status');
    let busy=false;
    form.onsubmit=event=>{
      event.preventDefault();if(busy)return;
      const selected=file.files[0],error=validate(selected),token=getToken()?.trim();
      const fail=text=>{message.textContent=text;progress.hidden=false;onError?.(text);};
      if(error){fail(error);return;}
      if(!token){fail('Zadejte administrační klíč Dokumentů.');return;}
      const data=new FormData();data.append('file',selected);data.append('category',category.value);data.append('scope',options.scope||'documents');
      const xhr=new XMLHttpRequest();xhr.open('POST',options.endpoint||'/api/admin/documents');
      xhr.setRequestHeader('Authorization','Bearer '+token);
      busy=true;button.disabled=true;progress.hidden=false;bar.value=0;message.textContent='Odesílání souboru: 0 %';
      xhr.timeout=180000;
      const finish=()=>{busy=false;button.disabled=false;};
      xhr.upload.onprogress=event=>{if(event.lengthComputable){bar.value=Math.round(event.loaded/event.total*100);message.textContent=bar.value<100?'Odesílání souboru: '+bar.value+' %':'Ukládám na OneDrive…';}};
      xhr.onload=async()=>{
        finish();let result={};try{result=JSON.parse(xhr.responseText);}catch{}
        if(xhr.status<200||xhr.status>=300){fail(typeof result.detail==='string'?result.detail:'Chyba serveru '+xhr.status);return;}
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
