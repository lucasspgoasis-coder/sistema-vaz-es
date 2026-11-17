import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('Módulo cresce e encolhe com o conteúdo sem altura fixa de janela',async()=>{
 let height=1400,callback,disconnected=0;const classes=[];
 const frame={style:{},hidden:false,contentDocument:{body:{getBoundingClientRect:()=>({height})},documentElement:{classList:{add:name=>classes.push(name)}}},contentWindow:{ResizeObserver:class{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected++;}}}};
 const context=vm.createContext({window:{addEventListener(){}},document:{},localStorage:{}});vm.runInContext(await read('portal.js'),context);context.portalObserveFrame(frame);assert.equal(frame.style.height,'1402px');assert.ok(classes.includes('portal-embedded'));height=700;callback();assert.equal(frame.style.height,'702px');frame.hidden=true;height=0;callback();assert.equal(frame.style.height,'702px');frame.hidden=false;height=1900;context.portalObserveFrame(frame);assert.equal(frame.style.height,'1902px');assert.equal(disconnected,1);
});
test('Tabelas recebem nomes das colunas ao virar cartões',async()=>{
 const headers=['Poço','Vazão'];const cells=headers.map(()=>({tagName:'TD',dataset:{},hasAttribute:()=>false}));
 const table={querySelectorAll:query=>query.startsWith('thead')?headers.map(textContent=>({textContent})):[{children:cells}]};let plugin;
 const Chart={defaults:{font:{}},register:value=>plugin=value};
 const context=vm.createContext({document:{querySelectorAll:()=>[table]},Chart});vm.runInContext(await read('layout.js'),context);assert.equal(cells[0].dataset.column,'Poço');assert.equal(cells[1].dataset.column,'Vazão');assert.equal(plugin.id,'fluidAppTheme');
});
test('Todos os módulos incluem os recursos de layout na página e no cache',async()=>{
 const sw=await read('sw.js');for(const folder of ['','sistema-adubacao/','sistema-rocadeira/']){const page=await read(folder+(folder?'index.html':'vazao.html'));assert.ok(page.includes('layout.css?v='));assert.ok(page.includes('layout.js?v='));assert.ok(sw.includes('./'+folder+'layout.css'));assert.ok(sw.includes('./'+folder+'layout.js'));new vm.Script(await read(folder+'layout.js'));}
 const flow=await read('vazao.html');assert.equal(flow.includes("style.width=Math.max(850"),false);
});
