# AB001 — The Road to Canaan

A standalone Godot 4.4.1 3D remake of the AB001 hero card, **ABRAM LEAVES EVERYTHING**, Genesis 12:1–5. Public entry point: `/godot-ab001/`.

## Playing

Swipe the world to travel; tap to stop and interact nearby. Buttons: Interact, Staff, Run, Call. Zoom buttons and pause menu work in both orientations. Keyboard: WASD/arrows, E, Space, Shift, Q. Each completed chapter earns a local chapter checkpoint; retries rebuild the current chapter.

1. Haran: gather Sarai, Lot, a household representative, two supply bundles, a pack donkey, and three sheep. Everyone must be nearby to leave.
2. Open road: recover the missing lamb, protect the caravan from wolves with the staff, refill water, and reach camp. An optional supply detour restores condition.
3. River: gather all three driftwood bundles, repair the crossing, stay on its planks, refill water on the far bank, and gather at camp.
4. Pass: watch telegraphed rockfall lanes and lead the caravan through the canyon to Canaan.

Explorer, Trailblazer, and Pathfinder change water consumption, wolf pressure, and rockfall frequency. Travel hazards are explicitly fictional additions. The story quotations are KJV. This is an adventure remake, not a test that certifies verse memorization.

## Actual Blender / Godot pipeline

`build_assets.py` builds 17 models using Blender 4.3's real `bpy` engine and exports GLBs into `assets/`. Run with Blender: `blender -b -P build_assets.py`, or Python 3.11 with `bpy==4.3.0` and `numpy<2`. Editable Blender collections are archived in `../../art/ab001-remake/ab001-assets.blend.zip`.

Open `project.godot` in Godot 4.4.1. `main.gd` builds the scenes, collisions, following caravan, enemy behavior, hazards, controls, objectives, and chapter progression. `web/` is the accessible HTML overlay and touch buttons; the rendered world and game simulation are Godot.

Run checks with `godot --headless --path godot/ab001-remake --editor --quit`, then `godot --headless --path godot/ab001-remake --script smoke.gd`. Set the release template in `export_presets.cfg` to Godot 4.4.1's `web_nothreads_release.zip` and export Web. Single-thread compatibility rendering avoids a cross-origin-isolation requirement on GitHub Pages. Requires WebGL 2.

`.github/workflows/build-ab001-remake.yml` imports, checks, exports, and copies the wrapper to `godot-ab001/`, then commits the generated web build. It preserves the existing public build until the new export succeeds. Other games and the older Godot source projects are independent.

Checkpoints use localStorage. No microphone, account, advertising, analytics, or third-party assets are required. Procedural sound is generated locally after a user gesture.
