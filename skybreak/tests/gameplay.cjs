/* Headless logic checks: node skybreak/tests/gameplay.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const core=require('../core.js');

// Every verse position has exactly one correct lane, even for repeated words.
for(const verse of core.VERSES){
  const words=core.tokens(verse);
  assert.equal(words.join(' '),verse.text);
  for(let i=0;i<words.length;i++)for(let n=0;n<30;n++){
    const c=core.choices(words,i);
    assert.equal(c.options.length,3);
    assert.equal(new Set(c.options.map(core.key)).size,3);
    assert.equal(core.key(c.options[c.correct]),core.key(words[i]));
  }
}
assert.equal(core.multiplier(0),1);assert.equal(core.multiplier(16),5);
assert.equal(core.medal(0,0),'gold');assert.notEqual(core.medal(0,1),'gold');

class Element {
  constructor(){this.style={};this.children=[];this.listeners={};this.dataset={};this.hidden=false;this.value='';this.textContent='';this.clientWidth=390;this.clientHeight=844;this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(n,fn){this.listeners[n]=fn;}
  append(...els){this.children.push(...els);}
  replaceChildren(...els){this.children=els;}
  setAttribute(){} focus(){} setPointerCapture(){}
  querySelector(){return this.children[0];}
  getBoundingClientRect(){return {left:0};}
}
const elements={};
const get=id=>elements[id]||=(new Element());
const lanes=[0,1,2].map(i=>{const e=new Element();e.dataset.lane=String(i);return e;});
const draw=new Proxy({measureText:t=>({width:t.length*9}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,k)=>target[k]||(()=>{})});
get('world').getContext=()=>draw;
let storage={},raf;
const env={console,SkyCore:core,Math,Image:class {complete=false;},HTMLSelectElement:class{},innerWidth:390,innerHeight:844,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener(){},requestAnimationFrame:fn=>{raf=fn;},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},navigator:{clipboard:{writeText:async()=>{}}},document:{getElementById:get,querySelectorAll:()=>lanes,createElement:()=>new Element(),createDocumentFragment:()=>new Element(),body:new Element(),addEventListener(){}}};
env.window=env;
vm.createContext(env);
const file=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
// Instrument an in-memory copy, leaving the shipping game free of debug hooks.
const code=file.replace('requestAnimationFrame(frame);\n})();','globalThis.test={begin,collect,steer,jump,burst,reveal,damage,pause,resume,toMenu,update,frame,get state(){return state},get run(){return run},get gate(){return gate},get hazards(){return hazards},set hazards(v){hazards=v},get jumpTime(){return jumpTime}};\n})();');
vm.runInContext(code,env);const g=env.test;assert.ok(g);
function action(i=0){get('overlayActions').children[i].listeners.click();}
function start(stage=0,difficulty='normal'){
 get('mission').value='0';get('difficulty').value=difficulty;get('startMode').value=String(stage);g.begin();assert.equal(g.state,'briefing');action();assert.equal(g.state,'playing');
}
start();
let original=JSON.stringify(g.gate.options);g.steer((g.gate.correct+1)%3);g.collect();
assert.equal(g.run.index,0);assert.equal(JSON.stringify(g.gate.options),original,'wrong answers must not relocate words');assert.equal(g.run.hearts,3);assert.equal(g.run.revealed,true);
g.steer(g.gate.correct);g.collect();assert.equal(g.run.index,1);
g.pause();const index=g.run.index;g.frame(100);assert.equal(g.run.index,index);assert.equal(g.state,'paused');g.resume();assert.equal(g.state,'playing');
g.jump();assert.ok(g.jumpTime>0);
g.run.charge=g.run.chargeMax;g.hazards=[{lane:1,p:.5,done:false}];g.burst();assert.equal(g.hazards.length,0);assert.equal(g.run.charge,0);
g.run.hearts=1;g.steer((g.gate.correct+1)%3);original=JSON.stringify(g.gate.options);g.collect();assert.equal(g.state,'down');const failedAt=g.run.index;action();assert.equal(g.state,'playing');assert.equal(g.run.index,failedAt);assert.equal(JSON.stringify(g.gate.options),original);assert.equal(g.run.rescues,1);

// Complete all three rounds, choose upgrades, and verify next mission and saved reward.
let guard=0;
while(g.state!=='complete'&&guard++<200){
 if(g.state==='playing'){g.steer(g.gate.correct);g.collect();}
 else if(g.state==='reward'){action(0);}
 else if(g.state==='briefing'){action();}
 else throw Error('unexpected '+g.state);
}
assert.equal(g.state,'complete');assert.equal(g.run.index,g.run.words.length);assert.equal(g.run.stage,2);assert.ok(g.run.score>5000);assert.ok(JSON.parse(storage['hide-the-word-skybreak-v1']).best[0]>0);
action(0);assert.equal(g.run.mission,1);assert.equal(g.state,'briefing');g.toMenu();assert.equal(g.state,'menu');assert.equal(get('menu').hidden,false);

// Recall hints reveal the current word once and do not move the choices.
start(1);original=JSON.stringify(g.gate.options);g.reveal();g.reveal();assert.equal(g.run.hints,1);assert.equal(g.run.revealed,true);assert.equal(JSON.stringify(g.gate.options),original);

// Exercise frame timing and canvas calls, including hazards, on phone dimensions.
for(let t=1000;t<7000;t+=16){if(g.state==='playing'){g.steer(g.gate.correct);g.frame(t);}}
assert.ok(g.run.index>0,'time must advance gates');
console.log('PASS: 8 KJV verses; unique choices; stable retry lanes; all 3 rounds; upgrades; boss completion; rescue; burst; hint; pause; rewards; next mission; frame loop.');
