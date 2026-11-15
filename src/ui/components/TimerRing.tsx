// Built with help from Claude (Anthropic).
// Urgent-event timer: a ring that drains, white → amber at half time → red for the last 3 seconds.
// The number is always shown, so it never relies on colour.
import { useEffect } from 'react';
import { sfx } from '../sound';
export function TimerRing({ left, total, className = '' }: { left: number; total: number; className?: string }) {
  const whole = Math.ceil(left);
  const share = total > 0 ? Math.max(0, left / total) : 0;
  const tone = whole <= 3 ? 'text-bad' : whole <= total / 2 ? 'text-warn' : 'text-white';
  const r = 24;
  const circumference = 2 * Math.PI * r;
  return (
    <div role="timer" aria-label={`${whole} seconds left`} className={`relative grid h-16 w-16 shrink-0 place-items-center ${tone} ${className}`}>
      <svg viewBox="0 0 56 56" aria-hidden className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
        />
      </svg>
      <span className="font-mono text-2xl font-bold">{whole}</span>
    </div>
  );
}

/**
 * The countdown on urgent cards: a bar that drains across the whole card, with the seconds
 * shown to a tenth. White, then amber at half time, then red and pulsing for the last 5 seconds.
 * The number and the word "seconds" are always there, so it never relies on colour.
 */
export function TimerBar({ left, total }: { left: number; total: number }) {
  const whole = Math.ceil(left);
  // SPEC Part 8: the last seconds tick.
  useEffect(() => {
    if (whole <= 5 && whole > 0) sfx.tick();
  }, [whole]);
  const share = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const tone = left <= 5 ? 'bad' : left <= total / 2 ? 'warn' : 'calm';
  const fill = { bad: 'bg-bad', warn: 'bg-warn', calm: 'bg-white/80' }[tone];
  const text = { bad: 'text-bad', warn: 'text-warn', calm: 'text-ink' }[tone];
  return (
    <div role="timer" aria-label={`${whole} seconds left`} className="mb-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="hud-label">Time to decide</span>
        <span className={`hud-value text-3xl ${text} ${left <= 5 ? 'timer-pulse' : ''}`}>
          {left.toFixed(1)}
          <span className="ml-1 font-mono text-sm font-medium text-ink-faint">s</span>
        </span>
      </div>
      <div aria-hidden className="mt-1.5 h-1 overflow-hidden bg-white/10">
        <div className={`h-full ${fill}`} style={{ width: `${share * 100}%` }} />
      </div>
      <div aria-hidden className="mt-1 flex justify-between font-mono text-[11px] font-medium text-ink-faint">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i}>{Math.round(total - (i * total) / 4)}</span>
        ))}
      </div>
    </div>
  );
}
