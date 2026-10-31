/* One segment viewport for every app. No template dimensions are duplicated here. */
(function(root){
 'use strict';
 const p=new URLSearchParams(location.search);
 if(root.EduvizeOutputModes.mode()!=='nsp'||p.get('ev_inner')==='1')return;
 if(!['segment_style','segment_block','orientation','style','block'].some(key=>p.has(key)))return;
 const orientation=p.get('segment_orientation')||p.get('orientation')||'landscape';
 const style=Number(p.get('segment_style')||p.get('style')||(p.get('layout')!=='signage'?p.get('layout'):1)||1);
 const block=Number(p.get('segment_block')||p.get('block')||1);
 const rect=root.EduvizeNSPLayouts.layouts[orientation]?.[style]?.[block-1];if(!rect)return;
 const host=document.createElement('div');host.id='edu-segment-host';
 const frame=document.createElement('iframe'),u=new URL(location.href);u.searchParams.set('ev_inner','1');u.searchParams.set('segment_orientation',orientation);u.searchParams.set('segment_style',style);u.searchParams.set('segment_block',block);
 frame.src=u.href;frame.title='Eduvize – vybraný segment';frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;frame.style.width=rect[0]+'px';frame.style.height=rect[1]+'px';
 host.append(frame);document.body.classList.add('edu-segment-wrapper');document.body.append(host);
 function fit(){const scale=Math.min(innerWidth/rect[0],innerHeight/rect[1]);frame.style.transform='translate(-50%,-50%) scale('+scale+')';}
 root.addEventListener('resize',fit);fit();
})(window);
