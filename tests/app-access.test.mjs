import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../app-access.js',import.meta.url),'utf8');
const nodes=new Map(),requests=[],stored=new Map(),session=new Map(),writeControls=[];
function element(){return {value:'',children:[],dataset:{},classList:{add(){},remove(){}},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(){},showModal(){this.open=true;},close(){this.open=false;}};}
function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
const storage=map=>({getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
const listeners={};
const context=vm.createContext({console,crypto:webcrypto,AbortSignal,Date,Intl,FormData:class{constructor(form){this.rows=Object.entries(form.elements).filter(([,input])=>!input.disabled).map(([key,input])=>[key,input.value]);}[Symbol.iterator](){return this.rows[Symbol.iterator]();}},localStorage:storage(stored),sessionStorage:storage(session),window:{addEventListener(name,fn){listeners[name]=fn;},matchMedia:()=>({matches:false})},navigator:{onLine:true,userAgent:'Test'},document:{visibilityState:'visible',body:element(),getElementById:get,querySelectorAll:selector=>selector==='[data-write-control]'?writeControls:[]},setTimeout:()=>{},setInterval:()=>{},rawData:[],maintenanceBase:[],maintenanceAnalysis:[],maintenanceLoaded:true,activeDashboardTab:'registry',weekInfo:()=>({week:1}),maintenanceDate:value=>value?value.split('/').reverse().join('-'):'',maintenanceWell:value=>'Poço '+String(value).padStart(2,'0'),renderFilters(){},maintenanceOptions(){},renderMaintenance(){},applyFilters(){},maintenanceTable(id,headers,rows){get(id).rows=rows;},fetch:async(url,options)=>{requests.push({url,options});const body=JSON.parse(options.body);return {ok:true,status:201,async json(){return {record:{seq:9,id:body.requestId,kind:body.kind,well:body.well,event_date:body.date,payload:{well:body.well,date:body.date,flow:body.flow,notes:body.notes},created_at:'2026-11-14T10:00:00Z',created_by:'test-manager'}};}};}});
vm.runInContext(source,context);
test('Dados do app atualizam gráficos sem duplicar a vazão da planilha; histórico mantém as versões',()=>{
 context.rawData=[{poco:'Poço 03 - Sede',dateStr:'2026-11-14',dateObj:new Date(2026,10,14),vazao:1000}];
 vm.runInContext('captureFlowSheet()',context);
 context.updates=[{seq:1,id:'app-one',kind:'flow',well:3,event_date:'2026-11-14',payload:{well:3,date:'2026-11-14',flow:2000},created_at:'2026-11-14T10:00:00Z',created_by:'gestor'},{seq:2,id:'app-two',kind:'flow',well:3,event_date:'2026-11-14',payload:{well:3,date:'2026-11-14',flow:3000},created_at:'2026-11-14T11:00:00Z',created_by:'gestor'}];
 vm.runInContext('appRecords=updates;mergeAppData()',context);
 assert.equal(context.rawData.length,1);assert.equal(context.rawData[0].vazao,3000);
 assert.equal(vm.runInContext('registryEntries().length',context),3,'Planilha e dois lançamentos preservados no histórico');
});
test('Retorno cadastrado atualiza parada original e preserva conexões dos medidores',()=>{
 context.maintenanceBase=[{'POÇO':'3','MANUTENÇÃO':'01/11/2026'}];context.maintenanceAnalysis=[{'Medidor (R2)':'Poço 06','Medidor (R3)':'Poço 03','Poços Parados':'Poço 03',Inicio:'01/11/2026',Fim:''}];
 vm.runInContext("appRecords=[];captureMaintenanceSheet();appRecords=[{id:'stop',seq:1,kind:'downtime',well:3,payload:{well:3,start:'2026-11-01',end:'2026-11-14',notes:'Retorno'}}];mergeAppData()",context);
 assert.equal(context.maintenanceAnalysis.length,1);assert.equal(context.maintenanceAnalysis[0].Fim,'14/11/2026');assert.equal(context.maintenanceAnalysis[0]['Medidor (R2)'],'Poço 06');
 vm.runInContext('mergeAppData()',context);assert.equal(context.maintenanceAnalysis.length,1,'Atualizações repetidas não duplicam a parada');
});
test('Visitante não envia formulário; gestor envia dados antes de desabilitar campos e atualiza histórico',async()=>{
 const fields={well:{value:'3'},date:{value:'2026-11-14'},flow:{value:'4500'},notes:{value:'Leitura do dia'}};writeControls.push(...Object.values(fields));const form={elements:fields,reportValidity:()=>true};
 const event={preventDefault(){},currentTarget:form};context.event=event;
 vm.runInContext("appRole='visitor';appToken='';",context);await vm.runInContext("saveRegistryForm(event,'flow')",context);assert.equal(requests.length,0);
 vm.runInContext("appRole='manager';appToken='manager-token';appRecords=[];updateAppRole()",context);
 await vm.runInContext("saveRegistryForm(event,'flow')",context);
 assert.equal(requests.length,1);const input=JSON.parse(requests[0].options.body);assert.equal(input.flow,4500);assert.equal(input.well,3);
 assert.equal(requests[0].options.headers.Authorization,'Bearer manager-token');assert.equal(context.rawData[0].vazao,4500);
 assert.match(get('registrySaveStatus').textContent,/salvo no servidor/);assert.equal(fields.flow.value,'');
});
test('Manifesto contém ícones instaláveis; interface não contém a senha do gestor',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.display,'standalone');for(const icon of manifest.icons){const bytes=await readFile(new URL('../'+icon.src,import.meta.url));const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
 assert.ok(html.includes('id="panel-registry"'));assert.ok(html.includes('id="accessManager"'));assert.equal((html+source).includes('ADMIN_PASSWORD_HASH'),false);
});
test('Sincronização em andamento não apaga um lançamento que acabou de ser salvo',async()=>{
 const previousFetch=context.fetch;context.fetch=async()=>({ok:true,status:200,async json(){return {records:[],nextCursor:null};}});
 const count=vm.runInContext('appRecords.length',context);assert.ok(count>0);
 await vm.runInContext('syncAppRecords()',context);
 assert.equal(vm.runInContext('appRecords.length',context),count);assert.equal(context.rawData[0].vazao,4500);
 context.fetch=previousFetch;
});
