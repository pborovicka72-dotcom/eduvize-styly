import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function element(){const listeners={},classes=new Set();return {listeners,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},addEventListener:(n,fn)=>listeners[n]=fn,setAttribute(){},replaceChildren(){},after(){},closest(){return null;},contains(){return false;},setCustomValidity(){},dispatchEvent(e){listeners[e.type]?.(e);}};}
const window={},zone=element(),file=element(),form=element(),message=element(),progress=element(),bar=element();file.files=[];file.closest=()=>zone;
const context={window,document:{createElement:element},Event:class{constructor(type){this.type=type;}},URL,location:{href:'https://test.skola.eduvize.cz/'}};
vm.runInNewContext(fs.readFileSync(new URL('../design-system/document-upload.js',import.meta.url),'utf8'),context);
window.EduvizeDocumentUpload.bind({form,file,category:element(),button:element(),progress,bar,message,getToken:()=>null});
let prevented=0;const files=[{name:'test.pdf',size:10},{name:'photo.png',size:20}];
const event={preventDefault(){prevented++;},dataTransfer:{types:['Files'],files}};
zone.listeners.dragover(event);assert.equal(event.dataTransfer.dropEffect,'copy');assert.equal(zone.classList.contains('edu-upload-dragover'),true);
zone.listeners.drop(event);assert.equal(file.files,files);assert.equal(message.textContent,'2 vybraných souborů');assert.equal(zone.classList.contains('edu-upload-dragover'),false);assert.equal(prevented,2);
zone.listeners.drop({preventDefault(){throw Error('Text drag must be untouched');},dataTransfer:{types:['text/plain'],files:[]}});
assert.equal(window.EduvizeDocumentUpload.validate(files[0]),null);
assert.match(window.EduvizeDocumentUpload.validate({name:'bad.exe',size:10}),/Povoleny/);
assert.match(window.EduvizeDocumentUpload.validate({name:'big.pdf',size:101*1024*1024}),/100 MB/);
await form.onsubmit({preventDefault(){}});assert.match(message.textContent,/Přihlaste/);
console.log('File drop selects multiple files through the existing upload flow; validation and explicit submission remain.');
