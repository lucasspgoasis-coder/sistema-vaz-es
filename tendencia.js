function calculateMonthlyTrend(rows){
 const groups=new Map();
 for(const row of rows){if(!Number.isFinite(row.vazao)||!row.dateStr||!row.poco)continue;const month=row.dateStr.slice(0,7),key=row.poco+'|'+month;
  if(!groups.has(key))groups.set(key,{well:row.poco,month,total:0,count:0});const item=groups.get(key);item.total+=row.vazao;item.count++;
 }
 const items=[...groups.values()].map(item=>({...item,average:item.total/item.count})).sort((a,b)=>a.well.localeCompare(b.well,'pt-BR',{numeric:true})||a.month.localeCompare(b.month)),previous=new Map();
 return items.map(item=>{const prior=previous.get(item.well);previous.set(item.well,item);const d=new Date(item.month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);const comparable=prior?.month===d.toISOString().slice(0,7),delta=comparable?item.average-prior.average:null;return {...item,delta,percent:comparable&&prior.average!==0?delta/prior.average*100:null,status:!comparable?'Sem mês anterior':Math.abs(delta)<0.000001?'Manteve':delta>0?'Aumentou':'Diminuiu'};});
}
let trendChart=null;
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
 if(trendChart)trendChart.destroy();
 trendChart=new Chart(document.getElementById('trendChart'),{type:'line',data:{labels:months.map(monthLabel),datasets:wells.map((well,index)=>({label:well,data:months.map(month=>items.find(r=>r.month===month&&r.well===well)?.average??null),borderColor:getWellColor(index),backgroundColor:getWellColor(index),tension:0.15,spanGaps:false,pointRadius:5}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{datalabels:{display:wells.length===1,align:'top',formatter:value=>value===null?'':number(value)},legend:{position:'bottom'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Vazão média · L/h'}}}}});
}
const baseSwitchDashboardTab=switchDashboardTab;
switchDashboardTab=function(tab){document.getElementById('panel-trend').hidden=tab!=='trend';document.getElementById('tab-trend').setAttribute('aria-selected',String(tab==='trend'));if(tab!=='trend'){baseSwitchDashboardTab(tab);return;}activeDashboardTab='trend';for(const name of ['overview','daily','maintenance','meters']){document.getElementById('panel-'+name).hidden=true;document.getElementById('tab-'+name).setAttribute('aria-selected','false');}document.querySelectorAll('.export-btn').forEach(button=>button.hidden=true);renderTrend();};
const baseApplyFlowFilters=applyFilters;
applyFilters=function(){if(activeDashboardTab==='trend'){renderTrend();return;}baseApplyFlowFilters();};
