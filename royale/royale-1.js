const VERSES = {
  rom323: { reference: "Romans 3:23", text: "For all have sinned, and come short of the glory of God;" },
  eph432: { reference: "Ephesians 4:32", text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you." },
  jer333: { reference: "Jeremiah 33:3", text: "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not." },
  php214: { reference: "Philippians 2:14", text: "Do all things without murmurings and disputings:" },
  pro153: { reference: "Proverbs 15:3", text: "The eyes of the LORD are in every place, beholding the evil and the good." },
  jhn316: { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  col313: { reference: "Colossians 3:13", text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye." },
  jas410: { reference: "James 4:10", text: "Humble yourselves in the sight of the Lord, and he shall lift you up." }
};

const PLAYER_COLORS = ["#ffd84f", "#48e8ff", "#ff5ea8", "#62f29f"];
const GHOST_COLORS = ["#ff4f64", "#ff9a4d", "#5ee8ff", "#d278ff", "#92f05f", "#ff72c6"];
const ATTACKS = ["extraGhost", "ghostRush", "reverse", "tunnelBlock"];
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const els = {
  home: $("homeScreen"), lobby: $("lobbyScreen"), game: $("gameScreen"), result: $("resultScreen"),
  playerName: $("playerName"), roomCodeInput: $("roomCodeInput"), homeStatus: $("homeStatus"),
  lobbyCode: $("lobbyCode"), playerList: $("playerList"), hostControls: $("hostControls"), guestWaiting: $("guestWaiting"),
  verseSelect: $("verseSelect"), lobbyStatus: $("lobbyStatus"), startBtn: $("startBtn"), connectionBadge: $("connectionBadge"),
  gameReference: $("gameReference"), nextWordText: $("nextWordText"), verseStrip: $("verseStrip"), opponentsBar: $("opponentsBar"),
  lives: $("lives"), canvas: $("gameCanvas"), countdown: $("countdown"), effectBanner: $("effectBanner"), tiltBtn: $("tiltBtn"),
  resultTitle: $("resultTitle"), resultSubtitle: $("resultSubtitle"), resultMedal: $("resultMedal"), finalStandings: $("finalStandings")
};

const ctx = els.canvas.getContext("2d");

let session = freshSession();
let hostConnections = new Map();
let pendingConnections = new Set();
let game = null;
let lastFrame = performance.now();
let animationStarted = false;
let tiltEnabled = false;
let effectTimer = null;

function freshSession() {
  return {
    peer: null,
    hostConn: null,
    roomCode: null,
    playerId: null,
    isHost: false,
    practice: false,
    players: [],
    verseKey: "rom323",
    phase: "home",
    seed: 0,
    lastPowerAt: Object.create(null)
  };
}

for (const [key, verse] of Object.entries(VERSES)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = `${verse.reference} KJV`;
  els.verseSelect.append(option);
}

const rememberedName = localStorage.getItem("verseChomperName");
if (rememberedName) els.playerName.value = rememberedName;
const inviteCode = new URLSearchParams(location.search).get("room");
if (inviteCode && /^[A-Z2-9]{5}$/i.test(inviteCode)) {
  els.roomCodeInput.value = inviteCode.toUpperCase();
  setTimeout(() => setStatus(els.homeStatus, "Enter your name, then tap JOIN."), 0);
}

function showScreen(screen) {
  screens.forEach((s) => s.classList.toggle("active", s === screen));
}

function cleanName(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9 _.'-]/g, "").slice(0, 16);
}

function normalizeWord(word) {
  return String(word || "").toLowerCase().replace(/[^a-z0-9']/g, "");
}

function verseWords(verseKey) {
  return VERSES[verseKey].text.split(/\s+/).map((display) => ({ display, normalized: normalizeWord(display) })).filter((w) => w.normalized);
}

function setStatus(el, message = "") {
  el.textContent = message;
}

function randomCode() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_CHARS[b % ROOM_CHARS.length]).join("");
}

function makePlayerId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hostPeerId(code) {
  return `verse-chomper-royale-${String(code).toLowerCase()}`;
}

function peerAvailable() {
  return typeof window.Peer === "function";
}

function setConnectionBadge(text, offline = false) {
  els.connectionBadge.textContent = text;
  els.connectionBadge.classList.toggle("offline", offline);
}

function openPeer(id) {
  return new Promise((resolve, reject) => {
    if (!peerAvailable()) return reject(new Error("The multiplayer network did not load. Check your internet connection and reload."));
    const peer = id ? new window.Peer(id, { debug: 0 }) : new window.Peer(undefined, { debug: 0 });
    const timer = setTimeout(() => {
      try { peer.destroy(); } catch {}
      reject(new Error("Could not reach the multiplayer network."));
    }, 10000);
    const opened = (peerId) => {
      clearTimeout(timer);
      resolve({ peer, peerId });
    };
    peer.once("open", opened);
    peer.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function createMatch() {
  const name = cleanName(els.playerName.value);
  if (!name) return setStatus(els.homeStatus, "Enter your player name first.");
  localStorage.setItem("verseChomperName", name);
  cleanupNetwork();
  setStatus(els.homeStatus, "Creating match…");

  for (let attempt = 0; attempt < 7; attempt++) {
    const code = randomCode();
    try {
      const { peer } = await openPeer(hostPeerId(code));
      session = freshSession();
      session.peer = peer;
      session.roomCode = code;
      session.playerId = makePlayerId();
      session.isHost = true;
      session.players = [{ id: session.playerId, name, isHost: true, connected: true, progress: 0, lives: 3 }];
      configureHostPeer(peer);
      try { history.replaceState({}, "", `${location.pathname}?room=${code}`); } catch {}
      setStatus(els.homeStatus, "");
      enterLobby();
      setConnectionBadge("LIVE");
      return;
    } catch (err) {
      if (err?.type === "unavailable-id" || /taken|unavailable/i.test(err?.message || "")) continue;
      console.error(err);
      setStatus(els.homeStatus, friendlyPeerError(err));
      return;
    }
  }
  setStatus(els.homeStatus, "Could not create a unique room. Try again.");
}

async function joinMatch() {
  const name = cleanName(els.playerName.value);
  const code = els.roomCodeInput.value.trim().toUpperCase();
  if (!name) return setStatus(els.homeStatus, "Enter your player name first.");
  if (!/^[A-Z2-9]{5}$/.test(code)) return setStatus(els.homeStatus, "Enter the 5-character match code.");
  localStorage.setItem("verseChomperName", name);
  cleanupNetwork();
  setStatus(els.homeStatus, "Joining match…");

  try {
    const { peer } = await openPeer();
    session = freshSession();
    session.peer = peer;
    session.roomCode = code;
    session.playerId = makePlayerId();
    session.isHost = false;
    configureGuestPeer(peer);
    const conn = peer.connect(hostPeerId(code), {
      reliable: true,
      metadata: { kind: "verse-chomper-royale-v1", playerId: session.playerId, name }
    });
    session.hostConn = conn;
    const joinTimer = setTimeout(() => {
      if (!conn.open && session.phase === "home") {
        setStatus(els.homeStatus, "Could not find that live match. Check the code and make sure the host still has the room open.");
      }
    }, 9000);
    conn.on("open", () => {
      clearTimeout(joinTimer);
      setStatus(els.homeStatus, "");
      enterLobby();
      setConnectionBadge("LIVE");
      try { history.replaceState({}, "", `${location.pathname}?room=${code}`); } catch {}
    });
    conn.on("data", (msg) => handleNetworkMessage(msg));
    conn.on("close", () => {
      setConnectionBadge("OFFLINE", true);
      if (session.phase !== "home" && session.phase !== "result") setStatus(els.lobbyStatus, "The host connection closed.");
    });
    conn.on("error", (err) => {
      console.error(err);
      setStatus(els.homeStatus, friendlyPeerError(err));
    });
  } catch (err) {
    console.error(err);
    setStatus(els.homeStatus, friendlyPeerError(err));
  }
}

function configureHostPeer(peer) {
  peer.on("connection", (conn) => {
    pendingConnections.add(conn);
    conn.on("open", () => registerGuestConnection(conn));
    conn.on("error", () => pendingConnections.delete(conn));
    conn.on("close", () => {
      pendingConnections.delete(conn);
      const guestId = conn.metadata?.playerId;
      if (!guestId) return;
      if (hostConnections.get(guestId) === conn) hostConnections.delete(guestId);
      const player = session.players.find((p) => p.id === guestId);
      if (player) player.connected = false;
      hostBroadcast({ type: "players", players: publicPlayers() });
    });
  });
  peer.on("error", (err) => {
    console.error(err);
    if (session.isHost && session.phase !== "home") setConnectionBadge("OFFLINE", true);
  });
}

function configureGuestPeer(peer) {
  peer.on("error", (err) => {
    console.error(err);
    if (session.phase === "home") setStatus(els.homeStatus, friendlyPeerError(err));
    else setConnectionBadge("OFFLINE", true);
  });
}

function registerGuestConnection(conn) {
  pendingConnections.delete(conn);
  const meta = conn.metadata || {};
  const playerId = String(meta.playerId || "");
  const name = cleanName(meta.name);
  if (meta.kind !== "verse-chomper-royale-v1" || !playerId || !name) {
    safeConnSend(conn, { type: "reject", reason: "Could not join this match." });
    setTimeout(() => conn.close(), 100);
    return;
  }

  let player = session.players.find((p) => p.id === playerId);
  if (!player) {
    if (session.phase !== "lobby") {
      safeConnSend(conn, { type: "reject", reason: "That match has already started." });
      setTimeout(() => conn.close(), 100);
      return;
    }
    if (session.players.length >= 4) {
      safeConnSend(conn, { type: "reject", reason: "That match already has four players." });
      setTimeout(() => conn.close(), 100);
      return;
    }
    player = { id: playerId, name, isHost: false, connected: true, progress: 0, lives: 3 };
    session.players.push(player);
  } else {
    player.name = name;
    player.connected = true;
    const old = hostConnections.get(playerId);
    if (old && old !== conn) { try { old.close(); } catch {} }
  }

  hostConnections.set(playerId, conn);
  conn.on("data", (msg) => hostHandleMessage(playerId, msg));
  safeConnSend(conn, makeSnapshot());
  hostBroadcast({ type: "players", players: publicPlayers() });
}

function friendlyPeerError(err) {
  const type = err?.type || "";
  if (type === "peer-unavailable") return "Match not found. Check the code and make sure the host still has the room open.";
  if (type === "network" || type === "server-error" || type === "socket-error") return "Could not reach the multiplayer network. Check your connection and try again.";
  if (type === "browser-incompatible") return "This browser cannot open the live multiplayer connection.";
  return "Could not open the live match. Try again.";
}

function safeConnSend(conn, message) {
  try { if (conn?.open) conn.send(message); } catch (err) { console.error(err); }
}

function handleNetworkMessage(msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "reject") {
    const reason = msg.reason || "Could not join that match.";
    cleanupNetwork();
    session.phase = "home";
    showScreen(els.home);
    setStatus(els.homeStatus, reason);
    return;
  }
  handleServerMessage(msg);
}

function send(type, payload = {}) {
  if (session.practice) {
    handlePracticeMessage(type, payload);
    return;
  }
  const message = { type, ...payload };
  if (session.isHost) hostHandleMessage(session.playerId, message);
  else safeConnSend(session.hostConn, message);
}

