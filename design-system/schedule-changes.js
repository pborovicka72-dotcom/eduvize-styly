/* DOM primitives deliberately share labels and states across schedule views. */
(function(root){
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;n.textContent=text||'';return n;};
 function decorate(node,item){node.classList.add('edu-schedule-change');node.dataset.changeType=['changed','cancelled','added'].includes(item.changeType)?item.changeType:'changed';}
 function badge(item){const n=el('span','edu-change-badge',item.changeLabel||item.title||'Změna výuky');decorate(n,item);return n;}
 function original(item){const o=item.original;if(!o)return null;const lines=[];if(o.title!==item.title&&o.title!==item.subject)lines.push(o.title);if(o.teacher&&(o.teacher!==item.teacher||item.changeType==='cancelled'))lines.push(o.teacher);if(o.room&&(o.room!==item.room||item.changeType==='cancelled'))lines.push('uč. '+o.room);if(!lines.length)return null;const n=el('span','edu-change-original','Původně: '+lines.join(' · '));n.dataset.eduOriginal='';return n;}
 root.EduvizeScheduleChanges=Object.freeze({decorate,badge,original});
})(window);
