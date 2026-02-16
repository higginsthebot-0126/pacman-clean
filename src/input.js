import { DIR } from './constants.js';

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

export class Input {
  constructor() {
    this.desiredDir = DIR.NONE; // buffered
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

  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  consumeRestart() {
    const v = this.restartPressed;
    this.restartPressed = false;
    return v;
  }
}
