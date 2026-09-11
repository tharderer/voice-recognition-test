"use strict";

// Completed verse rooms are visual history only. Their gray choices are inert.
(() => {
  const previousWrongVerseChoice = wrongVerseChoice;

  wrongVerseChoice = function(t, now) {
    if (t && t.roomIndex < wordIndex) return;
    return previousWrongVerseChoice(t, now);
  };
})();
