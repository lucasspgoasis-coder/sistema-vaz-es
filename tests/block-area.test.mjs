import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const context=vm.createContext({});new vm.Script(await read('area-blocos/core.js')).runInContext(context);const C=context.BlockAreaCore;
test('Área estimada usa média das larguras e distância perpendicular, com conversão para hectares',()=>{
 const area=C.calculate('10','14','50');assert.equal(area.squareMeters,600);assert.equal(area.hectares,.06);assert.equal(C.calculate('20,5','21.5','100').squareMeters,2100);assert.equal(C.calculate('100','100','100').hectares,1);for(const bad of ['0','-2','','abc','Infinity','1.000,50'])assert.throws(()=>C.calculate(bad,'10','20'));assert.throws(()=>C.create({block:'',left:10,right:14,height:50},'id'));
});
test('Cadastro atualiza o mesmo bloco e impede renomear um bloco para outro já existente',()=>{
 const first=C.create({block:'2',left:10,right:14,height:50},'first','2026-11-18T12:00:00Z'),second=C.create({block:'Bloco 10',left:20,right:20,height:100},'second');const created=C.upsert([first],second).records,updated=C.upsert(created,C.create({block:'Bloco 02',left:20,right:20,height:20},'new'));assert.equal(updated.records.length,2);assert.equal(updated.saved.id,'first');assert.equal(updated.saved.createdAt,first.createdAt);assert.equal(updated.saved.squareMeters,400);assert.equal(updated.records[0].block,'Bloco 02');assert.throws(()=>C.upsert(created,{...second,block:'Bloco 02'},'second'));
});
async function app(memory=new Map()){
 const dom=new JSDOM(await read('area-blocos/index.html'),{url:'https://lucasspgoasis-coder.github.io/sistema-vaz-es/area-blocos/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,context=dom.getInternalVMContext(),ready=[];w.matchMedia=()=>({matches:false});Object.defineProperty(w,'localStorage',{value:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}});const add=w.document.addEventListener.bind(w.document);w.document.addEventListener=(event,fn,options)=>event==='DOMContentLoaded'?ready.push(fn):add(event,fn,options);for(const file of ['core.js','app.js'])new vm.Script(await read('area-blocos/'+file)).runInContext(context);for(const fn of ready)await fn();return {w,get:id=>w.document.getElementById(id),memory,close:()=>dom.window.close()};
}
test('Blocos salvos restauram medidas, desenhos e totais; edição não duplica o cadastro',async()=>{
 const a=await app(),{w,get}=a;assert.equal(get('areaPreview').querySelector('svg'),null);const fill=(name,left,right,height)=>{for(const [id,value] of [['areaBlock',name],['areaLeft',left],['areaRight',right],['areaHeight',height]])get(id).value=value;w.BlockAreaApp.preview();};fill('2','10','14','50');assert.equal(get('areaSquareMeters').textContent,'600 m²');assert.equal(get('areaHectares').textContent,'0,06 ha');const first=w.BlockAreaApp.save();assert.ok(get('areaRecords').querySelector('svg').getAttribute('aria-label').includes('600 metros quadrados'));assert.ok(get('areaRecords').textContent.includes('600 m²'));w.BlockAreaApp.fresh();fill('10','20','20','100');w.BlockAreaApp.save();assert.equal(get('areaRecords').querySelectorAll('article').length,2);assert.ok(get('areaSummary').textContent.includes('2.600 m²'));w.BlockAreaApp.edit(first.id);get('areaHeight').value='100';w.BlockAreaApp.save();assert.equal(w.BlockAreaApp.state().length,2);assert.equal(w.BlockAreaApp.state()[0].squareMeters,1200);const memory=a.memory;a.close();
 const b=await app(memory);assert.equal(b.w.BlockAreaApp.state().length,2);assert.equal(b.get('areaRecords').querySelectorAll('svg.area-drawing').length,2);assert.ok(b.get('areaSummary').textContent.includes('3.200 m²'));b.get('areaSearch').value='10';b.get('areaSearch').dispatchEvent(new b.w.Event('input'));assert.equal(b.get('areaRecords').querySelectorAll('article').length,1);assert.ok(b.get('areaRecords').textContent.includes('Bloco 10'));b.close();
});
test('Novo módulo possui navegação, cache e preferência de movimento reduzido',async()=>{
 const html=await read('index.html'),sw=await read('sw.js'),css=await read('area-blocos/area.css');assert.ok(html.includes('data-system-card="area"'));assert.ok(html.includes('data-nav="area"'));for(const path of ['index.html','core.js','app.js','area.css'])assert.ok(sw.includes('./area-blocos/'+path));assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
