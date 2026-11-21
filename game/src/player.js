// The burglar, Wren. WASD or arrows to walk, Shift to sneak (slower, quieter, harder
// to spot), click to throw a pebble that draws guards away. Movement collides against
// walls and crates one axis at a time, so sliding along a wall feels right.
import { TILE, PLAY_Y, PLAYER_RADIUS, WALK_SPEED, SNEAK_SPEED } from './config.js';
import { isSolidTile, tileCenter } from './level.js';

/** A fresh player at the level's start tile, standing still. */
export function createPlayer(start) {
  const at = tileCenter(start.tx, start.ty);
  return {
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    facing: 0,
    sneaking: false,
    moving: false,
    stepPhase: 0,
    stepped: false,
  };
}

/** True when a circle of `radius` at (x, y) overlaps a solid tile. */
function hitsSolid(level, x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - PLAY_Y - radius) / TILE);
  const bottom = Math.floor((y - PLAY_Y + radius) / TILE);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (isSolidTile(level, tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Move the player by one frame of input: `direction` is a unit {x, y} (or 0, 0),
 * `sneak` holds Shift. Returns true when a footstep sounded this frame.
 */
export function updatePlayer(player, dt, level, direction, sneak) {
  player.sneaking = sneak;
  player.moving = direction.x !== 0 || direction.y !== 0;
  const speed = sneak ? SNEAK_SPEED : WALK_SPEED;
  const dx = direction.x * speed * dt;
  const dy = direction.y * speed * dt;
  if (player.moving) {
    player.facing = Math.atan2(direction.y, direction.x);
    if (!hitsSolid(level, player.x + dx, player.y, PLAYER_RADIUS)) player.x += dx;
    if (!hitsSolid(level, player.x, player.y + dy, PLAYER_RADIUS)) player.y += dy;
  }
  player.stepped = false;
  if (player.moving) {
    player.stepPhase += speed * dt;
    const stride = sneak ? 26 : 34;
    if (player.stepPhase >= stride) {
      player.stepPhase -= stride;
      player.stepped = true;
    }
  } else {
    player.stepPhase = 0;
  }
  return player.stepped;
}

/** The tile the player's centre stands on. */
export function playerTile(player) {
  return {
    tx: Math.floor(player.x / TILE),
    ty: Math.floor((player.y - PLAY_Y) / TILE),
  };
}
