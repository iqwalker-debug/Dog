// Level 9 (step 9): the first painted station. One of Ian's paintings (hill-country creek, reference 15)
// is the whole scene; the camera is fixed where the painter stood; the 3D dogs walk the path in front.
// This is how the game reaches the painted look on weak GPUs: paint the world, render only the dogs.
import { runLevel } from '../world.js';

// camera: eye height 1.6 m, horizon at ~43% from the top of the painting -> pitched 3.3° down, 45° vertical FOV
const PITCH = 3.3 * Math.PI / 180;

runLevel({
  id: 'station', name: 'Hill Country Creek (painted)', seed: 15,
  helpExtra: 'painted station: the scene is a painting, the dogs are 3D',
  fog: ['#cfe0e8', 400, 800],
  groundH: () => 0, waterY: null, water: false,
  station: { image: '/stations/creek.jpg', aspect: 1536 / 1024, fov: 45, pos: [0, 1.6, 0], look: [0, 1.6 - Math.tan(PITCH) * 10, 10], sun: [6, 15, -2], shadow: 0.85, fill: 0.9, saturation: 1.0 },
  // walkable: the crushed-granite path, bottom-left into the middle distance; keep off the painted pool (right) and the big oak trunk (far left)
  // (camera looks down +z, so world +x is screen-left. Path is x≈0.4..2 for z 3..12; the pool and slabs are x < 0.3)
  bounds: { x0: 0.35, x1: 3.0, z0: 3.2, z1: 12 },
  blocked: (x, z) => (x > 2.6 && z < 4.5), // the big oak trunk, bottom-left
  start: { x: 1.3, z: 5.2, heading: -0.1 },
  player: 'redGolden', buddies: ['bernedoodle'],
  treatSpot: (rnd) => ({ x: 0.5 + rnd() * 1.7, z: 3.5 + rnd() * 8 }),
  build() { return []; },
});
