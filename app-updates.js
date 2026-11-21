/* Atualizações do aplicativo: aviso, preparo dos arquivos e ativação. */
let appUpdateRegistration=null,appUpdateApplying=false,appUpdateReloading=false,appUpdateDismissed=null,appUpdateCheckTime=0,appUpdateWatchdog,appUpdateActivatedElsewhere=false;
const appUpdateNode=id=>document.getElementById(id);
function appUpdateMessage(text){appUpdateNode('appUpdateStatus').textContent=text;}
function appUpdateAvailable(worker,force=false){
 if(!worker||appUpdateApplying)return;
 appUpdateNode('appUpdateBadge').hidden=false;
 if(!force&&appUpdateDismissed===worker)return;
 appUpdateNode('appUpdateNotice').hidden=false;
 appUpdateNode('appUpdateTitle').textContent='Nova atualização disponível';
 appUpdateNode('appUpdateDescription').textContent='Uma nova versão do Sistema integrado está pronta. Conclua o que estiver preenchendo e atualize quando desejar.';
 appUpdateNode('appUpdateNow').hidden=false;appUpdateNode('appUpdateLater').textContent='Depois';
 appUpdateNode('appUpdateProgressArea').hidden=true;appUpdateNode('appUpdateNow').textContent='Atualizar agora';appUpdateMessage('');
}
function dismissAppUpdate(){if(appUpdateApplying)return;appUpdateDismissed=appUpdateRegistration?.waiting;appUpdateNode('appUpdateNotice').hidden=true;}
function appUpdateFailure(message){
 clearTimeout(appUpdateWatchdog);appUpdateApplying=false;appUpdateNode('appUpdateNotice').dataset.updating='false';try{sessionStorage.removeItem('oasis.app.updating');}catch{}
 appUpdateNode('appUpdateTitle').textContent='Atualização não concluída';appUpdateMessage(message);
 appUpdateNode('appUpdateNow').disabled=false;appUpdateNode('appUpdateNow').textContent='Tentar novamente';appUpdateNode('appUpdateLater').disabled=false;
}
function appUpdateArmTimeout(){clearTimeout(appUpdateWatchdog);appUpdateWatchdog=setTimeout(()=>appUpdateFailure('A atualização demorou mais que o esperado. Confira sua conexão e tente novamente.'),60000);}
function receiveAppUpdate(event){
 if(!appUpdateApplying)return;
 const expected=appUpdateRegistration?.waiting||appUpdateRegistration?.installing;
 if(event.source!==expected&&event.source!==navigator.serviceWorker.controller)return;
 const data=event.data||{};
 if(data.type==='APP_UPDATE_ERROR'){appUpdateFailure(data.message);return;}
 if(data.type==='APP_UPDATE_PROGRESS'&&data.total>0){
  appUpdateArmTimeout();const percent=Math.min(95,Math.floor(data.completed/data.total*95));
  appUpdateNode('appUpdateProgress').value=percent;appUpdateNode('appUpdatePercent').textContent=percent+'%';
  appUpdateNode('appUpdateStep').textContent='Preparando arquivos · '+data.completed+' de '+data.total;
 }else if(data.type==='APP_UPDATE_READY'){
  try{sessionStorage.setItem('oasis.app.updating','1');}catch{}
  appUpdateArmTimeout();appUpdateNode('appUpdateProgress').value=98;appUpdateNode('appUpdatePercent').textContent='98%';appUpdateNode('appUpdateStep').textContent='Aplicando nova versão…';
 }
}
async function applyAppUpdate(){
 if(appUpdateApplying)return;
 const worker=appUpdateRegistration?.waiting;if(!worker&&!appUpdateActivatedElsewhere){await checkAppUpdate(true);return;}
 if(navigator.onLine===false){appUpdateMessage('Conecte-se à internet para atualizar o aplicativo.');return;}
 appUpdateApplying=true;appUpdateNode('appUpdateNotice').dataset.updating='true';appUpdateNode('appUpdateNotice').hidden=false;appUpdateNode('appUpdateNow').disabled=true;appUpdateNode('appUpdateLater').disabled=true;
 appUpdateNode('appUpdateTitle').textContent='Atualizando o aplicativo';appUpdateNode('appUpdateDescription').textContent='Aguarde a preparação dos arquivos. O app abrirá novamente nesta mesma aba ao concluir.';
 appUpdateNode('appUpdateProgressArea').hidden=false;appUpdateNode('appUpdateProgress').value=0;appUpdateNode('appUpdatePercent').textContent='0%';appUpdateNode('appUpdateStep').textContent='Salvando alterações locais…';appUpdateMessage('');
 try{
  // Aguarda o rascunho da Contagem de Perdas antes de recarregar a página.
  for(const frame of document.querySelectorAll('#systemFrames iframe')){const win=frame.contentWindow;try{if(typeof win?.lossSave==='function')await win.lossSave(false);}catch(error){throw Error('Não foi possível salvar o rascunho de perdas. Salve o registro antes de atualizar.');}}
  if(appUpdateActivatedElsewhere){try{sessionStorage.setItem('oasis.app.updating','1');}catch{}location.reload();return;}
  appUpdateArmTimeout();worker.postMessage({type:'APPLY_APP_UPDATE'});
 }catch(error){appUpdateFailure(error.message);}
}
function observeAppUpdate(registration){
 appUpdateRegistration=registration;
 if(registration.waiting)appUpdateAvailable(registration.waiting);
 registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)appUpdateAvailable(registration.waiting||worker);});});
}
async function checkAppUpdate(manual=false){
 if(appUpdateApplying)return;
 if(!appUpdateRegistration){if(manual){appUpdateNode('appUpdateNotice').hidden=false;appUpdateNode('appUpdateNow').hidden=true;appUpdateNode('appUpdateLater').textContent='Fechar';appUpdateMessage('A verificação de atualizações ainda não está disponível neste navegador.');}return;}
 if(!manual&&Date.now()-appUpdateCheckTime<60000)return;appUpdateCheckTime=Date.now();
 const button=appUpdateNode('appUpdateCheck');button.disabled=true;
 try{
  if(navigator.onLine===false)throw Error('Conecte-se à internet para verificar atualizações.');
  await appUpdateRegistration.update();
  if(appUpdateActivatedElsewhere){showActivatedAppUpdate();return;}
  if(appUpdateRegistration.waiting){appUpdateAvailable(appUpdateRegistration.waiting,manual);return;}
  if(manual){appUpdateNode('appUpdateNotice').hidden=false;appUpdateNode('appUpdateTitle').textContent=appUpdateRegistration.installing?'Verificando nova versão…':'Aplicativo atualizado';appUpdateNode('appUpdateDescription').textContent=appUpdateRegistration.installing?'Aguarde enquanto verificamos os arquivos da nova versão.':'Você está usando a versão mais recente disponível.';appUpdateNode('appUpdateNow').hidden=true;appUpdateNode('appUpdateLater').textContent='Fechar';appUpdateMessage('');}
 }catch(error){if(manual){appUpdateNode('appUpdateNotice').hidden=false;appUpdateNode('appUpdateTitle').textContent='Não foi possível verificar';appUpdateNode('appUpdateNow').hidden=true;appUpdateNode('appUpdateLater').textContent='Fechar';appUpdateMessage(error.message);}}finally{button.disabled=false;}
}
function showActivatedAppUpdate(){
 appUpdateNode('appUpdateNotice').hidden=false;appUpdateNode('appUpdateBadge').hidden=false;appUpdateNode('appUpdateTitle').textContent='Nova versão pronta';appUpdateNode('appUpdateDescription').textContent='A atualização foi preparada em outra janela. Conclua seu preenchimento e abra a nova versão.';appUpdateNode('appUpdateNow').hidden=false;appUpdateNode('appUpdateNow').textContent='Abrir nova versão';appUpdateNode('appUpdateLater').textContent='Depois';appUpdateNode('appUpdateProgressArea').hidden=true;appUpdateMessage('');
}
async function initializeAppUpdates(){
 try{if(sessionStorage.getItem('oasis.app.updating')){sessionStorage.removeItem('oasis.app.updating');appUpdateNode('appUpdateNotice').hidden=false;appUpdateNode('appUpdateTitle').textContent='Aplicativo atualizado';appUpdateNode('appUpdateDescription').textContent='A nova versão do Sistema integrado está pronta para usar.';appUpdateNode('appUpdateNow').hidden=true;appUpdateNode('appUpdateLater').textContent='Fechar';appUpdateNode('appUpdateProgressArea').hidden=false;appUpdateNode('appUpdateProgress').value=100;appUpdateNode('appUpdatePercent').textContent='100%';appUpdateNode('appUpdateStep').textContent='Atualização concluída';}}catch{}
 if(!('serviceWorker' in navigator))return;
 navigator.serviceWorker.addEventListener('message',receiveAppUpdate);
 const hadController=Boolean(navigator.serviceWorker.controller);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!appUpdateApplying){if(hadController){appUpdateActivatedElsewhere=true;showActivatedAppUpdate();}return;}if(appUpdateReloading)return;appUpdateReloading=true;clearTimeout(appUpdateWatchdog);location.reload();});
 try{observeAppUpdate(await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));await checkAppUpdate();}catch{}
 setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)checkAppUpdate();},300000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkAppUpdate();});
 window.addEventListener('online',()=>checkAppUpdate());
}
window.addEventListener('load',initializeAppUpdates);
