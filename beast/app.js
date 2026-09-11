(()=>{
'use strict';
const $=id=>document.getElementById(id),frame=$('game'),{verses,expected,Run}=BeastRecall;
let ready=false,run=null,mode='menu',worker=null,recorder=null,stream=null,recordTimer=null,workerTimer=null,epoch=0,busy=false;
let soundContext;
const stageNames=['HATCHLING','ARMORED BEAST','WINGED BEAST','COPYCAT KING'];
const goals=['Collect 6 crystals. Chomp nearby robots or dash through them.','Collect 8 crystals and defeat 3 robots. Jump glowing hot pads!','Collect 8 crystals and survive 35 seconds. Your wings slow your fall.','Defeat the Copycat King and survive 45 seconds. Jump the pink shockwaves!'];
const send=(type,extra={})=>frame.contentWindow.postMessage(JSON.stringify({type,...extra}),location.origin);
function tone(f){try{soundContext||=new(window.AudioContext||window.webkitAudioContext)();soundContext.resume();const o=soundContext.createOscillator(),g=soundContext.createGain();o.frequency.value=f;o.connect(g);g.connect(soundContext.destination);g.gain.setValueAtTime(.09,soundContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,soundContext.currentTime+.15);o.start();o.stop(soundContext.currentTime+.17);}catch{}}
verses.forEach((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=v.ref+' KJV';$('verseSelect').append(o);});
function studyText(){const v=verses[Number($('verseSelect').value)||0];$('study').replaceChildren();for(let i=0;i<2;i++){const p=document.createElement('p');p.textContent=(i===0?'First half: ':'Second half: ')+expected(v,i);$('study').append(p);}}
$('verseSelect').addEventListener('change',studyText);studyText();
function buttonsEnabled(){ $('submit').disabled=busy;$('answer').disabled=busy;$('record').disabled=busy&&!(recorder&&recorder.state==='recording');}
function cleanup(){epoch++;clearTimeout(recordTimer);clearTimeout(workerTimer);if(recorder){recorder.onstop=null;if(recorder.state!=='inactive')recorder.stop();recorder=null;}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(worker){worker.terminate();worker=null;}busy=false;$('record').textContent='● RECORD MY VERSE';buttonsEnabled();}
function showCard(title,text,actions){$('panel').hidden=false;const card=$('panel').firstElementChild;card.replaceChildren();const p=document.createElement('p');p.className='eyebrow';p.textContent='HIDE THE WORD · BUILD A BEAST';const h=document.createElement('h2');h.textContent=title;const t=document.createElement('p');t.textContent=text;card.append(p,h,t);actions.forEach((a,i)=>{const b=document.createElement('button');b.textContent=a.label;if(i===0)b.className='primary';b.addEventListener('click',a.fn);card.append(b);});}
function toMenu(){cleanup();send('pause');location.reload();}
$('start').addEventListener('click',()=>{if(!ready)return;tone(440);run=new Run(verses[Number($('verseSelect').value)]);$('panel').hidden=true;$('hud').hidden=false;$('controls').hidden=false;mode='play';send('start');frame.focus();});
function openRecall(stage){cleanup();if(!run?.challenge(stage))return;mode='recall';$('panel').hidden=true;$('recall').hidden=false;$('controls').hidden=true;$('checkLabel').textContent=run.verse.ref+' KJV · '+(stage>=2?'FULL RECALL '+(stage-1)+' OF 2':'EVOLUTION '+(stage+1));$('checkTitle').textContent=['Earn your armor.','Earn your wings.','Unlock the cannon.','Prove you still know it.'][stage];$('checkInstruction').textContent=stage<2?'Produce the '+(stage===0?'FIRST':'SECOND')+' HALF you studied. Every word must be in order.':'Produce the ENTIRE verse, start to finish. No reference needed. Every word must be correct.';$('feedback').textContent='';$('answer').value='';$('answer').hidden=false;buttonsEnabled();}
function check(text){if(mode!=='recall'||!run?.pending)return;busy=false;buttonsEnabled();if(run.check(text)){cleanup();$('recall').hidden=true;mode='play';$('controls').hidden=false;tone(880);send('recall_pass');frame.focus();}else{$('feedback').textContent='That was not an exact match. Try the whole requested section again, or study and replay this round. Nothing has been passed.';$('answer').value='';tone(160);}}
$('submit').addEventListener('click',()=>{if(!busy)check($('answer').value);});
$('answer').addEventListener('paste',e=>{e.preventDefault();$('feedback').textContent='Please produce the verse yourself. Pasting does not count.';});
$('answer').addEventListener('drop',e=>e.preventDefault());
$('practice').addEventListener('click',()=>{if(!run)return;cleanup();run.study();$('recall').hidden=true;mode='study';showCard('Study. Then earn it.',run.verse.text,[{label:'HIDE THE VERSE & REPLAY',fn:()=>{$('panel').hidden=true;mode='play';$('controls').hidden=false;send('study_restart');frame.focus();}},{label:'Back to all games',fn:()=>location.href='../'}]);});
$('leave').addEventListener('click',toMenu);
$('pause').addEventListener('click',()=>{if(mode!=='play')return;mode='paused';send('pause');showCard('Take a breather.','Swipe in a direction to keep moving; tap to stop. Jump avoids hot pads and shockwaves. Dash destroys robots. Chomp close up; the winged beast can fire at enemies.',[{label:'KEEP PLAYING',fn:()=>{mode='play';$('panel').hidden=true;send('resume');frame.focus();}},{label:'Back to menu',fn:toMenu}]);});
for(const type of ['jump','dash','attack'])$(type).addEventListener('pointerdown',e=>{e.preventDefault();if(mode==='play'){send(type);tone(type==='attack'?280:500);}});
$('stop').addEventListener('pointerdown',e=>{e.preventDefault();send('move',{x:0,z:0});});
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.origin!==location.origin||!e.data||typeof e.data!=='object')return;const d=e.data;
if(d.type==='ready'){ready=true;$('loading').textContent='Your creature is ready. Study the two halves, then hatch!';$('start').disabled=false;return;}
if(!run)return;
if(d.type==='stage'){if(d.stage!==run.stage)return;mode='play';$('stageName').textContent=stageNames[d.stage];$('goal').textContent=goals[d.stage];$('attack').textContent=d.stage>=2?'FIRE':'CHOMP';$('hud').hidden=false;$('controls').hidden=false;}
if(d.type==='hud'){$('hearts').textContent='♥'.repeat(Math.max(0,d.hp));$('progress').textContent=run.stage===3?'King: '+Math.max(0,d.boss)+'/16 · '+d.seconds+'/45 sec':d.crystals+' crystals · '+d.kills+' robots'+(run.stage===2?' · '+d.seconds+'/35 sec':'');$('dash').textContent=d.dash>0?'DASH '+d.dash.toFixed(1):'ϟ DASH';}
if(d.type==='collect')tone(720);
if(d.type==='hurt')tone(110);
if(d.type==='recall')openRecall(d.stage);
if(d.type==='down'){mode='down';showCard('Your beast needs another try.','You keep your earned evolutions. This action round restarts, and its memory check still has to be passed.',[{label:'TRY THIS ROUND AGAIN',fn:()=>{$('panel').hidden=true;mode='play';send('retry');frame.focus();}},{label:'Back to menu',fn:toMenu}]);}
if(d.type==='complete'&&run.complete){mode='complete';$('controls').hidden=true;tone(1047);showCard('FULL EVOLUTION!', 'You beat the Copycat King and produced '+run.verse.ref+' twice in full, without word hints, with a battle in between. Come back tomorrow and see if you still remember it.',[{label:'PLAY ANOTHER VERSE',fn:toMenu},{label:'BACK TO ALL GAMES',fn:()=>location.href='../'}]);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')$('pause').click();if(document.hidden&&recorder?.state==='recording'){cleanup();$('feedback').textContent='Recording stopped when you left the game. Please record again.';}});
$('record').addEventListener('click',async()=>{
 if(recorder?.state==='recording'){recorder.stop();$('record').disabled=true;return;}
 if(busy||mode!=='recall')return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$('feedback').textContent='Recording is unavailable in this browser. Type the verse to continue.';return;}
 cleanup();const id=epoch;busy=true;buttonsEnabled();
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  if(id!==epoch){stream.getTracks().forEach(t=>t.stop());return;}
  const chunks=[];recorder=new MediaRecorder(stream);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=async()=>{
   clearTimeout(recordTimer);stream?.getTracks().forEach(t=>t.stop());stream=null;
   if(id!==epoch)return;
   $('record').textContent='CHECKING RECORDING…';$('feedback').textContent='Preparing your recording…';
   let ac;
   try{
    const blob=new Blob(chunks,{type:recorder.mimeType});recorder=null;
    ac=new(window.AudioContext||window.webkitAudioContext)();
    const decoded=await ac.decodeAudioData(await blob.arrayBuffer());
    const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();await ac.close();
    if(id!==epoch)return;
    worker=new Worker('speech-worker.js?v=1',{type:'module'});
    worker.onmessage=({data})=>{if(id!==epoch)return;if(data.type==='status')$('feedback').textContent=data.text;if(data.type==='result'&&data.id===id){clearTimeout(workerTimer);const transcript=data.text;cleanup();check(transcript);}if(data.type==='error'){cleanup();$('feedback').textContent=data.text+' You can type the verse instead.';}};
    worker.onerror=()=>{if(id!==epoch)return;cleanup();$('feedback').textContent='The speech checker could not run on this device. Type the whole verse to continue.';};
    workerTimer=setTimeout(()=>{if(id!==epoch)return;cleanup();$('feedback').textContent='Speech checking took too long. Please type the verse to continue.';},180000);
    const audio=rendered.getChannelData(0);worker.postMessage({type:'transcribe',audio,id},[audio.buffer]);
   }catch(err){if(ac&&ac.state!=='closed')ac.close().catch(()=>{});if(id===epoch){cleanup();$('feedback').textContent='Could not check this recording. Please try again or type the verse.';}}
  };
  recorder.onerror=()=>{if(id===epoch){cleanup();$('feedback').textContent='Recording failed. Try again or type the verse.';}};
  recorder.start();$('record').disabled=false;$('record').textContent='■ STOP & CHECK';$('feedback').textContent='Recording. Quote only the requested verse text, then press Stop & Check.';
  recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},60000);
 }catch(e){if(id===epoch){cleanup();$('feedback').textContent='Microphone access was unavailable. You can type the verse to continue.';}}
});
setTimeout(()=>{if(!ready)$('loading').textContent='Still loading the 3D game. Keep this page open; a slow connection can take longer.';},30000);
})();
