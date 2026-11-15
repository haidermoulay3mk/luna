// Built with help from Claude (Anthropic).
// Right-hand status panel during a mission: three small segmented gauges, supplies,
// the objectives (ticked live) and the last log lines. Each gauge keeps its own icon,
// bar pattern and state shape + word, so nothing depends on colour alone.
import { useEffect, useRef, useState } from 'react';
import { GAUGE_IDS, GAUGE_LABEL, GAUGE_PARTS, INVERTED_PARTS, SPARE_PARTS, TARGET_LABEL } from '../../engine/balance';
import { gaugesOf, gaugeState } from '../../engine/reducer';
import { scoreMission } from '../../engine/scoring';
import type { GaugeId, Parts } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { STATE_LABEL, STATE_TEXT, signed } from '../format';
import { sfx } from '../sound';
import { GAUGE_ICON, StarIcon, StateIcon, TargetIcon } from '../icons/Icons';
import { GAUGE_FILL, GAUGE_TEXT } from './Gauge';

const SEGMENTS = 12;

export function StatusPanel({ className = '' }: { className?: string }) {
  const parts = useGameStore((s) => s.state.parts);
  const sol = useGameStore((s) => s.state.sol);
  const spareParts = useGameStore((s) => s.state.spareParts);
  const [open, setOpen] = useState<GaugeId | null>(null);
  const gauges = gaugesOf(parts);
  return (
    <aside aria-label="Base status" className={`hud p-3 lg:p-4 ${className}`}>
      <div className="hidden items-baseline justify-between lg:flex">
        <p className="hud-label">Base status</p>
        <p className="hud-label tabular-nums">Sol {sol}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 lg:mt-3 lg:grid-cols-1 lg:gap-2.5">
        {GAUGE_IDS.map((id) => (
          <div key={id}>
            <MiniGauge id={id} value={gauges[id]} expanded={open === id} onToggle={() => setOpen(open === id ? null : id)} />
            {open === id && <PartsList id={id} parts={parts} className="hidden lg:block" />}
          </div>
        ))}
      </div>
      {open && <PartsList id={open} parts={parts} className="lg:hidden" />}
      <div className="mt-3 hidden items-center justify-between lg:flex">
        <span className="hud-label">Supplies</span>
        <span className="flex items-center gap-1.5">
          {Array.from({ length: SPARE_PARTS.max }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-3 w-3 rotate-45 rounded-[2px] border ${i < spareParts ? 'border-sun bg-sun shadow-[0_0_8px_rgb(255_181_71/0.6)]' : 'border-line-strong'}`}
            />
          ))}
          <span className="ml-1 font-mono text-sm font-bold">
            {spareParts}/{SPARE_PARTS.max}
            <span className="sr-only"> supplies</span>
          </span>
        </span>
      </div>
      <Objectives />
      <MiniLog />
    </aside>
  );
}

/** A slim gauge: icon, name, number, state, and a 12-segment bar that lights up. */
function MiniGauge({ id, value, expanded, onToggle }: { id: GaugeId; value: number; expanded: boolean; onToggle: () => void }) {
  const shown = Math.round(value);
  const state = gaugeState(value);
  const Icon = GAUGE_ICON[id];
  const lit = Math.round((Math.max(0, Math.min(100, value)) / 100) * SEGMENTS);
  const flash = useChangeFlash(shown);
  // A soft alarm when a gauge drops into the red (SPEC Part 8).
  useEffect(() => {
    if (state === 'critical') sfx.alarm();
  }, [state]);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${GAUGE_LABEL[id]}: ${shown} out of 100, ${STATE_LABEL[state]}. Show its parts.`}
      className={`relative block min-h-14 w-full rounded-btn border px-2.5 py-2 text-left hover:border-line-strong hover:bg-space-800 lg:min-h-0 ${
        expanded ? 'border-line-strong bg-space-800' : 'border-line bg-space-950/40'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Icon className={`shrink-0 text-lg ${GAUGE_TEXT[id]}`} />
        <span className="hud-label hidden truncate lg:inline">{GAUGE_LABEL[id]}</span>
        <span className="hud-value ml-auto text-2xl">{shown}</span>
      </span>
      <span aria-hidden className="mt-1.5 flex gap-[3px]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-[2px] motion-safe:transition-colors motion-safe:duration-500 ${
              i < lit ? `${GAUGE_FILL[id]} ${state === 'critical' ? 'critical-pulse' : ''}` : 'bg-white/10'
            }`}
          />
        ))}
      </span>
      <span className={`mt-1.5 flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${STATE_TEXT[state]}`}>
        <StateIcon state={state} className="text-sm" />
        <span className="hidden sm:inline">{STATE_LABEL[state]}</span>
      </span>
      {flash && (
        <span
          key={flash.key}
          aria-hidden
          className={`toast-in absolute bottom-2 right-2.5 font-mono text-xs font-bold ${flash.delta > 0 ? "text-ok" : "text-bad"}`}
        >
          {signed(flash.delta)}
        </span>
      )}
    </button>
  );
}

