"use strict";

// Keeps Verse Chomp's biblical predators on-screen and actively involved.
// Loaded after the original game + verse upgrade so Hero Missions remain untouched.
(() => {
  const previousDrawGhost = drawGhost;
  const previousInitVerse = initVerse;
  const previousUpdateVerse = updateVerse;
  let directorAt = 0;

  function openNear(minR,maxR){
    minR=clamp(Math.round(minR),2,WORLD_ROWS-2);
    maxR=clamp(Math.round(maxR),minR,WORLD_ROWS-2);
    return randomOpenIn(minR,maxR);
  }

  function placePredator(g,kind,now){
    let p;
    if(kind==="serpent"){
      // Serpent appears ahead and tries to cut off the next choice.
      let t=currentVerseTarget();
      if(t && Math.abs(t.r-player.r)<14) p=openNear(t.r-2,t.r+1);
      else p=openNear(player.r-7,player.r-4);
    }else if(kind==="wolf"){
      // Wolf patrols the next word room instead of wandering off forever.
      let t=currentVerseTarget();
      p=t?openNear(t.r-2,t.r+2):openNear(player.r-8,player.r-5);
    }else{
      // Lion enters from the lower half of the visible screen so the player
      // actually sees the chase begin instead of spawning off-camera.
      p=openNear(player.r+2,player.r+4);
    }
    g.c=p.c;g.r=p.r;g.lastCenter="";g.dir={x:0,y:-1};g.alertUntil=now+1800;g.chargeUntil=kind==="lion"?now+5000:now+3200;
  }

  function makePredator(type,now){
    const animal=enemyAnimal(type);
    const base=type==="chaser"?3.65:type==="ambush"?3.25:3.05;
    let g={type,animal,c:player.c,r:player.r,dir:{x:0,y:-1},lastCenter:"",speed:base,color:"#fff"};
    placePredator(g,animal,now);
    ghosts.push(g);
    return g;
  }

  function activatePredator(type,now){
    const animal=enemyAnimal(type);
    // Always make the warning true. If the arena is at its population cap,
    // bring an existing matching predator back into the visible hunt.
    let g=ghosts.find(x=>(x.animal||enemyAnimal(x.type))===animal && Math.abs(x.r-player.r)>7);
    if(!g && ghosts.length<7) g=makePredator(type,now);
    else if(!g){
      g=ghosts.reduce((a,b)=>Math.abs(a.r-player.r)>Math.abs(b.r-player.r)?a:b);
      g.type=type;g.animal=animal;g.speed=type==="chaser"?3.65:type==="ambush"?3.25:3.05;
      placePredator(g,animal,now);
    }else placePredator(g,animal,now);
    return g;
  }

  function countAnimal(name){return ghosts.filter(g=>(g.animal||enemyAnimal(g.type))===name).length}

  function keepHuntAlive(now){
    if(mode!=="verse"||!player)return;
    const section=currentSection();

    // Baseline pressure: the course should never become an empty maze.
    if(!countAnimal("lion")) makePredator("chaser",now);
    if(!countAnimal("wolf")) makePredator("patrol",now);
    if(section>=2&&!countAnimal("serpent")) makePredator("ambush",now);
    if(section===3&&countAnimal("lion")<2) makePredator("chaser",now);

    // Predators that get lost in the 300-row maze rejoin the action.
    ghosts.forEach(g=>{
      const animal=g.animal||enemyAnimal(g.type),dr=g.r-player.r;
      let tooFar=animal==="wolf"?Math.abs(dr)>14:(dr>7||dr<-14);
      if(tooFar) placePredator(g,animal,now);
    });
  }

  // Override the verse spawn function so all verse predators use the stronger,
  // visible placement. Hero mode still uses its own existing spawner.
  spawnVerseEnemy=function(type,r){
    if(mode!=="verse") return;
    return makePredator(type,performance.now());
  };

  wrongVerseChoice=function(t,now){
    t.cooldownUntil=now+1800;
    score=Math.max(0,score-50);
    verseStreak=0;
    wrongCount++;
    dangerBoostUntil=now+7000;
    verseGlitch=Math.max(player.r+2.2,verseGlitch-3.5);
    const type=wrongCount%3===0?"ambush":"chaser";
    const g=activatePredator(type,now);
    sfx("hit");
    flash("WRONG WORD — "+animalName(g)+" RELEASED!",true);
  };

  // Charge speed makes a newly released animal a real immediate threat.
  const baseStepGhost=stepGhost;
  stepGhost=function(g,dt,now){
    if(mode!=="verse") return baseStepGhost(g,dt,now);
    const normal=g.speed;
    if(g.chargeUntil&&now<g.chargeUntil) g.speed=normal*((g.animal||enemyAnimal(g.type))==="lion"?1.34:1.20);
    baseStepGhost(g,dt,now);
    g.speed=normal;
  };

  initVerse=function(){
    previousInitVerse();
    directorAt=0;
    // Put the opening animals where they can actually be seen.
    ghosts=[];
    makePredator("chaser",performance.now());
    makePredator("patrol",performance.now());
  };

  updateVerse=function(dt,now){
    previousUpdateVerse(dt,now);
    if(!running||mode!=="verse")return;
    if(now>=directorAt){
      directorAt=now+900;
      keepHuntAlive(now);
    }
  };

  drawGhost=function(g,now){
    if(mode!=="verse") return previousDrawGhost(g,now);
    const x=(g.c+.5)*tile,y=(g.r-cameraTop+.5)*tile;
    if(y<-tile*1.5||y>ch+tile*1.5)return;
    const animal=g.animal||enemyAnimal(g.type),icon=animal==="lion"?"🦁":animal==="serpent"?"🐍":"🐺";
    const alert=g.alertUntil&&now<g.alertUntil;
    const courage=now<powerUntil;
    ctx.save();
    if(alert){
      const pulse=.62+.18*Math.sin(now/70);
      ctx.strokeStyle="#ff684f";ctx.globalAlpha=.9;ctx.lineWidth=Math.max(3*dpr,tile*.09);
      ctx.beginPath();ctx.arc(x,y,tile*pulse,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#ffb19f";ctx.font=`1000 ${Math.max(7*dpr,tile*.17)}px system-ui`;ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.fillText(animal.toUpperCase()+" RELEASED!",x,y-tile*.63);
    }
    ctx.globalAlpha=courage?.55:1;
    ctx.shadowBlur=courage?5*dpr:16*dpr;ctx.shadowColor=courage?"#8bd5ff":"#ff9f32";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font=`${Math.max(22*dpr,tile*1.06)}px Apple Color Emoji,Segoe UI Emoji,sans-serif`;
    ctx.fillText(icon,x,y);
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    ctx.fillStyle=courage?"#bcecff":"#fff2c2";ctx.font=`1000 ${Math.max(7*dpr,tile*.17)}px system-ui`;
    ctx.fillText(animal.toUpperCase(),x,y+tile*.62);
    ctx.restore();
  };
})();
