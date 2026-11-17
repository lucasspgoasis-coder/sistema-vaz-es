import './analysis-rules.js';
let pipelinePromise=null,queue=Promise.resolve(),idleTimer;
async function classifier(){
 if(!pipelinePromise)pipelinePromise=(async()=>{
  const {pipeline,env,RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/dist/transformers.min.js');
  env.allowLocalModels=false;env.useBrowserCache=true;env.backends.onnx.wasm.numThreads=1;
  const engine=await pipeline('zero-shot-image-classification',PhotoDocAnalysis.model,{dtype:'q8',device:'wasm',progress_callback:progress=>self.postMessage({type:'progress',file:progress.file||'',progress:progress.progress??null,status:progress.status})});
  return {engine,RawImage};
 })().catch(error=>{pipelinePromise=null;throw error;});return pipelinePromise;
}
self.onmessage=event=>{
 const {requestId,image}=event.data;queue=queue.catch(()=>{}).then(async()=>{
  clearTimeout(idleTimer);
  try{self.postMessage({type:'running',requestId});const {engine,RawImage}=await classifier(),pixels=await RawImage.fromBlob(image);const results=await engine(pixels,PhotoDocAnalysis.candidates.map(c=>c.label),{hypothesis_template:'This is a photo of {}.'});self.postMessage({type:'result',requestId,analysis:PhotoDocAnalysis.interpret(results)});}
  catch(error){self.postMessage({type:'error',requestId,error:error.message||'Não foi possível analisar a foto neste aparelho.'});}
  finally{idleTimer=setTimeout(async()=>{const current=pipelinePromise;pipelinePromise=null;if(current)try{await (await current).engine.dispose();}catch{}},120000);}
 });
};
