const CACHE='oasis-vazao-app-20261114-portal-2';
const CORE=['./index.html','./portal.js','./portal.css','./manifest.webmanifest','./icons/gear.svg','./icons/gear-192.png','./icons/gear-512.png','./icons/modules.svg'];
const SYSTEM_FILES=['./vazao.html','./planilhas.js','./maintenance.js','./maintenance.css','./maintenance-history.js','./sistema-adubacao/index.html','./sistema-adubacao/dashboard.js','./sistema-adubacao/dashboard.css','./sistema-rocadeira/index.html','./sistema-rocadeira/assets/js/app.js','./sistema-rocadeira/assets/js/tailwind-config.js','./sistema-rocadeira/assets/js/dashboard.js','./sistema-rocadeira/assets/css/base.css','./sistema-rocadeira/assets/css/dashboard.css','./sistema-rocadeira/assets/js/report.js'];
SYSTEM_FILES.push(...["./sistema-adubacao/logo.svg","./sistema-adubacao/fontawesome/css/all.min.css","./sistema-adubacao/fontawesome/webfonts/fa-solid-900.woff2","./sistema-adubacao/fontawesome/webfonts/fa-regular-400.woff2","./sistema-adubacao/fontawesome/webfonts/fa-brands-400.woff2","./sistema-adubacao/fontawesome/webfonts/fa-v4compatibility.woff2","./sistema-rocadeira/assets/images/logo.png","./sistema-rocadeira/fontawesome/css/all.min.css","./sistema-rocadeira/fontawesome/webfonts/fa-solid-900.woff2","./sistema-rocadeira/fontawesome/webfonts/fa-regular-400.woff2","./sistema-rocadeira/fontawesome/webfonts/fa-brands-400.woff2","./sistema-rocadeira/fontawesome/webfonts/fa-v4compatibility.woff2"]);
const LIBRARIES=['https://cdn.tailwindcss.com','https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js','https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0','https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0','https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE);await Promise.allSettled([...SYSTEM_FILES,...LIBRARIES].map(async url=>{const response=await fetch(new Request(new URL(url,self.registration.scope),{mode:LIBRARIES.includes(url)?'no-cors':'same-origin',signal:AbortSignal.timeout(15000)}));if(response.ok||response.type==='opaque')await cache.put(url,response);}));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('oasis-vazao-app-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
function portalCacheKey(url,scope){const key=new URL(url);key.search='';key.hash='';if(key.pathname.endsWith('/'))key.pathname+='index.html';return key.href;}
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 const local=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname),library=LIBRARIES.includes(event.request.url);
 if(!local&&!library)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate'){
   const key=portalCacheKey(event.request.url,scope);
   try{const response=await fetch(event.request);if(response.ok)await cache.put(key,response.clone());return response;}
   catch{const saved=await cache.match(key);return saved||new Response('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title><body style="font:15px Arial;padding:32px;color:#294e37;background:#f5f7f2"><h2>Sistema indisponível sem conexão</h2><p>Conecte-se para abrir este sistema e consultar a planilha.</p><a href="'+scope.href+'" target="_top">Voltar ao painel de sistemas</a></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});}
  }
  if(local){try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch{return await cache.match(event.request,{ignoreSearch:true})||Response.error();}}
  const saved=await cache.match(event.request);if(saved)return saved;
  try{const response=await fetch(event.request);if(response.ok||response.type==='opaque')await cache.put(event.request,response.clone());return response;}catch{return Response.error();}
 })());
});
