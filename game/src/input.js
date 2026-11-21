// Keyboard and mouse input: WASD or arrows to move, Shift to sneak, Space or click
// to confirm, P or Escape to pause, R to restart the level, M to mute. The game reads
// a snapshot each frame; clicks are queued so a throw is never lost between frames.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

/** Attach listeners to the canvas and return the live input state. */
export function createInput(canvas) {
  const keys = new Set();
  const clicks = [];
  let mouse = { x: 0, y: 0 };
  let actions = 0;

  function onKeyDown(event) {
    if (event.code in MOVE_KEYS || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onClick(event) {
    onMouseMove(event);
    clicks.push({ x: mouse.x, y: mouse.y });
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  /** The normalised movement direction from the keys held this frame. */
  function direction() {
    let x = 0;
    let y = 0;
    for (const code of keys) {
      const move = MOVE_KEYS[code];
      if (move) {
        x += move.x;
        y += move.y;
      }
    }
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  return {
    direction,
    isSneaking: () => keys.has('ShiftLeft') || keys.has('ShiftRight'),
    mousePosition: () => ({ ...mouse }),
    /** Clicks since the last frame, in canvas pixels; drains the queue. */
    takeClicks: () => clicks.splice(0, clicks.length),
    /** One-shot actions since the last frame; drains them. */
    takeActions: () => {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