/** Shows "+8" or "−12" next to a gauge for a moment after its number changes. */
function useChangeFlash(value: number) {
  const previous = useRef(value);
  const [flash, setFlash] = useState<{ delta: number; key: number } | null>(null);
  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    if (delta === 0) return;
    setFlash({ delta, key: Date.now() });
    const id = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(id);
  }, [value]);
  return flash;
}

export function PartsList({ id, parts, className = '' }: { id: GaugeId; parts: Parts; className?: string }) {
  return (
    <ul className={`mt-2 space-y-1.5 rounded-btn border border-line p-2.5 text-sm ${className}`}>
      {GAUGE_PARTS[id].map((sub) => {
        const lowerIsBetter = INVERTED_PARTS.has(sub);
        const value = Math.round(parts[sub]);
        return (
          <li key={sub}>
            <span className="flex justify-between gap-2">
              <span className="text-ink">
                {TARGET_LABEL[sub]}
                {lowerIsBetter && <span className="text-ink-faint"> (lower is better)</span>}
              </span>
              <span className="font-mono font-bold">{value}</span>
            </span>
            <span aria-hidden className="mt-0.5 block h-1 overflow-hidden bg-white/10">
              <span className={`block h-full ${lowerIsBetter ? 'bg-white/45' : GAUGE_FILL[id]}`} style={{ width: `${value}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The objective and bonus, ticked while the base meets them right now. */
export function Objectives() {
  const mission = useGameStore((s) => s.mission);
  const state = useGameStore((s) => s.state);
  const score = scoreMission(state, mission);
  const rows = [
    { icon: <TargetIcon className="text-sun" />, label: 'Objective', text: mission.objective, met: score.objectiveMet },
    { icon: <StarIcon className="text-sun" />, label: 'Bonus', text: mission.bonusObjective, met: score.bonusMet },
  ];
  return (
    <ul className="mt-3 space-y-2 border-t border-line pt-3">
      {rows.map((row) => (
        <li key={row.label} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 shrink-0">{row.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="hud-label block">{row.label}</span>
            <span className="text-ink">{row.text}</span>
          </span>
          <span className={`mt-0.5 shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${row.met ? "text-ok" : "text-ink-faint"}`}>{row.met ? "✓ On track" : "○ Not yet"}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniLog() {
  const log = useGameStore((s) => s.state.log);
  const recent = log.slice(-3).reverse();
  if (recent.length === 0) return null;
  return (
    <div className="mt-3 hidden border-t border-line pt-3 lg:block">
      <p className="hud-label">Mission log</p>
      <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-soft">
        {recent.map((entry, i) => (
          <li key={`${entry.sol}-${i}`} className="truncate">
            Sol {entry.sol}: {entry.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
