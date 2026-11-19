/* Serialized, debounced server saving; in-memory edits only, no local drafts. */
(function(root){
 function create({key,initial,save,onState,delay=700}){
  let value=initial,revision=0,saved=0,timer,running=null,listener=onState;
  const state=(text,kind)=>listener?.(text,kind);
  function update(next){value={...next};revision++;state('Neuložené změny…','pending');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),delay);}
  async function flush(){clearTimeout(timer);if(running)return running;running=(async()=>{while(saved<revision){const version=revision,snapshot={...value};state('Ukládám…','pending');try{await save(snapshot);saved=version;if(saved===revision){state('Uloženo automaticky.','success');}}catch(error){state('Neuloženo: '+error.message+' Změny zůstaly rozepsané.','error');throw error;}}})();try{await running;}finally{running=null;}}
  return {value:()=>({...value}),update,flush,dirty:()=>saved<revision,listen(fn){listener=fn;if(saved<revision)state('Neuložené změny.','pending');}};
 }
 root.EduvizeAutoSave=Object.freeze({create});
})(window);
