import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

test('restoring an NSP profile keeps its saved segment after a web profile', () => {
  const listeners = new Map();
  const storage = new Map();
  const mode = {
    value: 'web',
    addEventListener(name, callback) { listeners.set(name, callback); },
  };
  let selected;
  let outputMode = 'nsp';
  const picker = {
    set(next) { selected = { ...selected, ...next }; },
    get() { return { ...selected }; },
    setMode(next) {
      if (next === outputMode) return;
      outputMode = next;
      if (next === 'nsp') {
        selected = { orientation: 'landscape', style: 1, block: 1 };
        options.onChange({ ...selected });
      }
    },
  };
  let options;
  const window = {
    EduvizeNSPPicker: {
      defaultSelection: { orientation: 'landscape', style: 1, block: 1 },
      mount(_root, value) { options = value; selected = { ...value.initial }; return picker; },
    },
  };
  const sandbox = {
    window,
    EduvizeNSPPicker: window.EduvizeNSPPicker,
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
    },
    location: { search: '' },
    document: {
      createElement() { return { hidden: false }; },
      addEventListener() {},
    },
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
  };
  const source = readFileSync(new URL('../design-system/editorial-admin.js', import.meta.url), 'utf8');
  runInNewContext(source, sandbox);
  const host = { querySelector() { return { before() {} }; }, contains() { return true; } };
  window.EduvizeEditorialAdmin.mount({ mode, url: () => 'https://example.test/', key: 'news', host });

  mode.value = 'nsp';
  window.EduvizeSegmentSelection.set({ orientation: 'landscape', style: 6, block: 3 });
  assert.deepEqual({ ...window.EduvizeSegmentSelection.params() }, { orientation: 'landscape', style: 6, block: 3 });
  assert.deepEqual(JSON.parse(storage.get('news')), { orientation: 'landscape', style: 6, block: 3 });

  mode.value = 'web';
  listeners.get('change')();
  mode.value = 'nsp';
  listeners.get('change')();
  assert.deepEqual({ ...window.EduvizeSegmentSelection.params() }, { orientation: 'landscape', style: 6, block: 3 });
});
