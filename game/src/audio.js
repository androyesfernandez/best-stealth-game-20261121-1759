// Procedural sound, no audio files: every cue is a small WebAudio oscillator or a
// burst of filtered noise. Guard footsteps get quieter with distance, so the player
// hears a patrol coming before they see it. Nothing plays until the first gesture
// creates the audio context, and M mutes it all.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context !== null;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = null) {
    if (!context || muted) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + when;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    } catch {
      // Audio is decoration: a failed cue never breaks the game.
    }
  }

  function noiseBurst(duration, volume, lowpass) {
    if (!context || muted) return;
    try {
      const length = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Audio is decoration: a failed cue never breaks the game.
    }
  }

  return {
    /** Call from the first click or keypress; safe to call any time. */
    unlock: () => ensure(),
    /** Flip the mute; returns the new muted state. */
    toggleMute: () => {
      muted = !muted;
      return muted;
    },
    isMuted: () => muted,
    /** A soft player footstep, quieter while sneaking. */
    playerStep: (sneaking) => noiseBurst(0.05, sneaking ? 0.03 : 0.06, 500),
    /** A guard footstep; `distance` in pixels sets the volume, so near guards sound near. */
    guardStep: (distance) => {
      const volume = Math.max(0.02, 0.22 - distance / 1400);
      noiseBurst(0.06, volume, 320);
    },
    /** Two-note chime when a relic is pocketed. */
    relicPickup: () => {
      tone(660, 0.12, 'sine', 0.16);
      tone(990, 0.18, 'sine', 0.16, 0.09);
    },
    /** A pebble ticking across the floor. */
    pebbleThrow: () => noiseBurst(0.08, 0.1, 2400),
    pebbleLand: () => {
      tone(190, 0.07, 'triangle', 0.18);
      tone(140, 0.09, 'triangle', 0.14, 0.06);
    },
    /** The sting when a guard's suspicion first rises: you have been noticed. */
    spottedSting: () => {
      tone(220, 0.35, 'sawtooth', 0.12, 0, 440);
      tone(330, 0.3, 'sawtooth', 0.07, 0.05, 495);
    },
    /** The alarm when a guard catches the player. */
    caughtSting: () => {
      tone(196, 0.5, 'sawtooth', 0.18, 0, 98);
      tone(147, 0.5, 'sawtooth', 0.18, 0.12, 73);
    },
    /** A short arpeggio when a level is cleared. */
    levelClear: () => {
      tone(523, 0.14, 'sine', 0.16);
      tone(659, 0.14, 'sine', 0.16, 0.11);
      tone(784, 0.22, 'sine', 0.16, 0.22);
    },
    /** The win fanfare after the third gallery. */
    winFanfare: () => {
      tone(523, 0.16, 'triangle', 0.18);
      tone(659, 0.16, 'triangle', 0.18, 0.13);
      tone(784, 0.16, 'triangle', 0.18, 0.26);
      tone(1047, 0.4, 'triangle', 0.2, 0.39);
    },
  };
}
