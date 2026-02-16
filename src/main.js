import { Game } from './game.js';

const canvas = document.getElementById('game');
const hud = {
  score: document.getElementById('score'),
  lives: document.getElementById('lives'),
  level: document.getElementById('level'),
  state: document.getElementById('state'),
};

const game = new Game(canvas, hud);
game.start();

// Tiny UX: focus page for keyboard.
window.addEventListener('click', () => window.focus());
