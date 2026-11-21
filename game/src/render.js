// The painter: the gallery floor, walls and crates, the glowing exit, the relics, the
// guards with their vision cones, Wren, and every screen around the game. The whole
// level fits on screen at once, so every frame is the game at a glance.
import { TILE, COLS, ROWS, PLAY_Y, VIEW_W, VIEW_H, PLAYER_RADIUS, GUARD_RADIUS, GAME_TITLE, GAME_SUBTITLE } from './config.js';
import { tileAt, tileCenter } from './level.js';
import { castVisionCone } from './vision.js';
import { GUARD_PATROL, GUARD_SUSPICIOUS, GUARD_CHASE, GUARD_INVESTIGATE } from './guards.js';
import { drawHudBar, drawBanner, drawFooter } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_WIN = 'win';
export const SCREEN_GAME_OVER = 'game-over';

function hashTile(tx, ty) {
  return ((tx * 73 + ty * 149) % 5) / 5;
}

function drawFloor(ctx, level) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const tile = tileAt(level, tx, ty);
      const x = tx * TILE;
      const y = PLAY_Y + ty * TILE;
      if (tile === '#') {
        ctx.fillStyle = '#171b24';
        ctx.fillRect(x, y, TILE, TILE);
        continue;
      }
      const shade = hashTile(tx, ty);
      ctx.fillStyle = shade < 0.5 ? '#262b36' : '#2a303c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillRect(x + TILE - 1, y, 1, TILE);
    }
  }
}

function drawWalls(ctx, level) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (tileAt(level, tx, ty) !== '#') continue;
      const x = tx * TILE;
      const y = PLAY_Y + ty * TILE;
      ctx.fillStyle = '#3a4152';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = '#4a5266';
      ctx.fillRect(x + 1, y + 1, TILE - 2, 6);
      ctx.fillStyle = '#232833';
      ctx.fillRect(x + 1, y + TILE - 5, TILE - 2, 4);
    }
  }
}

function drawCrates(ctx, level) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (tileAt(level, tx, ty) !== 'C') continue;
      const x = tx * TILE;
      const y = PLAY_Y + ty * TILE;
      ctx.fillStyle = '#6b4c2a';
      ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = '#8a6538';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + TILE - 5, y + TILE - 5);
      ctx.moveTo(x + TILE - 5, y + 5);
      ctx.lineTo(x + 5, y + TILE - 5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x + 3, y + TILE - 8, TILE - 6, 5);
    }
  }
}

function drawExit(ctx, level, time) {
  const exit = level.exitTile;
  const at = tileCenter(exit.tx, exit.ty);
  const pulse = 0.55 + 0.35 * Math.sin(time * 3);
  ctx.save();
  ctx.shadowColor = '#2eff8a';
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = '#1f7a4d';
  ctx.fillRect(at.x - 16, at.y - 16, 32, 32);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2eff8a';
  ctx.fillRect(at.x - 11, at.y - 11, 22, 22);
  ctx.fillStyle = '#0b2e1c';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', at.x, at.y + 24);
  ctx.restore();
}

function drawRelics(ctx, relics, time) {
  for (const relic of relics) {
    if (relic.taken) continue;
    const at = tileCenter(relic.tx, relic.ty);
    const bob = Math.sin(time * 2 + relic.tx) * 2;
    const glow = 0.6 + 0.4 * Math.sin(time * 4 + relic.ty);
    ctx.save();
    ctx.translate(at.x, at.y + bob);
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = 14 * glow;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e8d9a0';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(relic.name, at.x, at.y + 26);
  }
}

