// Built with help from Claude (Anthropic).
// GaugeTile (LUNA_BUILD A2.3): a Readout, a 4 px bar with a tick every 10 and a notch at the
// critical line (30), a sparkline of the last 8 values, and the state shape (circle / triangle /
// octagon) with its word, so the state never depends on colour.
import { useEffect, useRef, useState } from 'react';
import { GAUGE_LABEL, THRESHOLDS } from '../../../engine/balance';
import { gaugeState } from '../../../engine/reducer';
import type { GaugeId } from '../../../engine/types';
import { STATE_LABEL, STATE_TEXT } from '../../format';
import { GAUGE_ICON, StateIcon } from '../../icons/Icons';
import { GAUGE_FILL, GAUGE_TEXT } from '../Gauge';
import { Readout } from './Readout';

const HISTORY = 8;

/** Remembers the last 8 distinct values (rounded) for the sparkline. */
export function useHistory(value: number): number[] {
  const rounded = Math.round(value);
  const [history, setHistory] = useState<number[]>([rounded]);
  const last = useRef(rounded);
  useEffect(() => {
    if (rounded === last.current) return;
    last.current = rounded;
    setHistory((h) => [...h, rounded].slice(-HISTORY));
  }, [rounded]);
  return history;
}

/** Points for an SVG polyline 0…w × 0…h, value 0–100 bottom to top. */
export function sparkPoints(values: readonly number[], w = 64, h = 18): string {
  if (values.length === 1) return `0,${h - (values[0] / 100) * h} ${w},${h - (values[0] / 100) * h}`;
  return values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - (Math.max(0, Math.min(100, v)) / 100) * h).toFixed(1)}`).join(' ');
}

/** The 4 px bar: ticks every 10, a notch at the critical line. */
export function TickBar({ id, value, className = '' }: { id: GaugeId; value: number; className?: string }) {
  const shown = Math.max(0, Math.min(100, Math.round(value)));
  const critical = gaugeState(value) === 'critical';
  return (
    <span aria-hidden className={`relative block h-1 bg-white/10 ${className}`}>
      <span className={`absolute inset-y-0 left-0 motion-safe:transition-[width] motion-safe:duration-500 ${GAUGE_FILL[id]} ${critical ? 'critical-pulse' : ''}`} style={{ width: `${shown}%` }} />
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="absolute -bottom-1 h-1 w-px bg-white/25" style={{ left: `${(i + 1) * 10}%` }} />
      ))}
      <span className="absolute -top-1 h-3 w-0.5 bg-white/70" style={{ left: `${THRESHOLDS.caution}%` }} title="Critical line" />
    </span>
  );
}

export function GaugeTile({
  id,
  value,
  delta,
  onClick,
  expanded,
  className = '',
}: {
  id: GaugeId;
  value: number;
  delta?: number | null;
  onClick?: () => void;
  expanded?: boolean;
  className?: string;
}) {
  const state = gaugeState(value);
  const history = useHistory(value);
  const Icon = GAUGE_ICON[id];
  const shown = Math.round(value);
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <Readout label={GAUGE_LABEL[id]} icon={<Icon className={`text-sm ${GAUGE_TEXT[id]}`} />} value={shown} unit="/100" tone={GAUGE_TEXT[id]} size="lg" delta={delta} />
        <svg aria-hidden viewBox="0 0 64 18" className="mt-5 h-[18px] w-16 shrink-0 overflow-visible">
          <polyline points={sparkPoints(history)} fill="none" stroke="currentColor" strokeWidth="1.25" className={GAUGE_TEXT[id]} />
        </svg>
      </span>
      <TickBar id={id} value={value} className="mt-3" />
      <span className={`mt-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${STATE_TEXT[state]}`}>
        <StateIcon state={state} className="text-sm" />
        {STATE_LABEL[state]}
      </span>
    </>
  );
  const label = `${GAUGE_LABEL[id]}: ${shown} out of 100, ${STATE_LABEL[state]}.`;
  if (!onClick) {
    return (
      <div role="group" aria-label={label} className={`block p-3 ${className}`}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} aria-label={`${label} Show its parts.`} className={`block w-full p-3 text-left hover:bg-space-800 ${expanded ? 'bg-space-800' : ''} ${className}`}>
      {body}
    </button>
  );
}
