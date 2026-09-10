const PUBLIC_LOBBY_SLOTS = 24;
let publicBeaconPeer = null;
let publicBeaconSlot = -1;
let publicScannerPeer = null;
let publicScannerOpening = null;
let publicScanBusy = false;
let publicScanTimer = null;

function publicLobbyPeerId(slot) {
  return `verse-chomper-public-${String(slot).padStart(2, "0")}`;
}

function mountPublicLobbyBrowser() {
  if ($("publicRoomsCard")) return;
  const actions = document.querySelector(".home-actions");
  if (!actions) return;

  const card = document.createElement("div");
  card.id = "publicRoomsCard";
  card.className = "lobby-card public-lobbies";
  card.innerHTML = `
    <div class="public-lobbies-head">
      <h2>OPEN LOBBIES</h2>
      <button id="refreshRoomsBtn" class="ghost-btn refresh-rooms">REFRESH</button>
    </div>
    <div id="publicRoomList"><div class="scan-line"><span class="scan-dot"></span> Looking for players waiting now…</div></div>`;
  actions.parentNode.insertBefore(card, actions);

  const joinRow = actions.querySelector(".join-row");
  if (joinRow && !$("privateCodeLabel")) {
    const label = document.createElement("div");
    label.id = "privateCodeLabel";
    label.className = "private-code-label";
    label.textContent = "OR JOIN WITH A MATCH CODE";
    joinRow.parentNode.insertBefore(label, joinRow);
  }

  $("refreshRoomsBtn").addEventListener("click", () => scanPublicRooms(true));
}

function renderPublicRooms(rooms, message = "") {
  mountPublicLobbyBrowser();
  const list = $("publicRoomList");
  if (!list) return;
  if (message) {
    list.innerHTML = `<div class="public-room-empty">${escapeHTML(message)}</div>`;
    return;
  }
  if (!rooms.length) {
    list.innerHTML = `<div class="public-room-empty">No public matches are waiting right now. Create one and it will show up here for other players automatically.</div>`;
    return;
  }

  list.innerHTML = "";
  rooms
    .sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0) || String(a.hostName).localeCompare(String(b.hostName)))
    .forEach((room, index) => {
      const row = document.createElement("div");
      row.className = "player-row public-room-row";
      const verse = room.verseReference ? `${room.verseReference} KJV` : "KJV verse";
      row.innerHTML = `
        <div class="player-dot p${index % 4}">${Math.min(4, Math.max(1, room.playerCount || 1))}</div>
        <div>
          <div class="player-name">${escapeHTML(room.hostName || "Open Match")}</div>
          <div class="public-room-meta">${escapeHTML(verse)} · Code ${escapeHTML(room.roomCode || "")}</div>
        </div>
        <div class="room-count">${Math.min(4, room.playerCount || 1)}/4</div>
        <button class="room-join" data-room="${escapeHTML(room.roomCode || "")}">JOIN</button>`;
      list.append(row);
    });

  list.querySelectorAll(".room-join").forEach((button) => {
    button.addEventListener("click", () => joinDiscoveredRoom(button.dataset.room));
  });
}

function joinDiscoveredRoom(code) {
  const name = cleanName(els.playerName.value);
  if (!name) {
    setStatus(els.homeStatus, "Enter your player name first, then tap the lobby again.");
    els.playerName.focus();
    return;
  }
  els.roomCodeInput.value = String(code || "").toUpperCase();
  joinMatch();
}

function openScannerPeer() {
  if (publicScannerPeer && !publicScannerPeer.destroyed && publicScannerPeer.open) return Promise.resolve(publicScannerPeer);
  if (publicScannerOpening) return publicScannerOpening;
  if (!peerAvailable()) return Promise.reject(new Error("Multiplayer network unavailable"));

  publicScannerOpening = new Promise((resolve, reject) => {
    const peer = new window.Peer(undefined, { debug: 0 });
    let opened = false;
    const timer = setTimeout(() => {
      if (!opened) {
        try { peer.destroy(); } catch {}
        reject(new Error("Lobby scan timed out"));
      }
    }, 8000);
    peer.on("open", () => {
      opened = true;
      clearTimeout(timer);
      publicScannerPeer = peer;
      resolve(peer);
    });
    peer.on("error", (err) => {
      if (err?.type === "peer-unavailable") return;
      if (!opened) {
        clearTimeout(timer);
        reject(err);
      }
    });
    peer.on("close", () => {
      if (publicScannerPeer === peer) publicScannerPeer = null;
    });
  }).finally(() => { publicScannerOpening = null; });
  return publicScannerOpening;
}

function probeLobbySlot(peer, slot) {
  return new Promise((resolve) => {
    let finished = false;
    let conn;
    const finish = (info = null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { conn?.close(); } catch {}
      resolve(info);
    };
    const timer = setTimeout(() => finish(null), 1500);
    try {
      conn = peer.connect(publicLobbyPeerId(slot), {
        reliable: true,
        metadata: { kind: "verse-chomper-lobby-probe" }
      });
      conn.on("open", () => safeConnSend(conn, { type: "lobbyProbe" }));
      conn.on("data", (msg) => {
        if (msg?.type !== "lobbyInfo") return;
        if (msg.waiting && msg.roomCode && msg.playerCount > 0 && msg.playerCount < 4) finish(msg);
        else finish(null);
      });
      conn.on("error", () => finish(null));
      conn.on("close", () => finish(null));
    } catch {
      finish(null);
    }
  });
}

