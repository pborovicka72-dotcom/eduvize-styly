import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../design-system/configuration-profiles.js', import.meta.url), 'utf8');
const body = source.match(/function dirty\(\)\{([\s\S]*?)\n    \}\n    if\(adapter\.app==='documents'\)/)?.[1];
assert.ok(body, 'actual dirty() function found');

function dirtyFor(app, saved, visible, userChanged = false, segmentEdited = false) {
  const fingerprint = value => JSON.stringify(value);
  const make = new Function('baseline', 'userChanged', 'segmentEdited', 'adapter', 'fingerprint', `return function dirty(){${body}}`);
  return make(fingerprint(saved), userChanged, segmentEdited, { app, read: () => visible }, fingerprint)();
}

test('copy recognizes a selected segment across applications without a button event', () => {
  const saved = { values: { viewMode: 'nsp' }, segment: { orientation: 'landscape', style: 6, block: 2 } };
  const selected = { ...saved, segment: { orientation: 'landscape', style: 6, block: 3 } };
  assert.equal(dirtyFor('news', saved, selected), true);
  assert.equal(dirtyFor('news', saved, saved), false);
  assert.equal(dirtyFor('weather', saved, selected), true);
  assert.equal(dirtyFor('documents', saved, selected), false);
  assert.equal(dirtyFor('documents', saved, selected, true, true), true);
});
