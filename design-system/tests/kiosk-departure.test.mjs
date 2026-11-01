import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../configuration-profiles.js',import.meta.url),'utf8');
const start=source.indexOf('function departureFingerprint('),end=source.indexOf('    function state()',start);
assert.ok(start>0&&end>start);
function compare(app,a,b){const scope={adapter:{app},fingerprint:JSON.stringify};vm.runInNewContext(source.slice(start,end)+';this.compare=departureFingerprint;',scope);return scope.compare(a)===scope.compare(b);}
const initial={schemaVersion:1,data:{title:'Škola',pages:[{id:'home',buttons:[{type:'app',target:'news',appUrl:'https://news.example/?url=school'}]}],layoutOrientation:'landscape',layoutStyle:1,layoutBlock:1}};
const automatic=structuredClone(initial);Object.assign(automatic.data,{newsSources:[{name:'Obnovený seznam'}],layoutOrientation:'portrait',layoutStyle:2,layoutBlock:2,previewRevision:5});
assert.equal(compare('kiosk',initial,automatic),true,'automatic source refresh and preview selection must not block departure');
const title=structuredClone(initial);title.data.title='Jiná škola';
assert.equal(compare('kiosk',initial,title),false,'school content changes must remain protected');
const button=structuredClone(initial);button.data.pages[0].buttons[0].appUrl='https://news.example/?url=city';
assert.equal(compare('kiosk',initial,button),false,'choosing a different source for a menu button is a real edit');
assert.equal(compare('news',{values:{url:'https://school.example'}},{values:{url:'https://city.example'}}),false,'other applications keep protection for real changes');
console.log('Departure checks ignore automatic kiosk metadata while protecting school content and button source edits.');
