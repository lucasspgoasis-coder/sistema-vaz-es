function calculateMonthlyTrend(rows){
 const groups=new Map();
 for(const row of rows){if(!Number.isFinite(row.vazao)||!row.dateStr||!row.poco)continue;const month=row.dateStr.slice(0,7),key=row.poco+'|'+month;
  if(!groups.has(key))groups.set(key,{well:row.poco,month,total:0,count:0});const item=groups.get(key);item.total+=row.vazao;item.count++;
 }
 const items=[...groups.values()].map(item=>({...item,average:item.total/item.count})).sort((a,b)=>a.well.localeCompare(b.well,'pt-BR',{numeric:true})||a.month.localeCompare(b.month)),previous=new Map();
 return items.map(item=>{const prior=previous.get(item.well);previous.set(item.well,item);const d=new Date(item.month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);const comparable=prior?.month===d.toISOString().slice(0,7),delta=comparable?item.average-prior.average:null;return {...item,delta,percent:comparable&&prior.average!==0?delta/prior.average*100:null,status:!comparable?'Sem mês anterior':Math.abs(delta)<0.000001?'Manteve':delta>0?'Aumentou':'Diminuiu'};});
}
function trendAnnotation(item){
 const n=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:1});
 if(!item)return {color:'#647467',lines:[]};
 const arrow=item.delta===null?'•':item.status==='Manteve'?'→':item.delta>0?'↑':'↓';
 const signed=value=>(value>0?'+':'')+n(value);
 return {color:item.status==='Aumentou'?'#08714f':item.status==='Diminuiu'?'#c03935':'#647467',lines:[item.well+' · '+n(item.average)+' L/h',arrow+' '+item.status,item.delta===null?'Sem comparação':signed(item.delta)+' L/h · '+(item.percent===null?'% indisponível':signed(item.percent)+'%')]};
}
let trendChart=null,trendCharts=[];
function renderTrend(){
 const wellSelect=document.getElementById('trendWell'),yearSelect=document.getElementById('trendYear');
 const fill=(select,values)=>{const chosen=select.value;select.replaceChildren(new Option('Todos',''));for(const value of values)select.add(new Option(value,value));select.value=values.includes(chosen)?chosen:'';};
 fill(wellSelect,[...new Set(rawData.map(r=>r.poco))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true})));fill(yearSelect,[...new Set(rawData.map(r=>r.dateStr.slice(0,4)))].sort().reverse());
 const all=calculateMonthlyTrend(rawData),items=all.filter(r=>(!wellSelect.value||r.well===wellSelect.value)&&(!yearSelect.value||r.month.startsWith(yearSelect.value))),months=[...new Set(items.map(r=>r.month))].sort(),wells=[...new Set(items.map(r=>r.well))];
 if(months.length){const end=months.at(-1),cursor=new Date(months[0]+'-01T00:00:00Z');months.length=0;while(cursor.toISOString().slice(0,7)<=end){months.push(cursor.toISOString().slice(0,7));cursor.setUTCMonth(cursor.getUTCMonth()+1);}}
 const number=value=>value.toLocaleString('pt-BR',{maximumFractionDigits:2}),monthLabel=key=>key.slice(5)+'/'+key.slice(0,4);
 document.getElementById('trendEmpty').hidden=items.length>0;document.getElementById('trendCount').textContent=items.length+' médias mensais · '+wells.length+' poços';
 const body=document.getElementById('trendRows');body.replaceChildren();
 for(const item of items){const tr=document.createElement('tr');for(const value of [item.well,monthLabel(item.month),number(item.average)+' L/h',item.count,item.delta===null?'—':(item.delta>0?'+':'')+number(item.delta)+' L/h',item.percent===null?'—':(item.percent>0?'+':'')+number(item.percent)+'%',item.status]){const td=document.createElement('td');td.textContent=value;tr.append(td);}tr.lastChild.style.color=item.status==='Aumentou'?'#08714f':item.status==='Diminuiu'?'#b33c35':'#647467';body.append(tr);}
 for(const chart of trendCharts)chart.destroy();trendCharts=[];trendChart=null;
 const plots=document.getElementById('trendCharts');plots.replaceChildren();
 for(const [index,well] of wells.entries()){
  const pageMonths=months;
  const series=pageMonths.map(month=>items.find(r=>r.month===month&&r.well===well));if(!series.some(Boolean))continue;
  const section=document.createElement('section');section.className='trend-well-card';const heading=document.createElement('h4');heading.textContent=well;const symbol=document.createElement('span');symbol.className='chart-symbol';symbol.setAttribute('aria-hidden','true');symbol.innerHTML='<svg viewBox="0 0 24 24" focusable="false"><path d="M3 3v18h18M5 16l5-5 4 3 7-9M16 5h5v5"/></svg>';heading.append(symbol);section.append(heading);const period=document.createElement('p');period.className='trend-period-label';period.textContent=monthLabel(pageMonths[0])+' a '+monthLabel(pageMonths.at(-1));section.append(period);
  const scroll=document.createElement('div');scroll.className='trend-scroll';const plot=document.createElement('div');plot.className='trend-well-plot';plot.style.width='100%';const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Tendência mensal de '+well+' com variação em litros por hora e percentual');plot.append(canvas);scroll.append(plot);section.append(scroll);plots.append(section);
  const chart=new Chart(canvas,{type:'line',data:{labels:pageMonths.map(monthLabel),datasets:[{label:well,data:series.map(item=>item?.average??null),borderColor:getWellColor(index),backgroundColor:getWellColor(index),pointBackgroundColor:series.map(item=>trendAnnotation(item).color),pointBorderColor:'#fff',pointBorderWidth:2,tension:0.15,spanGaps:false,pointRadius:6}]},options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:95,left:65,right:65,bottom:65}},plugins:{datalabels:{display:context=>series[context.dataIndex]!=null?(series.length>18?'auto':true):false,align:context=>context.dataIndex%2?'bottom':'top',anchor:'end',offset:10,clip:false,color:context=>trendAnnotation(series[context.dataIndex]).color,backgroundColor:'#ffffffed',borderRadius:7,padding:7,textAlign:'center',font:{size:11,weight:'bold'},formatter:(value,context)=>{const item=series[context.dataIndex],annotation=trendAnnotation(item);return series.length>6&&item?[number(item.average)+' L/h',(item.delta===null?'•':item.status==='Manteve'?'→':item.delta>0?'↑':'↓')+' '+(item.percent===null?'—':(item.percent>0?'+':'')+number(item.percent)+'%')]:annotation.lines;}},legend:{display:false},tooltip:{callbacks:{label:context=>trendAnnotation(series[context.dataIndex]).lines}}},scales:{y:{beginAtZero:true,grace:'20%',title:{display:true,text:'Vazão média · L/h'}},x:{grid:{display:false}}}}});trendCharts.push(chart);
  const details=document.createElement('div');details.className='trend-month-details';
  series.forEach((item,i)=>{const cell=document.createElement('div'),date=document.createElement('strong');cell.className='trend-month-detail';date.textContent=monthLabel(pageMonths[i]);cell.append(date);if(item){const annotation=trendAnnotation(item);for(const line of [number(item.average)+' L/h',annotation.lines[1],annotation.lines[2]]){const text=document.createElement('span');text.textContent=line;text.style.color=annotation.color;cell.append(text);}}else{const empty=document.createElement('span');empty.textContent='Sem medição';cell.append(empty);}details.append(cell);});section.append(details);
 }
 trendChart=trendCharts[0]||null;
}
const baseSwitchDashboardTab=switchDashboardTab;
switchDashboardTab=function(tab){document.getElementById('panel-trend').hidden=tab!=='trend';document.getElementById('tab-trend').setAttribute('aria-selected',String(tab==='trend'));if(tab!=='trend'){baseSwitchDashboardTab(tab);return;}activeDashboardTab='trend';for(const name of ['overview','daily','maintenance','meters']){document.getElementById('panel-'+name).hidden=true;document.getElementById('tab-'+name).setAttribute('aria-selected','false');}document.querySelectorAll('.export-btn').forEach(button=>button.hidden=true);renderTrend();};
const baseApplyFlowFilters=applyFilters;
applyFilters=function(){if(activeDashboardTab==='trend'){renderTrend();return;}baseApplyFlowFilters();};

if(typeof window!=='undefined'){let trendResize;window.addEventListener('resize',()=>{clearTimeout(trendResize);trendResize=setTimeout(()=>{if(activeDashboardTab==='trend')renderTrend();},180);});}
