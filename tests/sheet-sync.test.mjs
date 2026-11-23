import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('sheet-sync.js','utf8');
function setup(){
 let now=100000,reads=0,timer;const events={},docEvents={},fetched=[],parsed=[];
 const window={frameElement:{hidden:false},fetch:async(input,options)=>{fetched.push({input,options});return {ok:true};},Papa:{parse:(input,options)=>{parsed.push({input,options});}},read:()=>{reads++;},addEventListener:(name,fn)=>events[name]=fn};
 const document={currentScript:{dataset:{reader:'read'}},visibilityState:'visible',addEventListener:(name,fn)=>docEvents[name]=fn},navigator={onLine:true};
 vm.runInContext(source,vm.createContext({window,document,navigator,Date:{now:()=>now},URL,Request,Promise,setInterval:fn=>timer=fn}));
 return {window,document,navigator,events,docEvents,fetched,parsed,tick:value=>now+=value,timer:()=>timer(),reads:()=>reads};
}
test('Leituras publicadas ignoram cache e cada consulta tem endereço novo, sem alterar gravações',async()=>{
 const app=setup(),url='https://docs.google.com/spreadsheets/d/e/TESTE/pub?output=csv&gid=12';
 await app.window.fetch(url);await app.window.fetch(url);
 assert.equal(app.fetched[0].options.cache,'no-store');assert.notEqual(app.fetched[0].input,app.fetched[1].input);assert.equal(new URL(app.fetched[0].input).searchParams.get('gid'),'12');
 await app.window.fetch('https://script.google.com/macros/s/TESTE/exec',{method:'POST',body:'coleta'});assert.equal(app.fetched[2].input,'https://script.google.com/macros/s/TESTE/exec');assert.equal(app.fetched[2].options.body,'coleta');
 let complete=0;app.window.Papa.parse(url,{download:true,complete:()=>complete++});assert.ok(app.parsed[0].input.includes('_sync='));app.parsed[0].options.complete({data:[]});assert.equal(complete,1);
 app.window.Papa.parse('Data,Valor\n23/11/2026,100',{header:true});assert.equal(app.parsed[1].input,'Data,Valor\n23/11/2026,100');
});
test('Retoma leitura ao voltar no celular e evita repetição, aba oculta, offline ou consulta em andamento',()=>{
 const app=setup();app.tick(31000);app.events.pageshow({persisted:true});assert.equal(app.reads(),1);app.events.online();assert.equal(app.reads(),1);
 app.tick(121000);app.window.frameElement.hidden=true;app.timer();assert.equal(app.reads(),1);app.window.frameElement.hidden=false;app.events.resize();assert.equal(app.reads(),2);
 app.tick(121000);app.navigator.onLine=false;app.timer();assert.equal(app.reads(),2);app.navigator.onLine=true;
 app.window.Papa.parse('https://docs.google.com/spreadsheets/d/e/TESTE/pub?output=csv',{download:true});app.tick(121000);app.timer();assert.equal(app.reads(),2);app.parsed[0].options.error(Error('offline'));app.timer();assert.equal(app.reads(),3);
});
test('Todos os leitores e o app instalado incluem a proteção de atualização',async()=>{
 for(const folder of ['sistema-transplantio','sistema-adubacao','sistema-rocadeira'])assert.equal(await readFile(folder+'/sheet-sync.js','utf8'),source);
 for(const file of ['vazao.html','manutencao.html','sistema-transplantio/index.html','sistema-adubacao/index.html','sistema-rocadeira/index.html'])assert.match(await readFile(file,'utf8'),/sheet-sync\.js\?v=.*data-reader=/);
 const sw=await readFile('sw.js','utf8');assert.ok(sw.includes("fetch(event.request,{cache:'no-store'})"));assert.ok(sw.includes('./sistema-transplantio/sheet-sync.js'));
});
