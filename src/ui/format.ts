// Built with help from Claude (Anthropic).
import { TARGET_LABEL } from '../engine/balance';
import type { Difficulty, Effect, GaugeState } from '../engine/types';

export const STATE_LABEL: Record<GaugeState, string> = { good: 'Good', caution: 'Caution', critical: 'Critical' };
export const STATE_TEXT: Record<GaugeState, string> = { good: 'text-ok', caution: 'text-warn', critical: 'text-bad' };

export const DIFFICULTY_NOTE: Record<Difficulty, string> = {
  explorer: 'No timer, and supplies last longer.',
  mission: '20 seconds to decide on each card.',
  commander: '15 seconds on each card, and supplies run down faster.',
};

/** "+12" or "−8" with a real minus sign; one decimal only when needed. */
export function signed(value: number): string {
  const size = Math.abs(value);
  const text = Number.isInteger(size) ? String(size) : size.toFixed(1);
  return `${value < 0 ? '−' : '+'}${text}`;
}

export const effectText = (effect: Effect) =>
  effect.target === 'time'
    ? `${effect.delta} more ${effect.delta === 1 ? 'sol' : 'sols'}`
    : `${TARGET_LABEL[effect.target]} ${signed(effect.delta)}`;
