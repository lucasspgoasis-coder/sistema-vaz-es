const PORTAL_SYSTEMS={manutencao:{name:'Manutenção dos poços',url:'manutencao.html',keywords:'manutencao pocos bombas motor parada historico tecnico'},area:{name:'Área dos blocos',url:'area-blocos/index.html',keywords:'area blocos terreno medidas largura altura metros quadrados hectares'},vazao:{name:'Vazão',url:'vazao.html'},adubacao:{name:'Adubação',url:'sistema-adubacao/index.html'},rocadeira:{name:'Roçadeira',url:'sistema-rocadeira/index.html'},transplantio:{name:'Transplantio',url:'sistema-transplantio/index.html',keywords:'plantio mudas germinação'},perdas:{name:'Contagem de Perdas',url:'sistema-perdas/index.html',keywords:'peso colhido colheita histórico'},documentario:{name:'Documentário de Perdas',url:'documentario/index.html',keywords:'fotografias fotos imagens evidências comprobatórias câmera documentação'}};
const portalFrames=new Map(),portalSheetStates=new Map();
const PORTAL_SHEET_SYSTEMS=new Set(['vazao','manutencao','transplantio','adubacao','rocadeira']);
let activePortalSystem='inicio',portalInstallPrompt=null;
function portalRead(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function portalWrite(key,value){try{localStorage.setItem(key,String(value));}catch{}}
function portalText(id,value){document.getElementById(id).textContent=value;}
function portalNormalize(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function portalRoute(){const hash=location.hash.slice(1);return Object.prototype.hasOwnProperty.call(PORTAL_SYSTEMS,hash)?hash:'inicio';}
function portalFitFrame(frame){
 try{if(frame.hidden)return;const body=frame.contentDocument?.body;if(!body)return;const height=Math.ceil(body.getBoundingClientRect().height)+2;if(height>0&&Math.abs((parseFloat(frame.style.height)||0)-height)>3)frame.style.height=height+'px';}catch{}
}
function portalObserveFrame(frame){
 try{frame._sizeObserver?.disconnect();const doc=frame.contentDocument,win=frame.contentWindow;if(!doc?.body)return;doc.documentElement.classList.add('portal-embedded');
 if(win.ResizeObserver){frame._sizeObserver=new win.ResizeObserver(()=>portalFitFrame(frame));frame._sizeObserver.observe(doc.body);}portalFitFrame(frame);
 }catch{}
}
function portalResizeFrame(frame){try{const win=frame.contentWindow;if(win)win.dispatchEvent(new win.Event('resize'));portalFitFrame(frame);}catch{}}
function renderPortalRoute(){
 const route=portalRoute(),home=route==='inicio';activePortalSystem=route;renderPortalSyncStatus();
 document.getElementById('portalHome').hidden=!home;document.getElementById('portalWorkspace').hidden=home;
 for(const link of document.querySelectorAll('[data-nav]')){if(link.dataset.nav===route)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 for(const [key,frame] of portalFrames)frame.hidden=key!==route;
 if(home){document.getElementById('workspaceLoading').hidden=true;updatePortalRecent();return;}
 const system=PORTAL_SYSTEMS[route];portalText('workspaceTitle',system.name);document.getElementById('openSystemLink').href=system.url+'?portal=20261124-push-fix-63';
 portalWrite('oasis.portal.lastSystem',route);
 let frame=portalFrames.get(route);
 if(!frame){
  frame=document.createElement('iframe');frame.className='system-frame';frame.title='Sistema de '+system.name;frame.setAttribute('aria-label','Sistema de '+system.name);frame.dataset.loaded='false';
  frame.onload=()=>{frame.dataset.loaded='true';portalObserveFrame(frame);renderPortalSyncStatus();if(activePortalSystem===route){document.getElementById('workspaceLoading').hidden=true;portalResizeFrame(frame);}};
  frame.onerror=()=>{if(activePortalSystem===route)portalText('workspaceLoadingText','Não foi possível abrir o sistema. Use Atualizar sistema ou Abrir em nova guia.');};
  frame.src=system.url+'?portal=20261124-push-fix-63';portalFrames.set(route,frame);document.getElementById('systemFrames').append(frame);
 }
 frame.hidden=false;document.getElementById('workspaceLoading').hidden=frame.dataset.loaded==='true';portalText('workspaceLoadingText','Abrindo '+system.name+'…');
 if(frame.dataset.loaded==='true')portalResizeFrame(frame);
}
function refreshPortalSystem(){
 const frame=portalFrames.get(activePortalSystem);if(!frame)return;
 frame.dataset.loaded='false';document.getElementById('workspaceLoading').hidden=false;portalText('workspaceLoadingText','Atualizando '+PORTAL_SYSTEMS[activePortalSystem].name+'…');
 frame.src=PORTAL_SYSTEMS[activePortalSystem].url+'?portal=20261124-push-fix-63&atualizar='+Date.now();
}
function updatePortalRecent(){const last=portalRead('oasis.portal.lastSystem');const valid=Object.prototype.hasOwnProperty.call(PORTAL_SYSTEMS,last);document.getElementById('lastSystemBox').hidden=!valid;if(valid){document.getElementById('lastSystemLink').href='#'+last;portalText('lastSystemName',PORTAL_SYSTEMS[last].name);}}
function filterPortalSystems(){const query=portalNormalize(document.getElementById('systemSearch').value.trim());let count=0;for(const card of document.querySelectorAll('[data-system-card]')){const system=PORTAL_SYSTEMS[card.dataset.systemCard];const matches=!query||portalNormalize(system.name+' '+(system.keywords||'')).includes(query);card.hidden=!matches;if(matches)count++;}document.getElementById('systemSearchEmpty').hidden=count>0;portalText('systemSearchStatus',count+' sistema'+(count===1?' disponível':'s disponíveis'));}
function portalSearchKey(event){if(event.key!=='Enter')return;const matches=[...document.querySelectorAll('[data-system-card]')].filter(card=>!card.hidden);if(matches.length===1)location.hash=matches[0].dataset.systemCard;}
function portalConnection(){const online=navigator.onLine!==false;const target=document.getElementById('portalConnection');target.dataset.state=online?'online':'offline';target.textContent=online?'Conexão disponível':'Sem conexão · última leitura';renderPortalSyncStatus();}
function portalStandalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function offerPortalInstall(){if(!portalStandalone())document.getElementById('portalInstallDialog').showModal();}
function dismissPortalInstall(){portalWrite('oasis.portal.installDismissed',Date.now());document.getElementById('portalInstallDialog').close();}
async function installPortalApp(){if(portalInstallPrompt){await portalInstallPrompt.prompt();const result=await portalInstallPrompt.userChoice;if(result.outcome==='accepted')document.getElementById('portalInstallDialog').close();portalInstallPrompt=null;}else{portalText('portalInstallHelp',/iPhone|iPad|iPod/i.test(navigator.userAgent)?'No Safari, toque em Compartilhar e depois Adicionar à Tela de Início.':'No menu do navegador, procure Instalar app ou Adicionar à tela inicial. O nome do aplicativo é Sistema integrado.');}}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();portalInstallPrompt=event;});
window.addEventListener('appinstalled',()=>{document.getElementById('portalInstallDialog').close();portalWrite('oasis.portal.installDismissed',Date.now());});
window.addEventListener('hashchange',renderPortalRoute);
window.addEventListener('online',portalConnection);window.addEventListener('offline',portalConnection);
window.addEventListener('load',()=>{
 const now=new Date();portalText('portalDate',new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Fortaleza'}).format(now));
 const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'America/Fortaleza'}).format(now));portalText('portalGreeting',hour<12?'Bom dia!':hour<18?'Boa tarde!':'Boa noite!');
 portalConnection();renderPortalRoute();updatePortalRecent();
 if(!portalStandalone()&&Date.now()-Number(portalRead('oasis.portal.installDismissed','0'))>7*86400000)setTimeout(offerPortalInstall,1600);
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){event.preventDefault();document.getElementById('systemSearch').focus();}});
});

