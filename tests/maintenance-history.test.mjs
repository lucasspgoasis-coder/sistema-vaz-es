import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const nodes=new Map(),charts=[];
function element(){const attributes={};return {children:[],style:{},parentElement:{style:{}},classList:{toggle(){}},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(key,value){attributes[key]=value;},getAttribute(key){return attributes[key];},querySelectorAll(){return this.children.flatMap(child=>[...(child.getAttribute('data-history-record')!==undefined?[child]:[]),...child.querySelectorAll()]);},closest(){return null;}};}
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
const undatedCount=vm.runInContext("maintenanceBase.filter(row=>!maintenanceDate(row['MANUTENÇÃO'])).length",context);
const cards=get('maintenanceEventBoard').querySelectorAll();
assert.equal(cards.length,datedCount+newDateCount+undatedCount,'Todos os eventos e fichas sem data aparecem em blocos');
assert.equal(charts.length,0,'Não usa mais gráfico de pontos');
const marchCard=cards.find(card=>contents(card).includes('22/03/2026'));
assert.ok(marchCard);marchCard.onclick();
assert.equal(marchCard.getAttribute('aria-pressed'),'true','Seleção do bloco fica destacada');
const record=contents(get('maintenanceTechnicalRecord'));
assert.match(record,/Poço 06/);assert.match(record,/11\/11\/2025/);assert.match(record,/22\/03\/2026/);assert.match(record,/André motores/);
const undatedIndex=vm.runInContext("maintenanceBase.findIndex(row=>!row['MANUTENÇÃO'])",context);
get('maintenanceRecordSelect').value=String(undatedIndex);get('maintenanceRecordSelect').onchange();
assert.match(contents(get('maintenanceTechnicalRecord')),/Não informada/);
assert.match(contents(get('maintenanceTechnicalRecord')),/5\.395/,'Preserva número exatamente como na fonte');
vm.runInContext("renderMaintenanceHistory(maintenanceBase.filter(row=>row['POÇO']==='6'))",context);
assert.equal(get('technicalWellCount').textContent,1);
assert.equal(get('maintenanceRecordSelect').children.length,3,'Mantém todas as fichas do poço selecionado');
assert.equal(get('maintenanceEventBoard').children.length,2,'Cabeçalho e apenas uma linha para o poço filtrado');
const well12Cards=vm.runInContext("renderMaintenanceHistory(maintenanceBase.filter(row=>row['POÇO']==='12'))",context);
const decemberCell=get('maintenanceEventBoard').children[1].children.find(cell=>cell.querySelectorAll().filter(card=>contents(card).includes('01/12/2025')).length===2);
assert.ok(decemberCell,'Eventos do mesmo poço e mês permanecem em blocos separados');
vm.runInContext("renderMaintenanceHistory(maintenanceBase.filter(row=>!row['MANUTENÇÃO']))",context);
assert.equal(get('maintenanceEventBoard').children[0].children.length,2,'Somente poço e coluna sem data quando não há datas');
assert.equal(get('maintenanceEventBoard').children[0].style.gridTemplateColumns,'145px 200px');
vm.runInContext('renderMaintenanceHistory([])',context);
assert.equal(get('maintenanceRecordSelect').disabled,true);
assert.equal(get('technicalChartEmpty').hidden,false);
assert.match(contents(get('maintenanceTechnicalRecord')),/Nenhum registro/);
console.log('OK: blocos de eventos, seleção destacada, datas legíveis, registros simultâneos separados, fichas completas e registros sem data.');
