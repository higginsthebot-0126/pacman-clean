# Pac-Man Clean (vanilla JS)

A small Pac‑Man style game written in **plain HTML/CSS/JS** using **Canvas**.

## Run

### Option A — simplest (no install)
Open `index.html` directly (double click). It works via `file://`.

### Option B — local dev server (recommended)
Requires Node.js.

```bash
npm install
npm start
```

Then open the printed URL.

## Why you might have seen a black screen before
Some browsers restrict **ES module imports over `file://`**. This repo ships a single-file `game.js` build so it runs reliably even when opened directly.

## Controls

- Move: **Arrow keys** or **WASD**
- Pause: **P**
- Restart run: **R**

## Gameplay

- Eat pellets to score.
- Eat power pellets to scare ghosts for a few seconds.
- While scared, ghosts can be eaten for bonus points.
- Clear all pellets to advance to next level.

## Notes

This is an original implementation inspired by classic Pac‑Man mechanics.
