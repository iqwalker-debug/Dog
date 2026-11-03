// Level loader: ?level=trail for the pack walk, default = swimming hole.
const level = new URLSearchParams(location.search).get('level') || 'swimhole';
const levels = {
  swimhole: () => import('./levels/swimhole.js'),
  trail: () => import('./levels/trail.js'),
};
(levels[level] || levels.swimhole)();
