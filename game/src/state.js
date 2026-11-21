// The game itself: screens, levels, scoring, lives, pebbles, and one fixed step.
// The main loop and the screenshot stager both drive it through stepGame with a plain
// frame-input object, so a staged screenshot is the real game played forward.
import { TILE, PLAY_Y, STEP, BEST_KEY } from './config.js';
import { LEVELS, findTile, findRelics } from './level.js';
import { createPlayer, updatePlayer, playerTile } from './player.js';
import { createGuard, updateGuard, highestSuspicion, pebbleNoise, relicNoise } from './guards.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE } from './input.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_LEVEL_CLEAR, SCREEN_WIN, SCREEN_GAME_OVER } from './render.js';

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_LEVEL_CLEAR, SCREEN_WIN, SCREEN_GAME_OVER };

/** A fresh game: title screen over the first gallery, three lives, no score yet. */
export function createGame(seed, audio, best) {
  const game = {
    seed,
    audio,
    screen: SCREEN_TITLE,
    levelIndex: 0,
    level: LEVELS[0],
    exitTile: findTile(LEVELS[0], 'E'),
    player: null,
    guards: [],
    relics: [],
    relicsTotal: 0,
    relicsTakenThisLevel: 0,
    score: 0,
    lives: 3,
    pebbles: LEVELS[0].pebbles,
    pebble: null,
    time: 0,
    levelTime: 0,
    message: null,
    messageAlpha: 0,
    messageLeft: 0,
    caughtBy: '',
    lastBonus: 0,
    best: best || 0,
    muted: false,
    pendingNoises: [],
  };
  loadLevel(game, 0);
  return game;
}

/** Set a level up from scratch: player at the start, guards on patrol, relics in place. */
export function loadLevel(game, index) {
  game.levelIndex = index;
  game.level = LEVELS[index];
  game.exitTile = findTile(game.level, 'E');
  game.level.exitTile = game.exitTile;
  game.player = createPlayer(findTile(game.level, 'P'));
  game.guards = game.level.guards.map((def, i) => createGuard(def, i));
  game.relics = findRelics(game.level);
  game.relicsTotal = game.relics.length;
  game.relicsTakenThisLevel = 0;
  game.pebbles = game.level.pebbles;
  game.pebble = null;
  game.levelTime = 0;
  game.pendingNoises = [];
}

/** Show a banner for `seconds` (the HUD fades it out). */
export function showMessage(game, text, sub, colour, seconds = 2.6) {
  game.message = { text, sub: sub || '', colour: colour || '#ffd76a' };
  game.messageAlpha = 1;
  game.messageLeft = seconds;
}

/** What the HUD reads: one plain object, no game internals. */
export function makeSnapshot(game) {
  return {
    levelName: game.level.name,
    levelSubtitle: game.level.subtitle,
    relicsTaken: game.relicsTakenThisLevel,
    relicsTotal: game.relicsTotal,
    pebbles: game.pebbles,
    lives: game.lives,
    time: game.time,
    score: game.score,
    best: Math.max(game.best, game.score),
    detection: Math.round(highestSuspicion(game.guards)),
  };
}

function saveBest(game) {
  if (game.score <= game.best) return;
  game.best = game.score;
  try {
    window.localStorage.setItem(BEST_KEY, String(game.best));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function startLevel(game) {
  loadLevel(game, game.levelIndex);
  game.screen = SCREEN_PLAY;
  showMessage(game, game.level.name, game.level.subtitle, '#e8d9a0', 2.6);
}

function throwPebble(game, click) {
  if (game.pebbles <= 0 || game.pebble) return;
  const x = Math.max(20, Math.min(1260, click.x));
  const y = Math.max(PLAY_Y + 20, Math.min(PLAY_Y + 620, click.y));
  const dx = x - game.player.x;
  const dy = y - game.player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 30) return;
  game.pebbles -= 1;
  game.pebble = {
    x0: game.player.x,
    y0: game.player.y,
    x1: x,
    y1: y,
    t: 0,
    duration: Math.max(0.25, distance / 650),
  };
  game.audio.pebbleThrow();
}

function clearLevel(game) {
  const timeBonus = Math.max(0, 400 - Math.floor(game.levelTime * 5));
  const relicBonus = game.relicsTakenThisLevel * 250;
  game.lastBonus = timeBonus;
  game.score += 500 + timeBonus;
  saveBest(game);
  game.audio.levelClear();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = SCREEN_WIN;
    game.audio.winFanfare();
  } else {
    game.screen = SCREEN_LEVEL_CLEAR;
  }
}

