// The HUD bar, banners and footer: what the player reads at a glance — the gallery,
// the relics, the pebbles, the lives, the clock, the score, and above all the
// detection meter, which is the game's heartbeat.
import { VIEW_W, HUD_H, VIEW_H } from './config.js';

/** The detection meter's colour: calm teal, warming amber, then alarm red. */
export function detectionColour(value) {
  if (value >= 72) return '#ff5040';
  if (value >= 35) return '#ffb03a';
  return '#3fd2c0';
}

/** Draw the top bar: gallery name, objectives, lives, clock, score, detection meter. */
export function drawHudBar(ctx, snapshot) {
  ctx.save();
  ctx.fillStyle = '#10131a';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#2c3444';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8d9a0';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(snapshot.levelName, 18, 20);
  ctx.fillStyle = '#8b93a5';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(snapshot.levelSubtitle, 18, 44);

  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(`◆ Relics ${snapshot.relicsTaken}/${snapshot.relicsTotal}`, 330, 20);
  ctx.fillStyle = '#c8ccd6';
  ctx.fillText(`● Pebbles ${snapshot.pebbles}`, 330, 44);
  ctx.fillStyle = '#ff7a6b';
  ctx.fillText(`♥ Lives ${snapshot.lives}`, 480, 20);
  ctx.fillStyle = '#c8ccd6';
  const minutes = Math.floor(snapshot.time / 60);
  const seconds = Math.floor(snapshot.time % 60);
  ctx.fillText(`◷ ${minutes}:${String(seconds).padStart(2, '0')}`, 480, 44);

  // The detection meter: the widest bar on the bar, because it decides everything.
  const meterX = 640;
  const meterW = 300;
  const meterY = 14;
  ctx.textAlign = 'left';
  ctx.fillStyle = snapshot.detection > 0 ? detectionColour(snapshot.detection) : '#8b93a5';
  ctx.font = 'bold 13px system-ui, sans-serif';
  const label = snapshot.detection >= 72 ? 'SPOTTED!' : snapshot.detection >= 35 ? 'SUSPICIOUS' : snapshot.detection > 0 ? 'NOTICED' : 'UNSEEN';
  ctx.fillText(label, meterX, meterY + 4);
  ctx.fillStyle = '#232833';
  ctx.fillRect(meterX, meterY + 16, meterW, 12);
  ctx.fillStyle = detectionColour(snapshot.detection);
  ctx.fillRect(meterX, meterY + 16, (meterW * Math.min(100, snapshot.detection)) / 100, 12);
  ctx.strokeStyle = '#3a4152';
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX + 0.5, meterY + 16.5, meterW, 12);
  ctx.fillStyle = '#8b93a5';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('detection', meterX, meterY + 42);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8d9a0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`Score ${snapshot.score}`, VIEW_W - 18, 20);
  ctx.fillStyle = '#8b93a5';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Best ${snapshot.best}`, VIEW_W - 18, 44);
  ctx.restore();
}

/** A fading centre banner (message + smaller sub-line) over the playfield. */
export function drawBanner(ctx, message, alpha) {
  if (!message || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  const width = ctx.measureText(message.text).width + 48;
  ctx.fillRect((VIEW_W - width) / 2, 108, width, 52);
  ctx.fillStyle = message.colour || '#ffd76a';
  ctx.fillText(message.text, VIEW_W / 2, 135);
  if (message.sub) {
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#dfe3ea';
    ctx.fillText(message.sub, VIEW_W / 2, 172);
  }
  ctx.restore();
}

/** The footer strip: the controls, always visible so a new player knows how to play. */
export function drawFooter(ctx, muted) {
  ctx.save();
  ctx.fillStyle = '#10131a';
  ctx.fillRect(0, VIEW_H - 16, VIEW_W, 16);
  ctx.fillStyle = '#7c8496';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WASD / arrows move · Shift sneak · Click throw a pebble · P pause · R restart · M mute', 18, VIEW_H - 8);
  ctx.textAlign = 'right';
  ctx.fillText(muted ? 'muted (M)' : 'sound on (M)', VIEW_W - 18, VIEW_H - 8);
  ctx.restore();
}
