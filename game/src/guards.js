// Guard patrol AI. A guard walks its waypoint loop, pausing at each stop to sweep
// its cone side to side; when it notices the player its suspicion climbs, and past
// thresholds it investigates the last seen spot, then chases. A thrown pebble or a
// nearby clink pulls it off patrol to look. Suspicion drains when the player is unseen,
// so a near miss is recoverable — the player always gets a chance to slip away.
import { TILE, DETECT_CLOSE, DETECT_MID, DETECT_FAR, DETECT_DECAY, SNEAK_MULTIPLIER, SUSPICIOUS_AT, CHASE_AT, CAUGHT_AT, PEBBLE_HEARING, RELIC_HEARING } from './config.js';
import { tileCenter } from './level.js';
import { pointInVisionCone } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';

/** A guard from a level definition: pixel position, facing, patrol state. */
export function createGuard(def, index) {
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  const next = tileCenter(def.waypoints[1 % def.waypoints.length][0], def.waypoints[1 % def.waypoints.length][1]);
  return {
    id: index,
    name: def.name,
    x: start.x,
    y: start.y,
    facing: Math.atan2(next.y - start.y, next.x - start.x),
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    speed: def.speed,
    range: def.range,
    halfAngle: def.halfAngle,
    pause: def.pause,
    pauseLeft: 0,
    sweepPhase: index * 1.7,
    state: GUARD_PATROL,
    suspicion: 0,
    lastSeen: null,
    investigateTarget: null,
    investigateLeft: 0,
    stepPhase: 0,
    stepped: false,
  };
}

/** How fast suspicion fills at this distance: closer is worse. */
export function detectionRate(distance, range, sneaking) {
  const base = distance < 90 ? DETECT_CLOSE : distance < range * 0.6 ? DETECT_MID : DETECT_FAR;
  return sneaking ? base * SNEAK_MULTIPLIER : base;
}

/** Turn `facing` toward `target` by at most `maxTurn` radians. */
function turnToward(facing, target, maxTurn) {
  let diff = target - facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) <= maxTurn) return target;
  return facing + Math.sign(diff) * maxTurn;
}

/** Walk toward a pixel point at `speed`; returns true on arrival. */
function walkToward(guard, x, y, speed, dt) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const distance = Math.hypot(dx, dy);
  const step = speed * dt;
  if (distance <= Math.max(step, 2)) {
    guard.x = x;
    guard.y = y;
    return true;
  }
  guard.x += (dx / distance) * step;
  guard.y += (dy / distance) * step;
  guard.facing = turnToward(guard.facing, Math.atan2(dy, dx), 6 * dt);
  return false;
}

/**
 * Advance one guard by dt. Returns an object of events for the frame:
 * spotted (suspicion crossed into view), caught (suspicion hit 100), stepped
 * (a footstep sounded — the renderer and audio use it for the footstep cue).
 */
export function updateGuard(guard, dt, level, player, noises) {
  const events = { spotted: false, caught: false, stepped: false };
  const wasSeen = guard.suspicion > 0;

  // A noise inside hearing range pulls a patrolling guard off to look at it.
  for (const noise of noises) {
    const distance = Math.hypot(noise.x - guard.x, noise.y - guard.y);
    if (distance <= noise.radius && guard.state !== GUARD_CHASE) {
      guard.state = GUARD_INVESTIGATE;
      guard.investigateTarget = { x: noise.x, y: noise.y };
      guard.investigateLeft = 4;
      guard.suspicion = Math.max(guard.suspicion, SUSPICIOUS_AT);
    }
  }

  const seesPlayer = pointInVisionCone(level, guard, player.x, player.y);
  const distance = Math.hypot(player.x - guard.x, player.y - guard.y);
  if (seesPlayer) {
    guard.suspicion += detectionRate(distance, guard.range, player.sneaking) * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= CHASE_AT) guard.state = GUARD_CHASE;
    else if (guard.suspicion >= SUSPICIOUS_AT) guard.state = GUARD_SUSPICIOUS;
    if (!wasSeen) events.spotted = true;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - DETECT_DECAY * dt);
    if (guard.state === GUARD_SUSPICIOUS && guard.suspicion < SUSPICIOUS_AT) {
      guard.state = GUARD_INVESTIGATE;
      guard.investigateTarget = guard.lastSeen ? { ...guard.lastSeen } : null;
      guard.investigateLeft = 3;
    }
    if (guard.state === GUARD_CHASE && guard.suspicion <= 0) {
      guard.state = GUARD_INVESTIGATE;
      guard.investigateTarget = guard.lastSeen ? { ...guard.lastSeen } : null;
      guard.investigateLeft = 3;
    }
  }
  if (guard.suspicion >= CAUGHT_AT) {
    guard.suspicion = CAUGHT_AT;
    events.caught = true;
    return events;
  }

  // Movement by state: patrol the loop, investigate a spot, or chase the player.
  if (guard.state === GUARD_PATROL) {
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.sweepPhase += dt;
      guard.facing += Math.sin(guard.sweepPhase * 1.6) * 0.9 * dt;
    } else {
      const target = tileCenter(guard.waypoints[guard.waypointIndex][0], guard.waypoints[guard.waypointIndex][1]);
      if (walkToward(guard, target.x, target.y, guard.speed, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = guard.pause;
      }
    }
  } else if (guard.state === GUARD_INVESTIGATE) {
    guard.investigateLeft -= dt;
    if (guard.investigateTarget) {
      const arrived = walkToward(guard, guard.investigateTarget.x, guard.investigateTarget.y, guard.speed * 1.35, dt);
      if (arrived || guard.investigateLeft <= 0) {
        guard.investigateLeft = Math.max(0, guard.investigateLeft);
        if (guard.investigateLeft <= 0 || arrived) {
          guard.state = GUARD_PATROL;
          guard.investigateTarget = null;
          guard.suspicion = Math.max(0, guard.suspicion - 10);
        }
      }
    } else {
      guard.state = GUARD_PATROL;
    }
    if (guard.investigateLeft <= 0 && guard.state === GUARD_INVESTIGATE) {
      guard.state = GUARD_PATROL;
      guard.investigateTarget = null;
    }
  } else {
    const target = guard.lastSeen ?? { x: player.x, y: player.y };
    walkToward(guard, target.x, target.y, guard.speed * 1.9, dt);
  }

  // Footsteps: a step every ~34 px of travel, so the player hears a guard coming.
  guard.stepPhase += (guard.state === GUARD_PATROL ? guard.speed : guard.speed * 1.4) * dt;
  if (guard.stepPhase >= 34) {
    guard.stepPhase -= 34;
    guard.stepped = true;
    events.stepped = true;
  } else {
    guard.stepped = false;
  }
  return events;
}

/** A noise event a pebble throw or a relic clink raises for the guards. */
export function pebbleNoise(x, y) {
  return { x, y, radius: PEBBLE_HEARING };
}

export function relicNoise(x, y) {
  return { x, y, radius: RELIC_HEARING };
}

/** The highest suspicion across the guards: the HUD's detection meter. */
export function highestSuspicion(guards) {
  let top = 0;
  for (const guard of guards) top = Math.max(top, guard.suspicion);
  return top;
}

/** True when any guard is actively hunting the player. */
export function anyGuardAlerted(guards) {
  return guards.some((guard) => guard.state === GUARD_CHASE || guard.suspicion >= CHASE_AT);
}
