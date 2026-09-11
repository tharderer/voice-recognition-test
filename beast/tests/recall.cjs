const assert=require('node:assert/strict');
const {verses,exact,expected,Run}=require('../recall.js');
for(const v of verses){
 const words=v.text.split(/\s+/);
 assert(exact(v.text.toUpperCase(),v.text));
 assert(!exact('',v.text));
 for(let i=0;i<words.length;i++){
  assert(!exact(words.filter((_,n)=>n!==i).join(' '),v.text),'Missing word accepted');
  const changed=words.slice();changed[i]='banana';assert(!exact(changed.join(' '),v.text),'Wrong word accepted');
 }
 assert(!exact(v.text+' extra',v.text));
 const run=new Run(v);
 assert(!run.check(v.text),'Cannot pass before completing action stage');
 assert(!run.challenge(2),'Cannot skip stages');
 for(let stage=0;stage<4;stage++){
  assert(run.challenge(stage));assert(!run.check('some plausible words'));
  assert(run.check(expected(v,stage)));assert(!run.check(expected(v,stage)));
 }
 assert(run.complete);
 const hintRun=new Run(v);
 for(let stage=0;stage<3;stage++){hintRun.challenge(stage);hintRun.check(expected(v,stage));}
 hintRun.challenge(3);hintRun.study();assert(!hintRun.complete);assert.equal(hintRun.stage,2);assert.deepEqual(hintRun.passed,[0,1]);assert(!hintRun.check(v.text));
 for(let stage=2;stage<4;stage++){assert(hintRun.challenge(stage));assert(hintRun.check(v.text));}
 assert(hintRun.complete);
}
console.log('PASS: all 8 verses reject omissions, substitutions, extra words, skipped stages, duplicate checks and helped final checks; two fresh full recalls required after studying.');
