// The three galleries of Velvet Shadow. Each map is 32 columns by 16 rows:
//   # wall (blocks movement and sight)   C crate (cover: blocks movement and sight)
//   . floor                              P player start
//   * relic to steal                      E exit (reach it unseen to clear the level)
// Guards patrol straight lines between waypoints, so every leg below was checked to
// run along open floor with no wall or crate between its ends.
import { COLS, ROWS } from './config.js';

export const LEVELS = [
  {
    name: 'Level 1 — The Foyer',
    subtitle: 'Two guards, three relics. Learn the patrols.',
    pebbles: 3,
    map: [
      '########' + '########' + '########' + '########',
      '#P....#.' + '......C.' + '........' + '......E#',
      '#.....#.' + '........' + '........' + '#....C.#',
      '#..C..#.' + '..*.....' + '....C...' + '#......#',
      '#.....#.' + '........' + '........' + '#...*..#',
      '#.....#.' + '......C.' + '........' + '#......#',
      '#.......' + '....#...' + '...C....' + '.......#',
      '#....C..' + '....#...' + '..C.....' + '.......#',
      '#.......' + '....#...' + '........' + '....C..#',
      '#.......' + '....#...' + '........' + '.......#',
      '#..C....' + '........' + '....C...' + '..#....#',
      '#.......' + '........' + '........' + '..#....#',
      '#..*....' + '........' + '....C...' + '..#....#',
      '#.......' + '........' + '........' + '..#....#',
      '#....C..' + '........' + '........' + '..#....#',
      '########' + '########' + '########' + '########',
    ],
    guards: [
      { name: 'Pell', waypoints: [[8, 2], [22, 2]], speed: 55, range: 230, halfAngle: 0.61, pause: 1.2 },
      { name: 'Marsh', waypoints: [[16, 13], [24, 13], [24, 8], [16, 8]], speed: 50, range: 220, halfAngle: 0.61, pause: 0.9 },
    ],
  },
  {
    name: 'Level 2 — The Vault Hall',
    subtitle: 'Three guards, three relics.',
    pebbles: 3,
    map: [
      '########' + '########' + '########' + '########',
      '#P..#...' + '....C...' + '..#.....' + '....E..#',
      '#...#...' + '.C......' + '..#..C..' + '.......#',
      '#...#..*' + '........' + '..#.....' + '.......#',
      '#...#...' + '....C...' + '..#.....' + '.C.....#',
      '#...#...' + '........' + '..#.....' + '.......#',
      '#....C..' + '....#...' + '........' + '..#....#',
      '#.......' + '....#...' + '........' + '..#..*.#',
      '#..C....' + '....#...' + '....C...' + '..#....#',
      '#.......' + '....#...' + '........' + '..#....#',
      '#....C..' + '..#.....' + '........' + '....C..#',
      '#.......' + '..#.....' + '..C.....' + '..#....#',
      '#..*....' + '..#.....' + '........' + '..#..C.#',
      '#.......' + '..#.....' + '........' + '..#....#',
      '#.......' + '..#.....' + '....C...' + '..#....#',
      '########' + '########' + '########' + '########',
    ],
    guards: [
      { name: 'Quill', waypoints: [[6, 3], [16, 3]], speed: 60, range: 235, halfAngle: 0.61, pause: 1.0 },
      { name: 'Voss', waypoints: [[2, 11], [8, 11], [8, 14], [2, 14]], speed: 55, range: 225, halfAngle: 0.61, pause: 0.9 },
      { name: 'Bram', waypoints: [[28, 3], [28, 5], [24, 5], [24, 3]], speed: 60, range: 235, halfAngle: 0.61, pause: 0.8 },
    ],
  },
  {
    name: 'Level 3 — The Rooftop Garden',
    subtitle: 'Four guards. The planters are your friends.',
    pebbles: 3,
    map: [
      '########' + '########' + '########' + '########',
      '#P....#.' + '.C....#.' + '.#....C.' + '....E..#',
      '#.....#.' + '......#.' + '.#......' + '..C....#',
      '#..C..#.' + '..*...#.' + '.#......' + '.......#',
      '#.....#.' + '......#.' + '.#...C..' + '....C..#',
      '#.....#.' + '......#.' + '.#......' + '.......#',
      '#..C....' + '........' + '....#...' + '....C..#',
      '#.......' + '...C....' + '....#...' + '.......#',
      '#....C..' + '........' + '....#...' + '..#....#',
      '#.......' + '....#...' + '....#...' + '..#..*.#',
      '#.......' + '....#...' + '........' + '..#....#',
      '#.......' + '....#...' + '..C.....' + '..#....#',
      '#..*....' + '....#...' + '........' + '..#....#',
      '#.......' + '....#...' + '....C...' + '..#....#',
      '#....C..' + '....#...' + '........' + '..#....#',
      '########' + '########' + '########' + '########',
    ],
    guards: [
      { name: 'Pell', waypoints: [[8, 2], [13, 2]], speed: 65, range: 250, halfAngle: 0.61, pause: 0.8 },
      { name: 'Marsh', waypoints: [[18, 3], [23, 3]], speed: 70, range: 240, halfAngle: 0.61, pause: 0.7 },
      { name: 'Quill', waypoints: [[2, 10], [10, 10]], speed: 70, range: 240, halfAngle: 0.61, pause: 0.7 },
      { name: 'Bram', waypoints: [[28, 10], [28, 14]], speed: 75, range: 240, halfAngle: 0.61, pause: 0.6 },
    ],
  },
];

