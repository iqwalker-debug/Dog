# Dog — painted 3D dog game (Godot 4.7, GDScript)

Rebuilt from the Three.js prototype. Same art direction, dogs, levels and gameplay.

## Run / test
- Open `project.godot` in Godot 4.7 and press F5, or `godot --path . -- --level=<name>`.
- Headless smoke test (parse + 30 frames): `godot --headless --path . --quit-after 30 -- --level=trail`
- Screenshot: `godot --path . -- --level=river --capture=/tmp/river.png --wait=6`
  (on a GPU-less Linux box: `xvfb-run -a godot --rendering-method gl_compatibility ...`)
- After adding a new `class_name`, run `godot --headless --path . --import` once so it's registered.
- Default renderer is Forward+ (SSAO, better shadows). Everything also works in Compatibility (OpenGL).

## Layout
- `scripts/main.gd` — root: level loading (`load_level`, `next_level`), HUD labels, watercolor
  post pass (`shaders/painterly.gdshader` on a full-screen ColorRect), dynamic resolution
  (`scaling_3d_scale` 0.5–1.0 holding 60 fps), command-line args, `--capture`.
- `scripts/level_base.gd` — scenery toolkit: `setup_env` (sky shader, warm hemisphere-style ambient,
  sun with 2-split shadows, depth fog, AgX), `terrain` (height-field from `ground_h`, vertex colors,
  optional photo detail + caustics), `scatter` (MultiMesh with per-instance colors), `water`, `prop`, input.
- `scripts/world.gd` — shared engine for dog-controlled levels (port of world.js `runLevel`):
  player dog (swim when deep, wade + wet when shallow), buddy AI (follow, wander, sniff, chase ball,
  bring it back), 12 treats, fetch race, ripples, chase camera, fur LOD. Levels override
  `_config()`, `ground_h()`, `_build()`, `treat_spot()`, optional `blocked()`.
- `scripts/dog.gd` + `sculpt.gd` + `fur.gd` + `breeds.gd` — sculpted one-piece bodies/heads
  (blended SDF shapes → surface nets), breed markings in vertex colors, shell fur
  (`shaders/fur.gdshader`: curl, droop, wet clumping, `max_shell` LOD), face (carved sockets,
  blinking lids, panting jaw + tongue), ears on springs, wagging tail chain, two-segment legs,
  collars/harnesses, shake-off droplets. Poses: `set_pose('auto'|'sit'|'lie'|'stand')`, `sniff()`.
  Meshes are sculpted once per breed (~0.9 s) and cached in `Dog._cache`.
- `scripts/forest.gd` — procedural branching trees (5 live-oak variants, golden aspen, 3 bushes),
  alpha-cut leaf cards with a generated leaf-cluster texture, wind sway (`shaders/leaf.gdshader`),
  one MultiMesh per variant; `blob()` for distant hills/sumac. Call `forest.flush()` after placing.
- `levels/` — swimhole (1, now on the World engine: treats + fetch too), trail (5: pack walk on
  verlet leashes, NPC walkers, POV/3rd-person), bluff (6), creek (7), river (8), showroom.
- `shaders/` — painterly (Kuwahara + edge pigment + 4-point glints + paper + vignette), sky,
  ground (vertex color, triplanar detail, caustics), water (fresnel, ripples), fur, leaf, fall.

## Graphics (v2 upgrade)
- Water (`shaders/water.gdshader`): screen-texture refraction + depth-buffer absorption (clear
  shallows → jade depths), fresnel sky, shoreline/wading foam. Works on web (Compatibility) too.
- Grass: `LevelBase.grass(rect, density, where)` — wind-swayed clumps in 12 m MultiMesh tiles with
  distance fade; levels define `_grass_pass()`. Web halves density.
- Dogs: sculpt res 54/46/30 + Laplacian smoothing; meshes baked in `dogcache/` by
  `godot --headless --path . -s tools/bake_dogs.gd` (re-run after changing dog shapes; stale keys
  just fall back to runtime sculpting). Fur: finer strands, up to 32 shells, combed, rim + backlight.
- Post: sun shafts toward the on-screen sun, split-tone grade, soft glow.
- Forward+ only (desktop): volumetric fog god rays, SSR, SSIL, SSAO, TAA, 4-split soft shadows,
  far DOF. The web build ignores these.

## Conventions
- Dog-local space: +z forward, +y up. Heading = rotation.y; forward = (sin h, 0, cos h).
- Dog rig nodes use `EULER_ORDER_XYZ` to match the original three.js animation math.
- `MeshUtil.ss(x, a, b)` is three.js-style smoothstep (argument order differs from Godot's).
- Colors are written as sRGB hex; shaders convert vertex/instance colors to linear.
- Godot front faces are clockwise: run custom meshes through `MeshUtil.fix_winding`.

## Next (roadmap carried over)
Levels 2–4 (greenbelt creek, off-leash park, Violet Crown arch), swim races, painted texture detail
on trunks/leaves, sound, gamepad + touch UI, export presets (Windows/macOS/Web/Android).

## Brief (unchanged)
Every frame should look like a hand-painted watercolor/gouache illustration of Austin, TX in summer:
turquoise/jade water, golden limestone, yellow-green live oaks, cerulean sky with cotton clouds,
paper grain and visible strokes; high warm sun, dappled leaf shadows, gold caustics, 4-point glints;
low dog's-eye camera (FOV 70). Dogs are the heroes. Target 4K @ 60 fps on an RTX 3070 / M2 Pro.
