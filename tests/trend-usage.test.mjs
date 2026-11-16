import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('Médias mensais: crescimento, queda, estabilidade, lacuna e base zero',async()=>{
 const source=await read('tendencia.js');const context=vm.createContext({switchDashboardTab(){},applyFilters(){}});vm.runInContext(source,context);
 const row=(month,vazao,poco='Poço 01')=>({dateStr:month+'-10',vazao,poco});
 const result=context.calculateMonthlyTrend([row('2025-12',100),row('2026-01',100),row('2026-01',200),row('2026-02',75),row('2026-03',75),row('2026-05',90),row('2026-01',0,'Poço 02'),row('2026-02',10,'Poço 02')]);
 assert.equal(result[1].average,150);assert.equal(result[1].delta,50);assert.equal(result[1].percent,50);assert.equal(result[1].status,'Aumentou');assert.equal(result[2].percent,-50);assert.equal(result[2].status,'Diminuiu');assert.equal(result[3].status,'Manteve');assert.equal(result[4].delta,null);assert.equal(result[6].percent,null);assert.equal(result[6].delta,10);
});
test('Participação das roçadeiras soma 100% em cada bloco e colaboradores no total',async()=>{
 const context=vm.createContext({});vm.runInContext(await read('sistema-rocadeira/assets/js/rendimento.js'),context);
 const rows=[{Local:'A',Equipamento:'R1',Operador:'Ana',DurationMinutes:60},{Local:'A',Equipamento:'R2',Operador:'Bia',DurationMinutes:180},{Local:'B',Equipamento:'R1',Operador:'Ana',DurationMinutes:60},{DurationMinutes:0},{DurationMinutes:-10}];
 const result=context.calculateUsage(rows);assert.equal(result.total,300);assert.equal(result.count,3);assert.equal(result.blocks[0].equipment[0][1]/result.blocks[0].total*100,25);assert.equal(result.people[0].name,'Bia');assert.equal(result.people[0].percent,60);assert.equal(result.people.reduce((sum,p)=>sum+p.percent,0),100);assert.equal(context.calculateUsage([]).total,0);
});
test('Nova aba mantém os filtros e usa os dados filtrados, sem tabela de registros na navegação',async()=>{
 const html=await read('sistema-rocadeira/index.html'),app=await read('sistema-rocadeira/assets/js/app.js');assert.ok(html.includes('tabBtn-rendimento'));assert.equal(html.includes('tabBtn-tabela'),false);assert.equal(html.includes('tabContent-tabela'),false);assert.ok(app.includes('renderRendimento(validData)'));assert.ok(app.includes("'rocadeiras', 'rendimento'"));
 const flow=await read('vazao.html');assert.ok(flow.includes('id="tab-trend"'));assert.ok(flow.includes('id="panel-trend"'));assert.ok(flow.includes('tendencia.js?v=20261116'));
});
