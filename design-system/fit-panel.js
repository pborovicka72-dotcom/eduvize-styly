/* Opt-in, scroll-free information panels. One inner sheet is scaled as a unit. */
(function () {
  if (window.EduvizeFitPanel) return;
  const hosts = new WeakSet();
  let queued = false;
  function fit(host) {
    const sheet = host.firstElementChild;
    if (!sheet || !host.clientWidth || !host.clientHeight) return;
    const width = Math.max(640, host.clientWidth);
    sheet.style.width = width + 'px';
    sheet.style.transformOrigin = 'top left';
    const scale = Math.min(1, host.clientWidth / width, host.clientHeight / sheet.scrollHeight);
    sheet.style.transform = 'scale(' + scale + ')';
    sheet.style.marginLeft = Math.max(0, (host.clientWidth - width * scale) / 2) + 'px';
    host.style.overflow = 'hidden';
  }
  const resize = new ResizeObserver(() => schedule());
  function refresh() {
    document.querySelectorAll('[data-edu-fit]').forEach(host => {
      if (!hosts.has(host)) {hosts.add(host); resize.observe(host);}
      fit(host);
    });
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {queued = false; refresh();});
  }
  function start() {
    refresh();
    new MutationObserver(schedule).observe(document, {subtree:true,childList:true,characterData:true});
    document.addEventListener('load', schedule, true);
    document.fonts?.ready.then(schedule);
  }
  window.EduvizeFitPanel = Object.freeze({refresh:schedule});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
