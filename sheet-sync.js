/* Leituras de planilha recentes em navegadores, celulares e no app instalado. */
(function(){
 const script=document.currentScript,reader=script?.dataset.reader;
 let sequence=0,inFlight=0,lastRead=Date.now();
 const published=value=>/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(String(value));
 function fresh(value){const url=new URL(value);url.searchParams.set('_sync',Date.now()+'-'+(++sequence));return url.href;}
 function start(){inFlight++;lastRead=Date.now();let done=false;return ()=>{if(!done){done=true;inFlight--;}};}
 if(typeof window.fetch==='function'){
  const original=window.fetch.bind(window);window.fetch=function(input,options){
   const url=typeof input==='string'||input instanceof URL?String(input):input?.url;
   if(!published(url)||(options?.method||input?.method||'GET').toUpperCase()!=='GET')return original(input,options);
   const finish=start(),request=typeof input==='string'||input instanceof URL?fresh(url):new Request(fresh(url),input);
   try{return Promise.resolve(original(request,{...options,cache:'no-store'})).finally(finish);}catch(error){finish();throw error;}
  };
 }
 if(window.Papa?.parse){
  const original=window.Papa.parse;window.Papa.parse=function(input,options){
   if(!options?.download||!published(input))return original.call(this,input,options);
   const finish=start(),config={...options,complete(...args){finish();return options.complete?.(...args);},error(...args){finish();return options.error?.(...args);}};
   try{return original.call(this,fresh(input),config);}catch(error){finish();throw error;}
  };
 }
 function visible(){try{return document.visibilityState!=='hidden'&&!window.frameElement?.hidden;}catch{return document.visibilityState!=='hidden';}}
 function refresh(minAge=30000){
  if(!reader||navigator.onLine===false||!visible()||inFlight||Date.now()-lastRead<minAge)return;
  const callback=window[reader];if(typeof callback!=='function')return;lastRead=Date.now();
  try{Promise.resolve(callback(true)).catch(()=>{});}catch{}
 }
 window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
 window.addEventListener('online',()=>refresh());
 window.addEventListener('resize',()=>refresh(120000));
 document.addEventListener('visibilitychange',()=>{if(visible())refresh();});
 setInterval(()=>refresh(120000),120000);
 window.AppSheetSync={fresh,refresh,published};
})();
