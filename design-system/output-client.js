/* Shared output API v1. No browser profile/storage lookup and no implicit publication. */
(function(root){'use strict';
 const id=/^[a-f0-9]{32}$/,origins=['https://test.skola.eduvize.cz','https://skola.eduvize.cz'];
 class OutputError extends Error{constructor(status,code,message,requestId){super(message);this.name='OutputError';Object.assign(this,{status,code,requestId});}}
 function create(options={}){
  const origin=options.origin||root.location.origin,fetcher=options.fetch||root.fetch.bind(root);
  if(!origins.includes(origin))throw new TypeError('Explicit Eduvize origin required');
  const checkId=value=>{if(!id.test(value||''))throw new TypeError('Invalid output ID');return value;};
  async function request(path,method='GET',body,key,privateRequest=true,contentOptions={}){
   const headers={Accept:'application/json'};
   if(privateRequest){const auth=await options.getAuthorization?.();if(!auth||!auth.startsWith('Bearer '))throw new OutputError(401,'UNAUTHORIZED','Přihlaste se ke škole.');headers.Authorization=auth;}
   if(body!==undefined){if(!key||!/^[a-f0-9-]{32,36}$/i.test(key))throw new TypeError('Persist an operation key before mutation');headers['Content-Type']='application/json';headers['Idempotency-Key']=key;}
   const abort=new AbortController(),parentAbort=()=>abort.abort(),signals=[options.signal,contentOptions.signal].filter(Boolean);
   for(const signal of signals){if(signal.aborted)abort.abort();else signal.addEventListener('abort',parentAbort,{once:true});}
   const timer=root.setTimeout(()=>abort.abort(),12000);
   let response,value;
   try{response=await fetcher(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:privateRequest?'omit':'same-origin',cache:'no-store',redirect:'error',signal:abort.signal});
    if(contentOptions.bitmap&&response.ok){
     const mime=response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase(),length=Number(response.headers.get('Content-Length'));
     if(!['image/jpeg','image/png','image/webp'].includes(mime)||length>8388608)throw new OutputError(502,'INVALID_RESPONSE','Server vrátil neplatný obrázek.');
     value=await response.blob();
     if(!value.size||value.size>8388608||value.type!==mime)throw new OutputError(502,'INVALID_RESPONSE','Server vrátil neplatný obrázek.');
    }else{
     try{value=await response.json();}
     catch(error){if(response.ok)throw error;value={};}
    }
    if(abort.signal.aborted)throw new OutputError(408,'REQUEST_ABORTED','Požadavek byl zrušen.');
   }
   finally{root.clearTimeout(timer);for(const signal of signals)signal.removeEventListener('abort',parentAbort);}

   if(!response.ok)throw new OutputError(response.status,value?.error?.code||'HTTP_ERROR',value?.error?.message||'Požadavek se nezdařil.',value?.error?.requestId);
   if(value.url){const u=new URL(value.url);if(u.origin!==origin||!/^\/o\/[a-f0-9]{32}$/.test(u.pathname)||u.search||u.hash)throw new OutputError(502,'INVALID_RESPONSE','Server vrátil neplatný odkaz.');}
   return value;
  }
  return Object.freeze({
   listOutputs:({appId,profileId,assemblyId,after,limit=50})=>request('/api/v1/outputs?'+new URLSearchParams({appId,profileId,...(assemblyId?{assemblyId}:{}),...(after?{after}:{}),limit})),
   listAssemblies:({appId,profileId,after,limit=50})=>request('/api/v1/output-assemblies?'+new URLSearchParams({appId,profileId,...(after?{after}:{}),limit})),
   newOperation:()=>root.crypto.randomUUID(),
   createAssembly:(body,key)=>request('/api/v1/output-assemblies','POST',body,key),
   createOutput:(body,key)=>request('/api/v1/outputs','POST',body,key),
   getOutput:outputId=>request('/api/v1/outputs/'+checkId(outputId)),
   saveDraft:(outputId,body,key)=>request('/api/v1/outputs/'+checkId(outputId)+'/draft','PUT',body,key),
   publishOutput:(outputId,body,key)=>request('/api/v1/outputs/'+checkId(outputId)+'/publish','POST',body,key),
   revokeOutput:(outputId,body,key)=>request('/api/v1/outputs/'+checkId(outputId)+'/revoke','POST',body,key),
   getOutputLink:outputId=>request('/api/v1/outputs/'+checkId(outputId)+'/link'),
   getPublicItem:(outputId,itemKey,contentOptions={})=>request('/api/public/v1/outputs/'+checkId(outputId)+'/items/'+checkId(itemKey),'GET',undefined,undefined,false,contentOptions),
   getPublicItemImage:(outputId,itemKey,contentOptions={})=>request('/api/public/v1/outputs/'+checkId(outputId)+'/items/'+checkId(itemKey)+'/image','GET',undefined,undefined,false,{...contentOptions,bitmap:true}),
   getPublicTheme:outputId=>request('/api/public/v1/outputs/'+checkId(outputId)+'/theme','GET',undefined,undefined,false),
   getPublicData:outputId=>request('/api/public/v1/outputs/'+checkId(outputId)+'/data','GET',undefined,undefined,false),
   getPublicOutput:outputId=>request('/api/public/v1/outputs/'+checkId(outputId),'GET',undefined,undefined,false)
  });
 }
 root.EduvizeOutputClient=Object.freeze({create,OutputError,schemaVersion:1});
})(typeof window==='undefined'?globalThis:window);
