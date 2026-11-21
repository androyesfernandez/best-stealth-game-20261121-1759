// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between seven screens: title, play, paused, caught, level
// clear, win and game over.
//
// ?seed=N fixes the staging. ?shot=cover|patrol|alarm|clear (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { STEP, BEST_KEY, VIEW_W, VIEW_H } from './config.js';
import { createRandom } from './random.js';
import { createGame, stepGame, makeSnapshot, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED } from './state.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM } from './input.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
const audio = createAudio();
const random = createRandom(seed);
void random;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

const game = createGame(seed, audio, readBest());

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    drawGame(ctx, game, makeSnapshot(game));
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  void scene;
}

function runGame() {
  const input = createInput(canvas);
  let lastScreen = game.screen;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    audio.unlock();
    const frameInput = {
      direction: input.direction(),
      sneak: input.isSneaking(),
      clicks: input.takeClicks(),
      actions: input.takeActions(),
    };
    if (frameInput.actions & ACTION_CONFIRM) audio.unlock();
    while (accumulator >= STEP) {
      stepGame(game, frameInput, STEP);
      frameInput.actions = 0;
      frameInput.clicks = [];
      accumulator -= STEP;
    }
    if (game.screen !== lastScreen) {
      if (game.screen === SCREEN_PLAY) announce(`Playing ${game.level.name}.`);
      else if (game.screen === SCREEN_PAUSED) announce('Paused.');
      else if (game.screen === SCREEN_TITLE) announce('Velvet Shadow. Press Space or click to start.');
      lastScreen = game.screen;
    }
    drawGame(ctx, game, makeSnapshot(game));
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === SCREEN_PLAY) {
      game.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Velvet Shadow. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
