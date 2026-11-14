import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const nodes=new Map(),charts=[];
function element(){return {children:[],style:{},parentElement:{style:{}},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(){},closest(){return null;}};}
function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
function contents(node){return [node.textContent||'',...node.children.map(contents)].join(' ');}
const context=vm.createContext({window:{addEventListener(){}},document:{getElementById:get,createElement:element},activeDashboardTab:'maintenance',Chart:class{constructor(canvas,config){charts.push(config);this.data=config.data;}destroy(){}}});
vm.runInContext(await readFile(new URL('../maintenance.js',import.meta.url),'utf8'),context);
vm.runInContext(await readFile(new URL('../maintenance-history.js',import.meta.url),'utf8'),context);
vm.runInContext('maintenanceBase=MAINTENANCE_SNAPSHOT.base;maintenanceAnalysis=MAINTENANCE_SNAPSHOT.analysis;renderMaintenanceHistory(maintenanceBase)',context);
assert.equal(get('technicalRecordCount').textContent,26);
assert.equal(get('technicalWellCount').textContent,14);
assert.equal(get('maintenanceRecordSelect').children.length,26,'Inclui registros sem data');
const datedCount=vm.runInContext("maintenanceBase.filter(row=>maintenanceDate(row['MANUTENÇÃO'])).length",context);
const newDateCount=vm.runInContext("maintenanceBase.filter(row=>maintenanceDate(row['NOVA MANUTENÇÃO'])).length",context);
assert.equal(charts[0].data.datasets[0].data.length,datedCount);
assert.equal(charts[0].data.datasets[1].data.length,newDateCount);
const pointIndex=charts[0].data.datasets[1].data.findIndex(point=>point.date==='2026-03-22');
assert.ok(pointIndex>=0);
charts[0].options.onClick(null,[{datasetIndex:1,index:pointIndex}],{data:charts[0].data});
const record=contents(get('maintenanceTechnicalRecord'));
assert.match(record,/Poço 06/);assert.match(record,/11\/11\/2025/);assert.match(record,/22\/03\/2026/);assert.match(record,/André motores/);
const undatedIndex=vm.runInContext("maintenanceBase.findIndex(row=>!row['MANUTENÇÃO'])",context);
get('maintenanceRecordSelect').value=String(undatedIndex);get('maintenanceRecordSelect').onchange();
assert.match(contents(get('maintenanceTechnicalRecord')),/Não informada/);
assert.match(contents(get('maintenanceTechnicalRecord')),/5\.395/,'Preserva número exatamente como na fonte');
vm.runInContext("renderMaintenanceHistory(maintenanceBase.filter(row=>row['POÇO']==='6'))",context);
assert.equal(get('technicalWellCount').textContent,1);
assert.equal(get('maintenanceRecordSelect').children.length,3,'Mantém todas as fichas do poço selecionado');
vm.runInContext('renderMaintenanceHistory([])',context);
assert.equal(get('maintenanceRecordSelect').disabled,true);
assert.equal(get('technicalChartEmpty').hidden,false);
assert.match(contents(get('maintenanceTechnicalRecord')),/Nenhum registro/);
console.log('OK: gráfico de datas, seleção por clique, 26 fichas, datas e campos originais, filtro por poço e registros sem data.');
