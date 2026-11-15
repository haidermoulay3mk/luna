// Built with help from Claude (Anthropic).
// One big gauge (SPEC 4.2): icon, name, number, state shape and a patterned bar.
// Tap it to open its parts. Colour is never the only signal: each gauge has its own icon
// and bar pattern, and each state has its own shape and word (circle / triangle / octagon).
import { gaugeState } from '../../engine/reducer';
import type { GaugeId } from '../../engine/types';
import { GaugeTile } from './deck/GaugeTile';

export const GAUGE_TEXT: Record<GaugeId, string> = { power: 'text-sun', life: 'text-life', crew: 'text-crew' };
export const GAUGE_FILL: Record<GaugeId, string> = {
  power: 'bg-sun pattern-power',
  life: 'bg-life pattern-life',
  crew: 'bg-crew pattern-crew',
};

export function GaugeBar({ id, value, className = '' }: { id: GaugeId; value: number; className?: string }) {
  const shown = Math.min(100, Math.max(0, Math.round(value)));
  const critical = gaugeState(value) === 'critical';
  return (
    <span aria-hidden className={`block overflow-hidden bg-white/10 ${className}`}>
      <span
        className={`block h-full motion-safe:transition-[width] motion-safe:duration-700 ${GAUGE_FILL[id]} ${critical ? 'critical-pulse' : ''}`}
        style={{ width: `${shown}%` }}
      />
    </span>
  );
}

/** One big gauge in its own frame (Flight Deck): the GaugeTile, tap to open its parts. */
export function Gauge({
  id,
  value,
  expanded,
  onToggle,
}: {
  id: GaugeId;
  value: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="hud overflow-visible">
      <GaugeTile id={id} value={value} expanded={expanded} onClick={onToggle} className="rounded-panel" />
    </div>
  );
}
