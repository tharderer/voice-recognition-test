/* Clarity pass: stable word orbs, full verse progress, and explicit multiplayer rules. */
(function(){
"use strict";
const STABLE_DECOYS=["some","many","people","always","were","unto","through","great","good","world","every","grace","shall","because","before","heaven","works","their","truth","faith","heart","word","mercy","light","walk","love"];
function isOpen(x,y){x=Math.floor(x);y=Math.floor(y);return !!game&&y>=0&&y<game.maze.length&&x>=0&&x<game.maze[0].length&&game.maze[y][x]===0}
function findAhead(minRows,maxRows,used){if(!game)return{x:13,y:13};for(let i=0;i<180;i++){let row=Math.round(game.player.y-(minRows+Math.random()*(maxRows-minRows)));if(row%2===0)row--;row=Math.max(1,Math.min(game.maze.length-2,row));let col=1+Math.floor(Math.random()*(game.maze[0].length-2));if(!isOpen(col,row))continue;if((used||[]).some(p=>Math.abs((p.x??0)-col)+Math.abs((p.y??0)-row)<2))continue;return{x:col,y:row}}return{x:Math.max(1,Math.min(game.maze[0].length-2,Math.floor(game.player.x))),y:Math.max(1,Math.floor(game.player.y)-5)}
function cleanDisplay(s){return String(s||"").replace(/[;:,.!?]$/g,"")}
buildWordChoices=function(){
  if(!game)return;
  if(game.progress>=game.words.length){game.wordChoices=[];return}
  const current=game.words[game.progress];
  const survivors=(game.wordChoices||[]).filter(c=>!c.correct&&c.normalized!==current.normalized&&c.y<game.player.y+3&&c.y>game.player.y-20);
  survivors.forEach(c=>c.correct=false);
  game.wordChoices=survivors;
  const used=game.wordChoices.slice();
  const correctPos=findAhead(3,9,used);
  game.wordChoices.push({...current,correct:true,x:correctPos.x,y:correctPos.y});
  used.push(correctPos);
  const usedWords=new Set(game.wordChoices.map(c=>c.normalized));
  const candidates=STABLE_DECOYS.filter(w=>normalizeWord(w)!==current.normalized&&!usedWords.has(normalizeWord(w)));
  while(game.wordChoices.filter(c=>!c.correct).length<4&&candidates.length){
    const idx=Math.floor(Math.random()*candidates.length),word=candidates.splice(idx,1)[0],p=findAhead(4,13,used);used.push(p);game.wordChoices.push({display:word,normalized:normalizeWord(word),correct:false,x:p.x,y:p.y});
  }
};
const oldUpdateVerseUI=updateVerseUI;
updateVerseUI=function(){
  if(!game)return oldUpdateVerseUI();
  const verse=VERSES[session.verseKey],next=game.words[game.progress],done=Math.min(game.progress,game.words.length);
  els.gameReference.textContent=`${verse.reference} KJV`;
  els.nextWordText.textContent=next?`WORD ${done+1} OF ${game.words.length} • NEXT: ${cleanDisplay(next.display).toUpperCase()}`:`${game.words.length}/${game.words.length} • VERSE COMPLETE!`;
  els.verseStrip.innerHTML=game.words.map((word,i)=>{
    const cls=i<game.progress?"done-word":i===game.progress?"current-word":"";
    return `<span class="${cls}">${escapeHTML(word.display)}</span>`;
  }).join(" ");
};
const rules=document.querySelector(".rules-card p");
if(rules)rules.innerHTML='<strong>HOW 2–4 PLAYER WORKS:</strong> Every player runs on their <strong>own copy of the same endless-maze challenge</strong>. You do not share one screen or collide with the other Pac-Men. The rival bars show each player’s verse progress. Chomp your verse words in order; wrong words break your combo. Every 4 correct words gives Verse Power and sends an attack to a rival. First player to finish the whole verse wins.';
const oldRenderOpponents=renderOpponents;
renderOpponents=function(){oldRenderOpponents();if(!game)return;const chips=els.opponentsBar.querySelectorAll(".opponent-chip");chips.forEach(chip=>chip.setAttribute("title","Rival verse progress"))};
function exitGamePresentation(){try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(_){}try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen()}catch(_){}}
const resultBack=document.getElementById("resultBackBtn");
if(resultBack)resultBack.addEventListener("click",()=>{exitGamePresentation();returnHome()});
document.querySelectorAll("#resultScreen [data-back-home]").forEach(btn=>btn.addEventListener("click",exitGamePresentation));
})();