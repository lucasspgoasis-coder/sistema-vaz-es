import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../portal.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const nodes=new Map(),memory=new Map(),events={};let resizeCount=0;
function element(){const attrs={};return {children:[],dataset:{},value:'',hidden:false,contentWindow:{Event:class{},dispatchEvent(){resizeCount++;}},append(...items){this.children.push(...items);},setAttribute(key,value){attrs[key]=value;},removeAttribute(key){delete attrs[key];},getAttribute:key=>attrs[key],focus(){},showModal(){this.open=true;},close(){this.open=false;}};}
function get(id){assert.ok(ids.includes(id),'Elemento declarado no HTML: '+id);if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
const nav=['inicio','vazao','adubacao','rocadeira'].map(name=>{const item=element();item.dataset.nav=name;return item;});
const cards=['vazao','adubacao','rocadeira'].map(name=>{const item=element();item.dataset.systemCard=name;return item;});
const context=vm.createContext({window:{addEventListener(name,handler){events[name]=handler;},matchMedia:()=>({matches:false})},document:{getElementById:get,createElement:element,querySelectorAll:selector=>selector==='[data-nav]'?nav:cards,addEventListener(){}},location:{hash:''},navigator:{onLine:true,userAgent:'Test'},localStorage:{getItem:key=>memory.get(key)||'',setItem:(key,value)=>memory.set(key,value)},setTimeout(){},console});
vm.runInContext(source,context);
test('Tela inicial possui três sistemas, sem perfis, senha ou cadastros',async()=>{
 assert.equal(ids.length,new Set(ids).size);assert.equal((html.match(/data-system-card=/g)||[]).length,3);
 assert.equal(/accessScreen|managerPassword|panel-registry|app-access|OASIS_API/.test(html),false);
 for(const path of ['vazao.html','sistema-adubacao/index.html','sistema-rocadeira/index.html'])await access(new URL('../'+path,import.meta.url));
 const flow=await readFile(new URL('../vazao.html',import.meta.url),'utf8');assert.equal((flow.match(/role="tab"/g)||[]).length,4);assert.equal(/app-access|managerPassword|panel-registry/.test(flow),false);assert.ok(flow.includes('docs.google.com/spreadsheets'));
 new vm.Script(flow.match(/<script>([\s\S]*?)<\/script>/)[1]);
});
test('Alterna os três módulos, preserva seus quadros e permite atualizar',()=>{
 vm.runInContext('renderPortalRoute()',context);assert.equal(get('portalHome').hidden,false);
 for(const name of ['vazao','adubacao','rocadeira']){context.location.hash='#'+name;events.hashchange();assert.equal(get('portalWorkspace').hidden,false);const frame=get('systemFrames').children.at(-1);assert.ok(frame.src.includes(name==='vazao'?'vazao.html':'sistema-'+name));frame.onload();assert.equal(get('workspaceLoading').hidden,true);}
 assert.equal(get('systemFrames').children.length,3);
 context.location.hash='#vazao';events.hashchange();assert.equal(get('systemFrames').children.length,3,'Reutiliza quadros para preservar os filtros');assert.ok(resizeCount>0);
 vm.runInContext('refreshPortalSystem()',context);assert.ok(get('systemFrames').children[0].src.includes('atualizar='));assert.equal(get('workspaceLoading').hidden,false);
 context.location.hash='#inicio';events.hashchange();assert.equal(get('portalWorkspace').hidden,true);assert.equal(get('lastSystemBox').hidden,false);
 context.location.hash='#constructor';events.hashchange();assert.equal(get('portalHome').hidden,false,'Rota desconhecida volta ao início');
});
test('Busca encontra nomes com ou sem acentos e abre o único resultado',()=>{
 get('systemSearch').value='rocadeira';vm.runInContext('filterPortalSystems()',context);assert.equal(cards.filter(card=>!card.hidden).length,1);assert.equal(cards[2].hidden,false);
 context.keyboardEvent={key:'Enter'};vm.runInContext('portalSearchKey(keyboardEvent)',context);assert.equal(context.location.hash,'rocadeira');
 get('systemSearch').value='inexistente';vm.runInContext('filterPortalSystems()',context);assert.equal(get('systemSearchEmpty').hidden,false);
 get('systemSearch').value='';vm.runInContext('filterPortalSystems()',context);assert.equal(cards.filter(card=>!card.hidden).length,3);
});
test('Instalação possui nome novo e ícones de engrenagem nas dimensões corretas',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.name,'Dados de vazão, adubação e roçadeira');assert.equal(manifest.id,'./');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){assert.ok(icon.src.includes('gear'));const bytes=await readFile(new URL('../'+icon.src,import.meta.url));const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});
test('Consulta offline usa apenas medições reais da planilha',async()=>{
 const cache=new Map();const c=vm.createContext({rawData:[{poco:'Poço 03',dateStr:'2026-11-14',vazao:5000}],localStorage:{setItem:(key,value)=>cache.set(key,value),getItem:key=>cache.get(key)||null}});vm.runInContext(await readFile(new URL('../planilhas.js',import.meta.url),'utf8'),c);
 vm.runInContext('cachePublishedFlowRows();rawData=[];restorePublishedFlowRows()',c);assert.equal(c.rawData.length,1);assert.equal(c.rawData[0].vazao,5000);cache.clear();vm.runInContext('restorePublishedFlowRows()',c);assert.equal(c.rawData.length,0);
});
test('Cache de navegação não troca início pelo conteúdo de um sistema',async()=>{
 const handlers={},saved=new Map();let online=true;
 const cache={put:async(key,response)=>saved.set(typeof key==='string'?key:key.url,response),match:async key=>saved.get(typeof key==='string'?key:key.url)};
 const scope='https://lucasspgoasis-coder.github.io/sistema-vaz-es/';
 const sw=vm.createContext({self:{registration:{scope},addEventListener:(name,handler)=>handlers[name]=handler},URL,Response,caches:{open:async()=>cache},fetch:async request=>{if(!online)throw Error('offline');return new Response(request.url.includes('vazao.html')?'Vazão':'Início');}});
 vm.runInContext(await readFile(new URL('../sw.js',import.meta.url),'utf8'),sw);
 const navigate=async url=>{let result;handlers.fetch({request:{method:'GET',mode:'navigate',url},respondWith:promise=>result=promise});return await result;};
 await navigate(scope+'?app=1');await navigate(scope+'vazao.html?portal=1');online=false;
 assert.equal(await (await navigate(scope)).text(),'Início');assert.equal(await (await navigate(scope+'vazao.html')).text(),'Vazão');
 assert.equal(saved.size,2,'Cada página tem sua própria entrada');
});
