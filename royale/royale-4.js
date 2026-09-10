function checkWordCollisions() {
  for (const choice of game.wordChoices) {
    if (Math.hypot(game.player.x - (choice.x + .5), game.player.y - (choice.y + .5)) < .55) {
      send("word", { word: choice.normalized });
      game.wordChoices = game.wordChoices.filter((c) => c !== choice);
      if (!choice.correct) setTimeout(() => { if (game && session.phase === "game") buildWordChoices(); }, 250);
      break;
    }
  }
}

function checkPowerPellets(now) {
  for (const pellet of game.powerPellets) {
    if (!pellet.active) continue;
    if (Math.hypot(game.player.x - (pellet.x + .5), game.player.y - (pellet.y + .5)) < .52) {
      pellet.active = false;
      pellet.respawnAt = now + 15000;
      if (now - game.lastPowerAt > 1500) {
        game.lastPowerAt = now;
        send("power");
      }
      break;
    }
  }
}

function checkGhostCollision(now) {
  if (now < game.respawnUntil) return;
  const hit = game.ghosts.some((g) => Math.hypot(game.player.x - g.x, game.player.y - g.y) < .62);
  if (!hit) return;
  game.respawnUntil = now + 1600;
  send("death");
  showEffect("GHOST HIT!", true);
  setTimeout(() => {
    if (!game) return;
    game.player.x = 1.5;
    game.player.y = 1.5;
    game.player.dir = "right";
    game.player.nextDir = "right";
    if (game.lives <= 0) {
      game.lives = 3;
      if (session.practice) {
        const me = session.players.find((p) => p.id === session.playerId);
        if (me) me.lives = 3;
      }
      showEffect("3 LIVES RESTORED — KEEP RACING!", false);
    }
    updateLivesUI();
  }, 700);
}

function applyWrongWordPenalty() {
  const now = performance.now();
  game.frozenUntil = Math.max(game.frozenUntil, now + 900);
  showEffect("WRONG WORD — FROZEN!", true);
}

function attackName(type) {
  return ({ extraGhost: "EXTRA GHOST", ghostRush: "GHOST RUSH", reverse: "REVERSE", tunnelBlock: "TUNNEL LOCK" })[type] || "ATTACK";
}

function applyAttack(type, fromName = "Rival") {
  const now = performance.now();
  if (type === "extraGhost") {
    const ghost = { x: 9.5, y: 11.5, dir: "left", speed: 3.5, color: GHOST_COLORS[game.ghosts.length % GHOST_COLORS.length], bonus: true };
    game.ghosts.push(ghost);
    game.extraGhostUntil = Math.max(game.extraGhostUntil, now + 8000);
  } else if (type === "ghostRush") {
    game.ghostRushUntil = Math.max(game.ghostRushUntil, now + 6000);
  } else if (type === "reverse") {
    game.reverseUntil = Math.max(game.reverseUntil, now + 4500);
  } else if (type === "tunnelBlock") {
    game.tunnelBlockedUntil = Math.max(game.tunnelBlockedUntil, now + 7000);
  }
  showEffect(`${fromName}: ${attackName(type)}!`, true);
}

function showEffect(text, danger = false) {
  clearTimeout(effectTimer);
  els.effectBanner.textContent = text;
  els.effectBanner.classList.toggle("danger", danger);
  els.effectBanner.classList.toggle("power", !danger);
  els.effectBanner.classList.remove("hidden");
  effectTimer = setTimeout(() => els.effectBanner.classList.add("hidden"), 1800);
}

function drawGame(now) {
  const w = els.canvas.width, h = els.canvas.height;
  const cols = game.maze[0].length, rows = game.maze.length;
  const tileW = w / cols, tileH = h / rows;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#02050c";
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (game.maze[y][x] !== 1) continue;
      ctx.fillStyle = "#112a67";
      ctx.fillRect(x * tileW + 1, y * tileH + 1, tileW - 2, tileH - 2);
      ctx.strokeStyle = "#2c69ff";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * tileW + 2.5, y * tileH + 2.5, tileW - 5, tileH - 5);
    }
  }

  for (const choice of game.wordChoices) drawWordOrb(choice, tileW, tileH);

  for (const p of game.powerPellets) {
    if (!p.active) continue;
    const x = (p.x + .5) * tileW, y = (p.y + .5) * tileH;
    const pulse = 4.7 + Math.sin(now / 120) * 1.6;
    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawChomper(game.player.x * tileW, game.player.y * tileH, Math.min(tileW, tileH) * .42, game.player.dir, now);
  for (const ghost of game.ghosts) drawGhost(ghost.x * tileW, ghost.y * tileH, Math.min(tileW, tileH) * .40, ghost.color, now);

  if (now < game.respawnUntil) {
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(0, 0, w, h);
  }
}

function drawWordOrb(choice, tileW, tileH) {
  const x = (choice.x + .5) * tileW;
  const y = (choice.y + .5) * tileH;
  const label = choice.display.replace(/[;:,.!?]$/g, "");
  ctx.font = "900 10px system-ui";
  const textWidth = ctx.measureText(label).width;
  const boxW = Math.min(88, Math.max(28, textWidth + 12));
  const boxH = 17;
  ctx.fillStyle = "rgba(9,13,26,.94)";
  roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,216,79,.7)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff5bd";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.slice(0, 14), x, y + .5, boxW - 8);
}

function drawChomper(x, y, r, dir, now) {
  const angle = ({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 })[dir] || 0;
  const mouth = .18 + Math.abs(Math.sin(now / 90)) * .28;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, angle + mouth, angle + Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fillStyle = "#ffd84f";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(255,216,79,.55)";
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawGhost(x, y, r, color, now) {
  const bob = Math.sin(now / 160 + x) * .7;
  y += bob;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r);
  for (let i = 0; i < 4; i++) {
    const px = x + r - (i + 1) * (2 * r / 4);
    ctx.lineTo(px + r / 4, y + r - (i % 2 ? 3 : 0));
  }
  ctx.lineTo(x - r, y + r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(x - r * .35, y - r * .05, r * .23, 0, Math.PI * 2); ctx.arc(x + r * .35, y - r * .05, r * .23, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#173caa";
  ctx.beginPath(); ctx.arc(x - r * .3, y, r * .10, 0, Math.PI * 2); ctx.arc(x + r * .4, y, r * .10, 0, Math.PI * 2); ctx.fill();
}

function roundRect(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