async function scanPublicRooms(force = false) {
  mountPublicLobbyBrowser();
  if (session.phase !== "home" || publicScanBusy) return;
  publicScanBusy = true;
  if (force) renderPublicRooms([], "Refreshing open lobbies…");
  else {
    const list = $("publicRoomList");
    if (list && !list.children.length) list.innerHTML = `<div class="scan-line"><span class="scan-dot"></span> Looking for players waiting now…</div>`;
  }

  try {
    const peer = await openScannerPeer();
    if (session.phase !== "home") return;
    const results = await Promise.all(Array.from({ length: PUBLIC_LOBBY_SLOTS }, (_, slot) => probeLobbySlot(peer, slot)));
    if (session.phase !== "home") return;
    const byCode = new Map();
    for (const room of results.filter(Boolean)) byCode.set(room.roomCode, room);
    renderPublicRooms([...byCode.values()]);
  } catch (err) {
    console.error(err);
    if (session.phase === "home") renderPublicRooms([], "Could not refresh public lobbies. You can still join with a match code.");
  } finally {
    publicScanBusy = false;
  }
}

function closeScannerPeer() {
  if (publicScannerPeer) {
    try { publicScannerPeer.destroy(); } catch {}
    publicScannerPeer = null;
  }
}

function publicLobbyInfo() {
  const livePlayers = session.players.filter((p) => p.connected !== false);
  const host = livePlayers.find((p) => p.isHost) || livePlayers[0];
  const verse = VERSES[session.verseKey] || VERSES.rom323;
  return {
    type: "lobbyInfo",
    waiting: session.phase === "lobby" && session.isHost && !session.practice && livePlayers.length < 4,
    roomCode: session.roomCode,
    hostName: host?.name || "Open Match",
    playerCount: livePlayers.length,
    maxPlayers: 4,
    verseKey: session.verseKey,
    verseReference: verse.reference,
    updatedAt: Date.now()
  };
}

function configurePublicBeacon(peer) {
  peer.on("connection", (conn) => {
    const answer = () => {
      safeConnSend(conn, publicLobbyInfo());
      setTimeout(() => { try { conn.close(); } catch {} }, 120);
    };
    conn.on("open", answer);
    conn.on("data", (msg) => { if (msg?.type === "lobbyProbe") answer(); });
  });
  peer.on("close", () => {
    if (publicBeaconPeer === peer) {
      publicBeaconPeer = null;
      publicBeaconSlot = -1;
    }
  });
}

function tryOpenBeacon(slot) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(publicLobbyPeerId(slot), { debug: 0 });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { peer.destroy(); } catch {}
      reject(new Error("Beacon slot timed out"));
    }, 3500);
    peer.once("open", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { peer.destroy(); } catch {}
      reject(err);
    });
  });
}

async function claimPublicBeacon() {
  if (publicBeaconPeer || session.phase !== "lobby" || !session.isHost || session.practice || !peerAvailable()) return;
  const start = hashString(session.roomCode || "royale") % PUBLIC_LOBBY_SLOTS;
  for (let n = 0; n < PUBLIC_LOBBY_SLOTS; n++) {
    if (session.phase !== "lobby" || !session.isHost || session.practice) return;
    const slot = (start + n) % PUBLIC_LOBBY_SLOTS;
    try {
      const peer = await tryOpenBeacon(slot);
      if (session.phase !== "lobby" || !session.isHost || session.practice) {
        try { peer.destroy(); } catch {}
        return;
      }
      publicBeaconPeer = peer;
      publicBeaconSlot = slot;
      configurePublicBeacon(peer);
      return;
    } catch (err) {
      if (err?.type !== "unavailable-id") console.warn("Public lobby beacon slot failed", slot, err);
    }
  }
  setStatus(els.lobbyStatus, "Your room is live, but the public lobby list is full. Players can still join with your code or share link.");
}

function releasePublicBeacon() {
  if (!publicBeaconPeer) return;
  try { publicBeaconPeer.destroy(); } catch {}
  publicBeaconPeer = null;
  publicBeaconSlot = -1;
}

function publicLobbyWatch() {
  if (session.phase === "home") {
    releasePublicBeacon();
    if (!publicScanTimer) {
      scanPublicRooms();
      publicScanTimer = setInterval(() => {
        if (session.phase === "home") scanPublicRooms();
      }, 6500);
    }
  } else {
    if (publicScanTimer) {
      clearInterval(publicScanTimer);
      publicScanTimer = null;
    }
    closeScannerPeer();
    if (session.phase === "lobby" && session.isHost && !session.practice) claimPublicBeacon();
    else releasePublicBeacon();
  }
}

mountPublicLobbyBrowser();
publicLobbyWatch();
setInterval(publicLobbyWatch, 750);
