function startGame(seed) {
  session.phase = "game";
  showScreen(els.game);
  const words = verseWords(session.verseKey);
  const maze = generateMaze(19, 23, seed >>> 0);
  game = {
    seed,
    maze,
    words,
    progress: 0,
    running: false,
    player: { x: 1.5, y: 1.5, dir: "right", nextDir: "right", speed: 4.7 },
    ghosts: [],
    wordChoices: [],
    powerPellets: [],
    lives: 3,
    frozenUntil: 0,
    respawnUntil: 0,
    reverseUntil: 0,
    tunnelBlockedUntil: 0,
    ghostRushUntil: 0,
    extraGhostUntil: 0,
    lastPowerAt: 0,
    startedAt: performance.now()
  };
  spawnGhosts(3);
  spawnPowerPellets();
  buildWordChoices();
  updateVerseUI();
  updateLivesUI();
  renderOpponents();
  countdownToStart();
  if (!animationStarted) {
    animationStarted = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }
}

function countdownToStart() {
  let count = 3;
  els.countdown.classList.remove("hidden");
  els.countdown.textContent = count;
  const timer = setInterval(() => {
    count -= 1;
    if (count > 0) els.countdown.textContent = count;
    else if (count === 0) els.countdown.textContent = "GO!";
    else {
      clearInterval(timer);
      els.countdown.classList.add("hidden");
      if (game) game.running = true;
    }
  }, 650);
}

