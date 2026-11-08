# Dog (Godot 4)

A 3D dog adventure game that looks like a hand-painted watercolor of Austin swimming holes and trails.
This is the Godot 4 rebuild of the original Three.js + Vite prototype.

## Run

1. Install **Godot 4.7** (standard build, no .NET needed): https://godotengine.org/download
2. Open Godot → **Import** → pick this folder's `project.godot` → **Import & Edit**.
3. Press **F5** (Run Project).

From a terminal:

```bash
godot --path . -- --level=trail
```

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows, or click-drag | swim / walk / turn |
| Shift | run |
| Space | splash (swimming) · call the dogs (trail) |
| F or double-click | throw the ball (fetch race) |
| B | bark (a buddy answers) |
| E | shake off |
| C | sit → lie → auto |
| 1 – 0 | swap your dog's breed |
| L | next level |
| V | trail: POV ↔ third person |
| M | sound on / off |
| F3 | FPS / internal-resolution overlay |

## Levels

`swimhole` (1) → `trail` (5) → `bluff` (6) → `creek` (7) → `river` (8), cycled with **L**.
Collect the 12 bone treats in each level; throw the ball and race your buddies to it.

## Command-line options (after `--`)

| Option | What it does |
| --- | --- |
| `--level=creek` | start on a level |
| `--breed=husky` | start as a breed |
| `--showroom` / `--showroom=golden` / `--showroom=golden --face` / `--pose=lie` | breed line-up, close-up, portrait |
| `--scale=0.5` | force the internal 3D render scale (otherwise dynamic, 0.5–1.0, holding 60 fps) |
| `--capture=shot.png --wait=6` | save a screenshot after N seconds, then quit |
| `--walk` | autopilot (walks forward) — handy for capture tests |

## Your own dog models

Drop a rigged, animated `.glb` into `models/dogs/` (per breed, or `dog.glb` for all) and it replaces
the procedural dog — see `models/dogs/README.md`.

See `CLAUDE.md` for the architecture and roadmap.
