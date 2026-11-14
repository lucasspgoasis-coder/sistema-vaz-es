const PORTAL_SYSTEMS={vazao:{name:'Vazão',url:'vazao.html'},adubacao:{name:'Adubação',url:'sistema-adubacao/index.html'},rocadeira:{name:'Roçadeira',url:'sistema-rocadeira/index.html'}};
const portalFrames=new Map();
let activePortalSystem='inicio',portalInstallPrompt=null;
function portalRead(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function portalWrite(key,value){try{localStorage.setItem(key,String(value));}catch{}}
function portalText(id,value){document.getElementById(id).textContent=value;}
function portalNormalize(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function portalRoute(){const hash=location.hash.slice(1);return Object.prototype.hasOwnProperty.call(PORTAL_SYSTEMS,hash)?hash:'inicio';}
function portalResizeFrame(frame){try{const win=frame.contentWindow;if(win)win.dispatchEvent(new win.Event('resize'));}catch{}}
function renderPortalRoute(){
 const route=portalRoute(),home=route==='inicio';activePortalSystem=route;
 document.getElementById('portalHome').hidden=!home;document.getElementById('portalWorkspace').hidden=home;
 for(const link of document.querySelectorAll('[data-nav]')){if(link.dataset.nav===route)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 for(const [key,frame] of portalFrames)frame.hidden=key!==route;
 if(home){document.getElementById('workspaceLoading').hidden=true;updatePortalRecent();return;}
 const system=PORTAL_SYSTEMS[route];portalText('workspaceTitle',system.name);document.getElementById('openSystemLink').href=system.url+'?portal=20261114-icons-2';
 portalWrite('oasis.portal.lastSystem',route);
 let frame=portalFrames.get(route);
 if(!frame){
  frame=document.createElement('iframe');frame.className='system-frame';frame.title='Sistema de '+system.name;frame.setAttribute('aria-label','Sistema de '+system.name);frame.dataset.loaded='false';
  frame.onload=()=>{frame.dataset.loaded='true';if(activePortalSystem===route){document.getElementById('workspaceLoading').hidden=true;portalResizeFrame(frame);}};
  frame.onerror=()=>{if(activePortalSystem===route)portalText('workspaceLoadingText','Não foi possível abrir o sistema. Use Atualizar sistema ou Abrir em nova guia.');};
  frame.src=system.url+'?portal=20261114-icons-2';portalFrames.set(route,frame);document.getElementById('systemFrames').append(frame);
 }
 frame.hidden=false;document.getElementById('workspaceLoading').hidden=frame.dataset.loaded==='true';portalText('workspaceLoadingText','Abrindo '+system.name+'…');
 if(frame.dataset.loaded==='true')portalResizeFrame(frame);
}
function refreshPortalSystem(){
 const frame=portalFrames.get(activePortalSystem);if(!frame)return;
 frame.dataset.loaded='false';document.getElementById('workspaceLoading').hidden=false;portalText('workspaceLoadingText','Atualizando '+PORTAL_SYSTEMS[activePortalSystem].name+'…');
 frame.src=PORTAL_SYSTEMS[activePortalSystem].url+'?portal=20261114-icons-2&atualizar='+Date.now();
}
function updatePortalRecent(){const last=portalRead('oasis.portal.lastSystem');const valid=Object.prototype.hasOwnProperty.call(PORTAL_SYSTEMS,last);document.getElementById('lastSystemBox').hidden=!valid;if(valid){document.getElementById('lastSystemLink').href='#'+last;portalText('lastSystemName',PORTAL_SYSTEMS[last].name);}}
function filterPortalSystems(){const query=portalNormalize(document.getElementById('systemSearch').value.trim());let count=0;for(const card of document.querySelectorAll('[data-system-card]')){const system=PORTAL_SYSTEMS[card.dataset.systemCard];const matches=!query||portalNormalize(system.name).includes(query);card.hidden=!matches;if(matches)count++;}document.getElementById('systemSearchEmpty').hidden=count>0;portalText('systemSearchStatus',count+' sistema'+(count===1?' disponível':'s disponíveis'));}
function portalSearchKey(event){if(event.key!=='Enter')return;const matches=[...document.querySelectorAll('[data-system-card]')].filter(card=>!card.hidden);if(matches.length===1)location.hash=matches[0].dataset.systemCard;}
function portalConnection(){const online=navigator.onLine!==false;const target=document.getElementById('portalConnection');target.dataset.state=online?'online':'offline';target.textContent=online?'Conexão disponível':'Sem conexão · última leitura';}
function portalStandalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function offerPortalInstall(){if(!portalStandalone())document.getElementById('portalInstallDialog').showModal();}
function dismissPortalInstall(){portalWrite('oasis.portal.installDismissed',Date.now());document.getElementById('portalInstallDialog').close();}
async function installPortalApp(){if(portalInstallPrompt){await portalInstallPrompt.prompt();const result=await portalInstallPrompt.userChoice;if(result.outcome==='accepted')document.getElementById('portalInstallDialog').close();portalInstallPrompt=null;}else{portalText('portalInstallHelp',/iPhone|iPad|iPod/i.test(navigator.userAgent)?'No Safari, toque em Compartilhar e depois Adicionar à Tela de Início.':'No menu do navegador, procure Instalar app ou Adicionar à tela inicial. O nome do aplicativo é Dados de vazão, adubação e roçadeira.');}}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();portalInstallPrompt=event;});
window.addEventListener('appinstalled',()=>{document.getElementById('portalInstallDialog').close();portalWrite('oasis.portal.installDismissed',Date.now());});
window.addEventListener('hashchange',renderPortalRoute);
window.addEventListener('online',portalConnection);window.addEventListener('offline',portalConnection);
window.addEventListener('load',()=>{
 const now=new Date();portalText('portalDate',new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Fortaleza'}).format(now));
 const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'America/Fortaleza'}).format(now));portalText('portalGreeting',hour<12?'Bom dia!':hour<18?'Boa tarde!':'Boa noite!');
 portalConnection();renderPortalRoute();updatePortalRecent();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
 if(!portalStandalone()&&Date.now()-Number(portalRead('oasis.portal.installDismissed','0'))>7*86400000)setTimeout(offerPortalInstall,1600);
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){event.preventDefault();document.getElementById('systemSearch').focus();}});
});
