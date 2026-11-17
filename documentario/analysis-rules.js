var PhotoDocAnalysis=(()=>{
 const model='Xenova/clip-vit-base-patch32';
 const candidates=[
  {id:'chewed',label:'crop plant leaves with holes and insect chewing damage',text:'A imagem sugere folhas com perfurações ou bordas consumidas. Esse aspecto pode ser compatível com dano por mastigação, mas a foto não confirma o agente responsável.'},
  {id:'dry',label:'crop plants with dry brown wilted leaves',text:'A imagem sugere folhas secas, amarronzadas ou murchas. A causa precisa ser conferida no campo; esse aspecto sozinho não confirma falta de água ou doença.'},
  {id:'broken',label:'broken stems or physically damaged crop plants',text:'A imagem sugere rupturas ou danos físicos na planta. É necessário conferir o histórico do manejo e a condição no bloco para atribuir a causa.'},
  {id:'spots',label:'crop plant leaves with visible spots and mold',text:'A imagem sugere manchas ou alteração localizada na superfície da planta. A aparência não permite identificar doença, fungo ou outro agente com segurança.'},
  {id:'yellow',label:'crop plant leaves with yellow discoloration',text:'A imagem sugere amarelecimento ou perda de coloração verde nas folhas. A foto não confirma deficiência nutricional, doença ou a causa dessa alteração.'},
  {id:'rot',label:'vegetables with visibly rotting or decaying tissue',text:'A imagem sugere tecido deteriorado ou com aspecto de podridão. Confirme a condição no local e o contexto antes de atribuir a causa da perda.'},
  {id:'water',label:'crop plants in flooded soil or standing water',text:'A imagem sugere água acumulada ou solo visivelmente encharcado junto às plantas. A foto não confirma por quanto tempo essa condição ocorreu nem se explica a perda.'},
  {id:'healthy',label:'healthy green crop plants without visible damage',text:'O modelo não destacou dano visual claro entre os aspectos comparados. Isso não descarta perdas ou problemas que não estejam visíveis nesta foto.'},
  {id:'unclear',label:'a blurry or unclear crop photograph with no identifiable plant details',text:'A imagem não permite uma descrição visual confiável. Faça uma foto mais próxima, nítida e bem iluminada e descreva a ocorrência observada.'},
  {id:'not_crop',label:'a photograph unrelated to crops or plants',text:'O modelo não reconheceu uma evidência visual clara de plantas nesta foto. Confira a imagem selecionada.'}
 ];
 function interpret(results,at=new Date().toISOString()){
  const ranked=[...results].filter(r=>Number.isFinite(r.score)&&r.score>=0&&r.score<=1&&candidates.some(c=>c.label===r.label)).sort((a,b)=>b.score-a.score),first=ranked[0],second=ranked[1];
  const candidate=candidates.find(c=>c.label===first?.label),ambiguous=!candidate||first.score<.45||(second&&first.score-second.score<.12);
  return {status:ambiguous||['unclear','not_crop'].includes(candidate?.id)?'inconclusive':'complete',text:ambiguous?'Os aspectos visuais comparados não tiveram distinção suficiente para uma descrição confiável. A causa deve ser informada e conferida pelo responsável.':candidate.text,model,at,category:ambiguous?'unclear':candidate.id,reviewRequired:true,scores:ranked.slice(0,3).map(r=>({category:candidates.find(c=>c.label===r.label).id,similarity:r.score}))};
 }
 return {model,candidates,interpret};
})();
globalThis.PhotoDocAnalysis=PhotoDocAnalysis;
