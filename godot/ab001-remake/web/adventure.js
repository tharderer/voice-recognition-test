(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const frame = $('game'), overlay = $('overlay'), panel = $('panel');
  const initialPanel = panel.innerHTML;
  const key = 'ab001-canaan-3d-v1';
  const names = ['Haran', 'The open road', 'The river crossing', 'The rockfall pass', 'Canaan'];
  const quotes = [
    ["Now the LORD had said unto Abram, Get thee out of thy country, and from thy kindred, and from thy father's house, unto a land that I will shew thee:", 'Genesis 12:1 · KJV'],
    ["So Abram departed, as the LORD had spoken unto him; and Lot went with him: and Abram was seventy and five years old when he departed out of Haran.", 'Genesis 12:4 · KJV'],
    ["And Abram took Sarai his wife, and Lot his brother's son, and all their substance that they had gathered, and the souls that they had gotten in Haran; and they went forth to go into the land of Canaan; and into the land of Canaan they came.", 'Genesis 12:5 · KJV']
  ];
  let ready = false, active = false, paused = false, chapter = 0, difficulty = 'trailblazer';
  let retries = 0, seconds = 0, health = 100, water = 100, toastTimer, audioContext, sound = true;
  let save = null;
  try { save = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  if (!save || !Number.isInteger(save.chapter) || save.chapter < 0 || save.chapter > 3 || !['explorer','trailblazer','hard'].includes(save.difficulty)) save = null;
  function command(type, data = {}) { frame.contentWindow.postMessage(JSON.stringify({type, ...data}), location.origin); }
  function persist() {
    save = {chapter, difficulty, retries, seconds};
    try { localStorage.setItem(key, JSON.stringify(save)); } catch (_) {}
  }
  function tone(freq = 440, duration = .12, type = 'sine', volume = .055) {
    if (!sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      osc.connect(gain).connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }
  function chord() { [330, 440, 554, 660].forEach((n,i) => setTimeout(() => tone(n,.4),i*95)); }
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4100); }
  function show(html) {
    overlay.classList.add('centered'); panel.innerHTML = html; overlay.hidden = false; overlay.scrollTop = 0;
    requestAnimationFrame(() => panel.querySelector('button')?.focus({preventScroll:true}));
  }
  function close() { overlay.hidden = true; paused = false; frame.focus(); }
  function brand() { return '<div class="brandline"><span>THE ROAD TO CANAAN</span><span>HERO CARD <b>AB001</b></span></div>'; }
  function verse(i) { return `<blockquote class="scripture">“${quotes[i][0]}”<cite>${quotes[i][1]}</cite></blockquote>`; }
  function updateStart() {
    if (!$('start')) return;
    $('start').disabled = !ready; $('start').textContent = ready ? 'BEGIN THE JOURNEY →' : 'PREPARING YOUR CARAVAN…';
    $('loadStatus').textContent = ready ? 'Ready. Swipe to move • tap to stop • gather everyone.' : 'Loading the 3D world. The first visit downloads the game engine.';
    $('continue').hidden = !save; $('continue').disabled = !ready;
    if (save) $('continue').textContent = `CONTINUE · ${names[save.chapter].toUpperCase()}`;
  }
  function start(resume) {
    if (!ready) return;
    difficulty = resume && save ? save.difficulty : document.querySelector('input[name="difficulty"]:checked').value;
    chapter = resume && save ? save.chapter : 0; retries = resume && save ? Number(save.retries)||0 : 0;
    seconds = resume && save ? Number(save.seconds)||0 : 0;
    active = true; paused = true; $('hud').hidden = false; tone(330,.18);
    const selectedChapter = chapter;
    show(brand()+`<div class="edition">${selectedChapter === 0 ? 'THE CALL · GENESIS 12' : 'YOUR JOURNEY CONTINUES'}</div><h2 id="panelTitle">${selectedChapter === 0 ? 'Take the first step.' : names[selectedChapter]+'.'}</h2>`+(selectedChapter === 0 ? verse(0) : '')+`<p class="lesson">${[
      'Gather Sarai, Lot, the household, both bundles of possessions, the pack donkey, and three sheep. Explore the streets. The gold ring and compass point to your next task. Bring the whole caravan to the gate.',
      'A lamb has wandered away. Find it, refill your water at the oasis, and reach camp. Wolves pursue the back of your caravan. Double back and use your staff to protect the stragglers.',
      'The crossing has washed out. Collect three driftwood bundles and repair it. Keep the caravan on the planks, refill water on the far bank, and reach camp.',
      'Lead the caravan through the pass. Coral strips warn where rocks will fall. Move sideways early, use RUN to clear a lane, and CALL to keep the caravan moving.'
    ][selectedChapter]}</p><button id="go" class="big-button">${selectedChapter === 0 ? 'GATHER THE CARAVAN' : 'RETURN TO THE TRAIL'} →</button>`);
    $('go').onclick = () => { command('start',{chapter:selectedChapter,difficulty}); close(); persist(); setTimeout(() => $('swipeTip').style.opacity = '0',18000); };
  }
  function bindIntro() { $('start').onclick = () => start(false); $('continue').onclick = () => start(true); updateStart(); }
  function showMenu() {
    if (!active || paused) return;
    command('pause'); paused = true;
    show(brand()+`<div class="edition">CHAPTER ${chapter+1} / 4 · PAUSED</div><h2 id="panelTitle">Rest a moment.</h2><p class="lesson">${names[chapter]}. Your chapter checkpoint is saved on this device.</p><button id="resume" class="big-button">BACK TO THE CARAVAN →</button><button id="retry" class="text-button">RESTART THIS CHAPTER</button><button id="sound" class="text-button">SOUND: ${sound ? 'ON' : 'OFF'}</button><p class="pause-help">Swipe to travel; tap to stop. INTERACT near people and objects. STAFF drives nearby wolves away. CALL helps the caravan catch up. RUN spends energy for a short burst.<br><br>Keyboard: WASD / arrows · E interact · Space staff · Q call · Shift run.</p><div class="menu-links"><a href="../">All games</a></div><p class="source-note">Genesis 12:1–5 · KJV. Travel hazards are fictional additions to the biblical journey.</p>`);
    $('resume').onclick = () => { command('resume'); close(); };
    $('retry').onclick = () => { retries++; persist(); command('retry'); close(); };
    $('sound').onclick = () => { sound = !sound; $('sound').textContent = 'SOUND: '+(sound?'ON':'OFF'); tone(); };
  }
  function chapterDone(d) {
    paused = true; chord();
    const next = d.chapter+1;
    const text = [
      'The household is together. Ahead: a wandering lamb, circling wolves, and a well worth reaching. Watch the back of the caravan.',
      'You brought the lamb back and found water. Ahead: gather driftwood, repair a washed-out crossing, and guide everyone safely over.',
      'The caravan is across. One last pass stands between you and Canaan. Watch the warning strips and lead everyone away from rolling rocks.',
      'The journey is complete. Bring the caravan into Canaan.'
    ][d.chapter];
    show(brand()+`<div class="edition">CHAPTER ${d.chapter+1} COMPLETE</div><h2 id="panelTitle">${['Beyond the gates.','A fire. A little rest.','Safe on the far bank.','Canaan ahead.'][d.chapter]}</h2>`+(d.chapter === 0 ? verse(1) : '')+`<p class="lesson">${text}</p><div class="stats-row"><div><b>${Math.round(d.condition)}%</b><span>CARAVAN CONDITION</span></div><div><b>${Math.round(d.water)}%</b><span>WATER LEFT</span></div></div><button id="next" class="big-button">${next === 4 ? 'ENTER CANAAN' : 'CONTINUE TO '+names[next].toUpperCase()} →</button><p class="source-note">${next<4 ? 'Fictional journey encounter · You recover some water and condition at each camp.' : 'The arrival follows Genesis 12:5.'}</p>`);
    // Save the earned next chapter, including if the player closes at the camp screen.
    if (next<4) { const previous=chapter; chapter=next; persist(); chapter=previous; }
    $('next').onclick = () => { command('next'); close(); };
  }
  function complete() {
    paused = true; active = false; $('hud').hidden = true; chord();
    try { localStorage.removeItem(key); } catch (_) {} save=null;
    show(brand()+`<div class="edition">ABRAM LEAVES EVERYTHING · JOURNEY COMPLETE</div><h2 id="panelTitle">Into the land<br>of Canaan.</h2>${verse(2)}<p class="lesson">You gathered the household, protected the caravan, repaired the crossing, and made it through the pass.</p><div class="stats-row"><div><b>4 / 4</b><span>CHAPTERS</span></div><div><b>${retries}</b><span>RETRIES</span></div><div><b>${{explorer:'I',trailblazer:'II',hard:'III'}[difficulty]}</b><span>CHALLENGE LEVEL</span></div></div><button id="again" class="big-button">TAKE THE JOURNEY AGAIN →</button><div class="menu-links"><a href="../ab002-adventure/">Next hero adventure · AB002</a><a href="../">All games</a></div><p class="source-note">The wolves, river repair, and rockfall were fictional journey encounters. The Scripture above is Genesis 12:5, KJV.</p>`);
    $('again').onclick = () => { panel.innerHTML=initialPanel; overlay.classList.remove('centered'); overlay.scrollTop=0; bindIntro(); };
  }
  window.addEventListener('message', event => {
    if (event.source!==frame.contentWindow || event.origin!==location.origin || !event.data || typeof event.data!=='object') return;
    const d=event.data;
    switch(d.type) {
      case 'ready': ready=true; updateStart(); break;
      case 'chapter':
        chapter=d.chapter;
        if(chapter===4){complete();break;}
        $('chapterNumber').textContent=String(chapter+1).padStart(2,'0'); $('chapterName').textContent=names[chapter].toUpperCase();
        if(active) persist();
        break;
      case 'hud':
        if(!active)break;
        health=d.condition;water=d.water;seconds=d.elapsed;
        $('health').value=health;$('healthValue').textContent=health;$('water').value=water;$('waterValue').textContent=water;
        $('goal').textContent=d.goal; $('distance').textContent=`${d.distance} STEPS · ${d.people} IN YOUR CARAVAN`;
        $('compass').style.transform=`rotate(${d.angle}rad)`; $('near').textContent=d.near==='INTERACT'?'Get close & tap':d.near;
        $('stamina').textContent=d.stamina+'% energy';$('sprint').disabled=d.stamina<20;$('staff').disabled=d.staff>0;$('call').disabled=d.call>0;
        break;
      case 'collected': tone(660,.13);setTimeout(()=>tone(880,.18),95);toast(d.text);break;
      case 'toast': toast(d.text);break;
      case 'staff': tone(d.scared ? 180 : 130,.16,'triangle',.09);if(d.scared)toast('The wolves retreat. Keep the caravan moving!');break;
      case 'hurt': tone(85,.22,'triangle',.08);toast(d.text);$('flash').classList.add('hit');setTimeout(()=>$('flash').classList.remove('hit'),300);break;
      case 'chapter_done': chapterDone(d);break;
      case 'down':
        paused=true;
        show(brand()+`<div class="edition">THE CARAVAN NEEDS REST</div><h2 id="panelTitle">Regroup.<br>Try a new route.</h2><p class="lesson">Your earlier chapters are safe. Refill your supplies and try ${names[chapter].toLowerCase()} again. Stay close to the back of the caravan when wolves approach.</p><button id="retry" class="big-button">RETRY THIS CHAPTER →</button><div class="menu-links"><a href="../">All games</a></div>`);
        $('retry').onclick=()=>{retries++;persist();command('retry');close();};break;
    }
  });
  for(const action of ['interact','staff','call','sprint']) $(action).onclick=()=>{if(active&&!paused){command(action);frame.focus();}};
  $('pause').onclick=showMenu;$('zoomIn').onclick=()=>command('zoom',{delta:-.12});$('zoomOut').onclick=()=>command('zoom',{delta:.12});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)showMenu();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();showMenu();}});
  bindIntro();
  setTimeout(()=>{if(!ready&&$('loadStatus')){$('loadStatus').textContent='Still loading. This game needs WebGL 2. If your browser reports a graphics error, try opening this page in Safari or Chrome. You can also reload the page.';}},45000);
})();
