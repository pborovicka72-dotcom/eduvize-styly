import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../editorial-output.js',import.meta.url),'utf8');
function fit(mode,{overflow=false,long=false}={}){
 let font=40,scheduled;
 const style={removeProperty(){font=40;},setProperty(key,value){if(key==='font-size')font=parseFloat(value);}};
 const content={clientWidth:1920,clientHeight:1600,children:[]};
 const quote={textContent:long?'x'.repeat(250):'Short quote',style,closest:()=>content,clientWidth:1000,
  get scrollHeight(){return overflow?font*50:font*2;},get scrollWidth(){return 200;},getBoundingClientRect:()=>({height:font*2})};
 content.children=[quote];
 const document={readyState:'loading',addEventListener(name,fn){if(name==='DOMContentLoaded')scheduled=fn;},
  querySelector(selector){if(selector==='.edu-wisdom-output .quote')return quote;if(selector==='.edu-wisdom-output .content')return content;return null;}};
 const scope={document,EduvizeOutputModes:{mode:()=>mode},addEventListener(){},getComputedStyle:node=>node===quote?{fontSize:'40px'}:{paddingTop:'0',paddingBottom:'0',rowGap:'0'},requestAnimationFrame:fn=>fn(),
  MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}}};
 scope.window=scope;vm.runInNewContext(source,scope);scheduled();return font;
}
for(const mode of ['nsp','kiosk']){
 test(mode+': short quotation never grows beyond its semantic text role',()=>assert.equal(fit(mode),40));
 test(mode+': long overflowing quotation shrinks to fit',()=>{const size=fit(mode,{overflow:true,long:true});assert.ok(size<40&&size>=12);});
}
test('ordinary web retains its unmodified document font',()=>assert.equal(fit('web'),40));
