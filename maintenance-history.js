let maintenanceHistoryRows=[],maintenanceHistorySelection=0;
function maintenanceEventCard(record,index,key,date){
 const button=document.createElement('button');button.type='button';button.className='maintenance-event-card '+(!date?'event-undated':key==='NOVA MANUTENÇÃO'?'event-renewal':'event-service');
 const selected=index===maintenanceHistorySelection;button.classList.toggle('is-selected',selected);button.setAttribute('data-history-record',String(index));button.setAttribute('aria-pressed',String(selected));
 button.setAttribute('aria-label',maintenanceWell(record['POÇO'])+' · '+(key==='NOVA MANUTENÇÃO'?'Nova manutenção':'Manutenção')+' · '+(date?maintenanceDisplay(date):'Data não informada')+' · Abrir ficha '+(index+1));
 const type=document.createElement('span'),when=document.createElement('strong'),equipment=document.createElement('span'),reference=document.createElement('small');
 type.className='event-card-type';type.textContent=key==='NOVA MANUTENÇÃO'?'NOVA MANUTENÇÃO':'MANUTENÇÃO';when.textContent=date?maintenanceDisplay(date):'Sem data informada';equipment.className='event-card-equipment';equipment.textContent=[record.MODELO,record.CV].filter(Boolean).join(' · ')||'Equipamento sem identificação';reference.textContent='Ficha '+(index+1)+' · consultar detalhes';button.append(type,when,equipment,reference);button.onclick=()=>selectMaintenanceRecord(index);return button;
}
function renderMaintenanceEventBoard(rows){
 const target=document.getElementById('maintenanceEventBoard');target.replaceChildren();
 const allDates=rows.flatMap(row=>['MANUTENÇÃO','NOVA MANUTENÇÃO'].map(key=>maintenanceDate(row[key])).filter(Boolean)).sort();
 document.getElementById('technicalChartEmpty').hidden=!!rows.length;
 if(!rows.length)return;
 const months=[];if(allDates.length){let month=allDates[0].slice(0,7),last=allDates.at(-1).slice(0,7);while(month<=last){months.push(month);const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);month=next.toISOString().slice(0,7);}}
 const columns='145px '+(months.length?'repeat('+months.length+', 170px) ':'')+'200px';
 const header=document.createElement('div');header.className='event-board-header';header.style.gridTemplateColumns=columns;const corner=document.createElement('div');corner.className='event-board-well event-board-corner';corner.textContent='POÇO / EQUIPAMENTOS';header.append(corner);
 for(const month of months){const label=document.createElement('div');label.className='event-board-month';label.textContent=new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));header.append(label);}const unknown=document.createElement('div');unknown.className='event-board-month';unknown.textContent='DATA NÃO INFORMADA';header.append(unknown);target.append(header);
 const wells=[...new Set(rows.map(row=>maintenanceWell(row['POÇO'])))].sort();
 for(const well of wells){
  const records=rows.map((record,index)=>({record,index})).filter(item=>maintenanceWell(item.record['POÇO'])===well);
  const line=document.createElement('div');line.className='event-board-row';line.style.gridTemplateColumns=columns;const label=document.createElement('div');label.className='event-board-well';const icon=document.createElement('span'),title=document.createElement('strong'),count=document.createElement('small');icon.className='event-well-icon';icon.textContent='⚙';icon.setAttribute('aria-hidden','true');title.textContent=well;count.textContent=records.length+' ficha'+(records.length===1?'':'s')+' técnica'+(records.length===1?'':'s');label.append(icon,title,count);line.append(label);
  const buckets=new Map([...months.map(month=>[month,[]]),['undated',[]]]);
  for(const {record,index} of records)for(const key of ['MANUTENÇÃO','NOVA MANUTENÇÃO']){const date=maintenanceDate(record[key]);if(date)buckets.get(date.slice(0,7)).push({record,index,key,date});else if(key==='MANUTENÇÃO')buckets.get('undated').push({record,index,key,date:null});}
  for(const [month,events] of buckets){const cell=document.createElement('div');cell.className='event-board-cell'+(month==='undated'?' event-board-undated':'');events.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.index-b.index);for(const event of events)cell.append(maintenanceEventCard(event.record,event.index,event.key,event.date));line.append(cell);}target.append(line);
 }
}
function maintenanceHistoryField(label,value){const item=document.createElement('div');item.className='technical-field';const title=document.createElement('dt'),content=document.createElement('dd');title.textContent=label;content.textContent=value===undefined||value===null||value===''?'Não informado':String(value);item.append(title,content);return item;}
function selectMaintenanceRecord(index){
 const record=maintenanceHistoryRows[index];if(!record)return;maintenanceHistorySelection=index;
 document.getElementById('maintenanceRecordSelect').value=String(index);
 const target=document.getElementById('maintenanceTechnicalRecord');target.replaceChildren();
 const heading=document.createElement('div');heading.className='technical-record-heading';const well=document.createElement('h4'),badge=document.createElement('span');well.textContent=maintenanceWell(record['POÇO']);badge.className='technical-badge';badge.textContent='Ficha '+(index+1)+' de '+maintenanceHistoryRows.length;heading.append(well,badge);target.append(heading);
 const dates=document.createElement('div');dates.className='technical-dates';
 for(const [key,label] of [['MANUTENÇÃO','Data de manutenção'],['NOVA MANUTENÇÃO','Data da nova manutenção']]){const box=document.createElement('div'),title=document.createElement('span'),value=document.createElement('strong');title.textContent=label;value.textContent=record[key]||'Não informada';box.append(title,value);dates.append(box);}target.append(dates);
 const sections=[['Bomba e motor',[['MARCA DA BOMBA/ MOTOR','Identificação da bomba / motor'],['MODELO','Modelo · valor da planilha'],['CV','Potência']]],['Instalação e medições',[['PROFUNDIDADE (M)','Profundidade (m)'],['VAZÃO INICIAL','Vazão inicial · valor da planilha'],['NIVEL ESTATICO POÇO','Nível estático do poço'],['NIVEL DINAMICO','Nível dinâmico']]],['Equipe e responsabilidade',[['INSTALAÇÃO','Instalação'],['Responsavel (Tec.)','Responsável técnico']]]];
 const covered=new Set(['POÇO','MANUTENÇÃO','NOVA MANUTENÇÃO','__appRecordId']);
 for(const [label,fields] of sections){const section=document.createElement('section'),title=document.createElement('h5'),grid=document.createElement('dl');section.className='technical-section';title.textContent=label;grid.className='technical-fields';for(const [key,name] of fields){grid.append(maintenanceHistoryField(name,record[key]));covered.add(key);}section.append(title,grid);target.append(section);}
 for(const button of document.getElementById('maintenanceEventBoard').querySelectorAll('button[data-history-record]')){const selected=Number(button.getAttribute('data-history-record'))===index;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('is-selected',selected);}
 const extra=Object.entries(record).filter(([key])=>!covered.has(key));if(extra.length){const grid=document.createElement('dl');grid.className='technical-fields';extra.forEach(([key,value])=>grid.append(maintenanceHistoryField(key,value)));target.append(grid);}
}
function renderMaintenanceHistory(rows){
 maintenanceHistoryRows=rows;const select=document.getElementById('maintenanceRecordSelect');select.replaceChildren();
 rows.forEach((record,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=maintenanceWell(record['POÇO'])+' · '+(record['MANUTENÇÃO']||'Sem data de manutenção')+' · '+(record['MODELO']||'Equipamento sem modelo')+' · registro '+(index+1);select.append(option);});
 select.disabled=!rows.length;select.onchange=()=>selectMaintenanceRecord(Number(select.value));
 maintenanceMetric('technicalRecordCount',rows.length);maintenanceMetric('technicalWellCount',new Set(rows.map(row=>maintenanceWell(row['POÇO']))).size);maintenanceMetric('technicalUndatedCount',rows.filter(row=>!maintenanceDate(row['MANUTENÇÃO'])).length);
 if(rows.length)selectMaintenanceRecord(Math.min(maintenanceHistorySelection,rows.length-1));else{maintenanceHistorySelection=0;const target=document.getElementById('maintenanceTechnicalRecord');target.replaceChildren();const message=document.createElement('p');message.className='empty';message.textContent='Nenhum registro técnico para o poço selecionado.';target.append(message);}
 renderMaintenanceEventBoard(rows);
}
