/* Shared calendar preferences; output URLs contain no account credentials. */
(function(root){
 const categories=Object.freeze({school:'Školní rok a prázdniny',admissions:'Přijímací řízení',maturita:'Maturity',holiday:'Svátky',significant:'Významné dny',nameday:'Jmeniny'});
 const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!isNaN(new Date(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 function normalize(v={}){return {view:['rolling','month','agenda'].includes(v.view)?v.view:'rolling',from:date(v.from)?v.from:'',type:['ZS','SS','KON','ZUS','MS','VOS'].includes(v.type)?v.type:'',district:typeof v.district==='string'?v.district.slice(0,100):'',schoolName:typeof v.schoolName==='string'?v.schoolName.slice(0,200):'',categories:Array.isArray(v.categories)?Object.keys(categories).filter(k=>v.categories.includes(k)):Object.keys(categories),viewMode:['web','kiosk','nsp'].includes(v.viewMode)?v.viewMode:'web'};}
 function read(p){return normalize({...Object.fromEntries(p),categories:p.has('categories')?p.get('categories').split(','):undefined});}
 function url(settings,base){const u=new URL(base);for(const [k,v]of Object.entries(normalize(settings))){if(v==='')u.searchParams.delete(k);else u.searchParams.set(k,Array.isArray(v)?v.join(','):v);}u.searchParams.delete('edu-profile');u.searchParams.delete('display');return u;}
 root.EduvizeCalendarSettings=Object.freeze({categories,normalize,read,url,date});
})(typeof window==='undefined'?globalThis:window);
