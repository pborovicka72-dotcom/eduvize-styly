/* Administration navigation uses the current tab, including dynamically added links. */
(function(){
 function normalize(){document.querySelectorAll('a[href]:not([download]),form').forEach(element=>{if(element.target&&element.target!=='_self')element.target='_self';});document.querySelectorAll('base[target]').forEach(element=>element.target='_self');}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalize,{once:true});else normalize();
 new MutationObserver(normalize).observe(document.documentElement,{childList:true,subtree:true});
})();