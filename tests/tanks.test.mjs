import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script=await readFile(new URL('../tanks.js',import.meta.url),'utf8');
const nodes=new Map();
function element(){return {children:[],style:{},attributes:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(key,value){this.attributes[key]=value;}};}
function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
const charts=[];
const context=vm.createContext({activeDashboardTab:'tanks',rawData:[],WELL_COLORS:['red','green','blue'],document:{getElementById:get,createElement:element,createElementNS:element,querySelectorAll:()=>[]},Chart:class{constructor(canvas,config){charts.push(config);}destroy(){}}});
vm.runInContext(script,context);
function calculate(rows,start='',end='',hours=24){context.inputRows=rows;context.inputStart=start;context.inputEnd=end;context.inputHours=hours;return JSON.parse(vm.runInContext('JSON.stringify(calculateTankData(inputRows,inputStart,inputEnd,inputHours))',context));}
const row=(well,date,flow)=>({poco:'Poço '+String(well).padStart(2,'0'),dateStr:date,vazao:flow});
const input=[row(1,'2026-11-01',100),row(1,'2026-11-01',300),row(7,'2026-11-01',500),row(8,'2026-11-03',0),row(13,'2026-11-01',9999)];
let tanks=calculate(input);
assert.equal(tanks[0].total,4800,'Média das leituras repetidas × 24 horas');
assert.equal(tanks[1].total,12000,'Poço 07 contado apenas no tanque 04');
assert.equal(tanks[0].wells.some(well=>well.well===7),false);
assert.equal(tanks[0].wells.some(well=>well.well===13),false);
assert.equal(tanks[0].daily[1].total,null,'Dia intermediário sem leitura não é zero');
assert.equal(tanks[1].daily[2].total,0,'Medição de vazão zero permanece zero');
assert.equal(tanks[0].daily[0].complete,false);
tanks=calculate(input,'2026-11-03','2026-11-03');
assert.equal(tanks[0].total,null);
assert.equal(tanks[1].total,0,'Limites de data inclusivos');
assert.equal(calculate(input,'','',12)[1].total,6000,'Horas alteram o volume estimado');
assert.equal(calculate([], '', '',24)[0].total,null);
const complete=calculate([1,3,4,5,6,11,12].map(well=>row(well,'2026-11-01',100)));
assert.equal(complete[0].total,16800);
assert.equal(complete[0].completeDays,1);
context.rawData=input;
vm.runInContext('renderTanks()',context);
assert.equal(charts.length,2,'Dois gráficos diários');
assert.equal(charts[0].data.datasets.length,7);
assert.equal(charts[1].data.datasets.length,5);
assert.equal(charts[1].data.datasets[0].data[0],12000);
assert.equal(get('tankDrawing03').children.length,1,'Ilustração do tanque 03');
assert.equal(get('tankDrawing04').children.length,1,'Ilustração do tanque 04');
assert.equal(get('tankWells03').children[1].children.length,7);
assert.equal(get('tankWells04').children[1].children.length,5);
console.log('OK: cálculos, médias diárias, datas, horas, cobertura, dados ausentes, dois gráficos e dois tanques.');
