// Line of sight and vision cones. A cone is a wedge of rays cast from the guard;
// each ray marches forward until it hits a wall or a crate, so cover really does
// shadow the floor behind it — that shadowing is what sells the stealth.
import { TILE, PLAY_Y } from './config.js';
import { blocksSightTile } from './level.js';

const RAY_STEP = 6;
const CONE_RAYS = 26;

/** True when no wall or crate stands between two pixel points. */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / RAY_STEP));
  for (let step = 1; step < steps; step += 1) {
    const x = x0 + (dx * step) / steps;
    const y = y0 + (dy * step) / steps;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor((y - PLAY_Y) / TILE);
    if (blocksSightTile(level, tx, ty)) return false;
  }
  return true;
}

/** The angle between the guard's facing and the point, in [0, PI]. */
export function angleToPoint(guard, x, y) {
  const target = Math.atan2(y - guard.y, x - guard.x);
  let diff = Math.abs(target - guard.facing);
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  return diff;
}

/**
 * True when a point lies inside a guard's cone: within range, within the half-angle
 * and with an unblocked line of sight. The caller passes the guard's current state.
 */
export function pointInVisionCone(level, guard, x, y) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > guard.range) return false;
  if (distance > 1 && angleToPoint(guard, x, y) > guard.halfAngle) return false;
  return hasLineOfSight(level, guard.x, guard.y, x, y);
}

/**
 * The cone as a polygon of pixel points, for drawing: one ray per slice of the wedge,
 * each ray stopping at the first wall or crate (or at the guard's range). The polygon
 * is what the player reads as "safe" and "seen".
 */
export function castVisionCone(level, guard) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let index = 0; index <= CONE_RAYS; index += 1) {
    const angle = guard.facing - guard.halfAngle + (2 * guard.halfAngle * index) / CONE_RAYS;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let reach = guard.range;
    for (let distance = RAY_STEP; distance <= guard.range; distance += RAY_STEP) {
      const x = guard.x + cos * distance;
      const y = guard.y + sin * distance;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor((y - PLAY_Y) / TILE);
      if (blocksSightTile(level, tx, ty)) {
        reach = distance;
        break;
      }
    }
    points.push({ x: guard.x + cos * reach, y: guard.y + sin * reach });
  }
  return points;
}

/** The guard whose cone currently covers the point, or null. */
export function guardSeeingPoint(level, guards, x, y) {
  for (const guard of guards) {
    if (pointInVisionCone(level, guard, x, y)) return guard;
  }
  return null;
}
