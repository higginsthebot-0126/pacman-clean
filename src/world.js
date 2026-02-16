import { DIR, DIRS, GRID_W, GRID_H, TILE_ID, GAME, clamp } from './constants.js';

function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export class World {
  constructor(parsedMap) {
    this.baseMapLines = null;
    this.resetFromParsed(parsedMap);
  }

  resetFromParsed(parsedMap) {
    // Deep copy grid
    this.grid = parsedMap.grid.map(r => r.slice());
    this.pelletsLeft = parsedMap.pellets;

    this.score = 0;
    this.level = 1;
    this.lives = 3;

    this.state = 'ready'; // ready|playing|dead|levelclear|gameover|paused
    this.stateTimer = 0;

    this.frightTimer = 0;
    this.needsMapReset = false;

    // Spawn positions (tile coords) tuned for MAP1
    this.player = {
      x: 14, y: 23,
      dir: DIR.LEFT,
      nextDir: DIR.LEFT,
      speed: GAME.PLAYER_SPEED,
      anim: 0,
    };

    this.ghostHome = { x: 14, y: 14 };

    this.ghosts = [
      makeGhost('blinky', '#ff3b30', 14, 14, DIR.LEFT, { bias: 'direct', scatter: { x: 25, y: 1 } }),
      makeGhost('pinky',  '#ff4fd8', 13, 14, DIR.RIGHT, { bias: 'ahead', scatter: { x: 2, y: 1 } }),
      makeGhost('inky',   '#34c759', 14, 15, DIR.LEFT, { bias: 'random', scatter: { x: 25, y: 34 } }),
      makeGhost('clyde',  '#ff9500', 15, 15, DIR.RIGHT, { bias: 'shy', scatter: { x: 2, y: 34 } }),
    ];
  }

  resetLevel(parsedMap) {
    this.grid = parsedMap.grid.map(r => r.slice());
    this.pelletsLeft = parsedMap.pellets;
    this.frightTimer = 0;
    this.needsMapReset = false;
    this.state = 'ready';
    this.stateTimer = 0;

    this.player.x = 14; this.player.y = 23;
    this.player.dir = DIR.LEFT;
    this.player.nextDir = DIR.LEFT;

    const starts = [
      { x: 14, y: 14, dir: DIR.LEFT },
      { x: 13, y: 14, dir: DIR.RIGHT },
      { x: 14, y: 15, dir: DIR.LEFT },
      { x: 15, y: 15, dir: DIR.RIGHT },
    ];
    this.ghosts.forEach((g, i) => {
      g.x = starts[i].x; g.y = starts[i].y; g.dir = starts[i].dir;
      g.mode = 'chase'; g.deadTimer = 0;
    });
  }

  tileAt(x, y) {
    // wrap tunnel horizontally on row 14 (classic)
    if (y === 14) {
      if (x < 0) x = GRID_W - 1;
      if (x >= GRID_W) x = 0;
    }
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return TILE_ID.WALL;
    return this.grid[y][x];
  }

  canEnter(x, y, who) {
    const t = this.tileAt(x, y);
    if (t === TILE_ID.WALL) return false;
    if (t === TILE_ID.DOOR && who === 'player') return false;
    return true;
  }

  isCentered(ent) {
    const fx = ent.x - Math.floor(ent.x);
    const fy = ent.y - Math.floor(ent.y);
    const dx = Math.abs(fx - 0.5);
    const dy = Math.abs(fy - 0.5);
    return (dx < GAME.TURN_EPS) && (dy < GAME.TURN_EPS);
  }

  snapToCenter(ent) {
    ent.x = Math.floor(ent.x) + 0.5;
    ent.y = Math.floor(ent.y) + 0.5;
  }

  update(dt, inputDesiredDir) {
    // state machine
    if (this.state === 'paused') {
      // still animate a tiny bit? no.
      return;
    }

    if (this.state === 'ready') {
      this.stateTimer += dt;
      if (this.stateTimer > 0.8) {
        this.state = 'playing';
        this.stateTimer = 0;
      }
      return;
    }

    if (this.state === 'dead') {
      this.stateTimer += dt;
      if (this.stateTimer > GAME.RESPAWN_TIME) {
        if (this.lives <= 0) {
          this.state = 'gameover';
        } else {
          // soft reset entities, keep pellets
          this.state = 'ready';
          this.stateTimer = 0;
          this.player.x = 14; this.player.y = 23;
          this.player.dir = DIR.LEFT;
          this.player.nextDir = DIR.LEFT;
          const starts = [
            { x: 14, y: 14, dir: DIR.LEFT },
            { x: 13, y: 14, dir: DIR.RIGHT },
            { x: 14, y: 15, dir: DIR.LEFT },
            { x: 15, y: 15, dir: DIR.RIGHT },
          ];
          this.ghosts.forEach((g, i) => {
            g.x = starts[i].x; g.y = starts[i].y; g.dir = starts[i].dir;
            g.mode = 'chase'; g.deadTimer = 0;
          });
          this.frightTimer = 0;
        }
      }
      return;
    }

    if (this.state === 'levelclear') {
      this.stateTimer += dt;
      if (this.stateTimer > 1.0) {
        this.level++;
        this.stateTimer = 0;
        this.state = 'ready';
        this.needsMapReset = true;
      }
      return;
    }

    if (this.state === 'gameover') {
      return;
    }

    // playing
    if (this.frightTimer > 0) {
      this.frightTimer = Math.max(0, this.frightTimer - dt);
      if (this.frightTimer === 0) {
        this.ghosts.forEach(g => { if (g.mode === 'frightened') g.mode = 'chase'; });
      }
    }

    this.player.anim += dt;

    // buffered input
    if (inputDesiredDir) this.player.nextDir = inputDesiredDir;

    this.moveEntity(this.player, dt, 'player');
    this.consumePellet();

    // ghosts
    for (const g of this.ghosts) {
      this.updateGhost(g, dt);
      this.moveEntity(g, dt, 'ghost');
    }

    this.checkCollisions();

    if (this.pelletsLeft <= 0) {
      this.state = 'levelclear';
      this.stateTimer = 0;
    }
  }

  moveEntity(ent, dt, who) {
    // turning at tile centers
    if (this.isCentered(ent)) {
      this.snapToCenter(ent);
      if (who === 'player') {
        if (ent.nextDir !== DIR.NONE && this.canEnter(Math.floor(ent.x + ent.nextDir.x), Math.floor(ent.y + ent.nextDir.y), 'player')) {
          ent.dir = ent.nextDir;
        }
      }

      // If current dir blocked, stop
      const nx = Math.floor(ent.x + ent.dir.x);
      const ny = Math.floor(ent.y + ent.dir.y);
      if (!this.canEnter(nx, ny, who === 'player' ? 'player' : 'ghost')) {
        ent.dir = DIR.NONE;
      }
    }

    const speed = ent.speed;
    ent.x += ent.dir.x * speed * dt;
    ent.y += ent.dir.y * speed * dt;

    // tunnel wrap
    if (Math.floor(ent.y) === 14) {
      if (ent.x < -0.5) ent.x = GRID_W - 0.5;
      if (ent.x > GRID_W - 0.5) ent.x = -0.5;
    }

    ent.x = clamp(ent.x, -1, GRID_W + 1);
    ent.y = clamp(ent.y, -1, GRID_H + 1);
  }

  consumePellet() {
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    const t = this.tileAt(px, py);
    if (t === TILE_ID.PELLET) {
      this.grid[py][px] = TILE_ID.EMPTY;
      this.pelletsLeft--;
      this.score += 10;
    } else if (t === TILE_ID.POWER) {
      this.grid[py][px] = TILE_ID.EMPTY;
      this.pelletsLeft--;
      this.score += 50;
      this.startFrightened();
    }
  }

  startFrightened() {
    this.frightTimer = GAME.POWER_TIME;
    for (const g of this.ghosts) {
      if (g.mode !== 'eaten') {
        g.mode = 'frightened';
      }
    }
  }

  checkCollisions() {
    const p = this.player;
    for (const g of this.ghosts) {
      const d = dist2(p.x, p.y, g.x, g.y);
      if (d < 0.40 * 0.40) {
        if (g.mode === 'frightened') {
          g.mode = 'eaten';
          g.deadTimer = 0;
          this.score += 200;
        } else if (g.mode !== 'eaten') {
          // player dies
          this.lives--;
          this.state = 'dead';
          this.stateTimer = 0;
          return;
        }
      }
    }
  }

  updateGhost(g, dt) {
    // adjust speed per mode
    if (g.mode === 'frightened') g.speed = GAME.FRIGHT_SPEED;
    else if (g.mode === 'eaten') g.speed = GAME.EATEN_SPEED;
    else g.speed = GAME.GHOST_SPEED;

    // Choose direction only when centered
    if (!this.isCentered(g)) return;
    this.snapToCenter(g);

    // determine target
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);

    let tx = px, ty = py;

    if (g.mode === 'eaten') {
      tx = this.ghostHome.x;
      ty = this.ghostHome.y;
      // when home, revive
      if (Math.floor(g.x) === tx && Math.floor(g.y) === ty) {
        g.mode = (this.frightTimer > 0) ? 'frightened' : 'chase';
      }
    } else if (g.mode === 'frightened') {
      // run away: target opposite side from player
      tx = clamp((GRID_W - 1) - px, 0, GRID_W - 1);
      ty = clamp((GRID_H - 1) - py, 0, GRID_H - 1);
      // add randomness
      if (Math.random() < 0.25) {
        tx = Math.floor(Math.random() * GRID_W);
        ty = Math.floor(Math.random() * GRID_H);
      }
    } else {
      // chase personalities
      if (g.personality.bias === 'ahead') {
        tx = clamp(px + this.player.dir.x * 4, 0, GRID_W - 1);
        ty = clamp(py + this.player.dir.y * 4, 0, GRID_H - 1);
      } else if (g.personality.bias === 'shy') {
        const close = dist2(g.x, g.y, this.player.x, this.player.y) < 7 * 7;
        if (close) { tx = g.personality.scatter.x; ty = g.personality.scatter.y; }
      } else if (g.personality.bias === 'random') {
        if (Math.random() < 0.15) {
          tx = Math.floor(Math.random() * GRID_W);
          ty = Math.floor(Math.random() * GRID_H);
        }
      }
    }

    // available dirs (no reverse unless forced)
    const options = [];
    for (const d of DIRS) {
      const nx = Math.floor(g.x + d.x);
      const ny = Math.floor(g.y + d.y);
      if (!this.canEnter(nx, ny, 'ghost')) continue;
      // avoid reversal
      if (g.dir !== DIR.NONE && d.x === -g.dir.x && d.y === -g.dir.y) continue;
      options.push(d);
    }

    if (options.length === 0) {
      // allow reversal if stuck
      for (const d of DIRS) {
        const nx = Math.floor(g.x + d.x);
        const ny = Math.floor(g.y + d.y);
        if (this.canEnter(nx, ny, 'ghost')) options.push(d);
      }
    }

    if (options.length === 0) {
      g.dir = DIR.NONE;
      return;
    }

    // pick best option: minimize distance to target (or maximize if frightened)
    let best = options[0];
    let bestScore = Infinity;
    for (const d of options) {
      const nx = Math.floor(g.x + d.x);
      const ny = Math.floor(g.y + d.y);
      const score = dist2(nx, ny, tx, ty);
      if (score < bestScore) { bestScore = score; best = d; }
    }

    // add personality randomness
    if (g.mode !== 'eaten') {
      const jitter = (g.personality.bias === 'random') ? 0.35 : 0.18;
      if (Math.random() < jitter) {
        best = options[Math.floor(Math.random() * options.length)];
      }
    }

    // frightened should prefer going away; approximate by occasionally choosing worst
    if (g.mode === 'frightened' && Math.random() < 0.45) {
      let worst = options[0];
      let worstScore = -Infinity;
      for (const d of options) {
        const nx = Math.floor(g.x + d.x);
        const ny = Math.floor(g.y + d.y);
        const score = dist2(nx, ny, tx, ty);
        if (score > worstScore) { worstScore = score; worst = d; }
      }
      best = worst;
    }

    g.dir = best;
  }
}

function makeGhost(name, color, x, y, dir, personality) {
  return {
    name,
    color,
    x: x + 0.5,
    y: y + 0.5,
    dir,
    speed: GAME.GHOST_SPEED,
    mode: 'chase',
    deadTimer: 0,
    personality,
  };
}
