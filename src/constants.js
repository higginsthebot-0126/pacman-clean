export const TILE = 16; // base tile size in pixels (logical)
export const GRID_W = 28;
export const GRID_H = 36;

export const DIR = {
  NONE: { x: 0, y: 0, name: 'NONE' },
  LEFT: { x: -1, y: 0, name: 'LEFT' },
  RIGHT: { x: 1, y: 0, name: 'RIGHT' },
  UP: { x: 0, y: -1, name: 'UP' },
  DOWN: { x: 0, y: 1, name: 'DOWN' },
};

export const DIRS = [DIR.LEFT, DIR.RIGHT, DIR.UP, DIR.DOWN];

export const TILE_ID = {
  WALL: '#',
  EMPTY: ' ',
  PELLET: '.',
  POWER: 'o',
  DOOR: '-', // ghost house door (player cannot pass)
};

export const GAME = {
  FPS: 60,
  PLAYER_SPEED: 6.2,      // tiles per second
  GHOST_SPEED: 5.6,       // tiles per second
  FRIGHT_SPEED: 4.2,      // tiles per second
  EATEN_SPEED: 8.5,       // tiles per second
  TURN_EPS: 0.15,         // how close to tile center to allow turning (in tiles)
  POWER_TIME: 7.0,        // seconds frightened
  RESPAWN_TIME: 1.0,      // delay after death
};

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
