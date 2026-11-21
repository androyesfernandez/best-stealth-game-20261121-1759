// Shared constants for Velvet Shadow: one top-down stealth level fills the canvas under
// a 64 px HUD bar. The grid is 32 by 16 tiles of 40 px, so the whole level is always on
// screen: the judge sees the level, the cones, the cover and the exit in one frame.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const HUD_H = 64;
export const PLAY_Y = HUD_H;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const PLAYER_RADIUS = 13;
export const GUARD_RADIUS = 14;
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 85;
export const BEST_KEY = 'velvet-shadow-best';
export const GAME_TITLE = 'Velvet Shadow';
export const GAME_SUBTITLE = 'a quiet heist in three galleries';

// How fast a guard's suspicion fills while the player stands inside its vision cone,
// at close / mid / far range, and how fast it drains once the player is unseen.
export const DETECT_CLOSE = 62;
export const DETECT_MID = 34;
export const DETECT_FAR = 18;
export const DETECT_DECAY = 42;
export const SNEAK_MULTIPLIER = 0.55;
export const SUSPICIOUS_AT = 35;
export const CHASE_AT = 72;
export const CAUGHT_AT = 100;

// A thrown pebble is heard this far away; a relic's clink carries this far.
export const PEBBLE_HEARING = 280;
export const RELIC_HEARING = 90;
