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

  function safeOpenAt(c,r){
    const cc=clamp(Math.round(c),1,COLS-2),rr=clamp(Math.round(r),1,WORLD_ROWS-2);
    if(!wall(cc,rr))return{c:cc,r:rr};
    for(let radius=1;radius<=4;radius++){
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
        const x=clamp(cc+dx,1,COLS-2),y=clamp(rr+dy,1,WORLD_ROWS-2);
        if(!wall(x,y))return{c:x,r:y};
      }
    }
    return{c:13,r:rr};
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
      // Lion enters from the lower half of the visible screen, but with a
      // little more breathing room than the first predator build.
      p=openNear(player.r+3,player.r+5);
    }
    g.c=p.c;g.r=p.r;g.lastCenter="";g.dir={x:0,y:-1};g.alertUntil=now+1800;
    g.chargeUntil=kind==="lion"?now+3000:now+2800;
  }

  function makePredator(type,now){
    const animal=enemyAnimal(type);
    // Lions remain the strongest hunter, but no longer outrun Pac-Man once
    // the release charge and normal danger multipliers stack together.
    const base=type==="chaser"?3.25:type==="ambush"?3.15:3.00;
    let g={type,animal,c:player.c,r:player.r,dir:{x:0,y:-1},lastCenter:"",speed:base,color:"#fff"};
    placePredator(g,animal,now);
    ghosts.push(g);
    return g;
  }

  function activatePredator(type,now){
    const animal=enemyAnimal(type);
    // Always make the warning true. If the arena is at its population cap,
    // bring an existing matching predator back into the visible hunt.
    let g=ghosts.find(x=>(x.animal||enemyAnimal(x.type))===animal && Math.abs(x.r-player.r)>8);
    if(!g && ghosts.length<7) g=makePredator(type,now);
    else if(!g){
      g=ghosts.reduce((a,b)=>Math.abs(a.r-player.r)>Math.abs(b.r-player.r)?a:b);
      g.type=type;g.animal=animal;g.speed=type==="chaser"?3.25:type==="ambush"?3.15:3.00;
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

    // Predators that truly get lost rejoin the action, but lions are allowed
    // a little more distance before being teleported back into the hunt.
    ghosts.forEach(g=>{
      const animal=g.animal||enemyAnimal(g.type),dr=g.r-player.r;
      let tooFar=animal==="wolf"?Math.abs(dr)>14:animal==="lion"?(dr>9||dr<-16):(dr>8||dr<-15);
      if(tooFar) placePredator(g,animal,now);
    });
  }

  // Override the verse spawn function so all verse predators use the visible
  // placement. Hero mode still uses its own existing spawner.
  spawnVerseEnemy=function(type,r){
    if(mode!=="verse") return;
    return makePredator(type,performance.now());
  };

  wrongVerseChoice=function(t,now){
    t.cooldownUntil=now+1800;
    score=Math.max(0,score-50);
    verseStreak=0;
    wrongCount++;
    dangerBoostUntil=now+5000;
    verseGlitch=Math.max(player.r+2.2,verseGlitch-3.5);
    const type=wrongCount%3===0?"ambush":"chaser";
    const g=activatePredator(type,now);
    sfx("hit");
    flash("WRONG WORD — "+animalName(g)+" RELEASED!",true);
  };

  // Newly released animals still surge into the chase, but the lion's burst
  // is now modest instead of stacking into an almost unavoidable sprint.
  const baseStepGhost=stepGhost;
  stepGhost=function(g,dt,now){
    if(mode!=="verse") return baseStepGhost(g,dt,now);
    const normal=g.speed;
    if(g.chargeUntil&&now<g.chargeUntil) g.speed=normal*((g.animal||enemyAnimal(g.type))==="lion"?1.18:1.15);
    baseStepGhost(g,dt,now);
    g.speed=normal;
  };

  // In Verse Chomp, a lost life resumes at the place the player was caught.
  // The darkness is pushed back and predators are repositioned so the player
  // gets a fair restart instead of an immediate repeat hit.
  hurtVerse=function(now,reason){
    if(now<invulnUntil)return;
    const deathSpot=safeOpenAt(player.c,player.r);
    lives--;
    sfx("hit");
    verseStreak=0;
    flash((reason||"DANGER")+" GOT YOU",true);
    if(lives<=0){finishVerse(false);return}

    resetPlayer(deathSpot.c,deathSpot.r);
    invulnUntil=now+2400;
    powerUntil=0;
    const section=currentSection();
    ghosts=[];
    let lion=makePredator("chaser",now);
    let wolf=makePredator("patrol",now);
    lion.chargeUntil=now+1500;
    wolf.chargeUntil=now+1200;
    if(section>=2){let serpent=makePredator("ambush",now);serpent.chargeUntil=now+1200}
    if(section===3){let lion2=makePredator("chaser",now);lion2.chargeUntil=now+1200}
    verseGlitch=Math.max(verseGlitch,player.r+9);
    updateVerseHud();
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
      directorAt=now+1000;
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
