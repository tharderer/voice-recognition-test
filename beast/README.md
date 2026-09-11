# Build a Beast — Hide the Word

A real Godot 4.4.1 3D browser game, using nine custom Blender 4.3 models, published at `/beast/`. The existing games are preserved.

## Play

Swipe over the world to move continuously in that direction; tap the world or STOP to stop. JUMP clears hot pads and shockwaves. DASH destroys nearby robots and briefly protects the beast. CHOMP attacks nearby enemies; later evolutions gain a ranged attack. Keyboard inside the game: WASD/arrows, Space, Shift, E.

Four action rounds earn three visible evolutions and face the Copycat King. Collect crystals, defeat robots, survive hazards, then recall the assigned KJV passage. There are eight verses. The first two rounds check the two studied halves. The last two each require the whole verse, with at least 45 seconds of boss-round gameplay between them.

Typed checks require every word, in order, allowing only punctuation/case differences. No answer choices, first letters, automatic completion, or partial-credit passes. Pasting and dropping text into the answer field are disabled. No live correctness feedback reveals a partial answer. Study cancels the current attempt; studying during either whole-verse check resets BOTH whole-verse checks and requires replaying the action rounds. This is a client-side learning game, not a tamper-proof examination or a promise of long-term retention.

Optional voice mode records a complete clip before transcribing. Transformers.js 3.8.1 and Whisper tiny.en run in a worker on the player's device; the model is downloaded from Hugging Face and code from jsDelivr. No API key and no recording upload to an application server. The expected verse is never supplied as a transcription prompt. Silence, model/download failures, and mismatches cannot pass. Recognition may mishear children or KJV wording; full typed recall is always available. On slower phones, loading/transcription can take time. No microphone permission is requested until the player selects recording. The worker is terminated on cancellation. Phone microphone and speech-model operation still need real-device playtesting.

## Sources and build

- `godot/beast/build_assets.py` creates actual meshes and materials with Blender's `bpy`, exports GLB, and saves `art/beast/beast-assets.blend`.
- Blender runtime used: `bpy==4.3.0`, Python 3.11, `numpy<2`.
- Godot: `godot/beast/`; single-threaded Compatibility renderer web export.
- Rebuild asset command: `python godot/beast/build_assets.py` in an environment containing bpy.
- Rebuild game: set the export preset's custom template path for your machine, import with Godot, then export Web.
- `.github/workflows/build-beast.yml` performs the reproducible game build and commits its web export.
- `node beast/tests/recall.cjs` tests recall gates. `godot --headless --path godot/beast --script smoke.gd` checks the four stages and imported models.

All story-world creatures, hazards, upgrades, and the Copycat King are fictional arcade elements. Scripture is exact KJV.
