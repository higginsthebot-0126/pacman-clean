import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { parseMap, MAP1 } from './map.js';
import { World } from './world.js';

export class Game {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;

    this.input = new Input();
    this.renderer = new Renderer(canvas);

    this.parsed = parseMap(MAP1);
    this.world = new World(this.parsed);

    this.lastT = 0;
    this.acc = 0;
    this.running = true;

    this.fixedDt = 1 / 60;

    this.updateHud();
  }

  restartAll() {
    this.parsed = parseMap(MAP1);
    this.world = new World(this.parsed);
    this.updateHud();
  }

  tick = (t) => {
    if (!this.running) return;
    const now = t / 1000;
    if (!this.lastT) this.lastT = now;
    let dt = now - this.lastT;
    this.lastT = now;

    // clamp to avoid spiral of death
    dt = Math.min(dt, 0.05);
    this.acc += dt;

    if (this.input.consumeRestart()) {
      this.restartAll();
    }
    if (this.input.consumePause()) {
      this.world.state = (this.world.state === 'paused') ? 'playing' : 'paused';
    }

    while (this.acc >= this.fixedDt) {
      const desired = this.input.desiredDir;
      if (this.world.state !== 'paused') {
        this.world.update(this.fixedDt, desired);
      }

      if (this.world.needsMapReset) {
        this.world.resetLevel(this.parsed);
      }

      this.acc -= this.fixedDt;
    }

    this.render();
    requestAnimationFrame(this.tick);
  };

  start() {
    requestAnimationFrame(this.tick);
  }

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
