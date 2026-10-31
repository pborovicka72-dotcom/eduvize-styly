/* Serialized, debounced form saving with a recoverable local draft. */
(function(root){
 function create({key,initial,save,onState,delay=700}){
  let value=initial,revision=0,saved=0,timer,running=null,listener=onState;
  try{const draft=JSON.parse(localStorage.getItem(key)||'null');if(draft){value=draft;revision=1;}}catch{}
  const state=(text,kind)=>listener?.(text,kind);
  function update(next){value={...next};revision++;try{localStorage.setItem(key,JSON.stringify(value));}catch{}state('Neuložené změny…','pending');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),delay);}
  async function flush(){clearTimeout(timer);if(running)return running;running=(async()=>{while(saved<revision){const version=revision,snapshot={...value};state('Ukládám…','pending');try{await save(snapshot);saved=version;if(saved===revision){try{localStorage.removeItem(key);}catch{}state('Uloženo automaticky.','success');}}catch(error){state('Neuloženo: '+error.message+' Změny zůstaly rozepsané.','error');throw error;}}})();try{await running;}finally{running=null;}}
  return {value:()=>({...value}),update,flush,dirty:()=>saved<revision,listen(fn){listener=fn;if(saved<revision)state('Obnovené neuložené změny.','pending');}};
 }
 root.EduvizeAutoSave=Object.freeze({create});
})(window);
