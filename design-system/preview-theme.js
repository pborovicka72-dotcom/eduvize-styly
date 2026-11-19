/* A preview's loading cover uses the same active theme as its administration. */
(function(root){
 'use strict';
 if(root.parent===root)return;
 let parentRoot;
 try{if(root.parent.location.origin!==root.location.origin)return;parentRoot=root.parent.document.documentElement;}catch{return;}
 const variables=['--ev-bg','--ev-text','--ev-muted','--ev-surface','--ev-primary','--ev-primary-text','--ev-secondary','--ev-secondary-text','--ev-accent','--ev-border'];
 function apply(){
  const inherited=root.getComputedStyle(parentRoot),style=root.document.documentElement.style;
  for(const variable of variables){const value=inherited.getPropertyValue(variable).trim();if(value)style.setProperty(variable,value);}
 }
 apply();new MutationObserver(apply).observe(parentRoot,{attributes:true,attributeFilter:['style']});
})(window);
