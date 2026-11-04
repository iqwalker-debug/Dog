# Pawbound

A 3D dog-collecting adventure with a painted look. Everything is in one HTML file. Open `index.html` in a browser with WebGL to play. Three.js loads from a CDN, so the first load needs internet. Progress saves to your browser's local storage.

## The loop
1. **Collect breeds.** There are 18 breeds, from Golden Retrievers and Goldendoodles to rare Bernese Mountain Dogs. Adopt them at the shelter or rescue lost puppies on the trail.
2. **Bond and train.** You get 3 care actions a day: play, give treats, train. At bond 80 a dog becomes your **Best Friend**.
3. **Teach trail running.** Only best friends can learn it, and only trail-ready dogs can join your **party of 3**.
4. **Explore.** Walk a Hill Country greenbelt in third person, with a clear creek, limestone ledges and live oaks. Your pack follows you and swims when the water gets deep. Collect treats, chests and void crystals. At the end of each trail, the Rift Gate leads deeper. A Rift Maw guards every third gate.
5. **Fight the void.** Turn-based battles happen right where you meet a monster, with your 3 dogs against up to 3 monsters.

## Life stages
Dogs age one day each time a day ends.

| Stage | Days | Energy (stamina) | Balance (hit %, stamina cost) | Wisdom (moves known) |
|---|---|---|---|---|
| Puppy | 0–5 | ★★★ 30 | ★ 62%, ×1.25 | ★ 2 |
| Adult | 6–17 | ★★ 12 | ★★★ 93%, ×0.75 | ★★ 4 (learns its breed signature move) |
| Senior | 18+ | ★ 8 | ★★ 88%, ×0.85 | ★★★ 8 (full repertoire) |

Puppies **don't always listen**. Bond and training improve that.

## Rendering
- The scene renders to an off-screen target. A **Kuwahara filter** then turns pixels into flat brush dabs. A grade pass adds warm highlights, cool shadows, extra saturation and paper grain.
- Procedural terrain carries a carved creek. The creek bed has caustics and depth absorption, and the water surface has fresnel reflection and sun glints.
- Rocks, oak trunks, leaf cards (with spherical canopy normals), grass and wildflowers are instanced, so there are few draw calls.
- Dogs are built from primitives with curly or fluffy displaced fur and merle or patch coat shaders. Kennel portraits render the same 3D dogs through the same painted pass.
- **Performance:** there are Auto, Performance, Balanced and Beauty presets. Resolution scales itself to hold the frame rate. You can turn on a frame-rate counter in Settings.

## Controls
- WASD or the arrow keys to move, Shift to run, and drag or Q/E to turn the camera.
- On touch screens, use the joystick and drag to look.
- In battle, press 1–9 for moves, R to rest and Tab to switch targets.

## Imported 3D models
- Breeds listed in `MODEL_FILES` (in `index.html`) load a GLB model from `models/`. Every other breed uses the built-in dog builder.
- Imported models can have named leg joints (`FrontLeft_UpperLeg` and so on), a `Tail` and ears, plus a walk animation that speeds up with movement.
- `models/treasure_chest.glb` was made with ChatGPT (honey-oak wood, iron bands, brass lock). Its lid opens with the model's own `Open` animation when you collect it.
- `models/goldendoodle.glb` was made with ChatGPT, then slimmed with gltf-transform from 18.7 MB / 362k triangles down to 3.2 MB / 114k triangles.
- `vendor/GLTFLoader.js` is three.js's model loader, wrapped so it works with the page's single copy of three.js.
- Opening `index.html` straight from disk can't load models, so it falls back to the built-in dogs. Serve the folder instead, for example with `python3 -m http.server`.
