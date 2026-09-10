function hostHandleMessage(playerId, msg) {
  if (!session.isHost || !msg || typeof msg !== "object") return;
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return;

  if (msg.type === "start") {
    if (!player.isHost || session.phase !== "lobby" || session.players.filter((p) => p.connected !== false).length < 2) return;
    const verseKey = VERSES[msg.verseKey] ? msg.verseKey : "rom323";
    session.players = session.players.filter((p) => p.connected !== false);
    session.verseKey = verseKey;
    session.seed = randomUint32();
    session.lastPowerAt = Object.create(null);
    session.players.forEach((p) => { p.progress = 0; p.lives = 3; });
    hostBroadcast({ type: "start", verseKey, seed: session.seed, players: publicPlayers() });
    return;
  }

  if (msg.type === "word" && session.phase === "game") {
    const words = verseWords(session.verseKey);
    const expected = words[player.progress]?.normalized;
    if (!expected) return;
    if (normalizeWord(msg.word) === expected) {
      player.progress += 1;
      hostBroadcast({ type: "progress", playerId, progress: player.progress });
      if (player.progress >= words.length) hostBroadcast({ type: "finished", winnerId: playerId, players: publicPlayers() });
    } else {
      hostSendTo(playerId, { type: "wrong" });
    }
    return;
  }

  if (msg.type === "power" && session.phase === "game") {
    const now = Date.now();
    const last = session.lastPowerAt[playerId] || 0;
    if (now - last < 1400) return;
    session.lastPowerAt[playerId] = now;
    const rivals = session.players.filter((p) => p.id !== playerId && p.connected !== false);
    if (!rivals.length) return;
    rivals.sort((a, b) => (b.progress || 0) - (a.progress || 0) || Math.random() - .5);
    const target = rivals[0];
    const attack = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];
    hostBroadcast({ type: "attack", attack, fromId: playerId, fromName: player.name, targetId: target.id, targetName: target.name });
    return;
  }

  if (msg.type === "death" && session.phase === "game") {
    player.lives = Math.max(0, (player.lives ?? 3) - 1);
    hostBroadcast({ type: "lives", playerId, lives: player.lives });
    if (player.lives === 0) player.lives = 3;
  }
}

function hostBroadcast(message, includeSelf = true) {
  if (includeSelf) handleServerMessage(message);
  for (const conn of hostConnections.values()) safeConnSend(conn, message);
}

function hostSendTo(playerId, message) {
  if (playerId === session.playerId) handleServerMessage(message);
  else safeConnSend(hostConnections.get(playerId), message);
}

function publicPlayers() {
  return session.players.map(({ id, name, isHost, connected, progress, lives }) => ({
    id, name, isHost, connected: connected !== false, progress: progress || 0, lives: lives ?? 3
  }));
}

function makeSnapshot() {
  const progressByPlayer = {};
  for (const p of session.players) progressByPlayer[p.id] = p.progress || 0;
  return {
    type: "snapshot",
    phase: session.phase === "game" ? "playing" : session.phase === "result" ? "finished" : "lobby",
    verseKey: session.verseKey,
    seed: session.seed,
    winnerId: null,
    progressByPlayer,
    players: publicPlayers()
  };
}

function randomUint32() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function enterLobby() {
  session.phase = "lobby";
  showScreen(els.lobby);
  els.lobbyCode.textContent = session.roomCode || "BOTS";
  els.hostControls.classList.toggle("hidden", !session.isHost);
  els.guestWaiting.classList.toggle("hidden", session.isHost);
  $("shareBtn").classList.toggle("hidden", session.practice);
  renderLobbyPlayers();
}

function handleServerMessage(msg) {
  if (msg.type === "snapshot") {
    session.players = msg.players || [];
    if (msg.verseKey) session.verseKey = msg.verseKey;
    if (msg.seed) session.seed = msg.seed;
    if (msg.phase === "playing" && session.phase !== "game") startGameFromSnapshot(msg);
    else if (msg.phase === "finished") finishMatch(msg.winnerId, msg.players || session.players);
    else renderLobbyPlayers();
    return;
  }
  if (msg.type === "players") {
    session.players = msg.players || [];
    if (session.phase === "lobby") renderLobbyPlayers();
    if (session.phase === "game") renderOpponents();
    return;
  }
  if (msg.type === "start") {
    session.verseKey = msg.verseKey;
    session.seed = msg.seed || hashString(session.roomCode || "royale");
    session.players = msg.players || session.players;
    startGame(session.seed);
    return;
  }
  if (msg.type === "progress") {
    const player = session.players.find((p) => p.id === msg.playerId);
    if (player) player.progress = msg.progress;
    if (game && msg.playerId === session.playerId) {
      game.progress = msg.progress;
      buildWordChoices();
      updateVerseUI();
    }
    renderOpponents();
    return;
  }
  if (msg.type === "wrong") {
    if (game) applyWrongWordPenalty();
    return;
  }
  if (msg.type === "attack") {
    if (msg.targetId === session.playerId) applyAttack(msg.attack, msg.fromName);
    if (msg.fromId === session.playerId) showEffect(`POWER! ${attackName(msg.attack)} → ${msg.targetName}`, false);
    return;
  }
  if (msg.type === "lives") {
    const player = session.players.find((p) => p.id === msg.playerId);
    if (player) player.lives = msg.lives;
    if (msg.playerId === session.playerId && game) {
      game.lives = msg.lives;
      updateLivesUI();
    }
    return;
  }
  if (msg.type === "finished") {
    session.players = msg.players || session.players;
    finishMatch(msg.winnerId, session.players);
  }
}

