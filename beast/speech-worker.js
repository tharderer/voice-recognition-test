import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
let transcriber;
self.onmessage=async({data})=>{
 try{
  if(!transcriber){self.postMessage({type:'status',text:'Downloading the speech checker. This first download can take a few minutes.'});transcriber=await pipeline('automatic-speech-recognition','Xenova/whisper-tiny.en',{device:'wasm',dtype:'q8',progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'status',text:'Loading speech model: '+Math.round(p.progress||0)+'%'});}});}
  if(data.type==='load'){self.postMessage({type:'ready'});return;}
  const audio=data.audio;
  let energy=0;for(let i=0;i<audio.length;i++)energy+=audio[i]*audio[i];
  if(audio.length<16000||Math.sqrt(energy/audio.length)<.004)throw Error('The recording was too short or too quiet. Please try again or type the verse.');
  self.postMessage({type:'status',text:'Checking your finished recording…'});
  const result=await transcriber(audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:false,do_sample:false,max_new_tokens:160});
  self.postMessage({type:'result',text:result.text,id:data.id});
 }catch(e){self.postMessage({type:'error',text:e.message||'Speech checking could not load.'});}
};
