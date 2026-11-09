// Level loader: ?level=trail for the pack walk, default = swimming hole.
const level = new URLSearchParams(location.search).get('level') || 'swimhole';
const levels = {
  swimhole: () => import('./levels/swimhole.js'),
  trail: () => import('./levels/trail.js'),
  bluff: () => import('./levels/bluff.js'),
  creek: () => import('./levels/creek.js'),
  river: () => import('./levels/river.js'),
  station: () => import('./levels/station.js'),
};
(levels[level] || levels.swimhole)();
