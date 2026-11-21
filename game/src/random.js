// A tiny seeded generator (mulberry32) so a fixed seed always stages the same frame:
// the same patrol pauses, the same sparkle phases, the same screenshot every run.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [min, max) from the generator. */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

/** One of the array's entries, picked by the generator. */
export function randomPick(random, entries) {
  return entries[Math.floor(random() * entries.length)];
}
