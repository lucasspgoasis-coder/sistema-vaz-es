/* Apresentação comum; os cálculos de cada módulo permanecem próprios. */
(function(){
 const annotate=()=>{document.querySelectorAll('main table').forEach(table=>{const headers=[...table.querySelectorAll('thead tr:first-child th')].map(th=>th.textContent.trim());if(!headers.length)return;table.querySelectorAll('tbody tr,tfoot tr').forEach(row=>{[...row.children].forEach((cell,index)=>{if(cell.tagName==='TD'&&!cell.hasAttribute('colspan'))cell.dataset.column=headers[index]||'Valor';});});});};
 let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;annotate();});};
 if(typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});annotate();
 if(typeof Chart!=='undefined'){
 Chart.defaults.font.family='Inter, Arial, sans-serif';Chart.defaults.color='#617b89';Chart.defaults.locale='pt-BR';
 Chart.register({id:'fluidAppTheme',beforeInit(chart){
  const opts=chart.config.options;opts.responsive=true;opts.maintainAspectRatio=false;
  opts.plugins??={};opts.plugins.tooltip??={};Object.assign(opts.plugins.tooltip,{backgroundColor:'#173b4b',titleColor:'#fff',bodyColor:'#edf7fb',padding:13,cornerRadius:10});
  if(opts.plugins.legend?.display!==false){opts.plugins.legend??={};opts.plugins.legend.position='bottom';opts.plugins.legend.labels={...opts.plugins.legend.labels,usePointStyle:true,boxWidth:8,padding:16,font:{size:11}};}
  if(opts.scales)for(const [key,axis] of Object.entries(opts.scales)){axis.grid={...axis.grid,color:'#eaf0f3'};axis.border={display:false};axis.ticks={...axis.ticks,font:{size:11}};if(key==='x'&&opts.indexAxis!=='y'){axis.ticks.autoSkip=true;axis.ticks.maxTicksLimit=window.innerWidth<600?6:12;axis.ticks.maxRotation=35;}}
  chart.data.datasets.forEach(dataset=>{if((dataset.type||chart.config.type)==='bar'){dataset.borderRadius=6;dataset.maxBarThickness??=42;}else if((dataset.type||chart.config.type)==='line'){dataset.borderWidth??=2.5;dataset.pointHoverRadius=7;}});
 }});
 }
})();
