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
    new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true});
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
