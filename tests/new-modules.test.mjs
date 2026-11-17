import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Transplantio abre diretamente e inicia as duas leituras de planilha',async()=>{
 const html=await read('sistema-transplantio/index.html');assert.equal(/<form id="loginForm"|<div id="loginScreen"|user ===|pass ===/.test(html),false);assert.equal(html.includes('loadMockData'),false);assert.equal(html.includes('i.imgur.com'),false);assert.match(html,/id="dashboardScreen" class="\s*flex/);const events={},urls=[],nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(){},classList:{add(){},remove(){},toggle(){}},style:{}});return nodes.get(id);};const context=vm.createContext({document:{getElementById:get,addEventListener:(name,fn)=>events[name]=fn,querySelectorAll:()=>[]},window:{addEventListener(){}},Chart:{register(){}},ChartDataLabels:{},Papa:{parse:url=>urls.push(url)},setTimeout(){}});
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))vm.runInContext(match[1],context);assert.equal(typeof events.DOMContentLoaded,'function');events.DOMContentLoaded();assert.equal(urls.length,2);assert.ok(urls.every(url=>url.includes('docs.google.com/spreadsheets')));
});
test('Novos módulos possuem tema local, logos, fontes, histórico e recursos no cache',async()=>{
 const sw=await read('sw.js');for(const folder of ['sistema-transplantio','sistema-perdas']){const html=await read(folder+'/index.html');assert.ok(html.includes('layout.css?v='));assert.ok(html.includes('layout.js?v='));assert.ok(html.includes('fontawesome/css/all.min.css'));assert.ok(html.includes('logo.svg'));for(const file of ['layout.css','layout.js','logo.svg','fontawesome/webfonts/fa-solid-900.woff2']){await access(new URL('../'+folder+'/'+file,import.meta.url));assert.ok(sw.includes('./'+folder+'/'+file));}}
 const html=await read('sistema-perdas/index.html');for(const id of ['lossPanel-history','lossPanel-analysis','lossHistoryList','lossBlockChart','lossCauseChart','lossSaveNow'])assert.ok(html.includes('id="'+id+'"'));for(const file of ['history-core.js','history-report.js','history.js']){new vm.Script(await read('sistema-perdas/'+file));assert.ok(sw.includes('./sistema-perdas/'+file));}
});
