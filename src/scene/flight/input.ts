// Built with help from Claude (Anthropic).
// Flight controls. Keyboard: W/S thrust and brake, A/D or ←/→ turn, Space (or E) rise straight up,
// Shift (or Q) sink down, ↑/↓ tilt the nose. Touch: on-screen buttons set the same axes.
// Read every frame by the scene.
import { useEffect } from 'react';
import type { ShipInput } from '../../engine/flight';

const held = new Set<string>();
/** Axes from the touch buttons (−1, 0 or 1 each). */
export const touchAxes: ShipInput = { thrust: 0, turn: 0, pitch: 0, lift: 0 };

const KEY_AXES: Record<string, [keyof ShipInput, number]> = {
  w: ['thrust', 1],
  s: ['thrust', -1],
  a: ['turn', -1],
  arrowleft: ['turn', -1],
  d: ['turn', 1],
  arrowright: ['turn', 1],
  arrowup: ['pitch', 1],
  arrowdown: ['pitch', -1],
  ' ': ['lift', 1],
  e: ['lift', 1],
  shift: ['lift', -1],
  q: ['lift', -1],
};

/** The current controls, keyboard and touch added together. */
export function readInput(): ShipInput {
  const input: ShipInput = { ...touchAxes };
  for (const key of held) {
    const axis = KEY_AXES[key];
    if (axis) input[axis[0]] += axis[1];
  }
  return input;
}

export function useFlightKeyboard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
      const key = e.key.toLowerCase();
      if (!(key in KEY_AXES)) return;
      // Space would click a focused button and the arrows would scroll the page.
      e.preventDefault();
      held.add(key);
    };
    const up = (e: KeyboardEvent) => held.delete(e.key.toLowerCase());
    const clear = () => held.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      held.clear();
      Object.assign(touchAxes, { thrust: 0, turn: 0, pitch: 0, lift: 0 });
    };
  }, [enabled]);
}
