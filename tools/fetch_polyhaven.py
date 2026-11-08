#!/usr/bin/env python3
"""Re-download the CC0 Poly Haven assets used by the game (then run tools/bake_rocks.gd).
Rocks land in assets/rocks/<name>/ (raw 1k glTF scans); ground/bark textures in textures/."""
import json, os, urllib.request

ROCKS = ['boulder_01', 'rock_07', 'rock_09', 'stone_01', 'namaqualand_boulder_02', 'namaqualand_boulder_04', 'namaqualand_boulder_05']
TEXTURES = ['dry_riverbed_rock', 'rock_boulder_dry', 'forest_ground_04', 'river_small_rocks', 'rocky_trail', 'sparse_grass', 'bark_brown_02', 'rock_face_03']


def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'dog-game-asset-fetch/1.0'})
    return urllib.request.urlopen(req, timeout=90).read()


for r in ROCKS:
    g = json.loads(get(f'https://api.polyhaven.com/files/{r}'))['gltf']['1k']['gltf']
    d = f'assets/rocks/{r}'
    os.makedirs(d, exist_ok=True)
    open(f'{d}/{r}.gltf', 'wb').write(get(g['url']))
    for rel, inc in g.get('include', {}).items():
        p = os.path.join(d, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(get(inc['url']))
    print('rock', r)
for t in TEXTURES:
    f = json.loads(get(f'https://api.polyhaven.com/files/{t}'))
    for m, key in [('Diffuse', 'diff'), ('nor_gl', 'nor_gl'), ('Rough', 'rough')]:
        if m in f and '1k' in f[m]:
            open(f'textures/{t}_{key}_1k.jpg', 'wb').write(get(f[m]['1k']['jpg']['url']))
    print('texture', t)
