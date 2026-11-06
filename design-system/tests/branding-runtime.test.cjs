const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const code=fs.readFileSync(require('node:path').join(__dirname,'../branding.js'),'utf8');
function setup(){
 const origin='https://test.skola.eduvize.cz',images=[],requests=[],events={};
 const image=(source,attributes={})=>{let src=source;const e={dataset:{},handlers:{},hasAttribute:n=>n in attributes,getAttribute:()=>src,get src(){return new URL(src,origin).href},set src(v){src=v},addEventListener(n,f){this.handlers[n]=f},querySelectorAll:()=>[],matches:()=>true};images.push(e);return e;};
 const stock=image('/eduvize-styly/design-system/assets/eduvize-logo-compact.svg'),school=image('https://example.com/school.png',{'data-edu-school-logo':''}),preview=image('blob:preview',{'data-edu-brand-preview':''});
 const document={currentScript:{src:origin+'/eduvize-styly/design-system/branding.js'},readyState:'complete',body:{},querySelectorAll:()=>images,addEventListener(){},hidden:false};
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const window={addEventListener:(n,f)=>events[n]=f,dispatchEvent(){}};
 vm.runInNewContext(code,{window,document,location:{origin,href:origin+'/probe'},URL,localStorage:storage,MutationObserver:class{observe(){}},fetch:async(url)=>{requests.push(url);return{ok:false}},AbortSignal,setInterval(){},CustomEvent:class{}});
 return{origin,stock,school,preview,brand:window.EduvizeBranding,requests,values,events};
}
test('relative uploaded asset replaces standard logo without replacing school or preview',()=>{const e=setup();e.brand.apply({logoUrl:'/api/design-system/branding/assets/'+'a'.repeat(64)});assert.equal(e.stock.src,e.origin+'/api/design-system/branding/assets/'+'a'.repeat(64));assert.equal(e.school.src,'https://example.com/school.png');assert.equal(e.preview.src,'blob:preview');assert.deepEqual(e.requests,[e.origin+'/api/design-system/branding']);});
test('uploaded asset load error falls back to local standard logo',()=>{const e=setup();e.brand.apply({logoUrl:'/api/design-system/branding/assets/'+'a'.repeat(64)});e.stock.handlers.error();assert.equal(e.stock.src,e.brand.defaultSource);});
test('Render and opposite-environment logo URLs are never applied',()=>{const e=setup();for(const logoUrl of ['https://x.onrender.com/logo.png','https://skola.eduvize.cz/logo.png','https://user:pass@example.com/x']){e.brand.apply({logoUrl});assert.equal(e.stock.src,e.brand.defaultSource)}});
test('reset restores standard logo after a previously uploaded image',()=>{const e=setup();e.brand.apply({logoUrl:'/api/design-system/branding/assets/'+'b'.repeat(64)});e.brand.apply({logoUrl:''});assert.equal(e.stock.src,e.brand.defaultSource);});
