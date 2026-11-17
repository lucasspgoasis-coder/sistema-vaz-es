var PhotoDocReport=(()=>{
 const W=1240,H=1754,M=70;
 const date=value=>value.split('-').reverse().join('/');
 function lines(ctx,text,width){const result=[];let line='';for(const word of String(text||'').split(/\s+/)){if(ctx.measureText((line?line+' ':'')+word).width>width&&line){result.push(line);line='';}if(ctx.measureText(word).width>width){for(const char of word){if(ctx.measureText(line+char).width>width){result.push(line);line='';}line+=char;}}else line+=(line?' ':'')+word;}if(line)result.push(line);return result;}
 async function image(blob){if(typeof createImageBitmap==='function')return createImageBitmap(blob);return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Não foi possível abrir uma foto do relatório.'));};img.src=url;});}
 async function build(records,{format='both'}={}){
  const entries=PhotoDocCore.sortRecords(records.filter(r=>r.status==='documented'&&PhotoDocCore.activePhotos(r).length));if(!entries.length)throw Error('Não há documentação completa para gerar o relatório.');
  const pages=[];let canvas,ctx,y,activeEntry;
  function page(){canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.fillStyle='#233c55';ctx.fillRect(0,0,W,140);ctx.fillStyle='white';ctx.font='bold 32px Arial';ctx.fillText('FAZENDA OÁSIS · DOCUMENTÁRIO DE PERDAS',M,60);ctx.font='16px Arial';const sub=activeEntry?activeEntry.block+' · '+date(activeEntry.date)+(activeEntry.cause?' · '+activeEntry.cause:''):'Bloco A–Z → data cronológica → foto A–Z';lines(ctx,sub,W-M*2).slice(0,2).forEach((line,i)=>ctx.fillText(line,M,103+i*22));pages.push(canvas);y=187;}
  function ensure(height){if(y+height>H-90)page();}
  function text(value,size=19,bold=false,color='#254354'){ctx.font=(bold?'bold ':'')+size+'px Arial';const wrapped=lines(ctx,value,W-M*2);for(const line of wrapped){ensure(size+12);ctx.font=(bold?'bold ':'')+size+'px Arial';ctx.fillStyle=color;ctx.fillText(line,M,y);y+=size+10;}}
  function metadata(entry){text(entry.block+' · '+date(entry.date),27,true);if(entry.cause)text('Causa / ocorrência informada: '+entry.cause,22,true);if(entry.culture||entry.author)text([entry.culture&&'Cultura: '+entry.culture,entry.author&&'Responsável: '+entry.author].filter(Boolean).join(' · '),17);y+=8;}
  for(const entry of entries){activeEntry=entry;const photos=PhotoDocCore.sortPhotos(PhotoDocCore.activePhotos(entry));for(let index=0;index<photos.length;index++){
   const photo=photos[index];page();metadata(entry);text('Foto '+(index+1)+' de '+photos.length+' · Registro: '+PhotoDocCore.photoDate(entry),18,true,'#5969a4');
   if(index===0&&entry.notes){text('Observações do registro: '+entry.notes,17);y+=12;}
   const frameWidth=W-M*2,frameHeight=frameWidth*3/4;
   if(y+frameHeight+40>H-90){page();metadata(entry);text('Foto '+(index+1)+' de '+photos.length+' · Registro: '+PhotoDocCore.photoDate(entry),18,true,'#5969a4');}
   let bitmap;try{bitmap=await image(photo.preview||photo.original);}catch{throw Error('A foto '+photo.name+' não pôde ser desenhada. O arquivo original continua salvo no histórico.');}
   const scale=Math.min((frameWidth-20)/bitmap.width,(frameHeight-20)/bitmap.height),width=bitmap.width*scale,height=bitmap.height*scale;ctx.fillStyle='#f1f5f8';ctx.fillRect(M,y,frameWidth,frameHeight);ctx.drawImage(bitmap,M+(frameWidth-width)/2,y+(frameHeight-height)/2,width,height);y+=frameHeight+30;bitmap.close?.();
   const caption=PhotoDocCore.caption(entry,photo);text(caption.context,17);if(caption.automatic){y+=8;text(caption.automatic,18,false,'#5969a4');}
   if(photo.description&&photo.descriptionSource==='manual'){y+=8;text('Detalhamento visual: '+photo.description,18);}
   text(caption.review,16,true,photo.reviewed?'#23734f':'#986a32');y+=8;text('Registro: '+PhotoDocCore.photoDate(entry)+' · Original preservado · '+(photo.original.size/1024/1024).toLocaleString('pt-BR',{maximumFractionDigits:2})+' MB',14,false,'#6c8390');
   if(photo.hash)text('SHA-256 do original: '+photo.hash,13,false,'#6c8390');
  }}
  pages.forEach((c,i)=>{const p=c.getContext('2d');p.fillStyle='#fff';p.fillRect(0,H-70,W,70);p.fillStyle='#6c8390';p.font='15px Arial';p.fillText('Fotos originais preservadas no aparelho · Sugestões visuais não confirmam a causa.',M,H-43);p.textAlign='right';p.fillText((i+1)+' / '+pages.length,W-M,H-20);});
  let pdf=null,jpeg=null;
  if(format!=='jpeg'){if(!window.jspdf?.jsPDF)throw Error('Conecte-se para carregar a biblioteca de PDF ou escolha JPEG.');const documentPdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait'});pages.forEach((c,i)=>{if(i)documentPdf.addPage();documentPdf.addImage(c.toDataURL('image/jpeg',.92),'JPEG',0,0,210,297);});pdf=documentPdf.output('blob');}
  if(format!=='pdf'){const combined=document.createElement('canvas'),scale=Math.min(1,24000/(pages.length*H));combined.width=Math.round(W*scale);combined.height=Math.round(H*pages.length*scale);const paint=combined.getContext('2d');pages.forEach((c,i)=>paint.drawImage(c,0,Math.round(i*H*scale),combined.width,Math.round(H*scale)));jpeg=await new Promise((resolve,reject)=>combined.toBlob(blob=>blob?resolve(blob):reject(Error('Não foi possível gerar o JPEG.')),'image/jpeg',.92));}
  return {pdf,jpeg,pages:pages.length};
 }
 function download(blob,name){const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=String(name).replace(/[\\/:*?"<>|]/g,'_');link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 return {build,download};
})();
