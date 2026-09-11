// Keep the legacy AB001 launch hook pointed at the current remake.
document.getElementById('startHero')?.addEventListener('click', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign('./godot-ab001/');
}, true);
