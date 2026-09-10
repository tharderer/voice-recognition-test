'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const livesEl=document.getElementById('lives');
const progressEl=document.getElementById('progress');
const miniChecklist=document.getElementById('miniChecklist');
const startOverlay=document.getElementById('startOverlay');
const endOverlay=document.getElementById('endOverlay');
const endTitle=document.getElementById('endTitle');
const endText=document.getElementById('endText');
const TILE=64,COLS=15,ROWS=10,ATLAS_SCALE=640/1254;
const atlas=new Image();
const atlasParts=window.ABRAM_ATLAS_PARTS||[];
atlas.src='data:image/webp;base64,'+atlasParts.join('');

const SPRITES={
  abramFront:[5,5,165,230],abramRight1:[170,5,160,235],abramRight2:[320,5,150,235],abramRight3:[460,5,155,235],abramRight4:[605,5,145,235],abramBack:[895,5,170,240],
  sarai:[10,245,85,175],lot:[360,245,85,175],servant:[680,245,80,175],sheep:[15,425,120,185],camel:[372,418,98,207],donkey:[995,440,140,180],
  jug:[220,620,80,130],bread:[320,650,140,105],grain:[470,620,120,135],roll:[10,620,180,135],wall:[335,1115,145,130],sand:[15,1115,135,130],path:[180,1115,130,130],
  gate:[835,930,410,185],palm:[690,915,165,225],well:[530,925,170,185],tent:[10,920,320,190],altar:[335,930,195,180],rock:[705,790,150,130],thorn:[560,790,145,130],guard:[10,750,80,170],wolf:[1005,790,155,130]
};

const MAP=[
'###############',
'#.....#.......#',
'#.###.#.###.#.#',
'#.#...#...#.#.#',
'#.#.#####.#.#.#',
'#.#.......#...#',
'#.#####.#####.#',
'#.....#.......#',
'#...#...#....E#',
'###############'
];

const GOALS=[
  ['sarai','Sarai',3,1],['lot','Lot',5,1],['servant','Servant',1,3],['sheep','Sheep',9,1],['camel','Camel',13,3],['donkey','Donkey',13,5],['jug','Water',1,5],['bread','Bread',5,5],['grain','Grain',11,5],['roll','Tent Roll',7,7]
];

const DECOR=[
  ['tent',2,1,112],['well',8,1,78],['palm',11,1,72],['palm',13,7,72],['altar',2,7,74],['rock',8,5,58],['thorn',10,7,56]
];

function drawSprite(name,cx,cy,w,h=w,flip=false,alpha=1){
  const r=SPRITES[name]; if(!r||!atlas.complete)return;
  const sx=r[0]*ATLAS_SCALE, sy=r[1]*ATLAS_SCALE, sw=r[2]*ATLAS_SCALE, sh=r[3]*ATLAS_SCALE;
  ctx.save();ctx.globalAlpha=alpha;
  if(flip){ctx.translate(cx,cy);ctx.scale(-1,1);ctx.drawImage(atlas,sx,sy,sw,sh,-w/2,-h/2,w,h)}
  else ctx.drawImage(atlas,sx,sy,sw,sh,cx-w/2,cy-h/2,w,h);
  ctx.restore();
}
function overlap(a,b,ra,rb){return Math.hypot(a.x-b.x,a.y-b.y)<ra+rb}

