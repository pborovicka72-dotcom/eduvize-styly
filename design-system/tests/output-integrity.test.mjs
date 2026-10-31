import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const base=new URL('../',import.meta.url);
const document={readyState:'loading',addEventListener(){},documentElement:{dataset:{},classList:{add(){}}}};
const window={location:{href:'https://example.org/display',search:''}};
const scope={window,document,URL,URLSearchParams};
for(const name of ['output-modes.js','segment-profile.js','nsp-geometry.js'])vm.runInNewContext(fs.readFileSync(new URL(name,base),'utf8'),scope);
const modes=window.EduvizeOutputModes,profile=window.EduvizeSegmentProfile;
assert.equal(modes.mode('https://example.org/display?viewMode=web-pages&segment_style=4'),'web');
assert.equal(modes.mode('https://example.org/display?output=kiosk&layout=signage&segment_style=4'),'kiosk');
assert.equal(modes.mode('https://example.org/signage.html'),'nsp');
assert.equal(modes.mode('https://example.org/display?layout=signage'),'nsp');
assert.equal(modes.mode('https://example.org/display'),'web');
const ordinary=modes.url('https://example.org/display?viewMode=kiosk&layout=signage&segment_block=3&paging=on&lat=50','web');
assert.equal(ordinary.searchParams.get('paging'),'off');assert.equal(ordinary.searchParams.get('lat'),'50');assert.equal(ordinary.searchParams.has('segment_block'),false);
let count=0;
for(const styles of Object.values(window.EduvizeNSPLayouts.layouts))for(const rects of Object.values(styles))for(const [w,h]of rects){
 const geometry=profile.resolve(w,h),header=profile.header(geometry),text=profile.text(geometry);
 assert.equal(header.height,Math.min(w,h)*.16);assert.ok(text.body>=16);assert.ok(text.title>text.body);assert.ok(text.value>text.title);assert.equal(profile.header(geometry,'web').height,96);assert.equal(profile.text(geometry,'web').body,18);count++;
}
assert.equal(count,36);
const css=fs.readFileSync(new URL('output-integrity.css',base),'utf8');
assert.ok(css.includes('html.web-output'));assert.ok(css.includes('overflow:visible!important'));assert.ok(css.includes('.pdf-pages'));assert.ok(css.includes('.edu-kiosk-pagination'));
const brand=fs.readFileSync(new URL('web-brand.js',base),'utf8');assert.ok(brand.includes('eduvize-logo-compact-animated.svg'));assert.ok(brand.includes("mode()!=='web'"));
console.log('All 36 shared profiles, output-mode precedence, normal web flow and animated branding passed.');
