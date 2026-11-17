import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../layout.js',import.meta.url),'utf8');
function setup(reduced=false){
 let plugin,intersection,disconnected=false;const frames=new Map();let next=0;
 const context=vm.createContext({document:{querySelectorAll:()=>[]},window:{innerWidth:1000,matchMedia:()=>({matches:reduced})},Chart:{defaults:{font:{}},register:p=>plugin=p},IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}disconnect(){disconnected=true;}},requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id)});
 vm.runInContext(source,context);
 const chart={canvas:{closest:()=>({})},ctx:{},config:{type:'line',options:{}},data:{datasets:[{data:[100,150,null,130]}]},stop(){this.stops=(this.stops||0)+1;},reset(){this.resets=(this.resets||0)+1;},update(){this.updates=(this.updates||0)+1;}};
 return {plugin,chart,frames,enter:value=>intersection([{isIntersecting:value}]),flush:()=>{for(const [id,fn] of [...frames]){frames.delete(id);fn();}},disconnected:()=>disconnected};
}
test('Gráfico anima quando entra na tela e volta a animar ao reabrir, sem alterar dados',()=>{
 const s=setup(),before=JSON.stringify(s.chart.data.datasets[0].data);s.plugin.beforeInit(s.chart);assert.equal(s.chart.config.options.animation.duration,950);assert.ok(s.chart.config.options.animation.delay({type:'data',dataIndex:50,datasetIndex:2})<=320);s.plugin.afterInit(s.chart);s.enter(true);s.flush();assert.equal(s.chart.resets,1);s.enter(true);s.flush();assert.equal(s.chart.resets,1);s.enter(false);s.enter(true);s.flush();assert.equal(s.chart.resets,2);assert.equal(JSON.stringify(s.chart.data.datasets[0].data),before);
});
test('Exportação e preferência por movimento reduzido mantêm gráficos estáticos',()=>{
 for(const reduced of [true,false]){const s=setup(reduced);if(!reduced)s.chart.config.options.responsive=false;s.plugin.beforeInit(s.chart);s.plugin.afterInit(s.chart);assert.equal(s.chart.config.options.animation,false);assert.equal(s.chart.$appMotionObserver,undefined);}
});
test('Destruir gráfico cancela animação agendada e observador',()=>{
 const s=setup();s.plugin.beforeInit(s.chart);s.plugin.afterInit(s.chart);s.enter(true);assert.equal(s.frames.size,1);s.plugin.afterDestroy(s.chart);assert.equal(s.frames.size,0);assert.equal(s.disconnected(),true);
});
