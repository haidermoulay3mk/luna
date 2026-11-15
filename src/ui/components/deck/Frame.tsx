// Built with help from Claude (Anthropic).
// Frame (LUNA_BUILD A2.3): the instrument panel every screen is built from. Panel colour at
// 80 %, 1 px line border, four 10 px corner brackets (SVG, they draw in), and a header row:
// index number in mono accent ("01"), a mono uppercase label, an optional right slot.
// `glass` adds blur: at most 2 glass frames on screen, and never in Lite mode.
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useSettings } from '../../../store/settings';

export interface FrameProps {
  /** "01", "02"… shown in mono accent before the label. */
  index?: number | string;
  label?: string;
  /** Anything on the right of the header row (a DataTag, a count, a button). */
  right?: ReactNode;
  glass?: boolean;
  /** Position in the screen's entry stagger (40 ms each). */
  order?: number;
  as?: ElementType;
  className?: string;
  bodyClassName?: string;
  'aria-label'?: string;
  children?: ReactNode;
}

export function Frame({ index, label, right, glass = false, order = 0, as: Tag = 'section', className = '', bodyClassName = '', children, ...rest }: FrameProps) {
  const lite = useSettings((s) => s.lite);
  const blur = glass && !lite;
  const header = index !== undefined || label || right;
  return (
    <Tag
      aria-label={rest['aria-label'] ?? label}
      className={`hud plain frame-in ${blur ? 'glass' : ''} ${className}`}
      style={{ '--i': order } as CSSProperties}
    >
      <Brackets order={order} />
      {header && (
        <header className="flex items-center gap-2 border-b border-line px-3 py-2">
          {index !== undefined && <span className="font-mono text-[11px] font-bold text-sun">{String(index).padStart(2, '0')}</span>}
          {label && <span className="hud-label truncate">{label}</span>}
          {right && <span className="ml-auto flex shrink-0 items-center gap-2">{right}</span>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

/** Four L-shaped corner brackets, just outside the rounded corners, drawn in on entry. */
export function Brackets({ order = 0 }: { order?: number }) {
  const corners: [string, string][] = [
    ['-left-1 -top-1', 'M1 11 V1 H11'],
    ['-right-1 -top-1', 'M0 1 H10 V11'],
    ['-bottom-1 -left-1', 'M1 0 V10 H11'],
    ['-bottom-1 -right-1', 'M0 10 H10 V0'],
  ];
  return (
    <>
      {corners.map(([where, d]) => (
        <svg key={where} aria-hidden viewBox="0 0 11 11" className={`pointer-events-none absolute h-[11px] w-[11px] ${where}`}>
          <path d={d} fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth="1" className="draw-in" style={{ '--len': 20, '--i': order } as CSSProperties} />
        </svg>
      ))}
    </>
  );
}
