import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const staticIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(staticIds).size,staticIds.length,'IDs únicos');
const nodes=new Map(),memory=new Map();
function element(){const attrs={};return {value:'',children:[],style:{setProperty(){}},parentElement:{style:{}},dataset:{},classList:{toggle(){},add(){},remove(){}},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(key,value){attrs[key]=value;},getAttribute:key=>attrs[key],querySelectorAll(){return this.children.flatMap(child=>[...(child.getAttribute?.('data-history-record')!==undefined?[child]:[]),...(child.querySelectorAll?.()||[])]);},closest(){return null;},contains(){return true;}};}
function get(id){if((id.startsWith('panel-')||id.startsWith('tab-'))&&!staticIds.includes(id))throw Error('Painel inexistente: '+id);if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
const store={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
const context=vm.createContext({console,window:{addEventListener(){},matchMedia:()=>({matches:false})},document:{getElementById:get,createElement:element,createElementNS:element,createTextNode:text=>text,querySelectorAll:()=>[],body:element()},sessionStorage:store,localStorage:store,navigator:{onLine:true},requestAnimationFrame:fn=>fn(),setTimeout(){},setInterval(){},Chart:class{constructor(canvas,config){this.canvas=canvas;this.data=config.data;this.options=config.options;}resize(){}update(){}destroy(){}isDatasetVisible(){return true;}}});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
for(const file of ['maintenance.js','maintenance-history.js','app-access.js'])vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),context);
vm.runInContext("rawData=[{poco:'Poço 03',dateStr:'2026-11-14',dateObj:new Date(2026,10,14),dateDisplay:'14/11/2026',vazao:5000,ano:2026,mes:11,semana:46}];captureFlowSheet();maintenanceBase=MAINTENANCE_SNAPSHOT.base;maintenanceAnalysis=MAINTENANCE_SNAPSHOT.analysis;maintenanceLoaded=true;captureMaintenanceSheet();",context);
for(const tab of ['overview','daily','maintenance','meters','registry','overview','registry']){
 vm.runInContext(`switchDashboardTab('${tab}')`,context);
 for(const name of ['overview','daily','maintenance','meters','registry'])assert.equal(get('panel-'+name).hidden,name!==tab);
}
assert.equal(get('managerForms').hidden,true,'Visitante só consulta o histórico');
assert.equal(get('registryMaintenanceCount').textContent,26);
assert.equal(get('registryFlowCount').textContent,1);
vm.runInContext("rawData=[];restoreCachedFlow();applyFilters()",context);
assert.equal(vm.runInContext('rawData.length',context),1,'Consulta recupera dados reais já carregados');
assert.equal(html.includes('Dados simulados'),false);
const handlers={};vm.runInNewContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),{self:{registration:{scope:'https://lucasspgoasis-coder.github.io/sistema-vaz-es/'},addEventListener:(name,fn)=>handlers[name]=fn},URL});
let intercepted=false;
handlers.fetch({request:{method:'POST',url:'https://example.test/api/records'},respondWith(){intercepted=true;}});
handlers.fetch({request:{method:'GET',url:'https://oasis-vazao-cadastros-20261114.snappylace5.chatgpt.site/api/session'},respondWith(){intercepted=true;}});
assert.equal(intercepted,false,'Service worker não armazena nem intercepta autenticação e gravação');
console.log('OK: cinco abas, consulta de visitante, fichas, gráficos, cache de leitura e isolamento de API no service worker.');
