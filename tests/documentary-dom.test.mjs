import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
function file(name,color){const c=createCanvas(500,350),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,500,350);return new File([c.toBuffer('image/png')],name,{type:'image/png'});}
async function load(factory=new IDBFactory()){
 const dom=new JSDOM(await read('documentario/index.html'),{url:'https://lucasspgoasis-coder.github.io/sistema-vaz-es/documentario/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,context=dom.getInternalVMContext(),ready=[],workers=[],canvases=new WeakMap();
 const add=w.document.addEventListener.bind(w.document);w.document.addEventListener=(event,fn,options)=>event==='DOMContentLoaded'?ready.push(fn):add(event,fn,options);
 w.indexedDB=factory;w.structuredClone=structuredClone;Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.fetch=()=>{throw Error('Não deve enviar fotos para um servidor.');};w.matchMedia=()=>({matches:false});let url=0;w.URL.createObjectURL=()=>'blob:teste-'+(++url);w.URL.revokeObjectURL=()=>{};
 w.createImageBitmap=async blob=>loadImage(Buffer.from(await blob.arrayBuffer()));w.HTMLCanvasElement.prototype.getContext=function(){if(!canvases.has(this))canvases.set(this,createCanvas(this.width,this.height));return canvases.get(this).getContext('2d');};w.HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){canvases.get(this).encode('jpeg',Math.round(quality*100)).then(bytes=>callback(new Blob([bytes],{type})));};
 w.Worker=class{constructor(){this.requests=[];workers.push(this);}postMessage(message){this.requests.push(message);}terminate(){this.closed=true;}};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 for(const filename of ['core.js','analysis-rules.js','report.js','app.js'])new vm.Script(await read('documentario/'+filename)).runInContext(context);for(const fn of ready)await fn();
 return {dom,w,workers,context,get:id=>w.document.getElementById(id),close:async()=>{await w.PhotoDocApp.flush();w.PhotoDocApp.close();dom.window.close();}};
}
test('HTML real: agrupa três fotos, ordena nomes, preserva revisão contra IA e restaura histórico',async()=>{
 const factory=new IDBFactory(),app=await load(factory),{w,get}=app;get('docBlock').value='2';get('docCause').value='Falha de desenvolvimento';get('docDate').value='2026-11-17';const files=[file('Foto C.png','#16835e'),file('Foto A.png','#8964a6'),file('Foto B.png','#bd764a')];await w.PhotoDocApp.addFiles(files);
 assert.equal(w.PhotoDocApp.state().entries.length,1);assert.equal(w.PhotoDocApp.state().current.photos.length,3);assert.deepEqual([...get('docDraftPhotos').querySelectorAll('h4')].map(n=>n.textContent),['Foto A.png','Foto B.png','Foto C.png']);assert.equal(app.workers.length,1);assert.equal(app.workers[0].requests.length,3);
 const photo=w.PhotoDocApp.state().current.photos.find(p=>p.name==='Foto A.png'),card=[...get('docDraftPhotos').querySelectorAll('article')].find(n=>n.dataset.photoId===photo.id),textarea=card.querySelector('textarea');textarea.value='Descrição revisada no campo, sem confirmar agente pela foto.';textarea.dispatchEvent(new w.Event('input',{bubbles:true}));const check=card.querySelector('input');check.checked=true;check.dispatchEvent(new w.Event('change',{bubbles:true}));
 const job=w.PhotoDocApp.state().pending.find(j=>j.photoId===photo.id);app.workers[0].onmessage({data:{type:'result',requestId:job.requestId,analysis:{status:'complete',text:'Sugestão visual de teste.',at:new Date().toISOString(),reviewRequired:true}}});await w.PhotoDocApp.flush();await w.PhotoDocApp.persist();assert.equal(w.PhotoDocApp.state().current.photos.find(p=>p.id===photo.id).description,textarea.value);assert.equal(w.PhotoDocApp.state().current.photos.find(p=>p.id===photo.id).reviewed,true);
 await w.PhotoDocApp.tab('history');assert.equal(get('docPanel-register').hidden,true);assert.equal(get('docHistory').querySelectorAll('article').length,1);assert.equal(get('docHistory').querySelectorAll('img').length,3);assert.ok(get('docHistory').textContent.includes('Bloco 02'));await app.close();
 const reopened=await load(factory);assert.equal(reopened.get('docCause').value,'Falha de desenvolvimento');assert.equal(reopened.w.PhotoDocApp.state().current.photos.length,3);const restored=reopened.w.PhotoDocApp.state().current.photos.find(p=>p.name==='Foto A.png');assert.equal(restored.reviewed,true);assert.equal(restored.description,'Descrição revisada no campo, sem confirmar agente pela foto.');assert.deepEqual(Buffer.from(await restored.original.arrayBuffer()),Buffer.from(await files[1].arrayBuffer()));await reopened.close();
});
test('Novo registro conserva o anterior; histórico filtra e ordena blocos sem duplicar foto idêntica',async()=>{
 const app=await load(),{w,get}=app;get('docAutoAnalyze').checked=false;get('docBlock').value='10';get('docCause').value='Zebra';const first=file('Primeira.png','#2563a6');await w.PhotoDocApp.addFiles([first,first]);assert.equal(w.PhotoDocApp.state().current.photos.length,1);await w.PhotoDocApp.newRecord();get('docBlock').value='2';get('docCause').value='Ácaros';await w.PhotoDocApp.addFiles([file('Segunda.png','#16835e')]);await w.PhotoDocApp.tab('history');assert.equal(get('docHistory').querySelectorAll('article').length,2);assert.deepEqual([...get('docHistory').querySelectorAll('h3')].map(n=>n.textContent),['Bloco 02','Bloco 10']);get('docSearch').value='acaros';get('docSearch').dispatchEvent(new w.Event('input'));assert.equal(get('docHistory').querySelectorAll('article').length,1);assert.ok(get('docHistory').textContent.includes('Ácaros'));await app.close();
});
test('Rejeita arquivo que não é foto sem criar evidência ou análise fictícia',async()=>{
 const app=await load();app.get('docBlock').value='01';app.get('docCause').value='Teste';await app.w.PhotoDocApp.addFiles([new File(['texto'],'falsa.jpg',{type:'text/plain'})]);assert.equal(app.w.PhotoDocApp.state().current.photos.length,0);assert.equal(app.workers.length,0);assert.ok(app.get('docSaveStatus').textContent.includes('JPEG'));await app.close();
});
test('Sexto módulo, worker e arquivos de relatório estão no cache, sem pré-baixar o modelo de IA',async()=>{
 const html=await read('index.html'),sw=await read('sw.js'),portal=await read('portal.js');assert.ok(html.includes('data-system-card="documentario"'));assert.ok(portal.includes("url:'documentario/index.html'"));for(const file of ['index.html','documentario.css','core.js','app.js','report.js','analysis-rules.js','analysis-worker.js'])assert.ok(sw.includes('./documentario/'+file));assert.ok(sw.includes('OPTIONAL_LIBRARY_PREFIXES'));const worker=await read('documentario/analysis-worker.js');assert.ok(worker.includes('/dist/transformers.min.js'));assert.ok(worker.includes('RawImage.fromBlob(image)'));assert.equal(worker.includes('api.openai.com'),false);assert.equal(worker.includes('fetch('),false);
});
