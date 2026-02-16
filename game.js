// Pac-Man Clean (single-file build) — works over file:// (no ES modules required)
(() => {
  'use strict';

  // ===== constants =====
  const TILE = 16;
  const GRID_W = 28;
  const GRID_H = 36;

  const DIR = {
    NONE:  { x: 0,  y: 0,  name: 'NONE' },
    LEFT:  { x: -1, y: 0,  name: 'LEFT' },
    RIGHT: { x: 1,  y: 0,  name: 'RIGHT' },
    UP:    { x: 0,  y: -1, name: 'UP' },
    DOWN:  { x: 0,  y: 1,  name: 'DOWN' },
  };
  const DIRS = [DIR.LEFT, DIR.RIGHT, DIR.UP, DIR.DOWN];

  const TILE_ID = {
    WALL: '#',
    EMPTY: ' ',
    PELLET: '.',
    POWER: 'o',
    DOOR: '-',
  };

  const GAME = {
    PLAYER_SPEED: 6.2,      // tiles per second
    GHOST_SPEED: 5.6,
    FRIGHT_SPEED: 4.2,
    EATEN_SPEED: 8.5,
    TURN_EPS: 0.15,         // tiles
    POWER_TIME: 7.0,
    RESPAWN_TIME: 1.0,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ===== map =====
  const MAP1 = [
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

  function parseMap(lines) {
    if (lines.length !== GRID_H) throw new Error(`Map height must be ${GRID_H}`);
    const grid = [];
    let pellets = 0;
    for (let y = 0; y < GRID_H; y++) {
      const row = lines[y];
      if (row.length !== GRID_W) throw new Error(`Map width must be ${GRID_W} (row ${y} is ${row.length})`);
      const arr = row.split('');
      for (let x = 0; x < GRID_W; x++) {
        const c = arr[x];
        if (c === TILE_ID.PELLET || c === TILE_ID.POWER) pellets++;
        if (![TILE_ID.WALL, TILE_ID.EMPTY, TILE_ID.PELLET, TILE_ID.POWER, TILE_ID.DOOR].includes(c)) {
          arr[x] = TILE_ID.EMPTY;
        }
      }
      grid.push(arr);
    }
    return { grid, pellets };
  }

  // ===== input =====
  const keyToDir = {
    ArrowLeft: DIR.LEFT,
    ArrowRight: DIR.RIGHT,
    ArrowUp: DIR.UP,
    ArrowDown: DIR.DOWN,
    a: DIR.LEFT,
    d: DIR.RIGHT,
    w: DIR.UP,
    s: DIR.DOWN,
    A: DIR.LEFT,
    D: DIR.RIGHT,
    W: DIR.UP,
    S: DIR.DOWN,
  };

  class Input {
    constructor() {
      this.desiredDir = DIR.NONE;
      this.pausePressed = false;
      this.restartPressed = false;

      window.addEventListener('keydown', (e) => {
        const d = keyToDir[e.key];
        if (d) {
          this.desiredDir = d;
          e.preventDefault();
          return;
        }
        if (e.key === 'p' || e.key === 'P') this.pausePressed = true;
        if (e.key === 'r' || e.key === 'R') this.restartPressed = true;
      }, { passive: false });
    }

    consumePause() { const v = this.pausePressed; this.pausePressed = false; return v; }
    consumeRestart() { const v = this.restartPressed; this.restartPressed = false; return v; }
  }

  // ===== renderer =====
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.logicalW = GRID_W * TILE;
      this.logicalH = GRID_H * TILE;
      canvas.width = this.logicalW;
      canvas.height = this.logicalH;
      this.ctx.imageSmoothingEnabled = false;
    }

    clear() {
      const { ctx } = this;
      ctx.clearRect(0, 0, this.logicalW, this.logicalH);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.logicalW, this.logicalH);
    }

    drawMap(grid) {
      const { ctx } = this;
      ctx.fillStyle = '#1f4cff';
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const t = grid[y][x];
          if (t === TILE_ID.WALL) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const t = grid[y][x];
          const cx = x * TILE + TILE / 2;
          const cy = y * TILE + TILE / 2;
          if (t === TILE_ID.PELLET) {
            ctx.fillStyle = '#ffd79a';
            circle(ctx, cx, cy, 2.2);
          } else if (t === TILE_ID.POWER) {
            ctx.fillStyle = '#fff2cc';
            circle(ctx, cx, cy, 5.2);
          }
        }
      }
    }

    drawPlayer(p) {
      const { ctx } = this;
      const r = TILE * 0.45;
      const cx = p.x * TILE + TILE / 2;
      const cy = p.y * TILE + TILE / 2;

      const mouth = 0.35 + 0.15 * Math.sin(p.anim * 10);
      let ang = 0;
      if (p.dir.name === 'RIGHT') ang = 0;
      if (p.dir.name === 'LEFT') ang = Math.PI;
      if (p.dir.name === 'UP') ang = -Math.PI / 2;
      if (p.dir.name === 'DOWN') ang = Math.PI / 2;

      ctx.fillStyle = '#ffe65c';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, ang + mouth, ang + (Math.PI * 2 - mouth));
      ctx.closePath();
      ctx.fill();
    }

    drawGhost(g) {
      const { ctx } = this;
      const cx = g.x * TILE + TILE / 2;
      const cy = g.y * TILE + TILE / 2;
      const r = TILE * 0.45;

      let body = g.color;
      if (g.mode === 'frightened') body = '#2b6cff';
      if (g.mode === 'eaten') body = '#111';

      ctx.fillStyle = body;
      roundedRect(ctx, cx - r, cy - r, r * 2, r * 2, 6);
      ctx.fill();

      if (g.mode !== 'eaten') {
        ctx.fillStyle = '#fff';
        circle(ctx, cx - 4, cy - 2, 3);
        circle(ctx, cx + 4, cy - 2, 3);
        ctx.fillStyle = '#111';
        circle(ctx, cx - 4 + g.dir.x * 1.2, cy - 2 + g.dir.y * 1.2, 1.5);
        circle(ctx, cx + 4 + g.dir.x * 1.2, cy - 2 + g.dir.y * 1.2, 1.5);
      } else {
        ctx.fillStyle = '#fff';
        circle(ctx, cx - 4, cy - 2, 2);
        circle(ctx, cx + 4, cy - 2, 2);
      }
    }

    drawOverlay(text) {
      const { ctx } = this;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, this.logicalW, this.logicalH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, this.logicalW / 2, this.logicalH / 2);
    }
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  // ===== world (logic) =====
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  function makeGhost(name, color, x, y, dir, personality) {
    return {
      name,
      color,
      x: x + 0.5,
      y: y + 0.5,
      dir,
      speed: GAME.GHOST_SPEED,
      mode: 'chase',
      personality,
    };
  }

  class World {
    constructor(parsed) {
      this.resetFromParsed(parsed);
    }

    resetFromParsed(parsed) {
      this.grid = parsed.grid.map(r => r.slice());
      this.pelletsLeft = parsed.pellets;
      this.score = 0;
      this.level = 1;
      this.lives = 3;

      this.state = 'ready';
      this.stateTimer = 0;
      this.frightTimer = 0;
      this.needsMapReset = false;

      this.player = {
        x: 14.5, y: 23.5,
        dir: DIR.LEFT,
        nextDir: DIR.LEFT,
        speed: GAME.PLAYER_SPEED,
        anim: 0,
      };

      this.ghostHome = { x: 14, y: 14 };
      this.ghosts = [
        makeGhost('blinky', '#ff3b30', 14, 14, DIR.LEFT,  { bias: 'direct', scatter: { x: 25, y: 1 } }),
        makeGhost('pinky',  '#ff4fd8', 13, 14, DIR.RIGHT, { bias: 'ahead',  scatter: { x: 2,  y: 1 } }),
        makeGhost('inky',   '#34c759', 14, 15, DIR.LEFT,  { bias: 'random', scatter: { x: 25, y: 34 } }),
        makeGhost('clyde',  '#ff9500', 15, 15, DIR.RIGHT, { bias: 'shy',    scatter: { x: 2,  y: 34 } }),
      ];
    }

    resetLevel(parsed) {
      this.grid = parsed.grid.map(r => r.slice());
      this.pelletsLeft = parsed.pellets;
      this.frightTimer = 0;
      this.needsMapReset = false;
      this.state = 'ready';
      this.stateTimer = 0;

      this.player.x = 14.5; this.player.y = 23.5;
      this.player.dir = DIR.LEFT;
      this.player.nextDir = DIR.LEFT;

      const starts = [
        { x: 14, y: 14, dir: DIR.LEFT },
        { x: 13, y: 14, dir: DIR.RIGHT },
        { x: 14, y: 15, dir: DIR.LEFT },
        { x: 15, y: 15, dir: DIR.RIGHT },
      ];
      this.ghosts.forEach((g, i) => {
        g.x = starts[i].x + 0.5;
        g.y = starts[i].y + 0.5;
        g.dir = starts[i].dir;
        g.mode = 'chase';
      });
    }

    tileAt(x, y) {
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
      return (Math.abs(fx - 0.5) < GAME.TURN_EPS) && (Math.abs(fy - 0.5) < GAME.TURN_EPS);
    }

    snapToCenter(ent) {
      ent.x = Math.floor(ent.x) + 0.5;
      ent.y = Math.floor(ent.y) + 0.5;
    }

    update(dt, inputDesiredDir) {
      if (this.state === 'paused') return;

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
            this.state = 'ready';
            this.stateTimer = 0;
            this.player.x = 14.5; this.player.y = 23.5;
            this.player.dir = DIR.LEFT;
            this.player.nextDir = DIR.LEFT;
            const starts = [
              { x: 14, y: 14, dir: DIR.LEFT },
              { x: 13, y: 14, dir: DIR.RIGHT },
              { x: 14, y: 15, dir: DIR.LEFT },
              { x: 15, y: 15, dir: DIR.RIGHT },
            ];
            this.ghosts.forEach((g, i) => {
              g.x = starts[i].x + 0.5;
              g.y = starts[i].y + 0.5;
              g.dir = starts[i].dir;
              g.mode = 'chase';
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

      if (this.state === 'gameover') return;

      // playing
      if (this.frightTimer > 0) {
        this.frightTimer = Math.max(0, this.frightTimer - dt);
        if (this.frightTimer === 0) {
          this.ghosts.forEach(g => { if (g.mode === 'frightened') g.mode = 'chase'; });
        }
      }

      this.player.anim += dt;
      if (inputDesiredDir) this.player.nextDir = inputDesiredDir;

      this.moveEntity(this.player, dt, 'player');
      this.consumePellet();

      for (const g of this.ghosts) {
        this.updateGhost(g);
        this.moveEntity(g, dt, 'ghost');
      }

      this.checkCollisions();

      if (this.pelletsLeft <= 0) {
        this.state = 'levelclear';
        this.stateTimer = 0;
      }
    }

    moveEntity(ent, dt, who) {
      // Decide turns only near tile centers.
      if (this.isCentered(ent)) {
        this.snapToCenter(ent);

        if (who === 'player') {
          if (ent.nextDir !== DIR.NONE && this.canEnter(Math.floor(ent.x + ent.nextDir.x), Math.floor(ent.y + ent.nextDir.y), 'player')) {
            ent.dir = ent.nextDir;
          }
        }

        const nx = Math.floor(ent.x + ent.dir.x);
        const ny = Math.floor(ent.y + ent.dir.y);
        if (!this.canEnter(nx, ny, who === 'player' ? 'player' : 'ghost')) {
          ent.dir = DIR.NONE;
        }
      }

      // Move + hard collision correction (prevents drifting through walls).
      const ox = ent.x, oy = ent.y;
      ent.x += ent.dir.x * ent.speed * dt;
      ent.y += ent.dir.y * ent.speed * dt;

      // tunnel wrap
      if (Math.floor(ent.y) === 14) {
        if (ent.x < -0.5) ent.x = GRID_W - 0.5;
        if (ent.x > GRID_W - 0.5) ent.x = -0.5;
      }

      // If we ended up inside a blocked tile, revert.
      const tx = Math.floor(ent.x);
      const ty = Math.floor(ent.y);
      const ok = this.canEnter(tx, ty, who === 'player' ? 'player' : 'ghost');
      if (!ok) {
        ent.x = ox;
        ent.y = oy;
        ent.dir = DIR.NONE;
        if (who === 'player') this.snapToCenter(ent); // keep player aligned
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
      for (const g of this.ghosts) if (g.mode !== 'eaten') g.mode = 'frightened';
    }

    checkCollisions() {
      const p = this.player;
      for (const g of this.ghosts) {
        const d = dist2(p.x, p.y, g.x, g.y);
        if (d < 0.40 * 0.40) {
          if (g.mode === 'frightened') {
            g.mode = 'eaten';
            this.score += 200;
          } else if (g.mode !== 'eaten') {
            this.lives--;
            this.state = 'dead';
            this.stateTimer = 0;
            return;
          }
        }
      }
    }

    updateGhost(g) {
      if (g.mode === 'frightened') g.speed = GAME.FRIGHT_SPEED;
      else if (g.mode === 'eaten') g.speed = GAME.EATEN_SPEED;
      else g.speed = GAME.GHOST_SPEED;

      if (!this.isCentered(g)) return;
      this.snapToCenter(g);

      const px = Math.floor(this.player.x);
      const py = Math.floor(this.player.y);

      let tx = px, ty = py;

      if (g.mode === 'eaten') {
        tx = this.ghostHome.x;
        ty = this.ghostHome.y;
        if (Math.floor(g.x) === tx && Math.floor(g.y) === ty) {
          g.mode = (this.frightTimer > 0) ? 'frightened' : 'chase';
        }
      } else if (g.mode === 'frightened') {
        tx = clamp((GRID_W - 1) - px, 0, GRID_W - 1);
        ty = clamp((GRID_H - 1) - py, 0, GRID_H - 1);
        if (Math.random() < 0.25) {
          tx = Math.floor(Math.random() * GRID_W);
          ty = Math.floor(Math.random() * GRID_H);
        }
      } else {
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

      const options = [];
      for (const d of DIRS) {
        const nx = Math.floor(g.x + d.x);
        const ny = Math.floor(g.y + d.y);
        if (!this.canEnter(nx, ny, 'ghost')) continue;
        if (g.dir !== DIR.NONE && d.x === -g.dir.x && d.y === -g.dir.y) continue;
        options.push(d);
      }

      if (options.length === 0) {
        for (const d of DIRS) {
          const nx = Math.floor(g.x + d.x);
          const ny = Math.floor(g.y + d.y);
          if (this.canEnter(nx, ny, 'ghost')) options.push(d);
        }
      }

      if (options.length === 0) { g.dir = DIR.NONE; return; }

      let best = options[0];
      let bestScore = Infinity;
      for (const d of options) {
        const nx = Math.floor(g.x + d.x);
        const ny = Math.floor(g.y + d.y);
        const score = dist2(nx, ny, tx, ty);
        if (score < bestScore) { bestScore = score; best = d; }
      }

      if (g.mode !== 'eaten') {
        const jitter = (g.personality.bias === 'random') ? 0.35 : 0.18;
        if (Math.random() < jitter) best = options[Math.floor(Math.random() * options.length)];
      }

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

  // ===== game orchestration =====
  class GameApp {
    constructor(canvas, hud) {
      this.canvas = canvas;
      this.hud = hud;
      this.input = new Input();
      this.renderer = new Renderer(canvas);
      this.parsed = parseMap(MAP1);
      this.world = new World(this.parsed);
      this.lastT = 0;
      this.acc = 0;
      this.fixedDt = 1 / 60;
      this.running = true;
    }

    restartAll() {
      this.parsed = parseMap(MAP1);
      this.world = new World(this.parsed);
    }

    start() {
      requestAnimationFrame(this.tick);
    }

    tick = (t) => {
      if (!this.running) return;
      const now = t / 1000;
      if (!this.lastT) this.lastT = now;
      let dt = now - this.lastT;
      this.lastT = now;
      dt = Math.min(dt, 0.05);
      this.acc += dt;

      if (this.input.consumeRestart()) this.restartAll();
      if (this.input.consumePause()) {
        this.world.state = (this.world.state === 'paused') ? 'playing' : 'paused';
      }

      while (this.acc >= this.fixedDt) {
        if (this.world.state !== 'paused') {
          this.world.update(this.fixedDt, this.input.desiredDir);
        }
        if (this.world.needsMapReset) this.world.resetLevel(this.parsed);
        this.acc -= this.fixedDt;
      }

      this.render();
      requestAnimationFrame(this.tick);
    };

    updateHud() {
      this.hud.score.textContent = String(this.world.score);
      this.hud.lives.textContent = String(this.world.lives);
      this.hud.level.textContent = String(this.world.level);

      let state = this.world.state;
      if (state === 'playing') state = (this.world.frightTimer > 0) ? `Power ${this.world.frightTimer.toFixed(0)}s` : 'Playing';
      if (state === 'ready') state = 'Ready';
      if (state === 'dead') state = 'Ouch';
      if (state === 'gameover') state = 'Game Over';
      if (state === 'paused') state = 'Paused';
      if (state === 'levelclear') state = 'Level clear';
      this.hud.state.textContent = state;
    }

    render() {
      this.updateHud();
      const r = this.renderer;
      const w = this.world;
      r.clear();
      r.drawMap(w.grid);
      r.drawPlayer(w.player);
      for (const g of w.ghosts) r.drawGhost(g);
      if (w.state === 'paused') r.drawOverlay('Paused');
      if (w.state === 'gameover') r.drawOverlay('Game Over (R to restart)');
    }
  }

  // ===== bootstrap =====
  function boot() {
    const canvas = document.getElementById('game');
    const hud = {
      score: document.getElementById('score'),
      lives: document.getElementById('lives'),
      level: document.getElementById('level'),
      state: document.getElementById('state'),
    };

    const app = new GameApp(canvas, hud);
    app.start();

    // Ensure keyboard works even if the page didn't grab focus yet.
    try { canvas.focus(); } catch {}
    window.addEventListener('click', () => {
      try { canvas.focus(); } catch {}
      window.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
