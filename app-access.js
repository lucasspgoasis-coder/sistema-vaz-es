const OASIS_API='https://oasis-vazao-cadastros-20261114.snappylace5.chatgpt.site';
let appRole='visitor',appToken='',appRecords=[],sheetFlowRows=[],sheetMaintenanceRows=[],sheetAnalysisRows=[],appSyncBusy=false,appSaving=false,registryPage=0,installPrompt=null;
let flowSheetReady=false,maintenanceSheetReady=false;
const registryPageSize=30;
function appToday(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Fortaleza'}).format(new Date());}
function appWellNumber(value){return Number(String(value).match(/\d+/)?.[0]||0);}
function appWellName(value){return 'Poço '+String(value).padStart(2,'0');}
function appDate(value){return value?value.split('-').reverse().join('/'):'—';}
function appStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function appRead(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}}
function appMessage(id,text){const target=document.getElementById(id);if(target)target.textContent=text;}
async function appAPI(path,options={}){
 const headers={'Content-Type':'application/json',...(appToken?{Authorization:'Bearer '+appToken}:{})};
 const response=await fetch(OASIS_API+path,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok){if(response.status===401&&path!=='/api/login'){appToken='';appRole='visitor';sessionStorage.removeItem('oasis.manager.token');updateAppRole();}throw Error(data.error||'Não foi possível concluir a operação.');}return data;
}
function captureFlowSheet(){
 sheetFlowRows=rawData.filter(row=>!row.appRecordId).map(row=>({...row}));flowSheetReady=true;
 appStore('oasis.sheet.flow.v1',sheetFlowRows.map(row=>({...row,dateObj:undefined})));
 mergeAppData();
}
function restoreCachedFlow(){
 const cached=appRead('oasis.sheet.flow.v1',[]);sheetFlowRows=cached.map(row=>({...row,dateObj:new Date(row.dateStr+'T00:00:00')}));flowSheetReady=true;mergeAppData();
 return sheetFlowRows.length;
}
function captureMaintenanceSheet(){
 sheetMaintenanceRows=maintenanceBase.filter(row=>!row.__appRecordId).map(row=>({...row}));sheetAnalysisRows=maintenanceAnalysis.filter(row=>!row.__appRecordId).map(row=>({...row}));maintenanceSheetReady=true;
 appStore('oasis.sheet.maintenance.v1',{base:sheetMaintenanceRows,analysis:sheetAnalysisRows});mergeAppData();
}
function appFlowRow(record){const value=record.payload,d=new Date(value.date+'T00:00:00');return {id:record.id,appRecordId:record.id,dateObj:d,dateStr:value.date,dateDisplay:appDate(value.date),ano:d.getFullYear(),mes:d.getMonth()+1,semana:weekInfo(d).week,poco:appWellName(value.well),vazao:value.flow};}
function appMaintenanceRow(record){const value=record.payload;return {'MANUTENÇÃO':appDate(value.date),'POÇO':String(value.well),'MARCA DA BOMBA/ MOTOR':value.equipment,'MODELO':value.model,'CV':value.power,'PROFUNDIDADE (M)':value.depth,'INSTALAÇÃO':value.installer,'VAZÃO INICIAL':value.initialFlow,'NIVEL ESTATICO POÇO':value.staticLevel,'NIVEL DINAMICO':value.dynamicLevel,'NOVA MANUTENÇÃO':value.newDate?appDate(value.newDate):'','Responsavel (Tec.)':value.technician,'Observações':value.notes,__appRecordId:record.id};}
function mergeAppData(){
 const ordered=[...appRecords].sort((a,b)=>a.seq-b.seq),latestFlow=new Map(),latestStops=new Map();
 ordered.forEach(record=>{if(record.kind==='flow')latestFlow.set(record.well+':'+record.payload.date,record);if(record.kind==='downtime')latestStops.set(record.well+':'+record.payload.start,record);});
 rawData=[...sheetFlowRows.filter(row=>!latestFlow.has(appWellNumber(row.poco)+':'+row.dateStr)),...Array.from(latestFlow.values(),appFlowRow)].sort((a,b)=>a.dateStr.localeCompare(b.dateStr));
 maintenanceBase=[...sheetMaintenanceRows,...ordered.filter(record=>record.kind==='maintenance').map(appMaintenanceRow)];
 maintenanceAnalysis=sheetAnalysisRows.map(row=>({...row}));
 for(const record of latestStops.values()){const p=record.payload;const original=maintenanceAnalysis.find(row=>appWellNumber(row['Poços Parados'])===p.well&&maintenanceDate(row.Inicio)===p.start);const patch={'Poços Parados':appWellName(p.well),Inicio:appDate(p.start),Fim:p.end?appDate(p.end):'',Observações:p.notes,__appRecordId:record.id};if(original)Object.assign(original,patch);else maintenanceAnalysis.push(patch);}
}
async function syncAppRecords(){
 if(appSyncBusy)return;appSyncBusy=true;setAppSyncState('syncing','Atualizando dados…');
 try{
  let cursor=0,records=[];do{const page=await appAPI('/api/records?after='+cursor+'&limit=500');records.push(...page.records);cursor=page.nextCursor;}while(cursor!==null);
  appRecords=[...new Map([...appRecords,...records].map(record=>[record.id,record])).values()].sort((a,b)=>a.seq-b.seq);appStore('oasis.records.v1',appRecords);appStore('oasis.records.syncedAt',new Date().toISOString());mergeAppData();refreshAppViews();
  appMessage('registrySyncNote','Histórico sincronizado com o servidor. Os lançamentos são compartilhados entre os dispositivos; as planilhas originais permanecem sem alteração.');
  setAppSyncState('ready','Atualizado às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'}));
 }catch(error){const last=appRead('oasis.records.syncedAt','');setAppSyncState('offline','Sem sincronização'+(last?' · última leitura '+new Date(last).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):''));appMessage('registrySyncNote','Não foi possível consultar o servidor agora. Exibindo os dados já carregados; novos cadastros exigem conexão.');}
 finally{appSyncBusy=false;}
}
function setAppSyncState(state,text){const target=document.getElementById('appSyncState');target.dataset.state=state;target.textContent=text;}
function refreshAppViews(){
 if(!flowSheetReady&&rawData.length===0){renderRegistry();return;}
 renderFilters();if(maintenanceLoaded)maintenanceOptions();
 if(activeDashboardTab==='registry')renderRegistry();else if(['maintenance','meters'].includes(activeDashboardTab))renderMaintenance();else applyFilters();
 renderRegistry();
}
function showAccessScreen(){document.getElementById('accessScreen').hidden=false;document.body.classList.add('app-locked');setAccessChoice('visitor');}
function setAccessChoice(choice){const manager=choice==='manager';document.getElementById('accessManager').hidden=!manager;document.getElementById('accessVisitor').hidden=manager;for(const role of ['visitor','manager'])document.getElementById('accessTab'+role).setAttribute('aria-selected',String(role===choice));appMessage('loginError','');}
function updateAppRole(){
 appMessage('appRoleLabel',appRole==='manager'?'Gestor · '+(sessionStorage.getItem('oasis.manager.name')||'Gestor'):'Visitante · consulta');
 document.getElementById('managerForms').hidden=appRole!=='manager';document.getElementById('registryReadOnly').hidden=appRole==='manager';
 document.querySelectorAll('[data-write-control]').forEach(control=>control.disabled=appRole!=='manager'||appSaving);
}
function enterApp(){document.getElementById('accessScreen').hidden=true;document.body.classList.remove('app-locked');updateAppRole();renderRegistry();setTimeout(maybeOfferInstall,1200);}
async function enterVisitor(){if(appToken){try{await appAPI('/api/logout',{method:'POST',body:'{}'});}catch{}}appToken='';appRole='visitor';sessionStorage.removeItem('oasis.manager.token');sessionStorage.setItem('oasis.access','visitor');enterApp();}
async function submitManagerLogin(event){
 event.preventDefault();const form=event.currentTarget,button=document.getElementById('managerLoginButton');button.disabled=true;button.textContent='Verificando acesso…';appMessage('loginError','');
 try{const data=await appAPI('/api/login',{method:'POST',body:JSON.stringify({username:form.elements.username.value,password:form.elements.password.value})});appToken=data.token;appRole='manager';sessionStorage.setItem('oasis.manager.token',data.token);sessionStorage.setItem('oasis.manager.name',data.username);sessionStorage.setItem('oasis.access','manager');form.elements.password.value='';enterApp();}
 catch(error){appMessage('loginError',error.message==='Failed to fetch'?'Sem conexão com o serviço de acesso. Tente novamente.':error.message);}
 finally{button.disabled=false;button.textContent='Entrar como gestor';}
}
async function logoutApp(){if(appToken){try{await appAPI('/api/logout',{method:'POST',body:'{}'});}catch{}}appToken='';appRole='visitor';sessionStorage.removeItem('oasis.manager.token');sessionStorage.removeItem('oasis.access');updateAppRole();showAccessScreen();}
function openRegistryTab(){activeDashboardTab='registry';for(const name of ['overview','daily','maintenance','meters','registry']){document.getElementById('panel-'+name).hidden=name!=='registry';document.getElementById('tab-'+name).setAttribute('aria-selected',String(name==='registry'));}document.querySelectorAll('.export-btn').forEach(button=>button.hidden=true);renderRegistry();}
function registryType(type){for(const name of ['flow','maintenance','downtime']){document.getElementById('form-'+name).hidden=name!==type;document.getElementById('register-'+name).setAttribute('aria-selected',String(name===type));}}
async function saveRegistryForm(event,kind){
 event.preventDefault();if(appRole!=='manager'||!appToken){appMessage('registrySaveStatus','Entre como gestor para cadastrar.');return;}
 const form=event.currentTarget;if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));appSaving=true;updateAppRole();appMessage('registrySaveStatus','Salvando no histórico compartilhado…');
 try{
  const input=values;input.well=Number(input.well);if(kind==='flow')input.flow=Number(input.flow);input.kind=kind;input.requestId=crypto.randomUUID();
  const data=await appAPI('/api/records',{method:'POST',body:JSON.stringify(input)});
  if(!appRecords.some(record=>record.id===data.record.id))appRecords.push(data.record);appStore('oasis.records.v1',appRecords);mergeAppData();refreshAppViews();
  appMessage('registrySaveStatus','Cadastro salvo no servidor. Os gráficos e o histórico já foram atualizados.');setAppSyncState('ready','Cadastro salvo e sincronizado');
  if(kind==='flow')form.elements.flow.value='';
 }catch(error){appMessage('registrySaveStatus','Não foi salvo: '+error.message+'. Os campos foram mantidos para tentar novamente.');}
 finally{appSaving=false;updateAppRole();}
}
function registryEntries(){
 const sheetFlows=sheetFlowRows.map((row,index)=>({id:'sheet-flow-'+index,kind:'flow',well:appWellNumber(row.poco),date:row.dateStr,source:'Planilha',detail:row.vazao.toLocaleString('pt-BR')+' L/h',author:'Planilha de vazão'}));
 const sheetMaint=sheetMaintenanceRows.map((row,index)=>({id:'sheet-maint-'+index,kind:'maintenance',well:appWellNumber(row['POÇO']),date:maintenanceDate(row['MANUTENÇÃO'])||'',source:'Planilha',detail:[row['MARCA DA BOMBA/ MOTOR'],row.MODELO,row['NOVA MANUTENÇÃO']?'Nova manutenção: '+row['NOVA MANUTENÇÃO']:''].filter(Boolean).join(' · '),author:row['Responsavel (Tec.)']||'Planilha de manutenção'}));
 const sheetStops=sheetAnalysisRows.filter(row=>row['Poços Parados']).map((row,index)=>({id:'sheet-stop-'+index,kind:'downtime',well:appWellNumber(row['Poços Parados']),date:maintenanceDate(row.Inicio)||'',source:'Planilha',detail:'Parada: '+(row.Inicio||'Sem data')+' · Retorno: '+(row.Fim||'Em aberto'),author:'Planilha · Análise'}));
 const entries=appRecords.map(record=>{const p=record.payload;return {id:record.id,kind:record.kind,well:record.well,date:record.event_date,source:'Sistema',detail:record.kind==='flow'?p.flow.toLocaleString('pt-BR')+' L/h':record.kind==='maintenance'?[p.equipment,p.model,p.newDate?'Nova manutenção: '+appDate(p.newDate):''].filter(Boolean).join(' · '):'Parada: '+appDate(p.start)+' · Retorno: '+(p.end?appDate(p.end):'Em aberto'),notes:p.notes,author:record.created_by+' · '+new Date(record.created_at).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}),seq:record.seq};});
 return [...entries.sort((a,b)=>b.seq-a.seq),...[...sheetFlows,...sheetMaint,...sheetStops].sort((a,b)=>b.date.localeCompare(a.date))];
}
function registryFilterChanged(){registryPage=0;renderRegistry();}
function registryNext(direction){registryPage=Math.max(0,registryPage+direction);renderRegistry();}
function renderRegistry(){
 const table=document.getElementById('registryHistory');if(!table)return;updateAppRole();
 appMessage('registryFlowCount',sheetFlowRows.length);appMessage('registryMaintenanceCount',sheetMaintenanceRows.length);appMessage('registrySystemCount',appRecords.length);
 const type=document.getElementById('registryKind').value,source=document.getElementById('registrySource').value,well=Number(document.getElementById('registryWell').value)||0;
 const entries=registryEntries().filter(entry=>(!type||entry.kind===type)&&(!source||entry.source===source)&&(!well||entry.well===well));
 const pages=Math.max(1,Math.ceil(entries.length/registryPageSize));registryPage=Math.min(registryPage,pages-1);
 const labels={flow:'Vazão diária',maintenance:'Manutenção',downtime:'Parada / retorno'};
 maintenanceTable('registryHistory',['Data do evento','Poço','Tipo','Informações','Origem','Registrado por'],entries.slice(registryPage*registryPageSize,(registryPage+1)*registryPageSize).map(entry=>[entry.date?appDate(entry.date):'Sem data',appWellName(entry.well),labels[entry.kind],[entry.detail,entry.notes].filter(Boolean).join(' · '),entry.source,entry.author]));
 appMessage('registryPageText',entries.length+' registros · página '+(registryPage+1)+' de '+pages);document.getElementById('registryPrevious').disabled=registryPage===0;document.getElementById('registryNext').disabled=registryPage>=pages-1;
}
function isAppInstalled(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function maybeOfferInstall(){if(isAppInstalled())return;const dismissed=Number(appRead('oasis.install.dismissed',0));if(Date.now()-dismissed<7*86400000)return;document.getElementById('installDialog').showModal();}
function dismissInstall(){appStore('oasis.install.dismissed',Date.now());document.getElementById('installDialog').close();}
async function installOasisApp(){if(installPrompt){await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==='accepted')document.getElementById('installDialog').close();installPrompt=null;}else{appMessage('installHelp',/iPhone|iPad|iPod/i.test(navigator.userAgent)?'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.':'Abra o menu do navegador e procure Instalar app ou Adicionar à tela inicial. A opção depende do navegador e do dispositivo.');}}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{document.getElementById('installDialog').close();appStore('oasis.install.dismissed',Date.now());});
window.addEventListener('online',()=>{syncAppRecords();updateAppRole();});
window.addEventListener('offline',()=>setAppSyncState('offline','Sem conexão · consulta dos dados carregados'));
window.addEventListener('load',async()=>{
 appRecords=appRead('oasis.records.v1',[]);for(const input of document.querySelectorAll('[data-default-today]'))input.value=appToday();
 if(!flowSheetReady&&sheetFlowRows.length===0){const cached=appRead('oasis.sheet.flow.v1',[]);sheetFlowRows=cached.map(row=>({...row,dateObj:new Date(row.dateStr+'T00:00:00')}));}
 if(!maintenanceSheetReady){const cached=appRead('oasis.sheet.maintenance.v1',null);if(cached){sheetMaintenanceRows=cached.base;sheetAnalysisRows=cached.analysis;}}
 mergeAppData();renderRegistry();
 appToken=sessionStorage.getItem('oasis.manager.token')||'';
 if(appToken){try{await appAPI('/api/session');appRole='manager';enterApp();}catch{showAccessScreen();}}else if(sessionStorage.getItem('oasis.access')==='visitor')enterApp();else showAccessScreen();
 syncAppRecords();setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)syncAppRecords();},30000);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>appMessage('installHelp','A instalação não está disponível neste navegador. Você pode continuar usando o site.'));
});
