/* Exact public-domain KJV text. Game obstacles are fictional, not Bible narrative. */
(function(root){
  'use strict';
  const VERSES=[
    {ref:'Romans 3:23',name:'Cloudbreak Canyon',text:'For all have sinned, and come short of the glory of God;'},
    {ref:'Philippians 2:14',name:'Thunder Falls',text:'Do all things without murmurings and disputings:'},
    {ref:'James 4:10',name:'The Rising Isles',text:'Humble yourselves in the sight of the Lord, and he shall lift you up.'},
    {ref:'Proverbs 15:3',name:'Crystal Lookout',text:'The eyes of the LORD are in every place, beholding the evil and the good.'},
    {ref:'Jeremiah 33:3',name:'Echo Summit',text:'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.'},
    {ref:'Ephesians 4:32',name:'Kindness Crossing',text:'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ\'s sake hath forgiven you.'},
    {ref:'Colossians 3:13',name:'The Golden Reach',text:'Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.'},
    {ref:'John 3:16',name:'Starlight Citadel',text:'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'}
  ];
  const clean=w=>w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'');
  const key=w=>clean(w).toLowerCase();
  const tokens=v=>v.text.trim().split(/\s+/);
  function choices(words,index,random=Math.random){
    const answer=clean(words[index]);
    const pool=[...new Map([...words,'love','light','truth','heart','walk','peace','hope','grace'].map(w=>[key(w),clean(w)])).values()].filter(w=>key(w)!==key(answer));
    const options=[answer];
    while(options.length<3&&pool.length){options.push(pool.splice(Math.floor(random()*pool.length),1)[0]);}
    for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
    return {options,correct:options.findIndex(w=>key(w)===key(answer))};
  }
  const multiplier=streak=>Math.min(5,1+Math.floor(streak/4));
  const medal=(mistakes,hints)=>mistakes===0&&hints===0?'gold':mistakes<=3?'silver':'bronze';
  root.SkyCore={VERSES,clean,key,tokens,choices,multiplier,medal};
  if(typeof module!=='undefined')module.exports=root.SkyCore;
})(typeof window!=='undefined'?window:globalThis);
