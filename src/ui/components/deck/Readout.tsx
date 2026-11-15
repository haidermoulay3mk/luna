// Built with help from Claude (Anthropic).
// Readout (LUNA_BUILD A2.3): a big mono number with a small unit, a label above and a delta
// chip beside it. The number counts to its new value in 300 ms (instantly with reduced motion).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { signed } from '../../format';
import { usePrefersReducedMotion } from '../../hooks';

/** Counts from the old value to the new one over `ms` milliseconds. */
export function useCountTo(value: number, ms = 300): number {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced || ms <= 0 || typeof window.requestAnimationFrame !== 'function') {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      const current = origin + (value - origin) * eased;
      from.current = current;
      setShown(current);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, ms, reduced]);
  return shown;
}

export interface ReadoutProps {
  label: string;
  value: number;
  unit?: string;
  digits?: number;
  /** Change since the last step, shown as a chip with an arrow sign (not colour alone). */
  delta?: number | null;
  /** Tailwind classes for the number (for example a gauge colour). */
  tone?: string;
  size?: 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  /** Live telemetry (updated many times a second): show the number as it is, no counting. */
  instant?: boolean;
  className?: string;
}

const SIZE = { md: 'text-2xl', lg: 'text-4xl', xl: 'text-5xl' } as const;

export function Readout({ label, value, unit, digits = 0, delta, tone = 'text-ink', size = 'lg', icon, instant = false, className = '' }: ReadoutProps) {
  const shown = useCountTo(value, instant ? 0 : 300);
  return (
    <div className={className}>
      <p className="hud-label flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className={`hud-value ${SIZE[size]} ${tone}`}>{shown.toFixed(digits)}</span>
        {unit && <span className="font-mono text-xs font-medium text-ink-faint">{unit}</span>}
        {delta ? <DeltaTag delta={delta} /> : null}
      </p>
    </div>
  );
}

/** "▲ +12" / "▼ −8": arrow shape plus sign, so it never relies on colour. */
export function DeltaTag({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <span className={`ml-1 inline-flex items-center gap-0.5 rounded border px-1 font-mono text-[11px] font-bold ${up ? 'border-ok/40 text-ok' : 'border-bad/40 text-bad'}`}>
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      {signed(delta)}
    </span>
  );
}
