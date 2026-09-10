"use strict";

// AB001 generated-art renderer. This file changes only Hero Mission visuals.
// Verse Chomp keeps the original renderer, and Battle Royale lives in /royale/.
(() => {
  const original = {
    terrainColors,
    drawWall,
    drawGate,
    drawTarget,
    drawFollower,
    drawGhost,
    drawHazard,
    drawPlayer,
    draw
  };

  const atlas = new Image();
  let atlasReady = false;
  atlas.onload = () => { atlasReady = true; };

  function startAtlas() {
    const parts = window.ABRAM_ATLAS_PARTS || [];
    if (parts.length >= 13) atlas.src = "data:image/avif;base64," + parts.join("");
  }

  function loadAtlasPartsSequentially(part = 1) {
    window.ABRAM_ATLAS_PARTS = window.ABRAM_ATLAS_PARTS || [];
    if (part > 13) { startAtlas(); return; }
    const tag = document.createElement("script");
    tag.src = `royale/abram-avif-part${String(part).padStart(2,"0")}.js?v=1`;
    tag.onload = () => loadAtlasPartsSequentially(part + 1);
    tag.onerror = () => console.error("Could not load AB001 art atlas part", part);
    document.head.appendChild(tag);
  }

  if ((window.ABRAM_ATLAS_PARTS || []).length >= 13) startAtlas();
  else loadAtlasPartsSequentially();

  const SOURCE = 1254;
  const ATLAS = 640;
  const S = ATLAS / SOURCE;

  const R = {
    abramFront:[5,5,165,230], abramRight1:[170,5,160,235], abramRight2:[320,5,150,235], abramRight3:[460,5,155,235], abramRight4:[605,5,145,235], abramBack:[895,5,170,240],
    sarai:[10,245,85,175], lot:[360,245,85,175], servant:[680,245,80,175], girl:[918,245,82,175], sheep:[15,425,120,185], camel:[372,418,98,207],
    grain:[470,620,120,135], pack:[610,635,135,125], roll:[10,620,180,135], wall:[335,1115,145,130], gate:[835,930,410,185], palm:[690,915,165,225], well:[530,925,170,185], tent:[10,920,320,190], altar:[335,930,195,180], rock:[705,790,150,130], thorn:[560,790,145,130], cart:[845,790,180,130], guard:[10,750,80,170], guardSide:[85,750,85,170], wolf:[1005,790,155,130], campfire:[780,1120,140,125]
  };

  function sprite(name,cx,cy,w,h=w,flip=false,alpha=1){
    if(!atlasReady||!R[name]) return false;
    const r=R[name];
    ctx.save(); ctx.globalAlpha=alpha;
    if(flip){ctx.translate(cx,cy);ctx.scale(-1,1);ctx.drawImage(atlas,r[0]*S,r[1]*S,r[2]*S,r[3]*S,-w/2,-h/2,w,h)}
    else ctx.drawImage(atlas,r[0]*S,r[1]*S,r[2]*S,r[3]*S,cx-w/2,cy-h/2,w,h);
    ctx.restore(); return true;
  }

  function label(text,x,y,size=.18){
    ctx.save();
    const fs=Math.max(7*dpr,tile*size),pad=4*dpr;
    ctx.font=`1000 ${fs}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";
    const w=ctx.measureText(text).width+pad*2,h=fs+pad*1.5;
    ctx.fillStyle="rgba(48,29,13,.86)";ctx.fillRect(x-w/2,y-h/2,w,h);
    ctx.fillStyle="#fff2c4";ctx.fillText(text,x,y);ctx.restore();
  }

  function pickupSprite(t){
    if(t.id==="sarai")return"sarai";if(t.id==="lot")return"lot";if(t.id==="house1")return"servant";if(t.id==="house2")return"girl";if(t.id==="goods")return"grain";if(t.id==="tents")return"roll";if(t.id==="camel")return"camel";if(t.id==="flock")return"sheep";return"pack";
  }
  function followerSprite(f,i){
    if(f.kind==="person")return f.name==="SARAI"?"sarai":"lot";if(f.kind==="group")return i%2?"girl":"servant";if(f.kind==="goods")return i%2?"roll":"grain";if(f.kind==="camel")return"camel";if(f.kind==="flock")return"sheep";return"pack";
  }

  terrainColors=function(r){
    if(mode!=="hero")return original.terrainColors(r);
    if(r>=48)return{bg:"#d8ad63",wall:"#76502f",edge:"#d5a85f",dot:"#fff2ae"};
    if(r>=34)return{bg:"#dcbf7f",wall:"#80613a",edge:"#e0bc78",dot:"#fff3bd"};
    if(r>=10)return{bg:"#c8ad7b",wall:"#64533d",edge:"#b79a6c",dot:"#f8e4b3"};
    return{bg:"#8fb36d",wall:"#4f6843",edge:"#91b977",dot:"#f3f1b9"};
  };

  drawWall=function(x,y,col){
    if(mode!=="hero"||!atlasReady)return original.drawWall(x,y,col);
    ctx.save();ctx.fillStyle=col.wall;ctx.fillRect(x,y,tile,tile);sprite("wall",x+tile/2,y+tile/2,tile*.96,tile*.96);ctx.strokeStyle="rgba(63,39,19,.34)";ctx.lineWidth=Math.max(1,dpr*.65);ctx.strokeRect(x+tile*.05,y+tile*.05,tile*.90,tile*.90);ctx.restore();
  };

  drawGate=function(){
    if(mode!=="hero"||!atlasReady)return original.drawGate();
    const y=(47-cameraTop+.5)*tile;if(y<-tile*2.5||y>ch+tile*2.5)return;const x=13.5*tile;
    ctx.save();sprite("gate",x,y,tile*5.5,tile*2.55);if(journeyFlags.gate){ctx.fillStyle="rgba(105,220,107,.23)";ctx.fillRect(11*tile,(47-cameraTop)*tile,5*tile,tile);label("ROAD OPEN",x,y-tile*1.25,.22)}else{ctx.fillStyle="rgba(56,31,12,.30)";ctx.fillRect(11*tile,(47-cameraTop)*tile,5*tile,tile);label("HARAN GATE",x,y-tile*1.25,.22)}ctx.restore();
  };

  drawTarget=function(t){
    if(mode!=="hero"||!atlasReady)return original.drawTarget(t);
    const x=(t.c+.5)*tile,y=(t.r-cameraTop+.5)*tile;let sz=tile*1.08;if(t.kind==="camel")sz=tile*1.35;if(t.kind==="flock")sz=tile*1.12;if(t.kind==="goods")sz=tile*.98;
    ctx.save();ctx.shadowBlur=13*dpr;ctx.shadowColor="rgba(255,214,95,.85)";ctx.fillStyle="rgba(255,232,145,.28)";ctx.beginPath();ctx.arc(x,y,tile*.52,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;sprite(pickupSprite(t),x,y-tile*.08,sz,sz);label(t.name,x,y+tile*.55,.16);ctx.restore();
  };

  drawFollower=function(f,i){
    if(mode!=="hero"||!atlasReady)return original.drawFollower(f,i);
    const p=pathSample(17+i*15),x=(p.c+.5)*tile,y=(p.r-cameraTop+.5)*tile;let sz=tile*.88;if(f.kind==="camel")sz=tile*1.05;if(f.kind==="flock")sz=tile*.90;sprite(followerSprite(f,i),x,y,sz,sz,false,.96);
  };

  drawGhost=function(g,now){
    if(mode!=="hero"||!atlasReady)return original.drawGhost(g,now);
    const x=(g.c+.5)*tile,y=(g.r-cameraTop+.5)*tile,v=now<powerUntil,name=g.type==="chaser"?"wolf":(g.type==="ambush"?"guardSide":"guard"),size=g.type==="chaser"?tile*1.02:tile*1.00;
    if(v){ctx.save();ctx.globalAlpha=.45;ctx.fillStyle="#4f78ff";ctx.beginPath();ctx.arc(x,y,tile*.48,0,Math.PI*2);ctx.fill();ctx.restore()}sprite(name,x,y,size,size,false,v?.68:1);
  };

  drawHazard=function(h,now){
    if(mode!=="hero"||!atlasReady)return original.drawHazard(h,now);
    const x=(h.c+.5)*tile,y=(h.r-cameraTop+.5)*tile;if(y<-tile*2||y>ch+tile*2)return;
    if(h.type==="cart"){sprite("cart",x,y,tile*1.22,tile*.95,h.v<0);return}
    if(h.type==="rock"&&h.armed){if(h.warn>0){ctx.save();ctx.strokeStyle="#fff09a";ctx.globalAlpha=.55+.35*Math.sin(now/70);ctx.lineWidth=2*dpr;ctx.beginPath();ctx.arc(x,y,tile*(.38+.20*h.warn),0,Math.PI*2);ctx.stroke();ctx.restore()}else{const yy=y+(h.fall||0)*tile*.35;sprite("rock",x,yy,tile*.95,tile*.85)}return}
    original.drawHazard(h,now);
  };

  drawPlayer=function(now){
    if(mode!=="hero"||!atlasReady)return original.drawPlayer(now);
    const x=(player.c+.5)*tile,y=(player.r-cameraTop+.5)*tile,blink=(now<invulnUntil&&Math.floor(now/90)%2)?.35:1;let sp="abramFront",flip=false;
    if(player.dir.y<0)sp="abramBack";else if(player.dir.y>0)sp="abramFront";else if(player.dir.x!==0){const frames=["abramRight1","abramRight2","abramRight3","abramRight4"];sp=frames[Math.floor(player.mouth)%frames.length];flip=player.dir.x<0}
    const size=tile*1.58; // roughly twice the old Pac-Man diameter
    ctx.save();ctx.globalAlpha=blink;ctx.shadowBlur=10*dpr;ctx.shadowColor="rgba(255,218,83,.40)";sprite(sp,x,y,size,size,flip,blink);ctx.restore();
  };

  function drawHeroDecor(start,end){
    if(!atlasReady)return;
    for(let r=start;r<=end;r++)for(let c=1;c<COLS-1;c++){if(grid[r][c]!=="#")continue;const hash=(r*47+c*71)%233;if(hash!==0&&hash!==1)continue;const x=(c+.5)*tile,y=(r-cameraTop+.5)*tile;let name="rock",size=tile*.82;if(r>=48){name=c%3===0?"tent":(c%3===1?"palm":"well");size=name==="tent"?tile*1.15:tile*.92}else if(r>=34){name=c%2?"palm":"rock";size=tile*.86}else if(r>=10){name=c%2?"rock":"thorn";size=tile*.78}else{name=c%3===0?"palm":(c%3===1?"altar":"campfire");size=tile*.84}sprite(name,x,y,size,size,false,.78)}
  }

  draw=function(now){
    if(mode!=="hero"||!atlasReady)return original.draw(now);
    const base=terrainColors(player?player.r:69);ctx.fillStyle=base.bg;ctx.fillRect(0,0,cw,ch);
    const start=Math.max(0,Math.floor(cameraTop)-1),end=Math.min(WORLD_ROWS-1,Math.ceil(cameraTop+visibleRows)+1);
    for(let r=start;r<=end;r++){const col=terrainColors(r);for(let c=0;c<COLS;c++){const x=c*tile,y=(r-cameraTop)*tile,blocked=grid[r][c]==="#"||(r===47&&!journeyFlags.gate&&c>=11&&c<=15);if(blocked)drawWall(x,y,col);else{ctx.fillStyle=((r+c)&1)?"rgba(255,245,207,.055)":"rgba(75,45,18,.035)";ctx.fillRect(x,y,tile,tile);if(!visitedDots.has(key(c,r))){ctx.fillStyle=col.dot;ctx.beginPath();ctx.arc(x+tile/2,y+tile/2,Math.max(1.3*dpr,tile*.052),0,Math.PI*2);ctx.fill()}}}}
    drawHeroDecor(start,end);drawGate();targets.forEach(drawTarget);followers.forEach(drawFollower);hazards.forEach(h=>drawHazard(h,now));ghosts.forEach(g=>drawGhost(g,now));drawSandstorm();drawPlayer(now);
  };
})();
