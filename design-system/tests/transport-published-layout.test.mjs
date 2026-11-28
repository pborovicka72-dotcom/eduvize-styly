import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../transport-layout.js', import.meta.url), 'utf8');
const variables = new Map();
const body = {
  style: { setProperty(name, value) { variables.set(name, value); } },
  dataset: {},
  querySelector() { return null; },
};
const root = {
  innerWidth: 3840,
  innerHeight: 2160,
  document: { documentElement: { dataset: { outputMode: 'kiosk' } } },
  EduvizeSegmentProfile: {
    resolve(width, height) { return { width, height, short: Math.min(width, height) }; },
    text(_geometry, mode) { assert.equal(mode, 'kiosk'); return { body: 40 }; },
  },
};
vm.runInNewContext(source, { window: root });
root.EduvizeTransportLayout.apply(body, {}, 3840, 2160);
assert.equal(variables.get('--transport-text'), '40px');
root.document.documentElement.dataset.outputMode = 'nsp';
root.EduvizeTransportLayout.apply(body, {}, 3840, 2160);
assert(Math.abs(parseFloat(variables.get('--transport-text')) - 73.44) < 0.001);
