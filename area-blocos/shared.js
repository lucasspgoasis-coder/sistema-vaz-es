/* Base compartilhada das áreas. A cópia local e a fila sobrevivem a falhas de conexão. */
var BlockAreaShared=(()=>{
 const endpoint='https://oasis-vazao-cadastros-20261114.snappylace5.chatgpt.site/api/block-areas',queueKey='oasis.blockAreas.shared.outbox.v1';
 let hooks,queue={},busy=false,state='waiting',lastSync=0,lastAttempt=0,errorText='';
 const blockKey=record=>BlockAreaCore.block(record.block).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const same=(a,b)=>blockKey(a)===blockKey(b)&&['left','right','height'].every(key=>Number(a[key])===Number(b[key]));
 const body=record=>({block:record.block,left:Number(record.left),right:Number(record.right),height:Number(record.height)});
 const entries=()=>Object.entries(queue),pending=record=>entries().find(([,op])=>op.localId===record.id||(op.sharedId&&op.sharedId===record.sharedId));
 function persistQueue(){localStorage.setItem(queueKey,JSON.stringify(queue));}
 function status(){return {state:navigator.onLine===false?'offline':busy?'pending':state,lastSync,pending:entries().length,conflicts:entries().filter(([,op])=>op.conflict).length,error:errorText};}
 function notify(){hooks?.status(status());try{if(window.parent!==window)window.parent.postMessage({type:'APP_AREA_STATUS',status:status()},window.location.origin);}catch{}}
 async function request(url,options={}){const response=await fetch(url,{...options,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});let data;try{data=await response.json();}catch{throw Error('O serviço de áreas não respondeu corretamente. Tente novamente.');}if(!response.ok){const error=Error(data.error||'Não foi possível consultar o histórico compartilhado.');error.conflict=data.conflict;error.record=data.record;throw error;}return data;}
 function normalized(record){if(!record||!record.id||!Number.isInteger(record.sharedRevision)||record.sharedRevision<1)throw Error('Cadastro compartilhado inválido.');return {...record,...BlockAreaCore.calculate(record.left,record.right,record.height),block:BlockAreaCore.block(record.block),sharedId:record.sharedId||record.id,sharedPending:false};}
 function putRemote(remote,op,keepLocal=false){const list=hooks.read(),local=list.find(record=>record.id===op?.localId||(record.sharedId&&record.sharedId===remote.sharedId)||blockKey(record)===blockKey(remote)),saved=keepLocal&&local?{...local,sharedId:remote.sharedId,sharedRevision:remote.sharedRevision,sharedPending:true}:{...remote,id:local?.id||remote.id};if(!keepLocal&&local&&!local.sharedPending&&local.sharedRevision===remote.sharedRevision&&same(local,remote))return local;hooks.replace(BlockAreaCore.sort([...list.filter(record=>record!==local),saved]),op?{ack:true,recordId:saved.id,sharedId:remote.sharedId,sharedRevision:remote.sharedRevision}:{});return saved;}
 function enqueue(record,{run=true}={}){
  const prior=pending(record),slot=prior?.[0]||record.id;
  queue[slot]={requestId:crypto.randomUUID(),localId:record.id,sharedId:record.sharedId||'',expectedRevision:record.sharedRevision??null,record:body(record)};persistQueue();state='pending';notify();if(run)void sync();
 }
 function adopt(remote,slot,op){const newer=queue[slot];if(newer&&newer.requestId!==op.requestId){newer.localId=op.localId;newer.sharedId=remote.sharedId;newer.expectedRevision=remote.sharedRevision;delete newer.conflict;putRemote(remote,op,true);}else{putRemote(remote,op);delete queue[slot];}persistQueue();}
 async function pull(){
  const remote=[];let cursor='',pages=0;do{const data=await request(endpoint+'?after='+encodeURIComponent(cursor)+'&_sync='+Date.now());if(!Array.isArray(data.records))throw Error('Histórico compartilhado inválido.');remote.push(...data.records.map(normalized));if(data.nextCursor===cursor&&cursor)throw Error('Não foi possível concluir a leitura do histórico.');cursor=data.nextCursor||'';if(++pages>100)throw Error('O histórico ultrapassou o limite de leitura.');}while(cursor);
  for(const record of remote){const local=hooks.read().find(item=>(item.sharedId&&item.sharedId===record.sharedId)||blockKey(item)===blockKey(record)),queued=local&&pending(local);if(queued){const [slot,op]=queued;if(same(op.record,record))adopt(record,slot,op);else if(op.expectedRevision!==record.sharedRevision){op.conflict=record;persistQueue();}}else putRemote(record);}
 }
 async function sync(){
  if(!hooks||busy)return;if(navigator.onLine===false){state='offline';notify();return;}
  busy=true;lastAttempt=Date.now();errorText='';notify();let failed=false;
  try{
   for(const record of hooks.read())if((!record.sharedId||record.sharedPending)&&!pending(record))enqueue(record,{run:false});
   for(const [slot,op] of entries()){
    if(op.conflict)continue;
    try{const data=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:op.requestId,sharedId:op.sharedId,expectedRevision:op.expectedRevision,record:op.record})});if(data.requestId!==op.requestId)throw Error('O envio não foi confirmado pelo serviço.');adopt(normalized(data.record),slot,op);}
    catch(error){if(error.conflict&&error.record){const remote=normalized(error.record);if(same(op.record,remote))adopt(remote,slot,op);else if(queue[slot]?.requestId===op.requestId){queue[slot].conflict=remote;persistQueue();}}else{failed=true;errorText=error.message;break;}}
   }
   await pull();
   const conflicts=entries().some(([,op])=>op.conflict);state=conflicts?'conflict':failed&&entries().length?'error':entries().length?'pending':'synced';
   if(state==='synced'){lastSync=Date.now();try{localStorage.setItem('oasis.blockAreas.shared.lastSync',String(lastSync));}catch{}}
  }catch(error){state='error';errorText=error.message;}finally{busy=false;notify();if(state==='pending'&&entries().some(([,op])=>!op.conflict))setTimeout(()=>void sync(),0);}
 }
 async function resolve(localId,choice){const entry=entries().find(([,op])=>op.localId===localId);if(!entry?.[1].conflict)return;const [slot,op]=entry,remote=op.conflict;
  try{const key='oasis.blockAreas.shared.conflictCopies.v1',copies=JSON.parse(localStorage.getItem(key)||'[]');copies.push({at:new Date().toISOString(),local:op.record,shared:remote});localStorage.setItem(key,JSON.stringify(copies));if(choice==='remote'){putRemote(remote,op);delete queue[slot];persistQueue();}else{queue[slot]={...op,requestId:crypto.randomUUID(),sharedId:remote.sharedId,expectedRevision:remote.sharedRevision};delete queue[slot].conflict;persistQueue();}await sync();}catch(error){state='error';errorText=error.message;notify();}
 }
 async function history(record){if(!record.sharedId)throw Error('Envie este cadastro antes de consultar o histórico compartilhado.');let rows=[],cursor='',pages=0;do{const data=await request(endpoint+'/history?id='+encodeURIComponent(record.sharedId)+'&after='+encodeURIComponent(cursor));if(!Array.isArray(data.history))throw Error('Histórico de alterações inválido.');rows.push(...data.history);cursor=data.nextCursor||'';if(++pages>100)throw Error('O histórico ultrapassou o limite de leitura.');}while(cursor);return rows;}
 function init(callbacks){hooks=callbacks;try{queue=JSON.parse(localStorage.getItem(queueKey)||'{}');if(!queue||Array.isArray(queue)||typeof queue!=='object')queue={};lastSync=Number(localStorage.getItem('oasis.blockAreas.shared.lastSync'))||0;const raw=localStorage.getItem('oasis.blockAreas.v1');if(raw&&!localStorage.getItem('oasis.blockAreas.beforeShared.v1'))localStorage.setItem('oasis.blockAreas.beforeShared.v1',raw);}catch(error){state='error';errorText='Não foi possível preparar a fila de envio neste aparelho.';notify();return;}
  notify();void sync();window.addEventListener('online',()=>void sync());window.addEventListener('offline',notify);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastAttempt>15000)void sync();});setInterval(()=>{if(document.visibilityState!=='hidden'&&!window.frameElement?.hidden)void sync();},60000);
 }
 return {init,enqueue,sync,status,history,resolve,pending:record=>pending(record)?.[1]||null};
})();
