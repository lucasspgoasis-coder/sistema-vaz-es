/* Leituras de planilha recentes em navegadores, celulares e no app instalado. */
(function(){
 const script=document.currentScript,reader=script?.dataset.reader;
 let sequence=0,inFlight=0,lastRead=Date.now(),lastSync=0;
 const sources=new Map();
 const published=value=>/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(String(value));
 function fresh(value){const url=new URL(value);url.searchParams.set('_sync',Date.now()+'-'+(++sequence));return url.href;}
 function sourceKey(value){const url=new URL(value);url.searchParams.delete('_sync');url.searchParams.delete('t');return url.href;}
 function status(){const values=[...sources.values()];return {state:navigator.onLine===false?'offline':inFlight?'pending':values.some(value=>value==='error')?'error':values.length&&values.every(value=>value==='success')?'synced':'waiting',lastSync,pending:inFlight,sources:sources.size};}
 function publish(){try{if(window.parent&&window.parent!==window)window.parent.postMessage({type:'APP_SHEET_STATUS',status:status()},window.location.origin);}catch{}}
 function start(url){const key=sourceKey(url);inFlight++;lastRead=Date.now();sources.set(key,'pending');publish();let done=false;return success=>{if(!done){done=true;inFlight--;sources.set(key,success?'success':'error');if(!inFlight&&[...sources.values()].every(value=>value==='success'))lastSync=Date.now();publish();}};}
 if(typeof window.fetch==='function'){
  const original=window.fetch.bind(window);window.fetch=function(input,options){
   const url=typeof input==='string'||input instanceof URL?String(input):input?.url;
   if(!published(url)||(options?.method||input?.method||'GET').toUpperCase()!=='GET')return original(input,options);
   const finish=start(url),request=typeof input==='string'||input instanceof URL?fresh(url):new Request(fresh(url),input);
   try{return Promise.resolve(original(request,{...options,cache:'no-store'})).then(response=>{
    if(!response.ok){finish(false);return response;}
    if(typeof response.text!=='function'){finish(true);return response;}
    const read=response.text.bind(response);response.text=()=>read().then(text=>{finish(Boolean(text.trim())&&(!/<!doctype|<html/i.test(text)||/<table/i.test(text)));return text;},error=>{finish(false);throw error;});return response;
   },error=>{finish(false);throw error;});}catch(error){finish(false);throw error;}
  };
 }
 if(window.Papa?.parse){
  const original=window.Papa.parse;window.Papa.parse=function(input,options){
   if(!options?.download||!published(input))return original.call(this,input,options);
   const finish=start(input),config={...options,complete(...args){try{const result=options.complete?.(...args);finish(Array.isArray(args[0]?.data)&&!args[0]?.errors?.length);return result;}catch(error){finish(false);throw error;}},error(...args){finish(false);return options.error?.(...args);}};
   try{return original.call(this,fresh(input),config);}catch(error){finish(false);throw error;}
  };
 }
 function visible(){try{return document.visibilityState!=='hidden'&&!window.frameElement?.hidden;}catch{return document.visibilityState!=='hidden';}}
 function refresh(minAge=30000){
  if(!reader||navigator.onLine===false||!visible()||inFlight||Date.now()-lastRead<minAge)return;
  const callback=window[reader];if(typeof callback!=='function')return;lastRead=Date.now();
  try{Promise.resolve(callback(true)).catch(()=>{});}catch{}
 }
 window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
 window.addEventListener('online',()=>{refresh();publish();});
 window.addEventListener('offline',publish);
 window.addEventListener('resize',()=>refresh(120000));
 document.addEventListener('visibilitychange',()=>{if(visible())refresh();});
 setInterval(()=>refresh(120000),120000);
 window.AppSheetSync={fresh,refresh,published,status};
})();