function getCaught(game, guard) {
  game.lives -= 1;
  game.caughtBy = guard.name;
  game.audio.caughtSting();
  saveBest(game);
  game.screen = game.lives <= 0 ? SCREEN_GAME_OVER : SCREEN_CAUGHT;
}

/**
 * One fixed step. `frame` is { direction: {x, y}, sneak: bool, clicks: [{x, y}],
 * actions: bitmask } — the same shape the real keyboard/mouse builds and the
 * screenshot autopilot builds, so both play the same game.
 */
export function stepGame(game, frame, dt = STEP) {
  const actions = frame.actions || 0;
  const confirm = (actions & ACTION_CONFIRM) !== 0;
  const pause = (actions & ACTION_PAUSE) !== 0;
  const restart = (actions & ACTION_RESTART) !== 0;
  const mute = (actions & ACTION_MUTE) !== 0;
  if (game.messageLeft > 0) {
    game.messageLeft -= dt;
    game.messageAlpha = Math.min(1, game.messageLeft / 0.6);
    if (game.messageLeft <= 0) game.message = null;
  }

  if (game.screen === SCREEN_TITLE) {
    if (confirm) {
      game.score = 0;
      game.lives = 3;
      game.time = 0;
      startLevel(game);
    }
    return;
  }

  if (game.screen === SCREEN_PAUSED) {
    if (pause || confirm) game.screen = SCREEN_PLAY;
    return;
  }

  if (game.screen === SCREEN_CAUGHT) {
    if (confirm) startLevel(game);
    return;
  }

  if (game.screen === SCREEN_LEVEL_CLEAR) {
    if (confirm) {
      game.levelIndex += 1;
      startLevel(game);
    }
    return;
  }

  if (game.screen === SCREEN_WIN || game.screen === SCREEN_GAME_OVER) {
    if (confirm) {
      game.screen = SCREEN_TITLE;
      loadLevel(game, 0);
    }
    return;
  }

  // SCREEN_PLAY
  if (mute) game.muted = game.audio.toggleMute();
  if (pause) {
    game.screen = SCREEN_PAUSED;
    return;
  }
  if (restart) {
    startLevel(game);
    return;
  }

  game.time += dt;
  game.levelTime += dt;
  const noises = game.pendingNoises;
  game.pendingNoises = [];

  if (updatePlayer(game.player, dt, game.level, frame.direction || { x: 0, y: 0 }, !!frame.sneak)) {
    game.audio.playerStep(!!frame.sneak);
  }

  for (const click of frame.clicks || []) throwPebble(game, click);

  if (game.pebble) {
    game.pebble.t += dt;
    if (game.pebble.t >= game.pebble.duration) {
      noises.push(pebbleNoise(game.pebble.x1, game.pebble.y1));
      game.audio.pebbleLand();
      game.pebble = null;
    }
  }

  let caughtGuard = null;
  for (const guard of game.guards) {
    const events = updateGuard(guard, dt, game.level, game.player, noises);
    if (events.spotted) game.audio.spottedSting();
    if (events.stepped) {
      const distance = Math.hypot(guard.x - game.player.x, guard.y - game.player.y);
      game.audio.guardStep(distance);
    }
    if (events.caught) caughtGuard = guard;
  }
  if (caughtGuard) {
    getCaught(game, caughtGuard);
    return;
  }

  for (const relic of game.relics) {
    if (relic.taken) continue;
    const dx = game.player.x - (relic.tx * TILE + TILE / 2);
    const dy = game.player.y - (PLAY_Y + relic.ty * TILE + TILE / 2);
    if (Math.hypot(dx, dy) < 26) {
      relic.taken = true;
      game.relicsTakenThisLevel += 1;
      game.audio.relicPickup();
      game.pendingNoises.push(relicNoise(game.player.x, game.player.y));
      showMessage(game, `${relic.name} pocketed!`, `${game.relicsTakenThisLevel} of ${game.relicsTotal} relics · +250`, '#ffd76a', 1.8);
    }
  }

  const at = playerTile(game.player);
  if (at.tx === game.exitTile.tx && at.ty === game.exitTile.ty) {
    clearLevel(game);
  }
}
