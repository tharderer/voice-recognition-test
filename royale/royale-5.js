function updateVerseUI() {
  if (!game) return;
  const verse = VERSES[session.verseKey];
  els.gameReference.textContent = `${verse.reference} KJV`;
  const next = game.words[game.progress];
  els.nextWordText.textContent = next ? `NEXT: ${next.display.replace(/[;:,.!?]$/g, "").toUpperCase()}` : "VERSE COMPLETE!";
  els.verseStrip.innerHTML = game.words.map((word, i) => {
    const cls = i < game.progress ? "done-word" : i === game.progress ? "current-word" : "";
    return `<span class="${cls}">${escapeHTML(word.display)}</span>`;
  }).join(" ");
}

function updateLivesUI() {
  if (!game) return;
  els.lives.textContent = Array.from({ length: 3 }, (_, i) => i < game.lives ? "●" : "○").join(" ");
}

function renderOpponents() {
  if (!game) return;
  const total = game.words.length;
  const rivals = session.players.filter((p) => p.id !== session.playerId).slice(0, 3);
  els.opponentsBar.innerHTML = rivals.map((p) => {
    return `<div class="opponent-chip">
      <div class="opponent-top"><span class="opponent-name">${escapeHTML(p.name)}</span><span>${p.progress || 0}/${total}</span></div>
      <progress class="opponent-progress" max="${total}" value="${Math.min(p.progress || 0, total)}"></progress>
    </div>`;
  }).join("");
}

function finishMatch(winnerId, players) {
  if (session.phase === "result") return;
  session.phase = "result";
  if (game) game.running = false;
  showScreen(els.result);
  const words = verseWords(session.verseKey);
  const sorted = [...players].sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    return (b.progress || 0) - (a.progress || 0);
  });
  const winner = sorted.find((p) => p.id === winnerId);
  const won = winnerId === session.playerId;
  els.resultTitle.textContent = won ? "YOU WIN!" : `${winner?.name || "RIVAL"} WINS!`;
  els.resultMedal.textContent = won ? "★" : "◆";
  els.resultSubtitle.textContent = `${VERSES[session.verseKey].reference} KJV — ${words.length} words`;
  els.finalStandings.innerHTML = sorted.map((p, i) => `<div class="standing-row">
    <div class="standing-place">#${i + 1}</div>
    <div class="standing-name">${escapeHTML(p.name)}${p.id === session.playerId ? " (YOU)" : ""}</div>
    <div class="standing-progress">${Math.min(p.progress || 0, words.length)}/${words.length}</div>
  </div>`).join("");
}

function returnHome() {
  session.phase = "home";
  session.practice = false;
  cleanupNetwork();
  game = null;
  showScreen(els.home);
  setStatus(els.homeStatus, "");
  try { history.replaceState({}, "", location.pathname); } catch {}
}

function playAgain() {
  if (session.practice) {
    session.players.forEach((p) => { p.progress = 0; p.lives = 3; p.botSlowUntil = 0; });
    enterLobby();
    return;
  }
  returnHome();
}

function setDirection(dir) {
  if (!game || !DIRS[dir]) return;
  game.player.nextDir = dir;
}

async function toggleTilt() {
  if (tiltEnabled) {
    tiltEnabled = false;
    els.tiltBtn.textContent = "TILT: OFF";
    els.tiltBtn.classList.remove("enabled");
    return;
  }
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") return;
    }
    tiltEnabled = true;
    els.tiltBtn.textContent = "TILT: ON";
    els.tiltBtn.classList.add("enabled");
  } catch {
    showEffect("TILT NOT AVAILABLE", true);
  }
}

window.addEventListener("deviceorientation", (event) => {
  if (!tiltEnabled || !game) return;
  const beta = Number(event.beta || 0);
  const gamma = Number(event.gamma || 0);
  const threshold = 11;
  if (Math.abs(gamma) > Math.abs(beta - 35)) {
    if (gamma > threshold) setDirection("right");
    else if (gamma < -threshold) setDirection("left");
  } else {
    const forward = beta - 35;
    if (forward > threshold) setDirection("down");
    else if (forward < -threshold) setDirection("up");
  }
}, { passive: true });

let touchStart = null;
els.canvas.addEventListener("pointerdown", (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
els.canvas.addEventListener("pointerup", (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
  touchStart = null;
  if (Math.hypot(dx, dy) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? "right" : "left");
  else setDirection(dy > 0 ? "down" : "up");
});

window.addEventListener("keydown", (e) => {
  const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  if (map[e.key]) { e.preventDefault(); setDirection(map[e.key]); }
});

document.querySelectorAll(".dir-btn").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => { e.preventDefault(); setDirection(btn.dataset.dir); });
});

document.querySelectorAll("[data-back-home]").forEach((btn) => btn.addEventListener("click", returnHome));
$("createBtn").addEventListener("click", createMatch);
$("joinBtn").addEventListener("click", joinMatch);
$("practiceBtn").addEventListener("click", practiceWithBots);
$("shareBtn").addEventListener("click", shareInvite);
els.startBtn.addEventListener("click", startLiveBattle);
els.tiltBtn.addEventListener("click", toggleTilt);
$("playAgainBtn").addEventListener("click", playAgain);
els.roomCodeInput.addEventListener("input", () => { els.roomCodeInput.value = els.roomCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 5); });

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);
}
