const CACHE='oasis-vazao-app-20261114-1';
const CORE=['./','./index.html','./maintenance.js','./maintenance.css','./maintenance-history.js','./app-access.js','./app-access.css','./manifest.webmanifest','./icons/flow-192.png','./icons/flow-512.png','./icons/flow.svg'];
const LIBRARIES=['https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js','https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0','https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE);await Promise.allSettled(LIBRARIES.map(url=>cache.add(new Request(url,{mode:'no-cors'}))));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('oasis-vazao-app-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 const local=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname),library=LIBRARIES.includes(event.request.url);
 if(!local&&!library)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)await cache.put('./index.html',response.clone());return response;}catch{return await cache.match('./index.html')||Response.error();}}
 if(local){try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch{return await cache.match(event.request,{ignoreSearch:true})||Response.error();}}
 const cached=await cache.match(event.request);if(cached)return cached;
 try{const response=await fetch(event.request);if(response.ok||response.type==='opaque')await cache.put(event.request,response.clone());return response;}catch{return Response.error();}})());
});
