import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Central exibe os seis cartões na grade e navegação com nomes únicos',async()=>{
 const dom=new JSDOM(await read('index.html'));const doc=dom.window.document;assert.equal(doc.querySelectorAll('.system-cards>.system-card').length,6);assert.equal(doc.querySelectorAll('[data-nav]').length,7);const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);assert.ok(doc.querySelector('[data-system-card="transplantio"]'));assert.ok(doc.querySelector('[data-system-card="perdas"]'));dom.window.close();
});
function chartStub(){return class Chart{static defaults={font:{}};static register(){}constructor(canvas,config){this.canvas=canvas?.canvas||canvas;this.data=config.data;this.options=config.options;this.config=config;}destroy(){}resize(){}update(){}stop(){}reset(){}};}
async function load(folder,{factory=new IDBFactory(),parse=()=>{}}={}){
 const html=await read(folder+'/index.html'),dom=new JSDOM(html,{url:'https://lucasspgoasis-coder.github.io/sistema-vaz-es/'+folder+'/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,context=dom.getInternalVMContext(),ready=[];
 const add=w.document.addEventListener.bind(w.document);w.document.addEventListener=(name,fn,options)=>name==='DOMContentLoaded'?ready.push(fn):add(name,fn,options);
 w.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this};};w.Chart=chartStub();w.ChartDataLabels={};w.Papa={parse};w.structuredClone=structuredClone;w.indexedDB=factory;w.fetch=()=>{throw Error('Envio de dados inesperado');};w.matchMedia=()=>({matches:false});w.URL.createObjectURL=()=> 'blob:teste';w.URL.revokeObjectURL=()=>{};
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]).runInContext(context);
 for(const file of ['layout.js',...(folder==='sistema-perdas'?['history-core.js','history-report.js','history.js']:[])])new vm.Script(await read(folder+'/'+file)).runInContext(context);
 if(folder==='sistema-perdas')w.LossHistoryReport.build=async()=>({jpeg:new Blob(['jpeg salvo']),pdf:new Blob(['pdf salvo'])});
 for(const fn of ready)await fn(new w.Event('DOMContentLoaded'));await Promise.resolve();
 return {dom,w,context,close:async()=>{if(folder==='sistema-perdas'){await vm.runInContext('Promise.all([...lossFileJobs.values()])',context);vm.runInContext('lossDb?.close()',context);}dom.window.close();}};
}
test('HTML real de Perdas: preencher, salvar, visualizar, analisar e restaurar ao reabrir',async()=>{
 const factory=new IDBFactory(),app=await load('sistema-perdas',{factory}),{w,context}=app,get=id=>w.document.getElementById(id);
 get('cicloProducao').value='12';get('bloco').value='01';for(const id of ['cultura','variedade']){const select=get(id);select.value=[...select.options].find(o=>o.value&&o.value!=='outros').value;}get('totalTransplantado').value='1000';get('totalColhido').value='700';w.recalcularTudo();
 const saved=await w.lossSave(true);await w.lossFiles(saved);w.lossTab('history');assert.equal(get('registroForm').hidden,true);assert.equal(get('lossHistoryList').querySelectorAll('.loss-history-card').length,1);assert.ok(get('lossHistoryList').textContent.includes('300'));
 w.lossTab('analysis');assert.equal(get('lossPanel-analysis').hidden,false);assert.equal(get('lossAnalysisMetrics').querySelectorAll('.kpi').length,4);assert.ok(get('lossAnalysisMetrics').textContent.includes('30'));assert.equal(vm.runInContext('lossCharts.length',context),2);assert.equal(get('lossAnalysisMetrics').querySelectorAll('svg[data-motion-icon]').length,4);await app.close();
 const reopened=await load('sistema-perdas',{factory});assert.equal(reopened.w.document.getElementById('totalTransplantado').value,'1000');assert.equal(reopened.w.document.getElementById('totalColhido').value,'700');reopened.w.lossTab('history');assert.equal(reopened.w.document.querySelectorAll('.loss-history-card').length,1);await reopened.close();
});
test('HTML real de Transplantio: carrega dados, alterna abas e lida com planilhas indisponíveis',async()=>{
 const row={'Data - Transplantio':'17/11/2026',Local:'Bloco 01',Ciclo:'12',Cultura:'Brócolis',Variedade:'Imperial',Bandejas:'10',Mudas:'1000','Total transplantado':'900',Perdas:'100','Hora Início':'07:00','Hora Final':'09:00','Total de Colaboradores':'3'};
 const prod={'Data de Registo':'17/11/2026',Setor:'Bloco 01',Ciclo:'12',Cultura:'Brócolis',Variedade:'Imperial','Qtd Colhida':'700','Total não colhido':'200','Total transplantado':'900','Causas Registadas':'Falha','Perda por Causas':'100'};
 let reads=0;const app=await load('sistema-transplantio',{parse:(url,opts)=>opts.complete({data:[reads++===0?row:prod]})});assert.equal(reads,2);assert.equal(app.w.document.getElementById('kpiTransplantado').textContent,'900');for(const name of ['germinacao','rendimento','producao','transplantio'])assert.doesNotThrow(()=>app.w.switchTab(name));assert.equal(app.w.document.getElementById('tabBtn-transplantio').getAttribute('aria-selected'),'true');assert.equal(app.w.document.querySelector('#loginScreen'),null);await app.close();
 const failed=await load('sistema-transplantio',{parse:(url,opts)=>opts.error()});assert.equal(failed.w.document.getElementById('sheetNotice').hidden,false);assert.ok(failed.w.document.getElementById('sheetNotice').textContent.includes('indisponível'));assert.equal(failed.w.document.getElementById('btnAtualizarDados').disabled,false);await failed.close();
});
