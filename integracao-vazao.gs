/**
 * Cole no Apps Script VINCULADO à planilha de vazão e atualize a implantação existente.
 * Mantém Data | Poço | Hora | Vazão (L/H) e as colunas automáticas existentes.
 * Não use appendRow: fórmulas antecipadas podem levar a gravação para longe dos dados.
 */
function doGet() {
  return flowJson_({status:'online',version:'vazao-cadastro-1',message:'Cadastro de vazão ativo.'});
}
function doPost(e) {
  var lock=LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var p=JSON.parse(e&&e.postData&&e.postData.contents||'{}');
    var dateText=String(p.data||''),timeText=String(p.hora||''),wellMatch=String(p.poco||'').match(/^po[çc]o\s*0*(\d+)$/i),flow=Number(p.vazao),seconds=Number(p.segundos);
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(dateText)||!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(timeText)||!wellMatch||Number(wellMatch[1])<1||Number(wellMatch[1])>99||!isFinite(flow)||flow<=0||!isFinite(seconds)||seconds<=0||Math.abs(flow-54000/seconds)>0.00001)throw Error('Aferição inválida. Confira data, hora, poço e segundos para 15 litros.');
    var book=SpreadsheetApp.getActiveSpreadsheet();if(!book)throw Error('Vincule este script à planilha de vazão.');
    var sheets=book.getSheets().filter(function(sheet){if(sheet.getLastRow()<1||sheet.getLastColumn()<4)return false;var head=sheet.getRange(1,1,1,4).getDisplayValues()[0].map(flowHeader_);return head.join('|')==='data|poco|hora|vazao (l/h)';});
    var configured=PropertiesService.getScriptProperties().getProperty('VAZAO_ABA');if(configured)sheets=sheets.filter(function(sheet){return sheet.getName()===configured;});
    if(sheets.length!==1)throw Error('Não foi possível identificar uma única aba de vazão. Confira os quatro cabeçalhos ou configure VAZAO_ABA nas propriedades do script.');
    var sheet=sheets[0],zone=book.getSpreadsheetTimeZone(),date=Utilities.parseDate(dateText,zone,'dd/MM/yyyy');if(Utilities.formatDate(date,zone,'dd/MM/yyyy')!==dateText)throw Error('Data de coleta inválida.');
    var well='poço '+('0'+Number(wellMatch[1])).slice(-2),hourParts=timeText.split(':').map(Number),time=(hourParts[0]*3600+hourParts[1]*60+hourParts[2])/86400,last=sheet.getLastRow(),existing=last>1?sheet.getRange(2,1,last-1,4).getValues():[],lastInput=1;
    for(var i=0;i<existing.length;i++){
      var r=existing[i];if(r.some(function(v){return v!=='';}))lastInput=i+2;
      var rd=r[0] instanceof Date?Utilities.formatDate(r[0],zone,'dd/MM/yyyy'):String(r[0]).trim(),rt=r[2] instanceof Date?Utilities.formatDate(r[2],zone,'HH:mm:ss'):typeof r[2]==='number'?flowTime_(r[2]):String(r[2]).trim();
      if(rd===dateText&&String(r[1]).toLowerCase().trim()===well&&rt===timeText&&Math.abs(Number(r[3])-flow)<0.00001)return flowJson_({status:'success',duplicate:true,row:i+2,sheet:sheet.getName(),message:'Aferição já registrada; nenhum dado duplicado.'});
    }
    var row=lastInput+1,width=sheet.getLastColumn(),template=lastInput>1?sheet.getRange(lastInput,1,1,width):null;
    if(row>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),1);
    if(template)template.copyTo(sheet.getRange(row,1,1,width),SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);
    var headers=sheet.getRange(1,1,1,width).getDisplayValues()[0],formulas=template?template.getFormulasR1C1()[0]:[],dayParts=dateText.split('/').map(Number),year=dayParts[2],month=dayParts[1],monthNames=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var weekDate=new Date(Date.UTC(year,month-1,dayParts[0]));weekDate.setUTCDate(weekDate.getUTCDate()+4-(weekDate.getUTCDay()||7));var week=Math.ceil((((weekDate-new Date(Date.UTC(weekDate.getUTCFullYear(),0,1)))/86400000)+1)/7),hour=hourParts[0];
    var derived={'ano':year,'semana':week,'contagem':monthNames[month-1],'mes':month,'total':hour,'periodo (automatico)':hour<6?'Madrugada':hour<12?'Manhã':hour<18?'Tarde':'Noite'};
    // Prepara fórmulas antes dos quatro campos que identificam a coleta.
    for(var col=4;col<width;col++){var target=sheet.getRange(row,col+1);if(target.getFormula())continue;if(formulas[col])target.setFormulaR1C1(formulas[col]);else if(Object.prototype.hasOwnProperty.call(derived,flowHeader_(headers[col])))target.setValue(derived[flowHeader_(headers[col])]);}
    sheet.getRange(row,1,1,4).setValues([[date,well,time,flow]]);
    sheet.getRange(row,1).setNumberFormat('dd/MM/yyyy');sheet.getRange(row,3).setNumberFormat('HH:mm:ss');
    SpreadsheetApp.flush();
    return flowJson_({status:'success',row:row,sheet:sheet.getName(),requestId:String(p.requestId||''),message:'Aferição registrada na planilha de vazão.'});
  } catch(error) {return flowJson_({status:'error',message:String(error.message||error)});}
  finally {try{lock.releaseLock();}catch(ignored){}}
}
function flowHeader_(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');}
function flowTime_(value){var seconds=Math.round((value%1)*86400);return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(function(n){return ('0'+n).slice(-2);}).join(':');}
function flowJson_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
