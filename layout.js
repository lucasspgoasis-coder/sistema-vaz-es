/* Apresentação comum; os cálculos de cada módulo permanecem próprios. */
(function(){
 const annotate=()=>{document.querySelectorAll('main table').forEach(table=>{const headers=[...table.querySelectorAll('thead tr:first-child th')].map(th=>th.textContent.trim());if(!headers.length)return;table.querySelectorAll('tbody tr,tfoot tr').forEach(row=>{[...row.children].forEach((cell,index)=>{if(cell.tagName==='TD'&&!cell.hasAttribute('colspan'))cell.dataset.column=headers[index]||'Valor';});});});};
 let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;annotate();});};
 if(typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});annotate();
 if(typeof Chart!=='undefined'){
 Chart.defaults.font.family='Inter, Arial, sans-serif';Chart.defaults.color='#617b89';Chart.defaults.locale='pt-BR';
 Chart.register({id:'fluidAppTheme',beforeInit(chart){
  const opts=chart.config.options;
  const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  chart.$appMotionEnabled=opts.responsive!==false&&Boolean(chart.canvas.closest?.('main'))&&!reduced;
  opts.animation=chart.$appMotionEnabled?{duration:950,easing:'easeOutQuart',animateRotate:true,animateScale:true,delay:context=>context.type==='data'?Math.min((context.dataIndex||0)*32+(context.datasetIndex||0)*70,320):0}:false;
  opts.transitions={...opts.transitions,resize:{animation:{duration:0}},active:{animation:{duration:180}}};
  opts.responsive=opts.responsive!==false;opts.maintainAspectRatio=false;
  opts.plugins??={};opts.plugins.tooltip??={};Object.assign(opts.plugins.tooltip,{backgroundColor:'#173b4b',titleColor:'#fff',bodyColor:'#edf7fb',padding:13,cornerRadius:10});
  if(opts.plugins.legend?.display!==false){opts.plugins.legend??={};opts.plugins.legend.position='bottom';opts.plugins.legend.labels={...opts.plugins.legend.labels,usePointStyle:true,boxWidth:8,padding:16,font:{size:11}};}
  if(opts.scales)for(const [key,axis] of Object.entries(opts.scales)){axis.grid={...axis.grid,color:'#eaf0f3'};axis.border={display:false};axis.ticks={...axis.ticks,font:{size:11}};if(key==='x'&&opts.indexAxis!=='y'){axis.ticks.autoSkip=true;axis.ticks.maxTicksLimit=window.innerWidth<600?6:12;axis.ticks.maxRotation=35;}}
  chart.data.datasets.forEach(dataset=>{if((dataset.type||chart.config.type)==='bar'){dataset.borderRadius=6;dataset.maxBarThickness??=42;}else if((dataset.type||chart.config.type)==='line'){dataset.borderWidth??=2.5;dataset.pointHoverRadius=7;}});
 },afterInit(chart){
  if(!chart.$appMotionEnabled||typeof IntersectionObserver==='undefined')return;
  let visible=false;
  chart.$appMotionObserver=new IntersectionObserver(entries=>{for(const entry of entries){
   if(entry.isIntersecting&&!visible){visible=true;
    if(chart.$appMotionFrame)cancelAnimationFrame(chart.$appMotionFrame);
    chart.$appMotionFrame=requestAnimationFrame(()=>{chart.$appMotionFrame=null;if(!chart.canvas||!chart.ctx||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;chart.stop();chart.reset();chart.update();});
   }else if(!entry.isIntersecting){visible=false;if(chart.$appMotionFrame){cancelAnimationFrame(chart.$appMotionFrame);chart.$appMotionFrame=null;}}
  }},{threshold:0.12});chart.$appMotionObserver.observe(chart.canvas);
 },afterDestroy(chart){chart.$appMotionObserver?.disconnect();if(chart.$appMotionFrame)cancelAnimationFrame(chart.$appMotionFrame);chart.$appMotionFrame=null;}});
 }
})();
