const TANK_CONFIG=[{id:'03',name:'Tanque 03',wells:[1,3,4,5,6,11,12],color:'#177c9a'},{id:'04',name:'Tanque 04',wells:[7,8,9,10,14],color:'#25845c'}];
const tankFilters={start:'',end:'',hours:24};
let tankCharts=[];
function tankWellNumber(name){const match=String(name).match(/\d+/);return match?Number(match[0]):null;}
function tankNumber(value){return Number(value).toLocaleString('pt-BR',{maximumFractionDigits:0});}
function tankDate(iso){return iso.split('-').reverse().join('/');}
function calculateTankData(rows,start='',end='',hours=24){
 const days=new Map();
 for(const row of rows){if((start&&row.dateStr<start)||(end&&row.dateStr>end))continue;const well=tankWellNumber(row.poco);if(!TANK_CONFIG.some(tank=>tank.wells.includes(well))||!Number.isFinite(row.vazao)||row.vazao<0)continue;if(!days.has(row.dateStr))days.set(row.dateStr,new Map());const wells=days.get(row.dateStr);if(!wells.has(well))wells.set(well,[]);wells.get(well).push(row.vazao);}
 const dates=[];if(days.size){let day=[...days.keys()].sort()[0],last=[...days.keys()].sort().at(-1);while(day<=last){dates.push(day);const next=new Date(day+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);day=next.toISOString().slice(0,10);}}
 return TANK_CONFIG.map(tank=>{
  const daily=dates.map(date=>{const values=days.get(date)||new Map();const wells=tank.wells.map(well=>{const readings=values.get(well);return {well,flow:readings?readings.reduce((sum,v)=>sum+v,0)/readings.length:null,volume:readings?readings.reduce((sum,v)=>sum+v,0)/readings.length*hours:null};});const measured=wells.filter(w=>w.volume!==null);return {date,wells,total:measured.length?measured.reduce((sum,w)=>sum+w.volume,0):null,measured:measured.length,complete:measured.length===tank.wells.length};});
  const known=daily.filter(day=>day.total!==null),total=known.reduce((sum,day)=>sum+day.total,0);
  const wells=tank.wells.map(well=>{const measured=daily.map(day=>day.wells.find(w=>w.well===well)).filter(w=>w.volume!==null);return {well,days:measured.length,total:measured.length?measured.reduce((sum,w)=>sum+w.volume,0):null,averageFlow:measured.length?measured.reduce((sum,w)=>sum+w.flow,0)/measured.length:null};});
  return {...tank,daily,wells,total:known.length?total:null,average:known.length?total/known.length:null,peak:known.reduce((best,day)=>!best||day.total>best.total?day:best,null),knownDays:known.length,completeDays:known.filter(day=>day.complete).length};
 });
}
function tankFilterChanged(){
 const start=document.getElementById('tankStart'),end=document.getElementById('tankEnd'),hours=document.getElementById('tankHours');
 if(!start.checkValidity()||!end.checkValidity()||!hours.checkValidity()){document.getElementById('tankFilterError').textContent='Confira as datas e informe de 0 a 24 horas por dia.';return;}
 if(start.value&&end.value&&start.value>end.value){document.getElementById('tankFilterError').textContent='A data final deve ser igual ou posterior à data inicial.';return;}
 tankFilters.start=start.value;tankFilters.end=end.value;tankFilters.hours=Number(hours.value);document.getElementById('tankFilterError').textContent='';renderTanks();
}
function resetTankFilters(){tankFilters.start='';tankFilters.end='';tankFilters.hours=24;document.getElementById('tankStart').value='';document.getElementById('tankEnd').value='';document.getElementById('tankHours').value='24';document.getElementById('tankFilterError').textContent='';renderTanks();}
function tankWellColor(well){return WELL_COLORS[(well-1)%WELL_COLORS.length];}
function tankText(id,value){document.getElementById(id).textContent=value;}
function tankTable(id,headers,rows){const table=document.getElementById(id);table.replaceChildren();const head=document.createElement('thead'),title=document.createElement('tr'),body=document.createElement('tbody');headers.forEach(text=>{const th=document.createElement('th');th.scope='col';th.textContent=text;title.append(th);});head.append(title);for(const cells of rows){const tr=document.createElement('tr');for(const text of cells){const td=document.createElement('td');td.textContent=text;tr.append(td);}body.append(tr);}if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=headers.length;td.textContent='Nenhuma medição disponível no período selecionado.';tr.append(td);body.append(tr);}table.append(head,body);}
function drawTank(tank){
 const container=document.getElementById('tankDrawing'+tank.id);container.replaceChildren();const ns='http://www.w3.org/2000/svg';
 const node=(tag,attrs={},text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));if(text!==undefined)el.textContent=text;return el;};
 const svg=node('svg',{viewBox:'0 0 520 290',role:'img','aria-label':tank.name+': '+(tank.total===null?'sem dados':tankNumber(tank.total)+' litros estimados no período')});
 svg.append(node('title',{},tank.name+' · Representação do destino da água, sem indicação de nível ou capacidade'));
 svg.append(node('path',{d:'M 35 90 H 138 V 110 H 179',fill:'none',stroke:tank.color,'stroke-width':12,'stroke-linejoin':'round'}),node('path',{d:'M 164 98 L 181 110 L 164 122',fill:'none',stroke:tank.color,'stroke-width':5}),node('text',{x:32,y:55,fill:tank.color,'font-size':13,'font-weight':700},'ÁGUA DOS POÇOS'));
 tank.wells.forEach((item,i)=>{svg.append(node('text',{x:32+(i%2)*58,y:130+Math.floor(i/2)*25,fill:'#526b5d','font-size':12},String(item.well).padStart(2,'0')));});
 svg.append(node('rect',{x:185,y:58,width:305,height:172,rx:24,fill:'#f4f8fa',stroke:tank.color,'stroke-width':3}),node('path',{d:'M 188 130 Q 230 116 270 130 T 350 130 T 430 130 T 487 130 V 205 Q 487 227 465 227 H 210 Q 188 227 188 205 Z',fill:tank.color,opacity:.16}),node('ellipse',{cx:337,cy:59,rx:152,ry:26,fill:'#fff',stroke:tank.color,'stroke-width':3}),node('text',{x:337,y:66,'text-anchor':'middle',fill:tank.color,'font-size':18,'font-weight':800},tank.name.toUpperCase()),node('text',{x:337,y:158,'text-anchor':'middle',fill:'#1a4534','font-size':25,'font-weight':800},tank.total===null?'Sem medições':tankNumber(tank.total)+' L'),node('text',{x:337,y:184,'text-anchor':'middle',fill:'#526b5d','font-size':12},'entrada estimada no período'),node('text',{x:260,y:265,'text-anchor':'middle',fill:'#7c8b82','font-size':11},'Ilustração do tanque · não representa o nível armazenado'));
 container.append(svg);
}
function renderTanks(){
 if(activeDashboardTab!=='tanks')return;tankCharts.forEach(chart=>chart.destroy());tankCharts=[];
 const results=calculateTankData(rawData,tankFilters.start,tankFilters.end,tankFilters.hours);
 const dates=results[0].daily.map(day=>day.date);tankText('tankPeriod',dates.length?tankDate(dates[0])+' a '+tankDate(dates.at(-1)):'Nenhum dado no período');
 tankText('tankEstimateNote','Estimativa: média da vazão medida em cada dia (L/h) × '+tankFilters.hours+' horas/dia. Cada poço é contado apenas no seu tanque atual. A configuração atual de destino é aplicada a todo o período selecionado.');
 for(const tank of results){
  const id=tank.id,known=tank.total!==null;
  tankText('tankTotal'+id,known?tankNumber(tank.total)+' L':'—');tankText('tankAverage'+id,known?tankNumber(tank.average)+' L/dia':'—');tankText('tankPeak'+id,tank.peak?tankNumber(tank.peak.total)+' L':'—');tankText('tankPeakDate'+id,tank.peak?tankDate(tank.peak.date):'Sem medições');tankText('tankCoverage'+id,tank.completeDays+' / '+tank.daily.length);tankText('tankCoverageNote'+id,'dias com todos os '+tank.wells.length+' poços medidos');
  drawTank(tank);
  document.getElementById('tankEmpty'+id).hidden=known;
  document.getElementById('tankPlot'+id).style.width=Math.min(14000,Math.max(700,tank.daily.length*75))+'px';
  const datasets=tank.wells.map(well=>({label:'Poço '+String(well.well).padStart(2,'0'),data:tank.daily.map(day=>day.wells.find(item=>item.well===well.well).volume),backgroundColor:tankWellColor(well.well),borderRadius:2,maxBarThickness:55}));
  tankCharts.push(new Chart(document.getElementById('tankChart'+id),{type:'bar',data:{labels:tank.daily.map(day=>tankDate(day.date)),datasets},options:{responsive:true,maintainAspectRatio:false,devicePixelRatio:1,animation:false,layout:{padding:{top:40,right:25,left:10}},interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:18}},datalabels:{anchor:'end',align:'top',color:'#234e3a',font:{size:10,weight:'bold'},clip:false,display:c=>{const day=tank.daily[c.dataIndex],last=day.wells.findLastIndex(w=>w.volume!==null);return last===c.datasetIndex&&c.dataIndex%Math.max(1,Math.ceil(tank.daily.length/60))===0;},formatter:(_,c)=>tankNumber(tank.daily[c.dataIndex].total)},tooltip:{callbacks:{label:c=>c.dataset.label+': '+tankNumber(c.parsed.y)+' L',footer:items=>{const day=tank.daily[items[0].dataIndex];return 'Total estimado: '+tankNumber(day.total)+' L\nCobertura: '+day.measured+'/'+tank.wells.length+' poços medidos'+(day.complete?'':' · TOTAL PARCIAL');}}}},scales:{x:{stacked:true,grid:{display:false},title:{display:true,text:'DIA DA MEDIÇÃO'},ticks:{maxRotation:45,autoSkip:true,maxTicksLimit:45}},y:{stacked:true,beginAtZero:true,grace:'22%',title:{display:true,text:'ENTRADA ESTIMADA (LITROS/DIA)'},ticks:{callback:value=>tankNumber(value)},grid:{color:'#edf2ef'}}}}}));
  tankTable('tankWells'+id,['Poço','Vazão média medida','Dias medidos','Volume estimado','Participação'],tank.wells.map(well=>['Poço '+String(well.well).padStart(2,'0'),well.averageFlow===null?'Sem medição':tankNumber(well.averageFlow)+' L/h',well.days,well.total===null?'—':tankNumber(well.total)+' L',well.total!==null&&tank.total>0?(well.total/tank.total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—']));
  tankTable('tankDaily'+id,['Dia',...tank.wells.map(well=>'Poço '+String(well.well).padStart(2,'0')+' (L)'),'Total estimado (L)','Cobertura'],tank.daily.map(day=>[tankDate(day.date),...day.wells.map(well=>well.volume===null?'Sem medição':tankNumber(well.volume)),day.total===null?'Sem medição':tankNumber(day.total),day.complete?'Completo':day.measured+'/'+tank.wells.length+' poços · parcial']));
 }
}
function openTanksTab(){activeDashboardTab='tanks';for(const name of ['overview','daily','maintenance','meters','tanks']){document.getElementById('panel-'+name).hidden=name!=='tanks';document.getElementById('tab-'+name).setAttribute('aria-selected',String(name==='tanks'));}document.querySelectorAll('.export-btn').forEach(button=>button.hidden=true);renderTanks();}