/** The tile character at (tx, ty); anything outside the map reads as wall. */
export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

/** True for walls and crates: nothing walks through them. */
export function isSolidTile(level, tx, ty) {
  const tile = tileAt(level, tx, ty);
  return tile === '#' || tile === 'C';
}

/** True for walls and crates: a vision cone stops at them. */
export function blocksSightTile(level, tx, ty) {
  const tile = tileAt(level, tx, ty);
  return tile === '#' || tile === 'C';
}

/** True for floor, relic, exit and player-start tiles: the player may stand there. */
export function isWalkableTile(level, tx, ty) {
  return !isSolidTile(level, tx, ty);
}

/** Pixel centre of a tile, in canvas coordinates (the HUD bar sits above the grid). */
export function tileCenter(tx, ty) {
  return { x: tx * 40 + 20, y: 64 + ty * 40 + 20 };
}

/** Find the single tile holding `mark` (P or E) in a level map. */
export function findTile(level, mark) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (level.map[ty][tx] === mark) return { tx, ty };
    }
  }
  return null;
}

/** Every relic tile of a level, in reading order, with its display name. */
export function findRelics(level) {
  const names = ['Moon Opal', 'Sunken Crown', 'Fox Mask', 'Ivory Comet'];
  const relics = [];
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (level.map[ty][tx] === '*') {
        relics.push({ tx, ty, name: names[relics.length % names.length], taken: false });
      }
    }
  }
  return relics;
}

/** A level's maps are only useful when every row is exactly COLS wide. */
export function validateLevels() {
  for (const level of LEVELS) {
    if (level.map.length !== ROWS) throw new Error(`${level.name}: ${level.map.length} rows, expected ${ROWS}`);
    for (let ty = 0; ty < ROWS; ty += 1) {
      if (level.map[ty].length !== COLS) {
        throw new Error(`${level.name} row ${ty}: ${level.map[ty].length} columns, expected ${COLS}`);
      }
    }
    if (!findTile(level, 'P')) throw new Error(`${level.name}: no player start`);
    if (!findTile(level, 'E')) throw new Error(`${level.name}: no exit`);
    if (findRelics(level).length === 0) throw new Error(`${level.name}: no relics`);
  }
}
