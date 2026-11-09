// Level 10 (step 12): swimming hole station. Painting 1 is the scene (cropped to its upper band so the painted
// husky in the foreground stays out of frame); real water sits over the painted pool so the dogs swim, ripple and
// shake off on the way out. Camera is low, near the water, looking slightly up at the wall and trees like the painting.
import { runLevel } from '../world.js';

const UP = 6 * Math.PI / 180; // eye level (graffiti-wall top) is below frame centre, so the camera tilts up 6°

runLevel({
  id: 'swimstation', name: 'Swimming Hole (painted)', seed: 1,
  helpExtra: 'painted station: swim! the pool is real water over the painting',
  fog: ['#cfe0e8', 400, 800],
  groundH: () => -1.5, waterY: 0,
  waterOpts: { w: 80, d: 11, cz: 10.5, color: '#2f8f7c', clear: 0.3, opacity: 0.36 }, // pool ends at the painted wall base, ~16 m out
  station: {
    image: '/stations/swimhole.jpg', aspect: 1086 / 1448, cropY: 0.34, horizon: 0.40, band: 0.05,
    fov: 45, pos: [0, 1.6, 0], look: [0, 1.6 + Math.tan(UP) * 10, 10],
    sun: [-6, 15, 3], shadow: 0.5, floorY: -0.03, fill: 0.9, saturation: 1.0, hour: 12, bleed: 0.7,
  },
  bounds: { x0: -5, x1: 5, z0: 5.6, z1: 15 },
  start: { x: 1.2, z: 7.5, heading: 0.2 },
  player: 'lab', buddies: ['doodle'],
  treatSpot: (rnd) => ({ x: -4.5 + rnd() * 9, z: 6 + rnd() * 9 }),
  build() { return []; },
});
