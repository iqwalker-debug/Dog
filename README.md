# Pawbound

A dog-collecting adventure game in one HTML file. Open `index.html` in any browser to play. Progress saves to your browser's local storage.

## The loop
1. **Collect breeds.** There are 13, from common Corgis to rare Bernese Mountain Dogs. You can adopt them at the shelter or rescue lost dogs out in the wilds.
2. **Bond and train.** You get 3 care actions a day: play, give treats, train. At bond 80 a dog becomes your **Best Friend**.
3. **Teach trail running.** Only best friends can learn it, and only trail-ready dogs can join your **party of 3**.
4. **Explore.** Walk a fogged map to collect treats and treasure, rescue lost dogs and dive through rifts to deeper levels. Every third level has a Rift Maw boss.
5. **Fight the void.** Battles are turn-based, with 3 dogs against up to 3 monsters.

## Life stages
Dogs age one day each time a day ends.

| Stage | Days | Energy (stamina) | Balance (hit %, stamina cost) | Wisdom (moves known) |
|---|---|---|---|---|
| Puppy | 0–5 | ★★★ 30 | ★ 62%, ×1.25 | ★ 2 |
| Adult | 6–17 | ★★ 12 | ★★★ 93%, ×0.75 | ★★ 4 (learns its breed signature move) |
| Senior | 18+ | ★ 8 | ★★ 88%, ×0.85 | ★★★ 8 (full repertoire) |

- **Energy**: how many moves a dog gets before its stamina runs out. Resting refills half.
- **Balance**: accuracy, plus how little stamina each move costs.
- **Wisdom**: how many different moves a dog knows.
- Puppies **don't always listen**. Bond and training improve that.