class Player{
  constructor(){this.reset()}
  reset(){this.x=1.5*TILE;this.y=8.5*TILE;this.size=94;this.speed=225;this.dir={x:0,y:0};this.facing='right';this.step=0}
  update(dt){
    const nx=this.x+this.dir.x*this.speed*dt,ny=this.y+this.dir.y*this.speed*dt;
    if(this.dir.x||this.dir.y)this.step+=dt*9;
    if(this.dir.x>0)this.facing='right';else if(this.dir.x<0)this.facing='left';else if(this.dir.y<0)this.facing='up';else if(this.dir.y>0)this.facing='down';
    if(!game.wallHit(nx,this.y,this.size*.29))this.x=nx;
    if(!game.wallHit(this.x,ny,this.size*.29))this.y=ny;
  }
  draw(){
    let sp='abramFront';if(this.facing==='up')sp='abramBack';else if(this.facing==='right'||this.facing==='left')sp=['abramRight1','abramRight2','abramRight3','abramRight4'][Math.floor(this.step)%4];
    drawSprite(sp,this.x,this.y,this.size,this.size,this.facing==='left');
  }
}
class Item{
  constructor(key,label,x,y){this.key=key;this.label=label;this.x=x*TILE+TILE/2;this.y=y*TILE+TILE/2;this.done=false;this.size=(key==='camel'||key==='donkey')?58:(key==='sheep'?50:47)}
  draw(t){if(this.done)return;const bob=Math.sin(t*.004+this.x*.01)*3;ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#4c2c0e';ctx.beginPath();ctx.ellipse(this.x,this.y+this.size*.33,this.size*.28,this.size*.1,0,0,Math.PI*2);ctx.fill();ctx.restore();drawSprite(this.key,this.x,this.y+bob,this.size,this.size)}
}
class Enemy{
  constructor(kind,path,speed){this.kind=kind;this.path=path;this.i=0;this.speed=speed;this.size=kind==='guard'?58:62;this.x=path[0][0]*TILE+TILE/2;this.y=path[0][1]*TILE+TILE/2}
  update(dt){const p=this.path[this.i],tx=p[0]*TILE+TILE/2,ty=p[1]*TILE+TILE/2,dx=tx-this.x,dy=ty-this.y,d=Math.hypot(dx,dy);if(d<4){this.i=(this.i+1)%this.path.length;return}this.x+=dx/d*this.speed*dt;this.y+=dy/d*this.speed*dt}
  draw(){drawSprite(this.kind,this.x,this.y,this.size,this.size)}
}
class Game{
  constructor(){this.reset()}
  reset(){
    this.player=new Player();this.lives=3;this.gathered=new Set();this.running=false;this.paused=false;this.last=0;this.safeUntil=0;this.exitOpen=false;
    this.items=GOALS.map(g=>new Item(...g));
    this.enemies=[new Enemy('guard',[[4,1],[1,1],[1,3],[4,3]],112),new Enemy('guard',[[11,1],[13,1],[13,3],[11,3]],115),new Enemy('wolf',[[7,7],[10,7],[10,5],[7,5]],145)];
    this.syncUI();
  }
  start(){this.running=true;this.paused=false;this.last=0;startOverlay.classList.remove('visible');endOverlay.classList.remove('visible');requestAnimationFrame(t=>this.loop(t))}
  loop(t){if(!this.running)return;const dt=this.last?Math.min((t-this.last)/1000,.033):0;this.last=t;if(!this.paused)this.update(dt,t);this.draw(t);requestAnimationFrame(n=>this.loop(n))}
  wallHit(px,py,r){return [[px-r,py-r],[px+r,py-r],[px-r,py+r],[px+r,py+r]].some(([x,y])=>{const c=Math.floor(x/TILE),rr=Math.floor(y/TILE);if(c<0||rr<0||c>=COLS||rr>=ROWS)return true;const cell=MAP[rr][c];return cell==='#'||(cell==='E'&&!this.exitOpen)})}
  update(dt,t){
    this.player.update(dt);this.enemies.forEach(e=>e.update(dt));
    for(const it of this.items)if(!it.done&&overlap(this.player,it,this.player.size*.3,it.size*.3)){it.done=true;this.gathered.add(it.key);this.syncUI()}
    this.exitOpen=this.gathered.size===this.items.length;
    for(const e of this.enemies)if(t>this.safeUntil&&overlap(this.player,e,this.player.size*.28,e.size*.33)){this.lives--;this.safeUntil=t+1500;this.player.reset();this.syncUI();if(this.lives<=0){this.finish(false,'The caravan was stopped. Try another route and keep away from the patrols.');return}}
    const gx=Math.floor(this.player.x/TILE),gy=Math.floor(this.player.y/TILE);if(this.exitOpen&&gx===13&&gy===8)this.finish(true,'You gathered the caravan and left Haran. Abram obeyed the call and began the journey.');
  }
  finish(win,msg){this.running=false;endTitle.textContent=win?'MISSION COMPLETE':'MISSION FAILED';endText.textContent=msg;endOverlay.classList.add('visible')}
  syncUI(){livesEl.textContent=this.lives;progressEl.textContent=`${this.gathered.size}/10`;miniChecklist.innerHTML=GOALS.map(g=>`<span class="mission-chip ${this.gathered.has(g[0])?'done':''}">${g[1]}</span>`).join('')}
  draw(t){ctx.clearRect(0,0,canvas.width,canvas.height);this.drawWorld(t);this.items.forEach(i=>i.draw(t));this.enemies.forEach(e=>e.draw());if(!(t<this.safeUntil&&Math.floor(t/120)%2===0))this.player.draw();this.drawObjective(t)}
  drawWorld(){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=c*TILE,y=r*TILE;drawSprite((r+c)%2?'sand':'path',x+TILE/2,y+TILE/2,TILE,TILE);if(MAP[r][c]==='#')drawSprite('wall',x+TILE/2,y+TILE/2,TILE,TILE)}
    for(const [s,x,y,z] of DECOR)drawSprite(s,x*TILE+TILE/2,y*TILE+TILE/2,z,z);
    if(this.exitOpen){ctx.save();ctx.fillStyle='rgba(61,198,87,.28)';ctx.fillRect(13*TILE,8*TILE,TILE,TILE);ctx.restore()}
    drawSprite('gate',13.5*TILE,8.5*TILE,118,72);
  }
  drawObjective(t){
    ctx.save();ctx.fillStyle='rgba(255,248,231,.94)';ctx.strokeStyle='#88551f';ctx.lineWidth=3;roundRect(14,14,365,74,14);ctx.fill();ctx.stroke();ctx.fillStyle='#4b3014';ctx.font='900 21px Arial';ctx.fillText(this.exitOpen?'GO TO THE CITY GATE':'GATHER THE CARAVAN',28,43);ctx.font='700 16px Arial';ctx.fillText(this.exitOpen?'Everything is ready — depart!':`${10-this.gathered.size} mission items still to find`,28,69);ctx.restore();
  }
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
let game;
function dir(d){if(!game)return;game.player.dir={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[d]||{x:0,y:0}}
function stop(){if(game)game.player.dir={x:0,y:0}}
window.addEventListener('keydown',e=>{const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right',W:'up',A:'left',S:'down',D:'right'};if(m[e.key]){e.preventDefault();dir(m[e.key])}if(e.key===' '&&game){e.preventDefault();game.paused=!game.paused}});
window.addEventListener('keyup',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key))stop()});
document.querySelectorAll('[data-dir]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();dir(b.dataset.dir)});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,stop))});
document.getElementById('pauseBtn').addEventListener('click',()=>{if(game)game.paused=!game.paused});
document.getElementById('startBtn').addEventListener('click',()=>{game.reset();game.start()});
document.getElementById('restartBtn').addEventListener('click',()=>{game.reset();game.start()});
let swipeStart=null;canvas.addEventListener('pointerdown',e=>{swipeStart={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointermove',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;if(Math.hypot(dx,dy)<20)return;dir(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));swipeStart={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerup',()=>{swipeStart=null;stop()});canvas.addEventListener('pointercancel',()=>{swipeStart=null;stop()});
atlas.onload=()=>{game=new Game();game.draw(0)};
