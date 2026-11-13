const TANK_CONFIG=[{id:'03',name:'Tanque 03',wells:[1,3,4,5,6,11,12],color:'#177c9a'},{id:'04',name:'Tanque 04',wells:[7,8,9,10,14],color:'#25845c'}];
const tankFilters={start:'',end:'',day:'',hours:24};
let tankCharts=[];
let tankHourSettings={wells:{},days:{}};
const tankEditorDates={};
let tankRoutes=[];
let tankDaySplits={};
let tankSplitRows=[];
function tankShowDistributedDay(date){tankFilters.day=date;document.getElementById('tankExactDate').value=date;tankEditorDates['03']=date;tankEditorDates['04']=date;}
function applyTankSplitTable(){
 if(!tankSplitRows.length){tankText('tankSplitStatus','Não há poços com vazão medida neste dia.');return;}
 if(tankSplitRows.some(row=>row.inputs.some(input=>input.value===''||!input.checkValidity())||!validTankSplit({'03':Number(row.inputs[0].value),'04':Number(row.inputs[1].value)}))){tankText('tankSplitStatus','Confira todas as linhas: cada poço pode distribuir no máximo 24 horas por dia.');return;}
 const date=document.getElementById('tankSplitDate').value;
 for(const row of tankSplitRows)tankDaySplits[date+':'+row.well]={'03':Number(row.inputs[0].value),'04':Number(row.inputs[1].value)};
 tankShowDistributedDay(date);saveTankSplits();renderTanks();
}
function validTankSplit(split){return split&&Number.isFinite(split['03'])&&Number.isFinite(split['04'])&&split['03']>=0&&split['04']>=0&&split['03']+split['04']<=24+1e-9;}
try{const saved=JSON.parse(localStorage.getItem('oasis.tankSplits.v1')||'{}');for(const [key,split] of Object.entries(saved))if(/^\d{4}-\d{2}-\d{2}:\d+$/.test(key)&&validTankSplit(split))tankDaySplits[key]={'03':split['03'],'04':split['04']};}catch(error){console.warn('Não foi possível ler as divisões diárias salvas.',error);}
function saveTankSplits(){try{localStorage.setItem('oasis.tankSplits.v1',JSON.stringify(tankDaySplits));tankText('tankSplitStatus','Divisão diária salva neste navegador. Gráficos e totais recalculados.');}catch{tankText('tankSplitStatus','Divisão aplicada nesta sessão; não foi possível salvar no navegador.');}}

