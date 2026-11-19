/* Presentation comes exclusively from the server snapshot; metrics remain shared. */
(function(root){
 let presentation=null;
 function inKiosk(){
  try{return root.parent!==root&&root.parent.location.origin===root.location.origin&&root.parent.document.documentElement.dataset.kioskApp==='kiosk';}
  catch{return false;}
 }
 function resize(){
  if(!presentation)return;
  const {mode,geometry:g,interaction}=presentation,main=document.querySelector('main'),profile=root.EduvizeSegmentProfile;
  const embedded=inKiosk(),displayMode=embedded?'kiosk':mode;
  let width=root.innerWidth,height=root.innerHeight;
  if(!embedded&&mode==='nsp'){
   const size=root.EduvizeNSPLayouts.layouts[g.orientation]?.[g.layoutId]?.[g.segmentId-1];
   if(!size)throw Error('Nepodporovaný segment publikace.');[width,height]=size;
  }else if(!embedded&&mode==='kiosk'){width=g.width;height=g.height;}
  const geo=profile.resolve(width,height),header=profile.header(geo,displayMode),text=profile.text(geo,displayMode),style=main.style;
  style.setProperty('--gallery-vmin',Math.min(width,height)/100+'px');style.setProperty('--gallery-vw',width/100+'px');
  if(mode==='web'||embedded){style.position='';style.width='';style.height='';style.transform='';style.left='';style.top='';}
  else {Object.assign(style,{position:'absolute',left:'50%',top:'50%',width:width+'px',height:height+'px',transform:'translate(-50%,-50%) scale('+Math.min(root.innerWidth/width,root.innerHeight/height)+')',transformOrigin:'center'});}
  for(const [key,value] of Object.entries(header))style.setProperty('--edu-header-'+key,value+'px');
  for(const [key,value] of Object.entries(text))style.setProperty('--edu-text-'+key,value+'px');
  const heading=document.querySelector('.edu-output-header'),title=document.querySelector('.edu-header-title');
  // Match the established preview's shared output-header metrics exactly.
  const inset=(header.height-header.icon)/2;
  for(const name of ['height','min-height','max-height'])heading.style.setProperty(name,header.height+'px','important');
  heading.style.setProperty('padding',header.padding+'px '+inset+'px','important');heading.style.setProperty('gap',inset+'px','important');heading.style.setProperty('flex-shrink','0','important');
  title.style.setProperty('font-size',header.title+'px','important');
  for(let attempt=0;attempt<12&&title.clientWidth&&title.scrollWidth>title.clientWidth+1;attempt++){const size=parseFloat(root.getComputedStyle(title).fontSize);title.style.setProperty('font-size',Math.max(1,size*title.clientWidth/title.scrollWidth-.2)+'px','important');}
  document.documentElement.dataset.kioskHeader=displayMode==='kiosk'&&presentation.kioskLayout==='menu'?'light':'dark';
  document.documentElement.dataset.eduOutputMode=displayMode;document.documentElement.dataset.eduInteraction=interaction;
  document.querySelector('.gallery-controls').hidden=interaction!=='interactive';
 }
 function album(snapshot){
  const scope='/api/public/v1/outputs/'+snapshot.id+'/media/',media=new Map(snapshot.media.map(i=>[i.id,i])),content=snapshot.payload;
  return {id:snapshot.id,published:true,name:content.name,settings:content.settings,items:content.items.map(item=>{
   const asset=media.get(item.mediaId);
   if(!asset||asset.url!==scope+item.mediaId||asset.mime!==item.mime)throw Error('Neplatný publikovaný soubor.');
   return {...item,src:asset.url};
  })};
 }
 root.EduvizeGalleryPublishedView=Object.freeze({album,apply(value){presentation=value;resize();}});
 root.addEventListener('resize',resize);
})(window);