function generateMaze(cols, rows, seed) {
  const rand = mulberry32(seed || 1);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1));
  const stack = [[1, 1]];
  grid[1][1] = 0;
  const carveDirs = [[2,0],[-2,0],[0,2],[0,-2]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = shuffle(carveDirs.slice(), rand).filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx] === 1;
    });
    if (!options.length) { stack.pop(); continue; }
    const [dx, dy] = options[0];
    grid[cy + dy / 2][cx + dx / 2] = 0;
    grid[cy + dy][cx + dx] = 0;
    stack.push([cx + dx, cy + dy]);
  }

  for (let y = 2; y < rows - 2; y++) {
    for (let x = 2; x < cols - 2; x++) {
      if (grid[y][x] === 1 && rand() < 0.09) {
        const horiz = grid[y][x - 1] === 0 && grid[y][x + 1] === 0;
        const vert = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
        if (horiz || vert) grid[y][x] = 0;
      }
    }
  }

  const tunnelY = Math.floor(rows / 2);
  for (let x = 0; x < cols; x++) grid[tunnelY][x] = 0;
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 4; x++) grid[y][x] = 0;
  for (let y = tunnelY - 1; y <= tunnelY + 1; y++) for (let x = 7; x <= 11; x++) grid[y][x] = 0;
  return grid;
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(array, rand = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function walkableCells() {
  const cells = [];
  for (let y = 1; y < game.maze.length - 1; y++) {
    for (let x = 1; x < game.maze[0].length - 1; x++) {
      if (game.maze[y][x] === 0) cells.push({ x, y });
    }
  }
  return cells;
}

function buildWordChoices() {
  if (!game || game.progress >= game.words.length) return;
  const current = game.words[game.progress];
  const decoyIndexes = [];
  const offsets = [-2, -1, 1, 2, 3, -3, 4, -4];
  for (const offset of offsets) {
    const idx = game.progress + offset;
    if (idx >= 0 && idx < game.words.length && game.words[idx].normalized !== current.normalized) decoyIndexes.push(idx);
    if (decoyIndexes.length >= 3) break;
  }
  while (decoyIndexes.length < 3) {
    const idx = Math.floor(Math.random() * game.words.length);
    if (idx !== game.progress && !decoyIndexes.includes(idx) && game.words[idx].normalized !== current.normalized) decoyIndexes.push(idx);
    if (game.words.length < 4) break;
  }
  const choices = [{ ...current, correct: true }, ...decoyIndexes.map((i) => ({ ...game.words[i], correct: false }))];
  shuffle(choices);

  const cells = walkableCells().filter((c) => {
    const pd = Math.hypot(c.x + .5 - game.player.x, c.y + .5 - game.player.y);
    const gd = Math.min(...game.ghosts.map((g) => Math.hypot(c.x + .5 - g.x, c.y + .5 - g.y)), 99);
    return pd > 4 && gd > 2.5 && !game.powerPellets.some((p) => p.x === c.x && p.y === c.y);
  });
  shuffle(cells);
  game.wordChoices = choices.map((choice, i) => ({ ...choice, x: (cells[i]?.x ?? 3 + i * 3), y: (cells[i]?.y ?? 5 + i * 2) }));
}

function spawnGhosts(count) {
  const centerX = 9.5, centerY = 11.5;
  for (let i = 0; i < count; i++) {
    game.ghosts.push({ x: centerX + (i - 1) * .8, y: centerY, dir: i % 2 ? "left" : "right", speed: 3.1 + i * .12, color: GHOST_COLORS[i % GHOST_COLORS.length], bonus: false });
  }
}

function spawnPowerPellets() {
  const candidates = walkableCells().filter((c) => c.y > 3 && Math.hypot(c.x - 9, c.y - 11) > 5);
  shuffle(candidates, mulberry32((game.seed ^ 0xABCDEF) >>> 0));
  game.powerPellets = candidates.slice(0, 4).map((c) => ({ ...c, active: true, respawnAt: 0 }));
}

function frame(now) {
  const dt = Math.min(.04, (now - lastFrame) / 1000);
  lastFrame = now;
  if (game && session.phase === "game") {
    if (game.running) updateGame(dt, now);
    drawGame(now);
  }
  requestAnimationFrame(frame);
}

function updateGame(dt, now) {
  if (now >= game.respawnUntil && now >= game.frozenUntil) movePlayer(dt, now);
  updateGhosts(dt, now);
  checkWordCollisions();
  checkPowerPellets(now);
  checkGhostCollision(now);
  for (const pellet of game.powerPellets) {
    if (!pellet.active && now >= pellet.respawnAt) pellet.active = true;
  }
  if (game.extraGhostUntil && now > game.extraGhostUntil) {
    game.ghosts = game.ghosts.filter((g) => !g.bonus);
    game.extraGhostUntil = 0;
  }
}

function movePlayer(dt, now) {
  const p = game.player;
  const reverse = now < game.reverseUntil;
  let desired = p.nextDir;
  if (reverse) desired = OPPOSITE[desired];

  if (nearCenter(p)) {
    p.x = Math.floor(p.x) + .5;
    p.y = Math.floor(p.y) + .5;
    if (canMove(p, desired, now)) p.dir = desired;
    if (!canMove(p, p.dir, now)) return;
  }
  const d = DIRS[p.dir];
  p.x += d.x * p.speed * dt;
  p.y += d.y * p.speed * dt;
  handleTunnel(p, now);
}

function updateGhosts(dt, now) {
  for (const ghost of game.ghosts) {
    const speedBoost = now < game.ghostRushUntil ? 1.65 : 1;
    if (nearCenter(ghost)) {
      ghost.x = Math.floor(ghost.x) + .5;
      ghost.y = Math.floor(ghost.y) + .5;
      const dirs = Object.keys(DIRS).filter((dir) => dir !== OPPOSITE[ghost.dir] && canMove(ghost, dir, now, true));
      const fallback = Object.keys(DIRS).filter((dir) => canMove(ghost, dir, now, true));
      const options = dirs.length ? dirs : fallback;
      if (options.length) {
        options.sort((a, b) => ghostDirScore(ghost, a) - ghostDirScore(ghost, b));
        ghost.dir = Math.random() < .72 ? options[0] : options[Math.floor(Math.random() * options.length)];
      }
    }
    const d = DIRS[ghost.dir] || DIRS.left;
    ghost.x += d.x * ghost.speed * speedBoost * dt;
    ghost.y += d.y * ghost.speed * speedBoost * dt;
    handleTunnel(ghost, now, true);
  }
}

function ghostDirScore(ghost, dir) {
  const d = DIRS[dir];
  const nx = ghost.x + d.x, ny = ghost.y + d.y;
  const chase = Math.abs(nx - game.player.x) + Math.abs(ny - game.player.y);
  return chase + Math.random() * 3.2;
}

function nearCenter(entity) {
  const cx = Math.floor(entity.x) + .5;
  const cy = Math.floor(entity.y) + .5;
  return Math.abs(entity.x - cx) < .10 && Math.abs(entity.y - cy) < .10;
}

function canMove(entity, dir, now, ghost = false) {
  if (!dir) return false;
  const d = DIRS[dir];
  const x = Math.floor(entity.x), y = Math.floor(entity.y);
  const nx = x + d.x, ny = y + d.y;
  const tunnelY = Math.floor(game.maze.length / 2);
  if (ny === tunnelY && (nx < 0 || nx >= game.maze[0].length)) return now >= game.tunnelBlockedUntil;
  if (ny < 0 || ny >= game.maze.length || nx < 0 || nx >= game.maze[0].length) return false;
  return game.maze[ny][nx] === 0;
}

function handleTunnel(entity, now) {
  const cols = game.maze[0].length;
  const tunnelY = Math.floor(game.maze.length / 2) + .5;
  if (Math.abs(entity.y - tunnelY) > .6) return;
  if (now < game.tunnelBlockedUntil) {
    entity.x = Math.max(.5, Math.min(cols - .5, entity.x));
    return;
  }
  if (entity.x < -.15) entity.x = cols + .15;
  if (entity.x > cols + .15) entity.x = -.15;
}

