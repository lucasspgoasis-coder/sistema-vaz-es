var BlockAreaCore=(()=>{
 const clean=value=>String(value||'').trim().replace(/\s+/g,' ');
 function block(value){const text=clean(value),match=text.match(/^(?:bloco\s*)?0*(\d+)$/i);return match?'Bloco '+match[1].padStart(2,'0'):text;}
 function measure(value){const text=String(value??'').trim().replace(',','.');if(!/^\d+(\.\d+)?$/.test(text))throw Error('Use medidas em metros, com vírgula ou ponto decimal e sem separador de milhar.');const number=Number(text);if(!Number.isFinite(number)||number<=0)throw Error('As medidas devem ser maiores que zero.');return number;}
 const method='split-length-half-width-v2';
 // Esquerda + direita são duas partes do comprimento. A terceira medida é meia largura.
 function calculate(left,right,height){left=measure(left);right=measure(right);height=measure(height);const length=left+right,width=height*2,squareMeters=length*width;if(!Number.isFinite(length)||!Number.isFinite(width)||!Number.isFinite(squareMeters))throw Error('As medidas informadas ultrapassam o limite de cálculo.');return {left,right,height,length,width,method,squareMeters,hectares:squareMeters/10000};}
 function create(input,id,at=new Date().toISOString()){const name=block(input.block);if(!name)throw Error('Informe o bloco.');if(name.length>80)throw Error('O nome do bloco deve ter até 80 caracteres.');return {id,block:name,...calculate(input.left,input.right,input.height),createdAt:at,updatedAt:at};}
 function sort(records){return [...records].sort((a,b)=>a.block.localeCompare(b.block,'pt-BR',{numeric:true,sensitivity:'base'}));}
 function upsert(records,record,editingId=null){const key=record.block.toLocaleLowerCase('pt-BR'),same=records.find(item=>item.block.toLocaleLowerCase('pt-BR')===key),previous=records.find(item=>item.id===editingId)||same;if(editingId&&same&&same.id!==editingId)throw Error('Já existe outro cadastro com esse nome de bloco.');const saved={...record,id:previous?.id||record.id,createdAt:previous?.createdAt||record.createdAt};return {records:sort([...records.filter(item=>item.id!==saved.id),saved]),saved};}
 function migrate(records){return sort(records.map(record=>{const updated={...record,...create(record,record.id,record.createdAt),updatedAt:record.updatedAt||record.createdAt};if(record.method!==method)updated.previousCalculation=record.previousCalculation||{method:record.method||'average-width-v1',squareMeters:record.squareMeters,hectares:record.hectares};return updated;}));}
 return {block,measure,calculate,create,sort,upsert,migrate,method};
})();
