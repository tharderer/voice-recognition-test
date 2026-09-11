"use strict";

// Only the CURRENT verse room can interact with the player.
// Completed gray rooms and future inactive rooms are visual geography only.
(() => {
  const previousWrongVerseChoice = wrongVerseChoice;
  const previousUpdateVerse = updateVerse;

  // Defense in depth: even if another collision path calls this directly,
  // only a decoy from the active room is allowed to trigger a penalty.
  wrongVerseChoice = function(t, now) {
    if (!t || t.roomIndex !== wordIndex) return;
    return previousWrongVerseChoice(t, now);
  };

  // Strong fix: make every non-current room non-interactive BEFORE the
  // underlying collision loop runs. We temporarily give those targets an
  // infinite cooldown, then restore their real cooldown afterward. That way
  // old gray words cannot release predators, and future words cannot be
  // accidentally triggered early either.
  updateVerse = function(dt, now) {
    const held = [];
    if (mode === "verse" && Array.isArray(wordTargets)) {
      for (const t of wordTargets) {
        if (t.roomIndex !== wordIndex) {
          held.push([t, t.cooldownUntil]);
          t.cooldownUntil = Infinity;
        }
      }
    }

    try {
      return previousUpdateVerse(dt, now);
    } finally {
      for (const [t, oldCooldown] of held) t.cooldownUntil = oldCooldown;
    }
  };
})();
