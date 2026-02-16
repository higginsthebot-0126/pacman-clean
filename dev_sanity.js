import { parseMap, MAP1 } from './src/map.js';
import { World } from './src/world.js';
import { DIR } from './src/constants.js';

const parsed = parseMap(MAP1);
const w = new World(parsed);

// Run a couple seconds of simulation to catch obvious crashes.
for (let i = 0; i < 60 * 3; i++) {
  const desired = (i % 30 < 10) ? DIR.LEFT : (i % 30 < 20) ? DIR.UP : DIR.RIGHT;
  w.update(1/60, desired);
}

console.log('sanity ok', { score: w.score, pelletsLeft: w.pelletsLeft, lives: w.lives, state: w.state });
