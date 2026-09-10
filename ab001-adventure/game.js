(() => {
  'use strict';
  window.AB001_GAME_PARTS=[];
  let part=1;
  function next() {
    if (part>6) {
      try {
        const code=atob(window.AB001_GAME_PARTS.join(''));
        (0,Function)(code)();
      } catch (err) {
        console.error('AB001 game failed to start',err);
        const b=document.getElementById('startButton');
        if (b) { b.disabled=true; b.textContent='GAME LOAD ERROR'; }
      }
      return;
    }
    const s=document.createElement('script');
    s.src=`game-parts/game-part${String(part).padStart(2,'0')}.js?v=1`;
    s.onload=()=>{part++;next();};
    s.onerror=()=>console.error('Could not load AB001 game part',part);
    document.head.appendChild(s);
  }
  next();
})();
