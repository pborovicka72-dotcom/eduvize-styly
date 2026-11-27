import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./editorial-output.js', import.meta.url), 'utf8');
const document = { readyState: 'loading', addEventListener() {}, documentElement: { dataset: { outputMode: 'kiosk' } } };
const root = { innerHeight: 2160, innerWidth: 3840, EduvizeSegmentProfile: { resolve(width, height) { return { width, height }; }, text(_geometry, mode) { assert.equal(mode, 'kiosk'); return { body: 40 }; } } };
vm.runInNewContext(source, { window: root, document });
const kiosk = root.EduvizeNewsLayout.resolve(3840, 2160, { signage: true, images: true, count: 6 });
assert.equal(kiosk.font, 40);
document.documentElement.dataset.outputMode = 'nsp';
const nsp = root.EduvizeNewsLayout.resolve(3840, 2160, { signage: true, images: true, count: 6 });
assert(nsp.font > kiosk.font);
document.documentElement.dataset.outputMode = 'web';
assert.equal(root.EduvizeNewsLayout.resolve(1000, 800, { signage: false, count: 2 }).font, 16);