function drawVisionCone(ctx, level, guard) {
  const polygon = castVisionCone(level, guard);
  const alert = guard.suspicion / 100;
  const chasing = guard.suspicion >= 72;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let index = 1; index < polygon.length; index += 1) ctx.lineTo(polygon[index].x, polygon[index].y);
  ctx.closePath();
  if (chasing) ctx.fillStyle = `rgba(255, 64, 48, ${0.16 + 0.14 * alert})`;
  else if (guard.suspicion >= 35) ctx.fillStyle = `rgba(255, 150, 50, ${0.13 + 0.1 * alert})`;
  else ctx.fillStyle = 'rgba(255, 196, 64, 0.13)';
  ctx.fill();
  ctx.strokeStyle = chasing ? 'rgba(255, 90, 70, 0.5)' : 'rgba(255, 210, 90, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  const alert = guard.suspicion / 100;
  ctx.save();
  // A soft pool of light keeps each guard readable against the floor.
  const pool = ctx.createRadialGradient(guard.x, guard.y, 4, guard.x, guard.y, 64);
  pool.addColorStop(0, 'rgba(255, 220, 140, 0.07)');
  pool.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(guard.x - 64, guard.y - 64, 128, 128);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = guard.state === GUARD_CHASE ? '#c22e22' : '#a8443a';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, GUARD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#5d1f18';
  ctx.lineWidth = 2;
  ctx.stroke();

  // The facing tick: where the guard is looking, at a glance.
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * (GUARD_RADIUS + 7), guard.y + Math.sin(guard.facing) * (GUARD_RADIUS + 7));
  ctx.stroke();

  // Cap brim and torch dot.
  ctx.fillStyle = '#2c1c16';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y - 3, 7, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 10, guard.y + Math.sin(guard.facing) * 10, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // The mark above the head: ? while investigating, ! while suspicious, !! while chasing.
  let mark = '';
  let colour = '#ffd76a';
  if (guard.state === GUARD_CHASE) {
    mark = '!!';
    colour = '#ff5040';
  } else if (guard.suspicion >= 35) {
    mark = '!';
    colour = '#ffb03a';
  } else if (guard.state === GUARD_INVESTIGATE) {
    mark = '?';
    colour = '#dfe3ea';
  }
  if (mark) {
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colour;
    ctx.fillText(mark, guard.x, guard.y - GUARD_RADIUS - 12);
  }
  // A thin suspicion arc while the guard is noticing the player.
  if (guard.suspicion > 0 && guard.suspicion < 100) {
    ctx.strokeStyle = alert >= 0.72 ? '#ff5040' : '#ffb03a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_RADIUS + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * alert));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  const radius = player.sneaking ? PLAYER_RADIUS - 2 : PLAYER_RADIUS;
  ctx.save();
  const pool = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 150);
  pool.addColorStop(0, 'rgba(120, 220, 200, 0.10)');
  pool.addColorStop(1, 'rgba(120, 220, 200, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(player.x - 150, player.y - 150, 300, 300);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#2e8f86';
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#155e57';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hood and eyes, turned where Wren is facing.
  const hx = player.x + Math.cos(player.facing) * 4;
  const hy = player.y + Math.sin(player.facing) * 4;
  ctx.fillStyle = '#1d5f59';
  ctx.beginPath();
  ctx.arc(hx, hy, radius - 5, 0, Math.PI * 2);
  ctx.fill();
  const ex = Math.cos(player.facing);
  const ey = Math.sin(player.facing);
  const px = -ey;
  const py = ex;
  ctx.fillStyle = '#f4f8f8';
  ctx.beginPath();
  ctx.arc(hx + ex * 4 + px * 3.5, hy + ey * 4 + py * 3.5, 1.8, 0, Math.PI * 2);
  ctx.arc(hx + ex * 4 - px * 3.5, hy + ey * 4 - py * 3.5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(120, 220, 200, 0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawPebble(ctx, pebble) {
  if (!pebble) return;
  const progress = pebble.t / pebble.duration;
  const x = pebble.x0 + (pebble.x1 - pebble.x0) * progress;
  const y = pebble.y0 + (pebble.y1 - pebble.y0) * progress - Math.sin(progress * Math.PI) * 34;
  ctx.save();
  ctx.fillStyle = '#c8ccd6';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVignette(ctx, player) {
  const gradient = ctx.createRadialGradient(player.x, player.y, 240, player.x, player.y, 700);
  gradient.addColorStop(0, 'rgba(6, 8, 14, 0)');
  gradient.addColorStop(1, 'rgba(6, 8, 14, 0.30)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, PLAY_Y, VIEW_W, VIEW_H - PLAY_Y - 16);
}

function drawPanel(ctx, title, lines, accent) {
  ctx.save();
  const panelW = 620;
  const panelH = 150 + lines.length * 30;
  const x = (VIEW_W - panelW) / 2;
  const y = (VIEW_H - panelH) / 2 - 10;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = accent || '#e8d9a0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent || '#e8d9a0';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 48);
  ctx.fillStyle = '#dfe3ea';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, VIEW_W / 2, y + 96 + index * 30);
  });
  ctx.restore();
}

/** Paint one frame: the world, the HUD, and whichever screen sits over it. */
export function drawGame(ctx, game, snapshot) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#10131a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const level = game.level;
  drawFloor(ctx, level);
  drawExit(ctx, level, game.time);
  drawRelics(ctx, game.relics, game.time);
  for (const guard of game.guards) drawVisionCone(ctx, level, guard);
  drawWalls(ctx, level);
  drawCrates(ctx, level);
  for (const guard of game.guards) drawGuard(ctx, guard, game.time);
  drawPebble(ctx, game.pebble);
  drawPlayer(ctx, game.player, game.time);
  drawVignette(ctx, game.player);

  drawHudBar(ctx, snapshot);
  drawBanner(ctx, game.message, game.messageAlpha);
  drawFooter(ctx, game.muted);

  if (game.screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
    ctx.fillRect(0, PLAY_Y, VIEW_W, VIEW_H - PLAY_Y - 16);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8d9a0';
    ctx.font = 'bold 68px Georgia, serif';
    ctx.fillText(GAME_TITLE, VIEW_W / 2, 210);
    ctx.fillStyle = '#9aa2b2';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(GAME_SUBTITLE, VIEW_W / 2, 258);
    ctx.fillStyle = '#dfe3ea';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Sneak past the guards. Pocket the relics. Reach the EXIT unseen.', VIEW_W / 2, 318);
    ctx.fillText('Vision cones are real: walls and crates block them. If the meter fills, you are caught.', VIEW_W / 2, 348);
    ctx.fillText('WASD / arrows move · Shift sneak · Click throws a pebble to distract a guard', VIEW_W / 2, 378);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press SPACE or click to begin', VIEW_W / 2, 440);
    if (snapshot.best > 0) {
      ctx.fillStyle = '#8b93a5';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best score ${snapshot.best}`, VIEW_W / 2, 478);
    }
    ctx.restore();
  } else if (game.screen === SCREEN_PAUSED) {
    drawPanel(ctx, 'PAUSED', ['The guards wait for no one — except now.', 'Press P or SPACE to keep sneaking.'], '#8b93a5');
  } else if (game.screen === SCREEN_CAUGHT) {
    drawPanel(ctx, 'CAUGHT!', [`${game.caughtBy} spotted you in the ${game.level.name}.`, `${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — press SPACE to try the gallery again.`], '#ff5040');
  } else if (game.screen === SCREEN_LEVEL_CLEAR) {
    drawPanel(ctx, 'GALLERY CLEARED', [
      `${game.level.name} — slipped out unseen.`,
      `Relics ${game.relicsTakenThisLevel}/${game.relicsTotal} · Time bonus +${game.lastBonus}`,
      'Press SPACE for the next gallery.',
    ], '#2eff8a');
  } else if (game.screen === SCREEN_WIN) {
    drawPanel(ctx, 'THE HEIST IS COMPLETE', [
      'Three galleries, three clean getaways. Wren vanishes into the night.',
      `Final score ${game.score} · Best ${snapshot.best}`,
      'Press SPACE to play again.',
    ], '#ffd76a');
  } else if (game.screen === SCREEN_GAME_OVER) {
    drawPanel(ctx, 'THE GALLERY KEEPS ITS SECRETS', [
      'Out of lives. The guards change the locks tonight.',
      `Score ${game.score} · Best ${snapshot.best}`,
      'Press SPACE to return to the title.',
    ], '#ff5040');
  }
}
