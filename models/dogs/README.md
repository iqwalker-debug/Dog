# Drop-in dog models

Put a rigged, animated glTF binary here and the game uses it instead of the procedural dog:

- `models/dogs/<breed>.glb` for one breed, e.g. `golden.glb`, `husky.glb`, `frenchie.glb`
  (breed keys: golden, doodle, husky, lab, frenchie, redGolden, bernedoodle, creamGolden, whiteDoodle, collie)
- or `models/dogs/dog.glb` for every breed that has no file of its own.

The model should face **+Z** with **+Y up** (Blender: export glTF with "+Y Up"; the dog looking
down Blender's −Y axis ends up facing +Z). Size doesn't matter: it's scaled to the breed's height and
its paws are put on the ground.

Animations are matched by name (case-insensitive, any one word is enough):

| Game state | Names it looks for |
| --- | --- |
| idle | idle, stand, breath |
| walk | walk |
| trot | trot, jog (falls back to walk) |
| run | gallop, run, sprint (falls back to walk) |
| swim | swim, paddle |
| sit | sit |
| lie | lie, lay, rest, sleep |
| shake | shake |
| sniff | sniff, eat, smell |

Where to get them: realistic rigged dogs are usually paid assets (e.g. Fab/Unreal Marketplace,
Sketchfab Store, CGTrader, TurboSquid — check that the license allows use in a game, and export to
.glb from Blender if they come as .fbx). Shake-off droplets, wetness timing, barks and AI keep
working with any model.
