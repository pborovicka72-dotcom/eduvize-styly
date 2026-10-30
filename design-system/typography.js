/* Czech nonbreaking typography for rendered text. Form values and saved data stay intact. */
(function(root){
  if(root.EduvizeTypography)return;
  const nbsp='\u00a0',months='ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince';
  const numericDate=/(?<![\p{L}\p{N}.])(\d{1,2})\.[ \t\u00a0]*(\d{1,2})\.(?:[ \t\u00a0]*(\d{4}|\d{2})\b)?(?!\d)/gu;
  const namedDate=new RegExp('\\b(\\d{1,2})\\.[ \\t\\u00a0]*('+months+')(?:[ \\t\\u00a0]+(\\d{4})\\b)?','giu');
  const units=new RegExp('\\b\\d{1,2}\\.\\u00a0\\d{1,2}\\.(?:\\u00a0\\d{2,4})?|\\b\\d{1,2}\\.\\u00a0(?:'+months+')(?:\\u00a0\\d{4})?|\\b\\d{4}‑\\d{2}‑\\d{2}|\\b\\d{1,2}:\\d{2}(?::\\d{2})?','giu');
  function format(value){return String(value).split(/(https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi).map((part,index)=>{
    if(index%2)return part;
    let text=part.replace(numericDate,(_,d,m,y)=>d+'.'+nbsp+m+'.'+(y?nbsp+y:''))
      .replace(namedDate,(_,d,m,y)=>d+'.'+nbsp+m+(y?nbsp+y:''))
      .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$1‑$2‑$3');
    for(let i=0;i<2;i++)text=text.replace(/(^|[^\p{L}\p{N}])(\p{L})[ \t]+(?=\S|$)/gu,'$1$2'+nbsp);
    return text.replace(/(\d)[ \t]+(?=%|Kč\b|km\b|cm\b|mm\b|kg\b|°C\b)/g,'$1'+nbsp);
  }).join('');}
  const exclude='script,style,textarea,input,select,option,code,pre,[contenteditable]:not([contenteditable="false"]),[data-edu-typography="off"],.edu-typography-unit';
  function apply(node){
    if(!node||!node.isConnected)return;
    const nodes=[];
    if(node.nodeType===3)nodes.push(node);
    else{const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);}
    for(const text of nodes){
      if(text.parentElement?.closest(exclude))continue;
      const value=format(text.data),matches=Array.from(value.matchAll(units));
      if(!matches.length){if(text.data!==value)text.data=value;continue;}
      const fragment=document.createDocumentFragment();let end=0;
      for(const match of matches){fragment.append(document.createTextNode(value.slice(end,match.index)));const span=document.createElement('span');span.className='edu-typography-unit';span.textContent=match[0];fragment.append(span);end=match.index+match[0].length;}
      fragment.append(document.createTextNode(value.slice(end)));text.replaceWith(fragment);
    }
  }
  function start(){
    const pending=new Set();let queued=false;
    const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')pending.add(record.target);else for(const node of record.addedNodes)pending.add(node);}if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;observer.disconnect();for(const node of pending)apply(node);pending.clear();watch();root.EduvizeFitPanel?.refresh();});}});
    function watch(){observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
    apply(document.body);watch();
  }
  root.EduvizeTypography=Object.freeze({format,apply});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
