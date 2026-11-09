// Breed library, tuned to Ian's reference paintings (reference/painting-*.png).
// Dog-local space: +z forward, +y up, origin = torso center.
// mark(p, part) returns 0..1 = how much of the secondary color shows at point p.
import * as THREE from 'three';

const under = (p, y0 = -0.08, soft = 0.08) => THREE.MathUtils.smoothstep(-p.y, -y0 - soft, -y0 + soft);

export const BREEDS = {
  golden: {
    name: 'Golden Retriever', size: 1.0, legH: 0.68, width: 1.0, snout: 0.17, ears: 'flop', tail: 'feather',
    coat: '#d79b45', second: '#f1d08d', furLen: 0.07, curl: 0.15, shells: 20,
    mark: (p, part) => (part === 'body' ? under(p, -0.12) * 0.8 : part === 'head' ? 0.15 : 0.3),
    gear: { type: 'collar', color: '#b7e34a' },
  },
  redGolden: {
    name: 'Red Golden', size: 1.02, legH: 0.68, width: 1.0, snout: 0.18, ears: 'flop', tail: 'feather',
    coat: '#c4652a', second: '#e39a52', furLen: 0.08, curl: 0.2, shells: 20,
    mark: (p, part) => (part === 'body' ? under(p, -0.1) * 0.7 : 0.2),
    gear: { type: 'harness', color: '#26272b' },
  },
  creamGolden: {
    name: 'Cream Golden', size: 0.98, legH: 0.66, width: 1.0, snout: 0.16, ears: 'flop', tail: 'feather',
    coat: '#e7c27e', second: '#f6e3b6', furLen: 0.075, curl: 0.15, shells: 20,
    mark: (p, part) => (part === 'body' ? under(p, -0.1) : 0.4),
    gear: { type: 'harness', color: '#d8364a' },
  },
  doodle: {
    name: 'Red Goldendoodle', size: 0.95, legH: 0.66, width: 1.0, snout: 0.14, ears: 'flop', tail: 'pom',
    coat: '#bf7238', second: '#dd9a5a', furLen: 0.11, curl: 0.9, shells: 22,
    mark: () => 0.2,
    gear: { type: 'harness', color: '#2f63c9' },
  },
  whiteDoodle: {
    name: 'White Doodle', size: 0.95, legH: 0.64, width: 1.0, snout: 0.14, ears: 'flop', tail: 'pom',
    coat: '#efe6cf', second: '#fff8e8', furLen: 0.12, curl: 0.9, shells: 22,
    mark: () => 0.3, gear: null,
  },
  husky: {
    name: 'Husky', size: 1.0, legH: 0.66, width: 1.0, snout: 0.17, ears: 'erect', tail: 'plume',
    coat: '#2b2c33', second: '#f5f2ec', furLen: 0.08, curl: 0.05, shells: 20,
    mark: (p, part) => {
      if (part === 'body') return Math.max(under(p, -0.02, 0.06), THREE.MathUtils.smoothstep(p.z, 0.3, 0.5) * under(p, 0.12));
      if (part === 'head') {
        const mask = p.y < -0.01 || (p.z > 0.13 && p.y < 0.04) ? 1 : 0; // white muzzle, cheeks, jaw
        const spectacles = Math.hypot(Math.abs(p.x) - 0.065, p.y - 0.035) < 0.03 && p.z > 0.05 ? 1 : 0;
        const stripe = Math.abs(p.x) < 0.018 && p.z > 0.05 ? 1 : 0;   // white forehead blaze
        return Math.max(mask, spectacles, stripe);
      }
      return part === 'leg' ? 1 : part === 'tailTip' ? 1 : 0;
    },
    gear: { type: 'collar', color: '#2aa6a0' },
  },
  lab: {
    name: 'Black Lab', size: 1.0, legH: 0.66, width: 0.95, snout: 0.18, ears: 'flop', tail: 'otter',
    coat: '#1f1c1c', second: '#3a3433', furLen: 0.025, curl: 0, shells: 10,
    mark: () => 0, gear: { type: 'harness', color: '#7b3fb0' },
  },
  bernedoodle: {
    name: 'Bernedoodle', size: 1.0, legH: 0.68, width: 1.0, snout: 0.15, ears: 'flop', tail: 'pom',
    coat: '#221f20', second: '#f3eee4', furLen: 0.11, curl: 0.85, shells: 22,
    mark: (p, part) => {
      if (part === 'body') return THREE.MathUtils.smoothstep(p.z, 0.32, 0.5) * under(p, 0.1);
      if (part === 'head') return p.z > 0.12 || (Math.abs(p.x) < 0.03 && p.y > 0.0) ? 1 : 0;
      if (part === 'paw') return 1;
      return part === 'tailTip' ? 1 : 0;
    },
    gear: { type: 'harness', color: '#5d6b4a' },
  },
  frenchie: {
    name: 'French Bulldog', size: 0.7, legH: 0.34, depth: 1.0, width: 1.25, snout: 0.035, ears: 'bat', tail: 'stub',
    coat: '#c98843', second: '#2a211c', furLen: 0.018, curl: 0, shells: 8,
    mark: (p, part) => (part === 'head' ? (p.z > 0.08 && p.y < 0.02 ? 1 : 0) : 0), // black mask on muzzle
    gear: { type: 'harness', color: '#2f63c9' },
  },
  collie: {
    name: 'Border Collie Mix', size: 0.9, legH: 0.64, width: 0.9, snout: 0.17, ears: 'flop', tail: 'feather',
    coat: '#1f1d1e', second: '#f3f0ea', furLen: 0.07, curl: 0.1, shells: 18,
    mark: (p, part) => {
      if (part === 'body') return THREE.MathUtils.smoothstep(p.z, 0.35, 0.5) * under(p, 0.2);
      if (part === 'head') return Math.abs(p.x) < 0.035 || p.z > 0.14 ? 1 : 0;
      return part === 'paw' || part === 'tailTip' ? 1 : 0;
    },
    gear: null,
  },
};

export const BREED_ORDER = ['golden', 'doodle', 'husky', 'lab', 'frenchie', 'redGolden', 'bernedoodle', 'creamGolden', 'whiteDoodle', 'collie'];
