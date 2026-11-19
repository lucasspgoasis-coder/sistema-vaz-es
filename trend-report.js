/* Relatório técnico: os mesmos filtros e médias da aba Tendência. */
function trendReportItems(rows,well,year){return calculateMonthlyTrend(rows).filter(r=>(!well||r.well===well)&&(!year||r.month.startsWith(year)));}
function buildTrendReport(items,filters,PDF){
 const pdf=new PDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),fmt=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:2}),signed=v=>v===null?'—':(v>0?'+':'')+fmt(v),month=v=>v.slice(5)+'/'+v.slice(0,4),wells=[...new Set(items.map(r=>r.well))];let page=0;
 const text=(value,x,y,size=9,color='#243d35',align='left')=>{pdf.setFontSize(size);pdf.setTextColor(color);pdf.text(Array.isArray(value)?value:String(value),x,y,{align});};
 for(const well of wells){const rows=items.filter(r=>r.well===well),first=rows[0].month,last=rows.at(-1).month,months=[],cursor=new Date(first+'-01T00:00:00Z');while(cursor.toISOString().slice(0,7)<=last){months.push(cursor.toISOString().slice(0,7));cursor.setUTCMonth(cursor.getUTCMonth()+1);}
 for(let start=0;start<months.length;start+=12){if(page++)pdf.addPage();const period=months.slice(start,start+12),series=period.map(m=>rows.find(r=>r.month===m)),values=rows.map(r=>r.average),max=Math.max(...values,1)*1.15;
 pdf.setFillColor('#153f32');pdf.rect(0,0,297,25,'F');pdf.setFont('helvetica','bold');text('SISTEMA INTEGRADO',14,10,10,'#c8e9d4');text('RELATÓRIO TÉCNICO · TENDÊNCIA MENSAL',14,19,16,'#ffffff');
 text(well+' · '+month(period[0])+' a '+month(period.at(-1)),14,34,13);pdf.setFont('helvetica','normal');text('Filtros: '+(filters.well||'Todos os poços')+' | Ano: '+(filters.year||'Todos')+' | Emitido em '+filters.emitted,14,41,9);
 const x0=30,y0=94,width=240,height=43;pdf.setDrawColor('#dce6e0');pdf.setLineWidth(.2);
 for(let tick=0;tick<=3;tick++){const y=y0-tick*height/3;pdf.line(x0,y,x0+width,y);text(fmt(max*tick/3),x0-2,y+1,7,'#64756c','right');}text('Vazão média (L/h)',x0,47,8);
 const px=i=>x0+(period.length===1?width/2:i*width/(period.length-1));let prior=null;
 series.forEach((r,i)=>{if(!r){prior=null;text(month(period[i]),px(i),100,7,'#64756c','center');return;}const x=px(i),y=y0-r.average/max*height,color=r.delta>0?'#08714f':r.delta<0?'#bf3939':'#64756c';if(prior){pdf.setDrawColor('#20886c');pdf.setLineWidth(.6);pdf.line(prior.x,prior.y,x,y);}pdf.setFillColor(color);pdf.circle(x,y,1.2,'F');text(fmt(r.average),x,y-3,7,color,'center');text(month(r.month),x,100,7,'#64756c','center');prior={x,y};});
 const cols=[14,48,97,129,181,223,283];pdf.setFillColor('#e9f2ed');pdf.rect(14,107,269,9,'F');pdf.setFont('helvetica','bold');['Mês','Média (L/h)','Medições','Dif. (L/h)','Variação','Tendência'].forEach((v,i)=>text(v,(cols[i]+cols[i+1])/2,113,8,'#153f32','center'));pdf.setFont('helvetica','normal');
 series.forEach((r,i)=>{const y=116+i*4.7;if(i%2===0){pdf.setFillColor('#f4f7f5');pdf.rect(14,y,269,4.7,'F');}const entries=[month(period[i]),r?fmt(r.average):'—',r?String(r.count):'0',r?signed(r.delta):'—',r&&r.percent!==null?signed(r.percent)+'%':'—',r?r.status:'Sem medição'];entries.forEach((v,j)=>text(v,(cols[j]+cols[j+1])/2,y+3.3,7.5,j===5&&r?(r.delta>0?'#08714f':r.delta<0?'#bf3939':'#64756c'):'#243d35','center'));});
 pdf.setDrawColor('#cbdcd1');pdf.line(14,177,283,177);text('METODOLOGIA',14,183,8);const note='Média aritmética das medições cadastradas no mês. Diferença = média atual - média do mês anterior; variação = diferença ÷ média anterior × 100. Meses sem medição não representam vazão zero. Sem mês anterior consecutivo não há comparação; base anterior zero não permite percentual. Janeiro considera dezembro do ano anterior, mesmo com filtro de ano.';text(pdf.splitTextToSize(note,269),14,188,7.5);text('Fonte: planilha de vazão vinculada ao sistema · Página '+page,283,204,7,'#64756c','right');
 }}return pdf;
}
async function downloadTrendReport(){
 const button=document.getElementById('trendReportButton'),status=document.getElementById('trendReportStatus');
 try{button.disabled=true;status.textContent='Preparando relatório técnico…';await new Promise(resolve=>setTimeout(resolve,0));if(!window.jspdf?.jsPDF)throw Error('O gerador de PDF ainda está carregando. Tente novamente.');
 const well=document.getElementById('trendWell').value,year=document.getElementById('trendYear').value,items=trendReportItems(rawData,well,year);if(!items.length)throw Error('Não há medições para os filtros selecionados.');
 const pdf=buildTrendReport(items,{well,year,emitted:new Date().toLocaleString('pt-BR')},window.jspdf.jsPDF);pdf.save('Relatorio_Tecnico_Tendencia_'+(well||'Todos').replace(/[^a-z0-9]/gi,'_')+'_'+(year||'Todos')+'.pdf');status.textContent='Relatório técnico baixado.';
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
}
