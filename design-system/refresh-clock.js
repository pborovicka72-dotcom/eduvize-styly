/* Only slow periodic callbacks are configurable; clocks and page rotation keep their cadence. */
(function(root){
 if(root.EduvizeRefreshClock)return;
 const start=root.setInterval.bind(root),stop=root.clearInterval.bind(root),timers=new Map();
 let seconds=null,lastTriggered=null;
 function emit(){const detail=status();root.dispatchEvent(new CustomEvent('eduvize-refresh-state',{detail}));if(root.parent!==root)root.parent.postMessage({type:'eduvize-refresh-state',...detail},'*');}
 function status(){const due=[...timers.values()].map(t=>t.next).filter(Boolean);return {seconds,scheduled:due.length>0,nextRun:due.length?new Date(Math.min(...due)).toISOString():null,lastTriggered};}
 function arm(t){if(t.actual)stop(t.actual);t.actual=null;t.next=null;if(seconds===0)return;
  const delay=seconds===null?t.original:seconds*1000;
  t.next=Date.now()+delay;t.actual=start(()=>{lastTriggered=new Date().toISOString();t.next=Date.now()+delay;emit();t.callback(...t.args);},delay);
 }
 root.setInterval=function(callback,delay,...args){
  if(typeof callback!=='function'||Number(delay)<30000||/^(updateClock|clock|fit|render)$/i.test(callback.name||'')||/pageIndex|pageSeconds|nextPage|previousPage|currentPage|rotate|pagination|slideIndex/i.test(String(callback)))return start(callback,delay,...args);
  const t={callback,args,original:Number(delay),actual:null,next:null};arm(t);
  // Keep a stable handle even after changing the underlying native interval.
  const handle=t.actual||start(()=>{},2147483647);if(!t.actual)stop(handle);timers.set(handle,t);emit();return handle;
 };
 root.clearInterval=function(handle){const t=timers.get(handle);if(t){if(t.actual)stop(t.actual);timers.delete(handle);emit();}else stop(handle);};
 function configure(value){if(value!==null&&(!Number.isInteger(value)||![0,30,60,120,300,600,900,1800,3600].includes(value)))throw Error('Neplatný interval');if(value===seconds)return;seconds=value;for(const t of timers.values())arm(t);emit();}
 root.EduvizeRefreshClock=Object.freeze({configure,status,nativeInterval:start});
 const script=document.createElement('script');script.src='https://pborovicka72-dotcom.github.io/eduvize-styly/design-system/update-runtime.js?v=20261103-1';script.async=true;document.head.append(script);
})(window);
