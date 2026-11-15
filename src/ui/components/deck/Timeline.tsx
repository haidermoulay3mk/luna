// Built with help from Claude (Anthropic).
// Timeline (LUNA_BUILD A2.3): dots joined by a line. Done = check shape, current = accent dot,
// next = hollow ring. Used for the goal track (5 stops), chapter missions (3) and flight phases.
// Each stop also says its state in words for screen readers, so nothing relies on colour.
import type { CSSProperties } from 'react';

export type StopState = 'done' | 'current' | 'next';
export interface Stop {
  label: string;
  state: StopState;
}

const WORD: Record<StopState, string> = { done: 'done', current: 'you are here', next: 'not yet' };

/** Builds stops from a list of labels and the index of the current one (past the end = all done). */
export function stopsFrom(labels: readonly string[], current: number): Stop[] {
  return labels.map((label, i) => ({ label, state: i < current ? 'done' : i === current ? 'current' : 'next' }));
}

export function Timeline({ stops, label, compact = false, className = '' }: { stops: Stop[]; label: string; compact?: boolean; className?: string }) {
  const n = Math.max(1, stops.length);
  const reached = stops.reduce((last, stop, i) => (stop.state !== 'next' ? i : last), 0);
  const edge = `${50 / n}%`;
  const doneWidth = n > 1 ? `calc((100% - ${100 / n}%) * ${reached / (n - 1)})` : '0';
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden className="absolute top-[7px] h-px bg-line-strong" style={{ left: edge, right: edge }} />
      <span aria-hidden className="absolute top-[7px] h-px bg-white/60 motion-safe:transition-[width] motion-safe:duration-500" style={{ left: edge, width: doneWidth }} />
      <ol aria-label={label} className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` } as CSSProperties}>
        {stops.map((stop, i) => (
          <li key={`${stop.label}-${i}`} className="flex min-w-0 flex-col items-center text-center">
            <Dot state={stop.state} />
            {!compact && (
              <span
                className={`mt-1.5 max-w-full truncate px-1 font-mono text-[11px] uppercase tracking-[0.12em] ${
                  stop.state === 'current' ? 'font-bold text-sun' : stop.state === 'done' ? 'text-ink-soft' : 'text-ink-faint'
                }`}
              >
                {stop.label}
              </span>
            )}
            <span className="sr-only">
              {compact ? `${stop.label}: ` : ': '}
              {WORD[stop.state]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Dot({ state }: { state: StopState }) {
  if (state === 'done') {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0">
        <circle cx="8" cy="8" r="7" fill="#05070D" stroke="rgb(255 255 255 / 0.7)" />
        <path d="M4.5 8.2 L7 10.5 L11.5 5.5" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === 'current') {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0">
        <circle cx="8" cy="8" r="7" fill="#05070D" stroke="#FFB547" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3.5" fill="#FFB547" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0">
      <circle cx="8" cy="8" r="6" fill="#05070D" stroke="rgb(255 255 255 / 0.4)" strokeWidth="1.25" />
    </svg>
  );
}
