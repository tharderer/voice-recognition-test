(function(root){
'use strict';
const verses=[
{ref:'Romans 3:23',text:'For all have sinned, and come short of the glory of God;'},
{ref:'Philippians 2:14',text:'Do all things without murmurings and disputings:'},
{ref:'James 4:10',text:'Humble yourselves in the sight of the Lord, and he shall lift you up.'},
{ref:'Proverbs 15:3',text:'The eyes of the LORD are in every place, beholding the evil and the good.'},
{ref:'Jeremiah 33:3',text:'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.'},
{ref:'Ephesians 4:32',text:"And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you."},
{ref:'Colossians 3:13',text:'Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.'},
{ref:'John 3:16',text:'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'}
];
const normalize=t=>String(t).toLowerCase().replace(/[’']/g,'').replace(/[^a-z\s]/g,' ').trim().replace(/\s+/g,' ');
const exact=(answer,expected)=>normalize(answer).length>0&&normalize(answer)===normalize(expected);
const expected=(v,stage)=>{const w=v.text.split(/\s+/),mid=Math.ceil(w.length/2);return stage===0?w.slice(0,mid).join(' '):stage===1?w.slice(mid).join(' '):v.text;};
class Run {
 constructor(v){this.verse=v;this.stage=0;this.passed=[];this.pending=false;this.studyUsed=false;}
 challenge(stage){if(stage!==this.stage)return false;this.pending=true;this.studyUsed=false;return true;}
 check(answer){if(!this.pending||this.studyUsed||!exact(answer,expected(this.verse,this.stage)))return false;this.passed.push(this.stage);this.pending=false;this.stage++;return true;}
 study(){this.studyUsed=true;this.pending=false;if(this.stage>=2){this.stage=2;this.passed=this.passed.filter(n=>n<2);}}
 get complete(){return this.stage===4&&this.passed.join(',')==='0,1,2,3';}
}
root.BeastRecall={verses,normalize,exact,expected,Run};if(typeof module!=='undefined')module.exports=root.BeastRecall;
})(typeof window==='undefined'?globalThis:window);
