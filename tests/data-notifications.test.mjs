import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),source=await readFile(new URL('../data-notifications.js',import.meta.url),'utf8');
function app(){
 const dom=new JSDOM(html,{url:'https://example.com/sistema/',runScripts:'outside-only'}),w=dom.window;let permissionCalls=0,requests=0,revision=1,failure=false,flowCSV=null;const native=[];
 Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.AbortSignal=AbortSignal;w.setInterval=()=>0;
 w.Notification={permission:'default',async requestPermission(){permissionCalls++;this.permission='granted';return 'granted';}};
 Object.defineProperty(w.navigator,'serviceWorker',{value:{async getRegistration(){return {async showNotification(title,options){native.push({title,options});}};}}});
 w.fetch=async url=>{requests++;if(failure)throw Error('offline');return new Response(url.includes('2PACX-1vSaf')&&flowCSV!==null?flowCSV:'Data,Valor\n24/11/2026,'+(url.includes('2PACX-1vSaf')?revision:1));};
 w.eval(source);w.dispatchEvent(new w.Event('load'));
 return {w,dom,native,get permissionCalls(){return permissionCalls;},get requests(){return requests;},change(){revision++;},csv(value){flowCSV=value;},fail(value){failure=value;},stored:()=>JSON.parse(w.localStorage.getItem('oasis.dataNotifications.v1')),get:id=>w.document.getElementById(id)};
}
test('Pergunta antes de ativar, primeira consulta sem falsos avisos, identifica mudança e não repete',async()=>{
 const a=app();try{
 assert.equal(a.get('dataNoticePanel').hidden,false);assert.equal(a.permissionCalls,0);assert.equal(a.requests,0);
 await a.w.DataNotifications.enable();assert.equal(a.permissionCalls,1);assert.equal(a.requests,7);assert.equal(a.stored().events.length,0);
 a.w.DataNotifications.toggle(false);a.change();await a.w.DataNotifications.check(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.stored().events.length,1);assert.equal(a.get('dataNoticePanel').hidden,true);assert.equal(a.get('dataNoticeCount').textContent,'1');assert.match(a.get('dataNoticeList').textContent,/Vazão.*detectada hoje/);assert.equal(a.native.length,1);
 assert.equal(a.get('dataNoticeToast').hidden,false);assert.match(a.get('dataNoticeToastContent').textContent,/Data24\/11\/2026Valor2/);assert.match(a.native[0].options.body,/Valor: 2/);
 await a.w.DataNotifications.check(true);assert.equal(a.stored().events.length,1);assert.equal(a.native.length,1);
 a.get('dataNoticeList').querySelector('button').click();assert.equal(a.w.location.hash,'#vazao');assert.equal(a.get('dataNoticeCount').hidden,true);
 }finally{a.dom.window.close();}
});
test('Resumo mostra somente linhas novas, preserva duplicatas e interpreta aspas, vírgulas e quebras de linha',async()=>{
 const a=app();try{
 a.csv('Data,Poço,Vazão,Detalhe\n24/11/2026,Poço 01,1800,Antigo');await a.w.DataNotifications.enable();
 a.csv('Data,Poço,Vazão,Detalhe\n24/11/2026,Poço 02,2200,"Novo, com observação\nem duas linhas"\n24/11/2026,Poço 01,1800,Antigo');await a.w.DataNotifications.check(true);
 const event=a.stored().events.at(-1);assert.equal(event.total,1);assert.equal(event.removed,0);assert.equal(event.rows[0][1],'Poço 02');assert.equal(event.rows[0][3],'Novo, com observação\nem duas linhas');assert.match(event.summary,/Registros adicionados: 1/);assert.doesNotMatch(a.get('dataNoticeToastContent').textContent,/Antigo/);
 a.csv('Data,Poço,Vazão,Detalhe\n24/11/2026,Poço 01,1800,Antigo\n24/11/2026,Poço 02,2200,"Novo, com observação\nem duas linhas"\n24/11/2026,Poço 01,1800,Antigo');await a.w.DataNotifications.check(true);assert.equal(a.stored().events.at(-1).total,1);
 a.get('dataNoticeToastClose').click();assert.equal(a.get('dataNoticeToast').hidden,true);
 }finally{a.dom.window.close();}
});
test('Erros preservam referência, negar avisos do aparelho mantém o aviso interno e desativar interrompe consultas',async()=>{
 const a=app();try{
 a.w.Notification.requestPermission=async()=>{a.w.Notification.permission='denied';return 'denied';};await a.w.DataNotifications.enable();const before=a.stored().hashes;
 a.fail(true);await a.w.DataNotifications.check(true);assert.deepEqual(a.stored().hashes,before);assert.match(a.get('dataNoticeStatus').textContent,/Não foi possível/);assert.equal(a.stored().events.length,0);
 a.fail(false);a.change();await a.w.DataNotifications.check(true);assert.equal(a.stored().events.length,1);assert.equal(a.native.length,0);
 a.get('dataNoticeDisable').click();const requests=a.requests;await a.w.DataNotifications.check(true);assert.equal(a.requests,requests);assert.equal(a.stored().enabled,false);
 }finally{a.dom.window.close();}
});
test('Cadastro confirmado no app mostra valores imediatamente e não repete quando chega na planilha',async()=>{
 const a=app();try{
 a.csv('Data,Poço,Hora,Vazão (L/H)\n24/11/2026,poço 01,09:00:00,1800');await a.w.DataNotifications.enable();
 const notice={id:'vazao:coleta-2',route:'vazao',headers:['Data','Poço','Hora','Vazão (L/H)'],row:['24/11/2026','Poço 02','10:00:00',2200]};
 a.w.DataNotifications.recordSaved(notice);a.w.DataNotifications.recordSaved(notice);assert.equal(a.stored().events.length,1);assert.match(a.get('dataNoticeToastContent').textContent,/confirmado na planilha/);assert.match(a.get('dataNoticeToastContent').textContent,/Poço 02/);
 a.csv('Data,Poço,Hora,Vazão (L/H)\n24/11/2026,poço 01,09:00:00,1800\n24/11/2026,poço 02,10:00:00,2200\n24/11/2026,poço 03,11:00:00,2400');await a.w.DataNotifications.check(true);
 assert.equal(a.stored().events.length,2);assert.equal(a.stored().events.at(-1).total,1);assert.equal(a.stored().events.at(-1).rows[0][1],'poço 03');assert.equal(a.stored().echoes.length,0);
 }finally{a.dom.window.close();}
});