function portalSyncTarget(){return activePortalSystem==='inicio'?portalRead('oasis.portal.lastSystem'):activePortalSystem;}
function renderPortalSyncStatus(){
 const panel=document.getElementById('portalSyncPanel');if(!panel)return;
 const target=portalSyncTarget(),isSheet=PORTAL_SHEET_SYSTEMS.has(target),isArea=target==='area',frame=portalFrames.get(target),online=navigator.onLine!==false;
 let status=portalSheetStates.get(target);try{status=(isArea?frame?.contentWindow?.BlockAreaShared?.status():frame?.contentWindow?.AppSheetSync?.status())||status;}catch{}
 const local=target&&target!=='inicio'&&!isSheet&&!isArea,state=!online?'offline':local?'local':status?.state||'waiting';panel.dataset.state=state;
 const labels={synced:'Sincronizado',pending:'Sincronizando…',offline:'Sem conexão',error:'Não foi possível sincronizar',local:'Salvo neste aparelho',waiting:'Aguardando consulta',conflict:'Medidas aguardando revisão'};
 portalText('portalSyncState',labels[state]||labels.waiting);portalText('portalSyncScope',isArea?'Histórico compartilhado das áreas':'Sincronização das planilhas');
 portalText('portalSyncDetail',isArea?(state==='synced'?'As medidas salvas estão disponíveis para consulta no computador e no celular.':state==='pending'?'Enviando e consultando os cadastros compartilhados dos blocos.':state==='conflict'?'Há medidas diferentes em outro aparelho. Revise as opções no cadastro do bloco.':state==='offline'?'Sem conexão. Os cadastros deste aparelho são preservados para enviar depois.':status?.error||'Consultando o histórico compartilhado das áreas.'):local?'Estes registros são locais e não fazem parte da sincronização das planilhas.':!isSheet?'Abra um sistema: computador e celular consultam a mesma planilha vinculada.':state==='synced'?PORTAL_SYSTEMS[target].name+' · leitura da planilha concluída neste aparelho.':state==='pending'?PORTAL_SYSTEMS[target].name+' · buscando os dados mais recentes da planilha.':state==='offline'?'Conecte-se à internet para consultar os dados mais recentes.':state==='error'?'Uma consulta falhou. Tente sincronizar novamente; os dados exibidos podem ser de uma leitura anterior.':PORTAL_SYSTEMS[target].name+' · aguardando a primeira leitura da planilha.');
 portalText('portalSyncTime',local?'Histórico disponível neste navegador e aparelho.':status?.lastSync?'Última leitura confirmada: '+new Date(status.lastSync).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):'Ainda sem leitura confirmada neste aparelho.');
 const button=document.getElementById('portalSyncNow');button.hidden=Boolean(local);button.disabled=!online||state==='pending';portalText('portalSyncButtonLabel',activePortalSystem==='inicio'?(isArea?'Abrir histórico':'Abrir planilhas'):'Sincronizar agora');
}
function syncPortalSheets(){
 if(activePortalSystem==='inicio'){location.hash=(PORTAL_SHEET_SYSTEMS.has(portalSyncTarget())||portalSyncTarget()==='area')?portalSyncTarget():'vazao';return;}
 if(!PORTAL_SHEET_SYSTEMS.has(activePortalSystem)&&activePortalSystem!=='area')return;
 try{const win=portalFrames.get(activePortalSystem)?.contentWindow,api=activePortalSystem==='area'?win?.BlockAreaShared:win?.AppSheetSync;if(api){if(activePortalSystem==='area')void api.sync();else api.refresh(0);renderPortalSyncStatus();return;}}catch{}
 refreshPortalSystem();renderPortalSyncStatus();
}
window.addEventListener('message',event=>{
 if(event.origin===location.origin&&event.data?.type==='APP_RECORD_SAVED'){const entry=[...portalFrames].find(([key,frame])=>key===event.data.record?.route&&frame.contentWindow===event.source);if(entry)window.DataNotifications?.recordSaved(event.data.record);return;}
 if(event.origin!==location.origin||!['APP_SHEET_STATUS','APP_AREA_STATUS'].includes(event.data?.type))return;
 const entry=[...portalFrames].find(([key,frame])=>(event.data.type==='APP_AREA_STATUS'?key==='area':PORTAL_SHEET_SYSTEMS.has(key))&&frame.contentWindow===event.source);if(!entry)return;
 const status=event.data.status;if(!status||!['waiting','pending','synced','error','offline','conflict'].includes(status.state))return;
 portalSheetStates.set(entry[0],{state:status.state,lastSync:Number.isFinite(status.lastSync)?status.lastSync:0});renderPortalSyncStatus();
});
