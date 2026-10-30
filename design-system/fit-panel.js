/* Opt-in, scroll-free information panels. One inner sheet is scaled as a unit. */
(function () {
  if (window.EduvizeFitPanel) return;
  const hosts = new WeakSet();
  let queued = false;
  function fit(host) {
    const sheet = host.firstElementChild;
    if (!sheet || !host.clientWidth || !host.clientHeight) return;
    sheet.style.transformOrigin = 'top left';
    sheet.style.marginLeft = '0px';
    // Keep the visual width equal to the host even when fitting its height.
    function fits(scale) {
      sheet.style.width = host.clientWidth / scale + 'px';
      return sheet.scrollHeight * scale <= host.clientHeight;
    }
    let scale = 1;
    if (!fits(1)) {
      let low = 0.01, high = 1;
      for (let i = 0; i < 14; i++) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle; else high = middle;
      }
      scale = low;
    }
    sheet.style.width = host.clientWidth / scale + 'px';
    sheet.style.transform = 'scale(' + scale + ')';
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
