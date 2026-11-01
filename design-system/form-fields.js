/* Shared URL entry rule, including dynamically inserted controls. */
(function(root){
  if(root.EduvizeURLs)return;
  function normalize(value){
    const text=String(value||'').trim();
    if(!text||/^[a-z][a-z0-9+.-]*:/i.test(text)||/^(?:[/?#]|\.\.?\/)/.test(text))return text.startsWith('//')?'https:'+text:text;
    if(!text.includes('/')&&/\.(?:html?|php|json|pdf|png|svg|jpe?g|webp|mp4)$/i.test(text))return text;
    if(/^[^\s/@]+\.[^\s/]+(?:[/?#][^\s]*)?$/.test(text))return 'https://'+text;
    return text;
  }
  function eligible(field){
    if(!(field instanceof HTMLInputElement)||field.readOnly||field.disabled||field.dataset.eduUrl==='off')return false;
    if(field.type==='url'||field.dataset.eduUrl==='on')return true;
    if(!['text','search'].includes(field.type))return false;
    const key=field.id+' '+field.name;
    const label=field.closest('label');
    const caption=label?Array.from(label.childNodes).filter(node=>node.nodeType===3).map(node=>node.textContent).join(' ').trim():'';
    if(/^(?:URL\b|odkaz(?:\s|$)|adresa webu|webová adresa)/i.test(caption)||/\bURL\b/.test(caption))return true;
    return /(?:url|href|website|webaddress)/i.test(key)||/^https?:\/\//i.test(field.placeholder||'');
  }
  function apply(field,notify=true){
    if(!eligible(field))return;
    const value=normalize(field.value);
    if(value===field.value)return;
    field.value=value;
    if(notify){field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  function all(){document.querySelectorAll('input').forEach(field=>apply(field));}
  document.addEventListener('change',event=>apply(event.target,false),true);
  document.addEventListener('focusout',event=>apply(event.target),true);
  document.addEventListener('input',event=>{if(event.inputType==='insertFromPaste')apply(event.target);},true);
  document.addEventListener('keydown',event=>{if(event.key==='Enter')all();},true);
  document.addEventListener('click',event=>{if(event.target.closest?.('button,input[type=submit],a'))all();},true);
  document.addEventListener('submit',all,true);
  root.EduvizeURLs=Object.freeze({normalize,refresh:all});
})(window);

/* Shared textarea sizing. Loaded once by active-theme.js in every application. */
(function () {
  if (window.EduvizeForms) return;
  const observed = new WeakSet();
  const widths = new WeakMap();
  let queued = false;
  const eligible = field => field.matches('textarea:not([readonly]):not([data-edu-autogrow="off"])');
  function fit(field) {
    if (!eligible(field) || !field.getClientRects().length) return;
    field.dataset.eduAutogrow = 'on';
    field.rows = 1;
    field.style.setProperty('height', '0px', 'important');
    const style = getComputedStyle(field);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    field.style.setProperty('height', Math.ceil(field.scrollHeight + border) + 'px', 'important');
  }
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (widths.get(entry.target) !== entry.contentRect.width) {
        widths.set(entry.target, entry.contentRect.width);
        fit(entry.target);
      }
    }
  });
  function refresh() {
    document.querySelectorAll('textarea').forEach(field => {
      if (!eligible(field)) return;
      if (!observed.has(field)) { observed.add(field); resize.observe(field); }
      fit(field);
    });
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh(); });
  }
  function start() {
    refresh();
    new MutationObserver(schedule).observe(document.documentElement, {childList: true, subtree: true});
    document.addEventListener('input', event => { if (event.target.tagName === 'TEXTAREA') fit(event.target); });
    document.addEventListener('change', schedule);
    document.addEventListener('reset', schedule);
    document.addEventListener('click', schedule);
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
  }
  window.EduvizeForms = Object.freeze({refresh: schedule});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