function saveTankSplitInputs(well,date,h3,h4){
 const split={'03':Number(h3.value),'04':Number(h4.value)};
 if(!well||!date.value||!date.checkValidity()||h3.value===''||h4.value===''||!h3.checkValidity()||!h4.checkValidity()||!validTankSplit(split)){tankText('tankSplitStatus','Informe poço, data e horas dos dois tanques. A soma deve ficar entre 0 e 24 horas no mesmo dia.');return;}
 if(!rawData.some(row=>tankWellNumber(row.poco)===well&&row.dateStr===date.value&&Number.isFinite(row.vazao)&&row.vazao>=0)){tankText('tankSplitStatus','Este poço não possui vazão medida na data selecionada. Escolha um dia com medição para calcular os volumes.');return;}
 tankDaySplits[date.value+':'+well]=split;tankShowDistributedDay(date.value);saveTankSplits();renderTanks();
}
function renderTankSplitEditor(){
 const date=document.getElementById('tankSplitDate');
 tankSplitRows=[];
 if(!date.value)date.value=tankFilters.day||rawData.filter(row=>Number.isFinite(row.vazao)&&row.vazao>=0).map(row=>row.dateStr).sort().at(-1)||'';
 const readings=new Map();for(const row of rawData){if(row.dateStr!==date.value||!Number.isFinite(row.vazao)||row.vazao<0)continue;const well=tankWellNumber(row.poco);if(!well)continue;if(!readings.has(well))readings.set(well,[]);readings.get(well).push(row.vazao);}
 tankTable('tankSplitEditor',['Poço','Vazão diária','Horas → Tanque 03','Horas → Tanque 04','Tempo total ligado','Volume → Tanque 03','Volume → Tanque 04','Ação'],[...readings].sort(([a],[b])=>a-b).map(([well,values])=>{
  const flow=values.reduce((sum,value)=>sum+value,0)/values.length,split=tankDaySplits[date.value+':'+well],hours=tankHoursFor(well,date.value,tankFilters.hours),destination=tankDestination(well,date.value);
  const inputs=['03','04'].map(id=>{const input=document.createElement('input');input.type='number';input.min='0';input.max='24';input.step='0.01';input.required=true;input.className='tank-hours-input';input.value=String(split?split[id]:destination===id?hours:0);input.setAttribute('aria-label','Horas do Poço '+String(well).padStart(2,'0')+' para o tanque '+id+' em '+tankDate(date.value));return input;});
  tankSplitRows.push({well,inputs});
  const sum=document.createElement('strong'),v3=document.createElement('span'),v4=document.createElement('span'),save=document.createElement('button');save.type='button';save.textContent='Salvar poço';save.setAttribute('aria-label','Salvar divisão diária do Poço '+String(well).padStart(2,'0'));
  const preview=()=>{const a=Number(inputs[0].value),b=Number(inputs[1].value),valid=inputs.every(input=>input.value!==''&&input.checkValidity())&&validTankSplit({'03':a,'04':b});sum.textContent=valid?(a+b).toLocaleString('pt-BR')+' h':'Confira as horas (máx. 24h)';v3.textContent=valid?tankNumber(flow*a)+' L':'—';v4.textContent=valid?tankNumber(flow*b)+' L':'—';save.disabled=!valid;};inputs.forEach(input=>input.oninput=preview);preview();
  save.onclick=()=>saveTankSplitInputs(well,date,inputs[0],inputs[1]);
  return ['Poço '+String(well).padStart(2,'0'),tankFlow(flow)+' L/h',...inputs,sum,v3,v4,save];
 }));
}
function renderTankSplits(){
 tankTable('tankSplitHistory',['Dia','Poço','Tanque 03','Tanque 04','Total ligado / desligado','Ações'],Object.entries(tankDaySplits).sort(([a],[b])=>b.localeCompare(a)).map(([key,split])=>{const [date,well]=key.split(':'),sum=split['03']+split['04'],actions=document.createElement('div');actions.className='tank-split-actions';const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';edit.onclick=()=>{document.getElementById('tankSplitDate').value=date;renderTankSplitEditor();document.getElementById('tankSplitDate').focus();};const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.onclick=()=>{delete tankDaySplits[key];saveTankSplits();renderTanks();};actions.append(edit,remove);return [tankDate(date),'Poço '+well.padStart(2,'0'),split['03'].toLocaleString('pt-BR')+' h',split['04'].toLocaleString('pt-BR')+' h',sum.toLocaleString('pt-BR')+' h ligado / '+Number((24-sum).toFixed(2)).toLocaleString('pt-BR')+' h desligado',actions];}));
 renderTankSplitEditor();
}
function tankAllocation(well,date,tankId,hours,hourSettings,routes,splits){const split=splits[date+':'+well];if(split){const sum=split['03']+split['04'];return {assigned:split[tankId]>0||(sum===0&&tankDestination(well,date,routes)===tankId),hours:split[tankId],split:true};}return {assigned:tankDestination(well,date,routes)===tankId,hours:tankHoursFor(well,date,hours,hourSettings),split:false};}
try{const saved=JSON.parse(localStorage.getItem('oasis.tankRoutes.v1')||'[]');if(Array.isArray(saved))for(const route of saved){if(Number.isInteger(route.well)&&route.well>0&&['03','04'].includes(route.tank)&&(!route.start||/^\d{4}-\d{2}-\d{2}$/.test(route.start))&&(!route.end||/^\d{4}-\d{2}-\d{2}$/.test(route.end))&&(!route.start||!route.end||route.start<=route.end)&&!tankRoutes.some(existing=>existing.well===route.well&&(existing.start||'0000')<=(route.end||'9999')&&(route.start||'0000')<=(existing.end||'9999')))tankRoutes.push({well:route.well,tank:route.tank,start:route.start||'',end:route.end||''});}}catch(error){console.warn('Não foi possível ler os direcionamentos salvos.',error);}
function tankDestination(well,date,routes=tankRoutes){const route=routes.find(item=>item.well===well&&(!item.start||date>=item.start)&&(!item.end||date<=item.end));return route?route.tank:TANK_CONFIG.find(tank=>tank.wells.includes(well))?.id;}
function saveTankRoutes(){try{localStorage.setItem('oasis.tankRoutes.v1',JSON.stringify(tankRoutes));tankText('tankRouteStatus','Direcionamentos salvos neste navegador.');}catch{tankText('tankRouteStatus','Direcionamentos aplicados nesta sessão; não foi possível salvar no navegador.');}}
function addTankRoute(){
 const well=Number(document.getElementById('tankRouteWell').value),tank=document.getElementById('tankRouteTarget').value,start=document.getElementById('tankRouteStart'),end=document.getElementById('tankRouteEnd');
 if(!well||!['03','04'].includes(tank)||!start.checkValidity()||!end.checkValidity()||(start.value&&end.value&&start.value>end.value)){tankText('tankRouteStatus','Selecione um poço e confira as datas do período.');return;}
 if(tankRoutes.some(route=>route.well===well&&(route.start||'0000')<=(end.value||'9999')&&(start.value||'0000')<=(route.end||'9999'))){tankText('tankRouteStatus','Este poço já tem um direcionamento nesse período. Remova o registro anterior ou escolha datas sem sobreposição.');return;}
 tankRoutes.push({well,tank,start:start.value,end:end.value});saveTankRoutes();renderTanks();
}
function renderTankRoutes(){
 const select=document.getElementById('tankRouteWell');if(!select)return;const previous=select.value;select.replaceChildren();
 const all=[...new Set(rawData.filter(row=>Number.isFinite(row.vazao)&&row.vazao>=0).map(row=>tankWellNumber(row.poco)).filter(Boolean))].sort((a,b)=>a-b);
 for(const well of all){const option=document.createElement('option');option.value=String(well);option.textContent='Poço '+String(well).padStart(2,'0');select.append(option);}select.value=all.includes(Number(previous))?previous:String(all[0]||'');select.disabled=!all.length;
 tankTable('tankRouteHistory',['Poço','Destino no período','Início (inclusive)','Fim (inclusive)','Ação'],tankRoutes.map((route,index)=>{const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.setAttribute('aria-label','Remover direcionamento do Poço '+route.well+' ao Tanque '+route.tank);remove.onclick=()=>{tankRoutes.splice(index,1);saveTankRoutes();renderTanks();};return ['Poço '+String(route.well).padStart(2,'0'),'Tanque '+route.tank,route.start?tankDate(route.start):'Desde o início dos dados',route.end?tankDate(route.end):'Sem data final',remove];}));
}
try{const saved=JSON.parse(localStorage.getItem('oasis.tankHours.v1')||'null');if(saved)for(const kind of ['wells','days'])for(const [key,value] of Object.entries(saved[kind]||{})){if(Number.isFinite(value)&&value>=0&&value<=24&&/^(\d+|\d{4}-\d{2}-\d{2}:\d+)$/.test(key))tankHourSettings[kind][key]=value;}}catch(error){console.warn('Não foi possível ler os horários salvos.',error);}
function tankHoursFor(well,date,defaultHours=24,settings=tankHourSettings){return settings.days[date+':'+well]??settings.wells[well]??defaultHours;}
function saveTankHours(){try{localStorage.setItem('oasis.tankHours.v1',JSON.stringify(tankHourSettings));tankText('tankHoursStatus','Horários salvos neste navegador.');}catch{tankText('tankHoursStatus','Horários aplicados nesta sessão; o navegador não permitiu salvar.');}}
function tankHoursInput(well,date=''){
 const input=document.createElement('input');input.type='number';input.min='0';input.max='24';input.step='0.01';input.className='tank-hours-input';
 const key=date?date+':'+well:String(well),kind=date?'days':'wells';input.value=tankHourSettings[kind][key]??'';input.placeholder=String(date?(tankHourSettings.wells[well]??tankFilters.hours):tankFilters.hours);
 input.setAttribute('aria-label','Horas de funcionamento do Poço '+String(well).padStart(2,'0')+(date?' em '+tankDate(date):' por dia'));
 input.onchange=()=>{if(!input.checkValidity()){input.reportValidity();return;}if(input.value==='')delete tankHourSettings[kind][key];else tankHourSettings[kind][key]=Number(input.value);saveTankHours();renderTanks();};return input;
}
function resetTankHours(){tankHourSettings={wells:{},days:{}};saveTankHours();renderTanks();}
function tankWellNumber(name){const match=String(name).match(/\d+/);return match?Number(match[0]):null;}
function tankNumber(value){return Number(value).toLocaleString('pt-BR',{maximumFractionDigits:0});}
function tankFlow(value){return Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2});}
function tankDate(iso){return iso.split('-').reverse().join('/');}
function calculateTankData(rows,start='',end='',hours=24,hourSettings=tankHourSettings,routes=tankRoutes,splits=tankDaySplits){
 const days=new Map();
 const candidates=[...new Set([...TANK_CONFIG.flatMap(tank=>tank.wells),...routes.map(route=>route.well),...Object.keys(splits).map(key=>Number(key.split(':')[1]))])].sort((a,b)=>a-b);
 for(const row of rows){if((start&&row.dateStr<start)||(end&&row.dateStr>end))continue;const well=tankWellNumber(row.poco);if(!candidates.includes(well)||!Number.isFinite(row.vazao)||row.vazao<0)continue;if(!days.has(row.dateStr))days.set(row.dateStr,new Map());const wells=days.get(row.dateStr);if(!wells.has(well))wells.set(well,[]);wells.get(well).push(row.vazao);}
 const dates=[];if(days.size){let day=[...days.keys()].sort()[0],last=[...days.keys()].sort().at(-1);while(day<=last){dates.push(day);const next=new Date(day+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);day=next.toISOString().slice(0,10);}}
 return TANK_CONFIG.map(tank=>{
  const daily=dates.map(date=>{const values=days.get(date)||new Map();const assigned=candidates.filter(well=>tankAllocation(well,date,tank.id,hours,hourSettings,routes,splits).assigned);const wells=assigned.map(well=>{const readings=values.get(well),allocation=tankAllocation(well,date,tank.id,hours,hourSettings,routes,splits),runHours=allocation.hours;return {well,hours:runHours,split:allocation.split,flow:readings?readings.reduce((sum,v)=>sum+v,0)/readings.length:null,volume:readings?readings.reduce((sum,v)=>sum+v,0)/readings.length*runHours:null};});const measured=wells.filter(w=>w.volume!==null);return {date,wells,total:measured.length?measured.reduce((sum,w)=>sum+w.volume,0):null,flow:measured.length?measured.reduce((sum,w)=>sum+w.flow,0):null,measured:measured.length,expected:assigned.length,complete:assigned.length>0&&measured.length===assigned.length};});
  const known=daily.filter(day=>day.total!==null),total=known.reduce((sum,day)=>sum+day.total,0);
  const wells=candidates.map(well=>{const measured=daily.map(day=>day.wells.find(w=>w.well===well)).filter(w=>w&&w.volume!==null);return {well,days:measured.length,total:measured.length?measured.reduce((sum,w)=>sum+w.volume,0):null,averageFlow:measured.length?measured.reduce((sum,w)=>sum+w.flow,0)/measured.length:null,allocatedHours:measured.reduce((sum,w)=>sum+w.hours,0)};}).filter(well=>well.days>0);
  return {...tank,daily,wells,total:known.length?total:null,average:known.length?total/known.length:null,peak:known.reduce((best,day)=>!best||day.total>best.total?day:best,null),knownDays:known.length,completeDays:known.filter(day=>day.complete).length};
 });
}
function tankFilterChanged(){
 const start=document.getElementById('tankStart'),end=document.getElementById('tankEnd'),day=document.getElementById('tankExactDate'),hours=document.getElementById('tankHours');
 if(!start.checkValidity()||!end.checkValidity()||!day.checkValidity()||!hours.checkValidity()){document.getElementById('tankFilterError').textContent='Confira as datas e informe de 0 a 24 horas por dia.';return;}
 if(!day.value&&start.value&&end.value&&start.value>end.value){document.getElementById('tankFilterError').textContent='A data final deve ser igual ou posterior à data inicial.';return;}
 tankFilters.start=start.value;tankFilters.end=end.value;tankFilters.day=day.value;tankFilters.hours=Number(hours.value);document.getElementById('tankFilterError').textContent='';renderTanks();
}
function resetTankFilters(){tankFilters.start='';tankFilters.end='';tankFilters.day='';tankFilters.hours=24;document.getElementById('tankStart').value='';document.getElementById('tankEnd').value='';document.getElementById('tankExactDate').value='';document.getElementById('tankHours').value='24';document.getElementById('tankFilterError').textContent='';renderTanks();}
function tankWellColor(well){return WELL_COLORS[(well-1)%WELL_COLORS.length];}
function tankText(id,value){document.getElementById(id).textContent=value;}
function renderTankDailyEditor(tank){
 const select=document.getElementById('tankEditDate'+tank.id);select.replaceChildren();
 if(!tank.daily.some(day=>day.date===tankEditorDates[tank.id]))tankEditorDates[tank.id]=tank.daily.at(-1)?.date||'';
 for(const day of tank.daily){const option=document.createElement('option');option.value=day.date;option.textContent=tankDate(day.date);select.append(option);}select.value=tankEditorDates[tank.id];select.disabled=!tank.daily.length;
 select.onchange=()=>{tankEditorDates[tank.id]=select.value;renderTankDailyEditor(tank);};
 const day=tank.daily.find(item=>item.date===tankEditorDates[tank.id]);
 tankText('tankDayFlow'+tank.id,day&&day.flow!==null?tankFlow(day.flow)+' L/h'+(day.complete?'':' · parcial'):'Sem medição');
 tankText('tankDayVolume'+tank.id,day&&day.total!==null?tankNumber(day.total)+' L':'Sem medição');
 tankTable('tankHoursDaily'+tank.id,['Poço','Vazão diária medida (L/h)','Horas enviando para este tanque','Cálculo do volume diário'],day?day.wells.filter(well=>well.flow!==null).map(well=>['Poço '+String(well.well).padStart(2,'0'),well.flow===null?'Sem medição':tankFlow(well.flow)+' L/h',well.split?well.hours.toLocaleString('pt-BR')+' h · ajuste na divisão diária entre tanques':tankHoursInput(well.well,day.date),well.volume===null?'Sem vazão medida para calcular':tankFlow(well.flow)+' L/h × '+well.hours.toLocaleString('pt-BR')+' h = '+tankNumber(well.volume)+' L']):[]);
}
function tankTable(id,headers,rows){const table=document.getElementById(id);table.replaceChildren();const head=document.createElement('thead'),title=document.createElement('tr'),body=document.createElement('tbody');headers.forEach(text=>{const th=document.createElement('th');th.scope='col';th.textContent=text;title.append(th);});head.append(title);for(const cells of rows){const tr=document.createElement('tr');for(const text of cells){const td=document.createElement('td');if(text&&typeof text==='object')td.append(text);else td.textContent=text;tr.append(td);}body.append(tr);}if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=headers.length;td.textContent=id==='tankRouteHistory'?'Nenhum período cadastrado. Os cálculos usam os destinos atuais.':id==='tankSplitHistory'?'Nenhuma divisão diária cadastrada. Use a tabela para repartir as horas entre os tanques.':'Nenhuma medição disponível no período selecionado.';tr.append(td);body.append(tr);}table.append(head,body);}
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
 renderTankRoutes();renderTankSplits();
 const results=calculateTankData(rawData,tankFilters.day||tankFilters.start,tankFilters.day||tankFilters.end,tankFilters.hours);
 const dates=results[0].daily.map(day=>day.date);tankText('tankPeriod',tankFilters.day?tankDate(tankFilters.day)+(dates.length?' · somente este dia':' · nenhuma medição registrada'):dates.length?tankDate(dates[0])+' a '+tankDate(dates.at(-1)):'Nenhum dado no período');
 tankText('tankEstimateNote','Estimativa: vazão média medida no dia (L/h) × horas de funcionamento do poço naquele dia. Prioridade: divisão diária entre tanques → ajuste do dia → padrão do poço → padrão geral ('+tankFilters.hours+' h/dia). Os volumes respeitam a distribuição configurada e as divisões diárias entre tanques.');
 for(const tank of results){
  const id=tank.id,known=tank.total!==null;
  tankText('tankAllocatedHours'+id,known?tank.wells.reduce((sum,well)=>sum+well.allocatedHours,0).toLocaleString('pt-BR',{maximumFractionDigits:2})+' h-poço':'—');
  tankText('tankTotal'+id,known?tankNumber(tank.total)+' L':'—');tankText('tankAverage'+id,known?tankNumber(tank.average)+' L/dia':'—');tankText('tankPeak'+id,tank.peak?tankNumber(tank.peak.total)+' L':'—');tankText('tankPeakDate'+id,tank.peak?tankDate(tank.peak.date):'Sem medições');tankText('tankCoverage'+id,tank.completeDays+' / '+tank.daily.length);tankText('tankCoverageNote'+id,'dias com todos os poços direcionados medidos');
  tankText('tankSources'+id,tank.wells.length?'Poços com vazão registrada neste tanque no período: '+tank.wells.map(well=>String(well.well).padStart(2,'0')).join(', ')+'.':'Sem poços com vazão registrada para este tanque no período.');
  drawTank(tank);
  document.getElementById('tankEmpty'+id).hidden=known;
  document.getElementById('tankEmpty'+id).textContent=tankFilters.day?'Nenhuma vazão registrada para este tanque em '+tankDate(tankFilters.day)+'. Nenhum poço é exibido.':'Nenhuma medição disponível para este tanque no período selecionado.';
  document.getElementById('tankPlot'+id).parentElement.hidden=!known;
  document.getElementById('tankPlot'+id).style.width=Math.min(14000,Math.max(700,tank.daily.length*75))+'px';
  const datasets=tank.wells.map(well=>({label:'Poço '+String(well.well).padStart(2,'0'),data:tank.daily.map(day=>day.wells.find(item=>item.well===well.well)?.volume??null),backgroundColor:tankWellColor(well.well),borderRadius:2,maxBarThickness:55}));
  tankCharts.push(new Chart(document.getElementById('tankChart'+id),{type:'bar',data:{labels:tank.daily.map(day=>tankDate(day.date)),datasets},options:{responsive:true,maintainAspectRatio:false,devicePixelRatio:1,animation:false,layout:{padding:{top:40,right:25,left:10}},interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{boxWidth:12,padding:18}},datalabels:{anchor:'end',align:'top',color:'#234e3a',font:{size:10,weight:'bold'},clip:false,display:c=>{const day=tank.daily[c.dataIndex],last=tank.wells.findLastIndex(w=>day.wells.some(item=>item.well===w.well&&item.volume!==null));return last===c.datasetIndex&&c.dataIndex%Math.max(1,Math.ceil(tank.daily.length/60))===0;},formatter:(_,c)=>tankNumber(tank.daily[c.dataIndex].total)},tooltip:{callbacks:{label:c=>{const well=tank.daily[c.dataIndex].wells.find(w=>w.well===tank.wells[c.datasetIndex].well);return c.dataset.label+': '+tankFlow(well.flow)+' L/h × '+well.hours.toLocaleString('pt-BR')+' h = '+tankNumber(c.parsed.y)+' L';},footer:items=>{const day=tank.daily[items[0].dataIndex];return 'Total estimado: '+tankNumber(day.total)+' L\nCobertura: '+day.measured+'/'+day.expected+' poços medidos'+(day.complete?'':' · TOTAL PARCIAL');}}}},scales:{x:{stacked:true,grid:{display:false},title:{display:true,text:'DIA DA MEDIÇÃO'},ticks:{maxRotation:45,autoSkip:true,maxTicksLimit:45}},y:{stacked:true,beginAtZero:true,grace:'22%',title:{display:true,text:'ENTRADA ESTIMADA (LITROS/DIA)'},ticks:{callback:value=>tankNumber(value)},grid:{color:'#edf2ef'}}}}}));
  tankTable('tankWells'+id,['Poço','Vazão média medida','Horas destinadas a este tanque','Dias medidos','Volume estimado','Participação'],tank.wells.map(well=>['Poço '+String(well.well).padStart(2,'0'),well.averageFlow===null?'Sem medição':tankFlow(well.averageFlow)+' L/h',well.allocatedHours.toLocaleString('pt-BR',{maximumFractionDigits:2})+' h',well.days,well.total===null?'—':tankNumber(well.total)+' L',well.total!==null&&tank.total>0?(well.total/tank.total*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—']));
  renderTankDailyEditor(tank);
  tankTable('tankDaily'+id,['Dia',...tank.wells.map(well=>'Poço '+String(well.well).padStart(2,'0')+' · cálculo diário'),'Soma das vazões (L/h)','Total estimado (L)','Cobertura'],tank.daily.map(day=>[tankDate(day.date),...tank.wells.map(item=>{const well=day.wells.find(w=>w.well===item.well);return !well?'Outro destino':well.volume===null?'Sem medição':tankFlow(well.flow)+' L/h × '+well.hours.toLocaleString('pt-BR')+' h = '+tankNumber(well.volume)+' L';}),day.flow===null?'Sem medição':tankFlow(day.flow),day.total===null?'Sem medição':tankNumber(day.total),day.complete?'Completo':day.measured+'/'+day.expected+' poços · parcial']));
 }
}
function openTanksTab(){activeDashboardTab='tanks';for(const name of ['overview','daily','maintenance','meters','tanks']){document.getElementById('panel-'+name).hidden=name!=='tanks';document.getElementById('tab-'+name).setAttribute('aria-selected',String(name==='tanks'));}document.querySelectorAll('.export-btn').forEach(button=>button.hidden=true);renderTanks();}
