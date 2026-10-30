import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope={window:{},document:{readyState:'loading',addEventListener(){},createElementNS(){return {attrs:{},setAttribute(k,v){this.attrs[k]=v}}}}};
vm.runInNewContext(fs.readFileSync(new URL('../app-icons.js',import.meta.url),'utf8'),scope);
const icons=scope.window.EduvizeAppIcons;
for(const key of ['kiosk','styles','weather','holidays','transport','documents','wisdom','news']){
 const first=icons.create(key),second=icons.create(key);assert.equal(first.innerHTML,second.innerHTML);assert.equal(first.attrs.viewBox,'0 0 24 24');assert.ok(first.innerHTML.includes('<'));
 const classes=[];const host={classList:{add:x=>classes.push(x)},replaceChildren(svg){this.svg=svg}};icons.mount(host,key);assert.ok(classes.includes('edu-app-icon'));assert.equal(host.svg.innerHTML,icons.paths[key]);
}
const css=fs.readFileSync(new URL('../app-icons.css',import.meta.url),'utf8');assert.ok(css.includes('--ev-icon-radius'));assert.ok(!css.includes('--ev-card-radius'));assert.ok(!css.includes('--ev-control-radius'));
console.log('Canonical application artwork and independent icon radius verified.');
