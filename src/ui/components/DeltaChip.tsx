// Built with help from Claude (Anthropic).
// How much a gauge changed, e.g. "Power ↑ +12". Arrow and sign, not just colour.
// Phase 5 makes it float up and fade (SPEC Part 8).
import { GAUGE_LABEL } from '../../engine/balance';
import type { GaugeId } from '../../engine/types';
import { signed } from '../format';
import { CostIcon, GAUGE_ICON, GainIcon } from '../icons/Icons';
import { GAUGE_TEXT } from './Gauge';

export function DeltaChip({ gauge, delta }: { gauge: GaugeId; delta: number }) {
  const Icon = GAUGE_ICON[gauge];
  const Arrow = delta > 0 ? GainIcon : CostIcon;
  return (
    <span className="inline-flex items-center gap-2 rounded-btn border border-line bg-space-950/40 px-3 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.06em]">
      <Icon className={GAUGE_TEXT[gauge]} /> {GAUGE_LABEL[gauge]}
      <Arrow className={delta > 0 ? 'text-ok' : 'text-bad'} /> {signed(delta)}
    </span>
  );
}
