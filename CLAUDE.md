# Dog — painted 3D dog game

## Run
- `npm install` then `npm run dev` (open the URL it prints)
- `?scale=0.5` forces internal render scale; `?capture` enables screenshots; F3 shows FPS
- `npm run build` must pass before every commit

## Current state
- `src/painterly.js` — rendering foundation (paint filter, paper grain, glints, riverbed caustics, dynamic resolution). Extend, don't replace.
- `src/main.js` — Level 1 prototype (swimming hole, graffiti wall, dam, oaks, ripples, 2 AI dogs)
- `src/dog.js` — placeholder primitive dog. Replace with rigged GLB + shell fur.
- `reference/` — Ian's 8 target paintings. Compare screenshots against these.
- Note: UnrealBloomPass rendered black in testing; glints in the paint pass replace it.

## Brief
Build a 3D dog-adventure game in Three.js (Vite + TypeScript) whose every frame
looks like a hand-painted watercolor/gouache illustration of Austin, TX in summer.
Use /src/painterly.js as the rendering foundation (post pass, riverbed caustics,
water material, dynamic-res renderer). Do not replace it; extend it.

ART DIRECTION (non-negotiable)
- Look: Studio-Ghibli-adjacent painted realism. Saturated summer palette:
  turquoise/jade water, golden limestone, yellow-green live oaks, cerulean sky
  with cotton clouds. Paper grain and visible brush strokes on everything.
- Light: high sun, warm key (#fff1d0), cool sky fill. Dappled leaf shadows
  (animated cookie/gobo texture on the directional light). Gold caustics on the
  riverbed. 4-point star glints where sun hits water.
- Water must be clear enough to see rocks underneath; ripple rings around
  swimming dogs; wake spray particles; waterfall foam at the dam.
- Camera: low, near water level, slight wide-angle (FOV 70) — dog's-eye POV.
  Optional 3rd-person over-the-shoulder like walking two dogs on leashes.

DOGS (the hero)
- Breeds: golden doodle (curly), husky (black/white, plume tail), black lab,
  Australian shepherd (merle, heterochromia), shih-tzu mix, golden retriever.
- Fur via shell texturing (24–32 shells, noise-driven strand mask, curl for
  doodles) + fin silhouettes. Wet-fur state darkens and clumps fur when swimming.
- Animation: walk, trot, run, swim (head above water, paddle), shake-off,
  sniff, tongue-out pant. Procedural tail wag + ear physics (spring bones).
- Harnesses and leashes as rope physics (verlet).

LEVELS (stylized, not photoreal replicas)
1. Spring-fed swimming hole with graffiti retaining wall, low dam waterfall,
   chain-link fence, light poles, pavilion.
2. Wide shallow greenbelt creek, rocky banks, people wading, skyline far away.
3. Fenced off-leash park, grass with tiny white wildflowers.
4. Rusty steel arch trailhead with wildflower meadow and crushed-granite path.

PERFORMANCE TARGET: 3840x2160 @ 60fps on a desktop GPU (RTX 3070 / M2 Pro+)
- Keep the dynamic-resolution loop in painterly.js (internal 0.5–1.0 scale);
  the paint filter hides upscaling.
- Instanced trees/grass/rocks, LOD (3 levels), frustum culling,
  KTX2/Basis textures, Draco-compressed GLBs, shadow map 2048 with cascades only near camera.
- Fur shells drop to 8 at distance. Kuwahara radius 4 at >0.8 scale, 3 below.
- Show an FPS + internal-resolution debug overlay (toggle F3).

DELIVER IN ORDER, running after each step:
1. Level 1 graybox + painterly pipeline + water + caustics, one husky swimming.
2. Fur shells + swim/shake animations.
3. Remaining dogs, then levels 2–4.
4. Gameplay loop: fetch, swim races, collecting sticks/treats, walk routes.
After each step, screenshot at 3840x2160 with Playwright and compare against
the reference paintings in /reference; list the 3 biggest visual gaps and fix them.
