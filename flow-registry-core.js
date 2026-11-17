var FlowRegistryCore=(()=>{
 const liters=15,headers=['Data','Poço','Hora','Vazão (L/H)'];
 const endpoint='https://script.google.com/macros/s/AKfycbzCHUZ7M6MXQCkBB_xB_9_iqowyAQY0oqIlrZ8RS231n1n4fT-IjNJg5kBrhvyYYg/exec';
 function number(value){const text=String(value??'').trim().replace(',','.');return /^\d+(\.\d+)?$/.test(text)?Number(text):NaN;}
 function calculate(seconds){const value=number(seconds);if(!Number.isFinite(value)||value<=0)throw Error('Informe os segundos da aferição, acima de zero.');const flow=liters/value*3600;if(!Number.isFinite(flow))throw Error('Tempo de aferição inválido.');return flow;}
 function create(input,id){const date=String(input.date||''),hour=String(input.hour||''),match=String(input.well||'').trim().match(/^(?:po[çc]o\s*)?0*(\d+)$/i);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Informe uma data válida.');if(!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hour))throw Error('Informe uma hora válida.');if(!match||Number(match[1])<1||Number(match[1])>99)throw Error('Selecione um poço válido.');const seconds=number(input.seconds),flow=calculate(input.seconds),well='Poço '+match[1].padStart(2,'0'),time=hour.length===5?hour+':00':hour;return {id,date,hour:time,well,seconds,liters,flow,status:'pending',createdAt:new Date().toISOString()};}
 function fingerprint(record){return [record.date,record.hour,record.well,record.flow.toFixed(6)].join('|');}
 function payload(record){return {requestId:record.id,data:record.date.split('-').reverse().join('/'),poco:record.well.toLowerCase(),hora:record.hour,vazao:record.flow,segundos:record.seconds,volumeLitros:liters};}
 function confirmed(response){return response&&response.status==='success';}
 return {liters,headers,endpoint,number,calculate,create,fingerprint,payload,confirmed};
})();
