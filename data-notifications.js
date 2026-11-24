/* Avisos de mudanças nas planilhas, sem confundir a data de detecção com a data do registro. */
var DataNotifications=(()=>{
 const base='https://docs.google.com/spreadsheets/d/e/',key='oasis.dataNotifications.v1';
 const sheets=[
 ['vazao','Vazão','2PACX-1vSafB5fd5osyELyMS1T-pVO-WbL25l53ICs1dmVMgByrAlQsqSHT2YscIE-ClYrJvzPS-dGZSp25ysi'],
 ['adubacao','Adubação','2PACX-1vTJfPIEW6e5KKB1AHQGEptWfx3ZgF8np8eRyn2tFxVIIS8COWQIk0SS3V5n75k6BJoqd0teSi8suhvJ'],
 ['rocadeira','Roçadeira','2PACX-1vR9q-T-U_fT_tP9_ZKet4ai-BG11a6eCnwyG_BrJWIG7rQ7gFbKkrjDnj_r3ptMs-BbCl-7nm5kkHcI'],
 ['transplantio','Transplantio','2PACX-1vQBafGpPjdS96k2e5uJbMLZpUAC_lxayvEx3tFkKObwyUAt3Ex1ruG4mWNM4V-eIbn5t6w9gUFH5H5d'],
 ['transplantio','Transplantio · produção','2PACX-1vQPXlvM1rHExixKIUDi7CiP1p9bzJp2C7a2hYwdZiv9S_6VbW4q4e_l2m7_HyM1hCpOtq64sGBW9A7_'],
 ['manutencao','Manutenção dos poços · base','2PACX-1vQzVEGWOj1yLfJ6R5T_c07PxKhoLLinFnLyziQwMYIIXQKUVPL7T1qwhMjkoCKrkBaas8dmw7DUXPeV','0'],
 ['manutencao','Manutenção dos poços · análise','2PACX-1vQzVEGWOj1yLfJ6R5T_c07PxKhoLLinFnLyziQwMYIIXQKUVPL7T1qwhMjkoCKrkBaas8dmw7DUXPeV','1383864696']
 ].map(([route,name,id,gid])=>({route,name,id:route+':'+id+':'+(gid||''),url:base+id+'/pub?output=csv'+(gid?'&gid='+gid:'')}));
 let data,checking=false,lastCheck=0,opened=false;
 const get=id=>document.getElementById(id);
 function read(){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?{...v,hashes:v.hashes||{},events:Array.isArray(v.events)?v.events:[]}: {enabled:false,hashes:{},events:[]};}catch{return {enabled:false,hashes:{},events:[]};}}
 function save(){try{localStorage.setItem(key,JSON.stringify(data));}catch{get('dataNoticeStatus').textContent='Não foi possível guardar a preferência neste aparelho.';}}
 function day(date=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
 async function fingerprint(text){const bytes=new TextEncoder().encode(text.replace(/\r\n/g,'\n').trim());return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');}
 function render(){
  const today=data.events.filter(event=>day(event.at)===day()),unread=today.filter(event=>!event.read).length;
  get('dataNoticeCount').hidden=!unread;get('dataNoticeCount').textContent=unread;get('dataNoticeBell').dataset.unread=String(Boolean(unread));get('dataNoticeBell').setAttribute('aria-label','Notificações das planilhas'+(unread?': '+unread+' não lidas':''));
  get('dataNoticeEnable').hidden=data.enabled;get('dataNoticeDisable').hidden=!data.enabled;get('dataNoticeLater').hidden=data.enabled||data.asked;get('dataNoticeCheck').hidden=!data.enabled;
  get('dataNoticePreference').textContent=data.enabled?'Avisos ativados neste aparelho':'Deseja ativar os avisos das planilhas?';
  const list=get('dataNoticeList');list.replaceChildren();for(const event of today.slice().reverse()){
   const item=document.createElement('li'),button=document.createElement('button'),name=document.createElement('strong'),detail=document.createElement('span');button.type='button';name.textContent=event.name;detail.textContent='Alteração detectada hoje às '+new Date(event.at).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'});button.append(name,detail);button.onclick=()=>{event.read=true;save();render();location.hash=event.route;toggle(false);};item.append(button);list.append(item);
  }get('dataNoticeEmpty').hidden=Boolean(today.length);
 }
 function toggle(force){opened=typeof force==='boolean'?force:!opened;get('dataNoticePanel').hidden=!opened;get('dataNoticeBell').setAttribute('aria-expanded',String(opened));if(opened){for(const event of data.events)event.read=true;save();render();}else get('dataNoticeBell').focus();}
 async function nativeNotice(event){if(!data.enabled||!window.Notification||Notification.permission!=='granted')return;try{const registration=await navigator.serviceWorker?.getRegistration();if(registration?.showNotification)await registration.showNotification('Planilha atualizada · '+event.name,{body:'Uma alteração foi detectada. Toque para consultar os dados.',icon:'icons/gear-192.png',tag:'sheet-'+event.route,data:{route:event.route}});}catch{/* O aviso dentro do app continua disponível. */}}
 async function check(force=false){
  if(!data.enabled||checking||navigator.onLine===false||document.visibilityState==='hidden'||(!force&&Date.now()-lastCheck<120000))return;
  checking=true;lastCheck=Date.now();get('dataNoticeCheck').disabled=true;get('dataNoticeStatus').textContent='Consultando as planilhas…';let errors=0;
  await Promise.all(sheets.map(async sheet=>{try{
   const response=await fetch(sheet.url+'&_notice='+Date.now(),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const text=await response.text();if(!text.trim()||!/[;,]/.test(text)||/<(?:!doctype|html|body)\b/i.test(text))throw Error();const hash=await fingerprint(text);
   data=read();if(!data.enabled)return;const prior=data.hashes[sheet.id];data.hashes[sheet.id]=hash;
   if(prior&&prior!==hash){const event={route:sheet.route,name:sheet.name,at:Date.now(),read:false};data.events.push(event);data.events=data.events.filter(event=>Date.now()-event.at<7*86400000).slice(-100);save();opened=true;get('dataNoticePanel').hidden=false;get('dataNoticeBell').setAttribute('aria-expanded','true');render();void nativeNotice(event);}else save();
  }catch{errors++;}}));
  checking=false;get('dataNoticeCheck').disabled=false;get('dataNoticeStatus').textContent=errors?'Não foi possível consultar '+errors+' fonte(s). Os avisos anteriores foram preservados.':'Última verificação: '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'})+'.';render();
 }
 async function enable(){data.enabled=true;data.asked=true;save();render();let permission='unavailable';try{if(window.Notification)permission=await Notification.requestPermission();}catch{}get('dataNoticeHelp').textContent=permission==='granted'?'Avisos no app e no aparelho ativados. A verificação ocorre com o app aberto e ao retornar.':permission==='denied'?'Avisos dentro do app ativados. Para avisos do aparelho, permita notificações nas configurações do navegador.':'Avisos dentro do app ativados. Este navegador não liberou notificações do aparelho.';await check(true);}
 function init(){data=read();get('dataNoticeBell').onclick=()=>toggle();get('dataNoticeClose').onclick=()=>toggle(false);get('dataNoticeEnable').onclick=enable;get('dataNoticeLater').onclick=()=>{data.asked=true;save();toggle(false);};get('dataNoticeDisable').onclick=()=>{data.enabled=false;data.asked=true;save();render();get('dataNoticeStatus').textContent='Avisos desativados neste aparelho.';};get('dataNoticeCheck').onclick=()=>check(true);render();if(!data.asked)toggle(true);void check(true);
  setInterval(()=>void check(),120000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')void check(true);});window.addEventListener('online',()=>void check(true));window.addEventListener('storage',event=>{if(event.key===key){data=read();render();}});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&opened)toggle(false);});
 }
 window.addEventListener('load',init,{once:true});return {check,enable,toggle};
})();
