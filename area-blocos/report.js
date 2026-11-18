var BlockAreaReport=(()=>{
 const fmt=(n,d=6)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(n);
 const date=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
 async function image(svg){const source=new XMLSerializer().serializeToString(svg),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível preparar o desenho do bloco.'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
 async function build(records,drawing,options={}){
  if(!records.length)throw new Error('Cadastre um bloco antes de baixar o relatório.');
  const PDF=options.PDF||window.jspdf?.jsPDF;if(!PDF)throw new Error('A biblioteca de PDF não carregou. Conecte-se e tente novamente.');
  const ordered=BlockAreaCore.sort(records),pdf=new PDF({unit:'mm',format:'a4'}),generated=options.now||new Date(),total=ordered.reduce((s,r)=>s+r.squareMeters,0);
  const text=(value,x,y,size=11,bold=false,color='#244c45')=>{pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(color);pdf.text(Array.isArray(value)?value:String(value),x,y);};
  const box=(x,y,w,h,fill='#f0f7f3')=>{pdf.setFillColor(fill);pdf.setDrawColor('#c9ddd3');pdf.roundedRect(x,y,w,h,3,3,'FD');};
  for(let i=0;i<ordered.length;i++){
   if(i)pdf.addPage();const r=ordered[i];pdf.setFillColor('#ffffff');pdf.rect(0,0,210,297,'F');pdf.setFillColor('#126e5a');pdf.rect(0,0,210,5,'F');
   text('SISTEMA INTEGRADO · FAZENDA OÁSIS',16,17,9,true,'#126e5a');text('Relatório técnico de áreas',16,29,21,true);
   pdf.setFontSize(18);pdf.setFont('helvetica','bold');const title=pdf.splitTextToSize(r.block,178);text(title,16,41,18,true);
   const y=44+(title.length-1)*7; text('Emitido em '+date(generated),16,y+5,9);text('Atualização do cadastro: '+date(r.updatedAt),16,y+11,9);
   box(16,y+17,178,19);text(ordered.length+' bloco(s) neste relatório · Ordem alfabética',21,y+24,9,true);text('Área total: '+fmt(total)+' m²  |  '+fmt(total/10000)+' ha',21,y+31,10);
   for(const [j,label,value] of [[0,'LARGURA ESQUERDA',r.left],[1,'LARGURA DIREITA',r.right],[2,'ALTURA / COMPRIMENTO',r.height]]){const x=16+j*61;box(x,y+43,56,22);text(label,x+4,y+50,7,true);text(fmt(value)+' m',x+4,y+59,13,true);}
   for(const [j,label,value] of [[0,'ÁREA ESTIMADA',fmt(r.squareMeters)+' m²'],[1,'EM HECTARES',fmt(r.hectares)+' ha']]){const x=16+j*91;box(x,y+71,87,23,'#e4f2e9');text(label,x+5,y+79,8,true);text(value,x+5,y+88,17,true,'#126e5a');}
   const svg=drawing(r);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','760');svg.setAttribute('height','430');const img=await (options.loadImage||image)(svg),canvas=(options.canvas||(()=>document.createElement('canvas')))();canvas.width=1520;canvas.height=860;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1520,860);ctx.drawImage(img,0,0,1520,860);const diagramHeight=Math.min(94,229-(y+99)),diagramWidth=diagramHeight*760/430;pdf.addImage(canvas.toDataURL('image/jpeg',0.94),'JPEG',(210-diagramWidth)/2,y+99,diagramWidth,diagramHeight);
   const bottom=237;text('MEMÓRIA DE CÁLCULO',16,bottom,10,true);text('Área = (largura esquerda + largura direita) / 2 × altura',16,bottom+8,10);text('('+fmt(r.left)+' + '+fmt(r.right)+') / 2 × '+fmt(r.height)+' = '+fmt(r.squareMeters)+' m²',16,bottom+15,10,true);text('Hectares = '+fmt(r.squareMeters)+' / 10.000 = '+fmt(r.hectares)+' ha',16,bottom+22,10);
   const note=pdf.splitTextToSize('Área estimada considerando as larguras paralelas e a altura perpendicular entre elas. Desenho ilustrativo sem escala. Terrenos irregulares podem exigir outras medidas.',178);text(note,16,bottom+31,9);
   pdf.setDrawColor('#c9ddd3');pdf.line(16,282,194,282);text('Fonte: medidas cadastradas no aplicativo',16,288,8);text('Página '+(i+1)+' de '+ordered.length,164,288,8);
  }
  pdf.setProperties({title:'Relatório técnico de áreas dos blocos',subject:'Medidas, áreas estimadas e desenhos ilustrativos',creator:'Sistema integrado'});return pdf;
 }
 return {build};
})();
