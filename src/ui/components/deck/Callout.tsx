// Built with help from Claude (Anthropic).
// Callout (LUNA_BUILD A2.3): a dot on the object, a 1 px elbow leader line, and a text block
// (title in Space Grotesk, one mono sub-line). The line draws in over 250 ms, staggered 60 ms
// by `order`. Used for planets, mission sites and station modules. Positioned by its anchor
// (the dot) in % of the parent, which must be `relative`.
import type { CSSProperties, ReactNode } from 'react';

export interface CalloutProps {
  /** The dot: % from the parent's left and top. */
  x: number;
  y: number;
  title: string;
  sub?: string;
  /** Which way the leader line runs from the dot. */
  side?: 'left' | 'right';
  /** Length of the elbow's two legs in px. */
  rise?: number;
  run?: number;
  /** Accent = the next destination / "you are here". Dim = background objects. */
  tone?: 'accent' | 'normal' | 'dim';
  order?: number;
  onClick?: () => void;
  label?: string;
  children?: ReactNode;
}

const STROKE = { accent: '#FFB547', normal: 'rgb(255 255 255 / 0.55)', dim: 'rgb(255 255 255 / 0.28)' } as const;

export function Callout({ x, y, title, sub, side = 'right', rise = 28, run = 36, tone = 'normal', order = 0, onClick, label, children }: CalloutProps) {
  const w = run + 2;
  const h = rise + 2;
  const right = side === 'right';
  const d = right ? `M1 ${h - 1} L${Math.round(run * 0.4)} 1 L${w - 1} 1` : `M${w - 1} ${h - 1} L${w - 1 - Math.round(run * 0.4)} 1 L1 1`;
  const len = Math.ceil(Math.hypot(run * 0.4, rise) + run * 0.6) + 2;
  const text = (
    <>
      <span className={`block font-display text-base font-bold leading-tight ${tone === 'accent' ? 'text-sun' : tone === 'dim' ? 'text-ink-soft' : 'text-ink'}`}>{title}</span>
      {sub && <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">{sub}</span>}
      {children}
    </>
  );
  return (
    <div className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <span aria-hidden className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full" style={{ background: STROKE[tone] }} />
      <svg aria-hidden width={w} height={h} className="absolute overflow-visible" style={{ top: -h + 1, left: right ? 0 : -w + 1 }}>
        <path d={d} fill="none" stroke={STROKE[tone]} strokeWidth="1" className="draw-in" style={{ '--len': len, '--i': order } as CSSProperties} />
      </svg>
      <div className="frame-in absolute whitespace-nowrap" style={{ top: -h - 10, ...(right ? { left: w + 4 } : { right: w + 4 }), ['--i' as string]: order + 2 } as CSSProperties}>
        {onClick ? (
          <button type="button" onClick={onClick} aria-label={label ?? title} className="pointer-events-auto rounded-btn px-1 text-left hover:bg-space-800/70">
            {text}
          </button>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