function startGameFromSnapshot(msg) {
  session.players = msg.players || [];
  session.verseKey = msg.verseKey;
  session.seed = msg.seed || hashString(session.roomCode || "royale");
  startGame(session.seed);
  if (msg.progressByPlayer) {
    for (const p of session.players) {
      const progress = msg.progressByPlayer[p.id];
      if (Number.isInteger(progress)) p.progress = progress;
    }
    const mine = msg.progressByPlayer[session.playerId];
    if (Number.isInteger(mine) && game) {
      game.progress = mine;
      buildWordChoices();
      updateVerseUI();
    }
    renderOpponents();
  }
}

function renderLobbyPlayers() {
  els.playerList.innerHTML = "";
  const players = session.players.length ? session.players : [{ id: session.playerId, name: cleanName(els.playerName.value) || "You", isHost: session.isHost, connected: true }];
  players.forEach((player, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <div class="player-dot p${i % PLAYER_COLORS.length}">${i + 1}</div>
      <div class="player-name">${escapeHTML(player.name)}${player.id === session.playerId ? " (YOU)" : ""}${player.connected === false ? " — OFFLINE" : ""}</div>
      ${player.isHost ? '<div class="host-pill">HOST</div>' : ""}`;
    els.playerList.append(row);
  });
  if (session.isHost) {
    const livePlayers = players.filter((p) => p.connected !== false).length;
    els.startBtn.disabled = livePlayers < 2;
    els.startBtn.textContent = livePlayers < 2 ? "WAITING FOR A RIVAL" : "START BATTLE";
  }
}

function startLiveBattle() {
  if (!session.isHost) return;
  send("start", { verseKey: els.verseSelect.value });
}

async function shareInvite() {
  if (!session.roomCode || session.practice) return;
  const url = `${location.origin}${location.pathname}?room=${session.roomCode}`;
  const shareData = { title: "Verse Chomper Royale", text: `Join my Verse Chomper Royale match. Code: ${session.roomCode}`, url };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      setStatus(els.lobbyStatus, "Invite ready to send.");
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setStatus(els.lobbyStatus, "Join link copied.");
    } else {
      setStatus(els.lobbyStatus, `Match code: ${session.roomCode}`);
    }
  } catch (err) {
    if (err?.name !== "AbortError") setStatus(els.lobbyStatus, `Match code: ${session.roomCode}`);
  }
}

function practiceWithBots() {
  const name = cleanName(els.playerName.value) || "Player 1";
  localStorage.setItem("verseChomperName", name);
  cleanupNetwork();
  session = freshSession();
  Object.assign(session, {
    roomCode: "BOTS",
    playerId: "me",
    isHost: true,
    practice: true,
    verseKey: els.verseSelect.value || "rom323",
    phase: "lobby",
    players: [
      { id: "me", name, isHost: true, progress: 0, lives: 3 },
      { id: "bot1", name: "Red", isHost: false, progress: 0, lives: 3 },
      { id: "bot2", name: "Blue", isHost: false, progress: 0, lives: 3 },
      { id: "bot3", name: "Gold", isHost: false, progress: 0, lives: 3 }
    ]
  });
  enterLobby();
  setConnectionBadge("BOTS");
  els.startBtn.disabled = false;
  els.startBtn.textContent = "START BATTLE";
}

function handlePracticeMessage(type, payload) {
  if (type === "start") {
    session.verseKey = payload.verseKey || session.verseKey;
    startGame(hashString(`${Date.now()}practice`));
    scheduleBots();
    return;
  }
  if (type === "word") {
    const words = verseWords(session.verseKey);
    const me = session.players.find((p) => p.id === session.playerId);
    if (normalizeWord(payload.word) === words[me.progress]?.normalized) {
      me.progress += 1;
      handleServerMessage({ type: "progress", playerId: me.id, progress: me.progress });
      if (me.progress >= words.length) finishMatch(me.id, session.players);
    } else {
      handleServerMessage({ type: "wrong" });
    }
    return;
  }
  if (type === "power") {
    const rivals = session.players.filter((p) => p.id !== session.playerId);
    rivals.sort((a, b) => b.progress - a.progress);
    const target = rivals[0];
    const attacks = ["extraGhost", "ghostRush", "reverse", "tunnelBlock"];
    const attack = attacks[Math.floor(Math.random() * attacks.length)];
    showEffect(`POWER! ${attackName(attack)} → ${target.name}`, false);
    target.botSlowUntil = performance.now() + 4500;
    return;
  }
  if (type === "death") {
    const me = session.players.find((p) => p.id === session.playerId);
    me.lives = Math.max(0, me.lives - 1);
    handleServerMessage({ type: "lives", playerId: me.id, lives: me.lives });
  }
}

function scheduleBots() {
  const words = verseWords(session.verseKey);
  const tick = () => {
    if (!session.practice || session.phase !== "game") return;
    for (const bot of session.players.filter((p) => p.id !== session.playerId)) {
      if (bot.progress >= words.length) continue;
      const slowed = bot.botSlowUntil && performance.now() < bot.botSlowUntil;
      const chance = slowed ? 0.09 : 0.18 + Math.random() * 0.06;
      if (Math.random() < chance) {
        bot.progress += 1;
        renderOpponents();
        if (bot.progress >= words.length) {
          finishMatch(bot.id, session.players);
          return;
        }
      }
    }
    setTimeout(tick, 900);
  };
  setTimeout(tick, 900);
}

function cleanupNetwork() {
  for (const conn of hostConnections.values()) { try { conn.close(); } catch {} }
  hostConnections.clear();
  for (const conn of pendingConnections) { try { conn.close(); } catch {} }
  pendingConnections.clear();
  try { session.hostConn?.close(); } catch {}
  try { session.peer?.destroy(); } catch {}
  session.hostConn = null;
  session.peer = null;
}

