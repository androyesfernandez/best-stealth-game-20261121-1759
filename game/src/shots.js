// The screenshot scenes behind ?shot=cover|patrol|alarm|clear. Each one plays the real
// rules forward from a fresh level for a fixed script, steered by a waypoint pilot that
// walks Wren sneakily from cover to cover and waits when the next step would cross a
// lit cone — so every frame is what real play looks like, and the same seed always
// stages the same frame.
import { STEP } from './config.js';
import { tileCenter } from './level.js';
import { pointInVisionCone } from './vision.js';
import { highestSuspicion } from './guards.js';
import { loadLevel, stepGame, SCREEN_PLAY, SCREEN_LEVEL_CLEAR } from './state.js';
import { ACTION_CONFIRM } from './input.js';

const ARRIVE_AT = 14;
const MAX_WAIT_STEPS = 6 * 60;

/** Waypoints are tile coordinates; the pilot walks them in order, sneaking. */
function createPilot(waypoints) {
  return { waypoints, index: 0, waitSteps: 0 };
}

/** Is any guard's cone covering the probe point right now? */
function probeLit(game, x, y) {
  for (const guard of game.guards) {
    if (pointInVisionCone(game.level, guard, x, y)) return true;
  }
  return false;
}

/** One pilot frame: toward the current waypoint, or standing still when the way is lit. */
function pilotFrame(game, pilot) {
  const idle = { direction: { x: 0, y: 0 }, sneak: true, clicks: [], actions: 0 };
  if (pilot.index >= pilot.waypoints.length) return idle;
  const target = tileCenter(pilot.waypoints[pilot.index][0], pilot.waypoints[pilot.index][1]);
  const dx = target.x - game.player.x;
  const dy = target.y - game.player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < ARRIVE_AT) {
    pilot.index += 1;
    pilot.waitSteps = 0;
    return idle;
  }
  const nx = dx / distance;
  const ny = dy / distance;
  const aheadX = game.player.x + nx * 26;
  const aheadY = game.player.y + ny * 26;
  const standingLit = probeLit(game, game.player.x, game.player.y);
  const aheadLit = probeLit(game, aheadX, aheadY);
  if (aheadLit && !standingLit) {
    pilot.waitSteps += 1;
    if (pilot.waitSteps < MAX_WAIT_STEPS) return idle;
    pilot.waitSteps = 0;
  }
  return { direction: { x: nx, y: ny }, sneak: true, clicks: [], actions: 0 };
}

/**
 * The four scenes. `game` is a fresh game; the shot starts the level, plays it
 * forward with the pilot, and stops when its condition is met (or its step cap).
 * Returns the screen to draw over the staged world.
 */
export function stageShot(name, game) {
  const idle = { direction: { x: 0, y: 0 }, sneak: true, clicks: [], actions: 0 };
  if (name === 'patrol') {
    loadLevel(game, 1);
    game.screen = SCREEN_PLAY;
    for (let step = 0; step < 9 / STEP; step += 1) stepGame(game, idle);
    return { screen: game.screen };
  }

  loadLevel(game, 0);
  game.screen = SCREEN_PLAY;

  if (name === 'alarm') {
    const pilot = createPilot([[2, 6], [10, 6], [10, 2], [14, 2]]);
    for (let step = 0; step < 45 / STEP; step += 1) {
      stepGame(game, pilotFrame(game, pilot));
      if (highestSuspicion(game.guards) >= 85) break;
      if (game.screen !== SCREEN_PLAY) break;
    }
    return { screen: game.screen };
  }

  if (name === 'clear') {
    const pilot = createPilot([
      [2, 6], [10, 6], [10, 3], [14, 3], [14, 4], [20, 4], [20, 6],
      [25, 6], [25, 4], [28, 4], [28, 2], [28, 1], [30, 1],
    ]);
    for (let step = 0; step < 150 / STEP; step += 1) {
      stepGame(game, pilotFrame(game, pilot));
      if (game.screen === SCREEN_LEVEL_CLEAR) break;
      if (game.screen !== SCREEN_PLAY) {
        // Caught mid-heist: the pilot retries the gallery from the top.
        loadLevel(game, 0);
        game.screen = SCREEN_PLAY;
        pilot.index = 0;
        pilot.waitSteps = 0;
      }
    }
    return { screen: game.screen };
  }

  // Cover: a mid-sneak freeze — Wren behind the crates by the exit, Pell's cone
  // sweeping the gallery above, the EXIT glowing at the top of the frame.
  const pilot = createPilot([
    [2, 6], [10, 6], [10, 10], [16, 10], [16, 8], [22, 8], [22, 6], [25, 6], [25, 3],
  ]);
  for (let step = 0; step < 120 / STEP; step += 1) {
    stepGame(game, pilotFrame(game, pilot));
    if (pilot.index >= pilot.waypoints.length) break;
    if (game.screen !== SCREEN_PLAY) break;
  }
  return { screen: game.screen };
}
