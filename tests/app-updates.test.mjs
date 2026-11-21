import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const html=await readFile('index.html','utf8'),source=await readFile('app-updates.js','utf8'),workerSource=await readFile('sw.js','utf8');
async function app({waiting=true}={}){
 const dom=new JSDOM(html,{url:'https://example.com/sistema/#perdas',runScripts:'outside-only'}),w=dom.window,handlers={},messages=[];
 w.setTimeout=()=>1;w.clearTimeout=()=>{};w.setInterval=()=>1;
 const add=w.addEventListener.bind(w);w.addEventListener=(name,fn)=>{if(name!=='load')add(name,fn);};
 const worker={postMessage:data=>messages.push(data),addEventListener:(name,fn)=>handlers['worker'+name]=fn},registration={waiting:waiting?worker:null,installing:null,update:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn};
 const sw={controller:{},register:async()=>registration,addEventListener:(name,fn)=>handlers[name]=fn};Object.defineProperty(w.navigator,'serviceWorker',{value:sw});
 w.eval(source);await w.initializeAppUpdates();return {dom,w,worker,registration,handlers,messages,get:id=>w.document.getElementById(id)};
}
test('Avisa nova versão, permite adiar, reabrir e acompanha progresso real',async()=>{
 const a=await app();try{
 assert.equal(a.get('appUpdateNotice').hidden,false);a.w.dismissAppUpdate();assert.equal(a.get('appUpdateNotice').hidden,true);assert.equal(a.get('appUpdateBadge').hidden,false);
 await a.w.checkAppUpdate(true);assert.equal(a.get('appUpdateNotice').hidden,false);await a.w.applyAppUpdate();assert.equal(a.messages[0].type,'APPLY_APP_UPDATE');assert.equal(a.get('appUpdateNow').disabled,true);
 a.handlers.message({source:a.worker,data:{type:'APP_UPDATE_PROGRESS',completed:5,total:10}});assert.equal(a.get('appUpdateProgress').value,47);assert.ok(a.get('appUpdateStep').textContent.includes('5 de 10'));
 a.handlers.message({source:{},data:{type:'APP_UPDATE_PROGRESS',completed:10,total:10}});assert.equal(a.get('appUpdateProgress').value,47,'Ignora mensagens de outro worker');
 a.handlers.message({source:a.worker,data:{type:'APP_UPDATE_READY'}});assert.equal(a.get('appUpdateProgress').value,98);assert.equal(a.w.sessionStorage.getItem('oasis.app.updating'),'1');
 }finally{a.dom.window.close();}
});
test('Falha permite tentar novamente, offline impede aplicar e primeira instalação não avisa atualização',async()=>{
 const a=await app();try{await a.w.applyAppUpdate();a.handlers.message({source:a.worker,data:{type:'APP_UPDATE_ERROR',message:'Sem conexão'}});assert.equal(a.get('appUpdateNow').disabled,false);assert.equal(a.get('appUpdateNow').textContent,'Tentar novamente');assert.equal(a.w.sessionStorage.getItem('oasis.app.updating'),null);Object.defineProperty(a.w.navigator,'onLine',{value:false});await a.w.applyAppUpdate();assert.equal(a.messages.length,1);assert.ok(a.get('appUpdateStatus').textContent.includes('internet'));}finally{a.dom.window.close();}
 const b=await app({waiting:false});try{assert.equal(b.get('appUpdateNotice').hidden,true);await b.w.checkAppUpdate(true);assert.equal(b.get('appUpdateNow').hidden,true);assert.equal(b.get('appUpdateTitle').textContent,'Aplicativo atualizado');}finally{b.dom.window.close();}
});
async function worker({fail=false}={}){
 const handlers={},messages=[],saved=[],scope='https://example.com/sistema/';let activated=0;
 const cache={addAll:async()=>{},put:async(url)=>saved.push(url)};
 const self={registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{activated++;}};
 const ctx=vm.createContext({self,caches:{open:async()=>cache},URL,Request,Response,AbortSignal,fetch:async request=>new Response('arquivo',{status:fail&&request.url.endsWith('/portal.js')?503:200})});vm.runInContext(workerSource,ctx);
 let job;handlers.install({waitUntil:p=>job=p});await job;assert.equal(activated,0,'Não ativa atualizações automaticamente');
 handlers.message({data:{type:'APPLY_APP_UPDATE'},source:{postMessage:m=>messages.push(m)},waitUntil:p=>job=p});await job;return {messages,saved,activated};
}
test('Worker prepara arquivos, informa contagem real e só ativa quando arquivos locais estão prontos',async()=>{
 const ok=await worker();assert.equal(ok.activated,1);const progress=ok.messages.filter(m=>m.type==='APP_UPDATE_PROGRESS');assert.equal(progress[0].completed,0);assert.equal(progress.at(-1).completed,progress.at(-1).total);assert.equal(ok.messages.at(-1).type,'APP_UPDATE_READY');assert.ok(ok.saved.includes('./app-updates.js'));for(const file of ok.saved.filter(path=>path.startsWith('./')))await access(file);
 const failed=await worker({fail:true});assert.equal(failed.activated,0);assert.equal(failed.messages.at(-1).type,'APP_UPDATE_ERROR');
});

test('Detecta instalação da nova versão e avisa ativação em outra janela sem recarregar à força',async()=>{const a=await app({waiting:false});try{a.registration.installing=a.worker;a.handlers.updatefound();a.worker.state='installed';a.registration.waiting=a.worker;a.handlers.workerstatechange();assert.equal(a.get('appUpdateNotice').hidden,false);a.w.dismissAppUpdate();a.registration.waiting=null;a.handlers.controllerchange();assert.equal(a.get('appUpdateTitle').textContent,'Nova versão pronta');assert.equal(a.get('appUpdateNow').textContent,'Abrir nova versão');assert.equal(a.messages.length,0);}finally{a.dom.window.close();}});
test('Após reabrir, confirmação da atualização apresenta 100%',async()=>{const a=await app({waiting:false});try{a.w.sessionStorage.setItem('oasis.app.updating','1');await a.w.initializeAppUpdates();assert.equal(a.get('appUpdateProgress').value,100);assert.equal(a.get('appUpdateTitle').textContent,'Aplicativo atualizado');assert.equal(a.w.sessionStorage.getItem('oasis.app.updating'),null);}finally{a.dom.window.close();}});
