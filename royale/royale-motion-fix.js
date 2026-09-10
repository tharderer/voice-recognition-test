/* Royale motion/control hotfix: use the same buffered center-to-center movement model as Endless 256. */
(function () {
  "use strict";

  function centerKey(entity) {
    return Math.floor(entity.x) + "," + Math.floor(entity.y);
  }

  function centerX(entity) { return Math.floor(entity.x) + 0.5; }
  function centerY(entity) { return Math.floor(entity.y) + 0.5; }

  setDirection = function (dir) {
    if (!game || !DIRS[dir]) return;
    const p = game.player;
    p.nextDir = dir;
    p.want = dir;

    if (p.dir && OPPOSITE[p.dir] === dir) {
      p.dir = dir;
      p.lastCenter = "";
    }
  };

  movePlayer = function (dt, now) {
    const p = game.player;
    if (p.lastCenter == null) p.lastCenter = "";
    if (!p.want) p.want = p.nextDir || p.dir || "right";

    const cx = centerX(p);
    const cy = centerY(p);
    const near = Math.abs(p.x - cx) < 0.12 && Math.abs(p.y - cy) < 0.12;
    const key = centerKey(p);
    const stopped = !p.dir || !DIRS[p.dir];

    if (near && (p.lastCenter !== key || stopped)) {
      p.x = cx;
      p.y = cy;

      let wanted = p.want || p.nextDir;
      if (now < game.reverseUntil && wanted) wanted = OPPOSITE[wanted];

      if (wanted && canMove(p, wanted, now)) p.dir = wanted;
      if (!p.dir || !canMove(p, p.dir, now)) p.dir = "";
      p.lastCenter = key;
    }

    if (!p.dir || !DIRS[p.dir]) return;
    const d = DIRS[p.dir];
    const speed = 5.1;
    p.x += d.x * speed * dt;
    p.y += d.y * speed * dt;
    handleTunnel(p, now);
  };

  updateGhosts = function (dt, now) {
    for (const ghost of game.ghosts) {
      if (ghost.lastCenter == null) ghost.lastCenter = "";
      const cx = centerX(ghost);
      const cy = centerY(ghost);
      const near = Math.abs(ghost.x - cx) < 0.12 && Math.abs(ghost.y - cy) < 0.12;
      const key = centerKey(ghost);

      if (near && ghost.lastCenter !== key) {
        ghost.x = cx;
        ghost.y = cy;

        const all = Object.keys(DIRS).filter((dir) => canMove(ghost, dir, now, true));
        const noReverse = all.filter((dir) => !ghost.dir || dir !== OPPOSITE[ghost.dir]);
        const options = noReverse.length ? noReverse : all;

        if (options.length) {
          options.sort((a, b) => ghostDirScore(ghost, a) - ghostDirScore(ghost, b));
          ghost.dir = Math.random() < 0.78 ? options[0] : options[Math.floor(Math.random() * options.length)];
        } else {
          ghost.dir = "";
        }
        ghost.lastCenter = key;
      }

      if (!ghost.dir || !DIRS[ghost.dir]) continue;
      const d = DIRS[ghost.dir];
      const boost = now < game.ghostRushUntil ? 1.65 : 1;
      ghost.x += d.x * ghost.speed * boost * dt;
      ghost.y += d.y * ghost.speed * boost * dt;
      handleTunnel(ghost, now, true);
    }
  };

  const originalStartGame = startGame;
  startGame = function (seed) {
    originalStartGame(seed);
    if (!game) return;
    game.player.speed = 5.1;
    game.player.want = "right";
    game.player.nextDir = "right";
    game.player.dir = "right";
    game.player.lastCenter = "";
    for (const ghost of game.ghosts) ghost.lastCenter = "";
  };

  const originalApplyAttack = applyAttack;
  applyAttack = function (type, fromName) {
    originalApplyAttack(type, fromName);
    if (!game) return;
    for (const ghost of game.ghosts) {
      if (ghost.lastCenter == null) ghost.lastCenter = "";
    }
  };

  let swipeId = null;
  let sx = 0;
  let sy = 0;
  let swipeFired = false;
  const surface = els.game;

  surface.style.touchAction = "none";

  surface.addEventListener("pointerdown", function (e) {
    if (e.target && e.target.closest && e.target.closest("button")) return;
    swipeId = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
    swipeFired = false;
    try { surface.setPointerCapture(e.pointerId); } catch (_) {}
  }, { passive: false, capture: true });

  surface.addEventListener("pointermove", function (e) {
    if (swipeId !== e.pointerId || swipeFired || !game || session.phase !== "game") return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    swipeFired = true;
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "right" : "left")
      : (dy > 0 ? "down" : "up");
    setDirection(dir);
    e.preventDefault();
  }, { passive: false, capture: true });

  function clearSwipe(e) {
    if (swipeId === e.pointerId) swipeId = null;
  }
  surface.addEventListener("pointerup", clearSwipe, { capture: true });
  surface.addEventListener("pointercancel", clearSwipe, { capture: true });

  /* The 256-style control scheme is swipe-only. */
  const controls = document.querySelector(".controls-row");
  if (controls) controls.remove();

  const hint = document.createElement("div");
  hint.id = "royaleSwipeHint";
  hint.className = "royale-swipe-hint";
  hint.innerHTML = "SWIPE TO MOVE<small>Swipe early — turns are buffered.</small>";
  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.appendChild(hint);

  const hideHint = () => hint.classList.add("hide");
  surface.addEventListener("pointermove", function () {
    if (swipeFired) hideHint();
  }, { passive: true });
})();
