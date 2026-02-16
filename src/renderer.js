import { TILE, GRID_W, GRID_H, TILE_ID } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.logicalW = GRID_W * TILE;
    this.logicalH = GRID_H * TILE;

    // Keep internal resolution crisp.
    canvas.width = this.logicalW;
    canvas.height = this.logicalH;
  }

  clear() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.logicalW, this.logicalH);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.logicalW, this.logicalH);
  }

  drawMap(grid) {
    const { ctx } = this;

    // Walls
    ctx.fillStyle = '#1f4cff';
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const t = grid[y][x];
        if (t === TILE_ID.WALL) {
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    // Pellets
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
    const px = p.x * TILE;
    const py = p.y * TILE;
    const r = TILE * 0.45;
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;

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
    // body (simple)
    roundedRect(ctx, cx - r, cy - r, r * 2, r * 2, 6);
    ctx.fill();

    // eyes
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
