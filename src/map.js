import { GRID_W, GRID_H, TILE_ID } from './constants.js';

// Simple ASCII map. 28x36.
// Legend:
//  # wall
//  . pellet
//  o power pellet
//    empty
//  - ghost door (player blocked)

export const MAP1 = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##          ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## #      # ##.######",
  "      .   #      #   .      ",
  "######.## #      # ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##.......  .......##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
  "                            ",
  "                            ",
  "                            ",
  "                            ",
  "                            ",
];

export function parseMap(lines) {
  if (lines.length !== GRID_H) throw new Error(`Map height must be ${GRID_H}`);
  const grid = [];
  let pellets = 0;
  for (let y = 0; y < GRID_H; y++) {
    const row = lines[y];
    if (row.length !== GRID_W) throw new Error(`Map width must be ${GRID_W}`);
    const arr = row.split('');
    for (let x = 0; x < GRID_W; x++) {
      const c = arr[x];
      if (c === TILE_ID.PELLET || c === TILE_ID.POWER) pellets++;
      // normalize unknown chars
      if (![TILE_ID.WALL, TILE_ID.EMPTY, TILE_ID.PELLET, TILE_ID.POWER, TILE_ID.DOOR, '-'].includes(c)) {
        arr[x] = TILE_ID.EMPTY;
      }
    }
    grid.push(arr);
  }
  return { grid, pellets };
}

export function isWall(tile) {
  return tile === TILE_ID.WALL;
}

export function isDoor(tile) {
  return tile === TILE_ID.DOOR;
}
