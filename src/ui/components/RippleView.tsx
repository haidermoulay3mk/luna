// Built with help from Claude (Anthropic).
// The Ripple view (LUNA_BUILD B3): after each choice, for about 2 s (skippable), a small map of
// the 12 tracked factors joined by lines. Direct effects flash first, knock-ons travel along the
// lines 0.3 s apart, each node shows its +/− chip, and one line counts them: "That decision
// touched 11 systems." Reduced motion: the final state with no travel. Lite mode: a plain list.
import { useEffect, type CSSProperties } from 'react';
import { FACTORS, FACTOR_LABEL, HIGHER_IS_WORSE, RIPPLE_LINKS, touchedLine, type Factor, type Ripple } from '../../engine/ripple';
import { useGameStore } from '../../store/gameStore';
import { useSettings } from '../../store/settings';
import { signed } from '../format';
import { usePrefersReducedMotion } from '../hooks';
import { sfx } from '../sound';
import { Frame } from './deck/Frame';

/** How long the view stays before Why? opens (it can be skipped any time). */
export const RIPPLE_SECONDS = 2.4;
const STAGGER = 0.3;

/** Node positions on the map (viewBox 360 × 216): Power, Life Support and Crew columns, then the rest. */
const AT: Record<Factor, [number, number]> = {
  solar: [34, 36],
  battery: [34, 106],
  spareParts: [34, 176],
  oxygen: [126, 36],
  water: [126, 106],
  food: [126, 176],
  health: [218, 36],
  morale: [218, 106],
  radiation: [218, 176],
  sols: [318, 36],
  cargo: [318, 106],
  bolt: [318, 176],
};

/** Good news or bad news for this factor (a dose and time spent are worse when they go up). */
const isGood = (factor: Factor, delta: number) => (HIGHER_IS_WORSE.has(factor) ? delta < 0 : delta > 0);

/** When each node lights up: direct effects at once, knock-ons one after another. */
export function rippleDelays(ripple: Ripple): Partial<Record<Factor, number>> {
  const delays: Partial<Record<Factor, number>> = {};
  for (const f of ripple.direct) delays[f] = 0;
  ripple.knockOn.forEach((f, i) => (delays[f] = (i + 1) * STAGGER));
  return delays;
}

export function RippleView() {
  const ripple = useGameStore((s) => s.ripple);
  const open = useGameStore((s) => s.rippleOpen);
  const finish = useGameStore((s) => s.finishRipple);
  const lite = useSettings((s) => s.lite);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!open || !ripple) return;
    // One soft blip per touched system, rising (silent when sound is off).
    if (!reduced) for (let i = 0; i < Math.min(ripple.touched, 12); i++) sfx.ripple(i);
    const id = window.setTimeout(finish, RIPPLE_SECONDS * 1000 + ripple.knockOn.length * STAGGER * 500);
    return () => window.clearTimeout(id);
  }, [open, ripple, finish, reduced]);

  if (!open || !ripple) return null;
  return (
    <div className="pointer-events-auto absolute left-2 right-2 top-[4.5rem] z-30 sm:left-3 sm:right-auto sm:w-[25rem] lg:top-24">
      <Frame
        glass
        index="R"
        label="Ripple · systems touched"
        right={
          <button type="button" onClick={finish} className="rounded-btn border border-line-strong px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-space-800">
            Skip <span className="text-ink-faint">[Enter]</span>
          </button>
        }
        bodyClassName="p-3"
      >
        {lite ? <RippleList ripple={ripple} /> : <RippleMap ripple={ripple} reduced={reduced} />}
        <p role="status" className="mt-2 font-display text-lg font-bold">
          {touchedLine(ripple.touched)}
        </p>
        {ripple.rules.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
            {ripple.rules.slice(0, 3).map((rule) => (
              <li key={rule.id}>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-warn">Knock-on</span> {rule.reason}.
              </li>
            ))}
          </ul>
        )}
      </Frame>
    </div>
  );
}

function RippleMap({ ripple, reduced }: { ripple: Ripple; reduced: boolean }) {
  const delays = rippleDelays(ripple);
  const lit = (f: Factor) => delays[f] !== undefined;
  return (
    <svg viewBox="0 0 360 216" className="w-full" role="img" aria-label={`Ripple map: ${ripple.touched} of 12 systems changed`}>
      {RIPPLE_LINKS.map(([a, b]) => {
        const on = lit(a) && lit(b);
        const [x1, y1] = AT[a];
        const [x2, y2] = AT[b];
        const len = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
        const delay = Math.max(delays[a] ?? 0, delays[b] ?? 0);
        return (
          <line
            key={`${a}-${b}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={on ? '#FFB547' : 'rgb(255 255 255 / 0.14)'}
            strokeWidth={on ? 1.5 : 1}
            className={on && !reduced ? 'draw-in' : undefined}
            style={on && !reduced ? ({ '--len': len, animationDelay: `${delay}s` } as CSSProperties) : undefined}
          />
        );
      })}
      {FACTORS.map((f) => {
        const [x, y] = AT[f];
        const delta = ripple.deltas[f];
        const on = delta !== undefined;
        const good = on && isGood(f, delta);
        const direct = ripple.direct.includes(f);
        const style = on && !reduced ? ({ animationDelay: `${delays[f]}s` } as CSSProperties) : undefined;
        return (
          <g key={f}>
            <circle
              cx={x}
              cy={y}
              r={11}
              fill={on ? (direct ? '#FFB547' : '#121826') : '#05070D'}
              stroke={on ? '#FFB547' : 'rgb(255 255 255 / 0.3)'}
              strokeWidth={on ? 2 : 1}
              className={on && !reduced ? 'ripple-node' : undefined}
              style={style}
            />
            <text x={x} y={y + 25} textAnchor="middle" className="fill-[rgb(255_255_255/0.68)] font-mono" fontSize="11">
              {FACTOR_LABEL[f].replace('Radiation dose', 'Dose').replace('Spare parts', 'Parts').replace('Mars cargo', 'Cargo')}
            </text>
            {on && (
              <g className={!reduced ? 'ripple-chip' : undefined} style={style}>
                <rect x={x + 9} y={y - 22} width={34} height={15} rx={3} fill="#05070D" stroke={good ? '#4ADE80' : '#F87171'} />
                <text x={x + 26} y={y - 11} textAnchor="middle" fontSize="11" className={`font-mono font-bold ${good ? 'fill-ok' : 'fill-bad'}`}>
                  {(delta > 0 ? '▲' : '▼') + Math.abs(delta)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Lite mode: the same news as a plain list. */
function RippleList({ ripple }: { ripple: Ripple }) {
  const row = (f: Factor) => {
    const delta = ripple.deltas[f]!;
    return (
      <li key={f} className="flex items-center gap-2">
        <span className="flex-1">{FACTOR_LABEL[f]}</span>
        <span className={`font-mono text-sm font-bold ${isGood(f, delta) ? 'text-ok' : 'text-bad'}`}>
          {delta > 0 ? '▲' : '▼'} {signed(delta)}
        </span>
      </li>
    );
  };
  return (
    <div className="grid gap-3 text-base sm:grid-cols-2">
      <div>
        <p className="hud-label">Direct</p>
        <ul className="mt-1 space-y-0.5">{ripple.direct.map(row)}</ul>
      </div>
      <div>
        <p className="hud-label">Knock-on</p>
        <ul className="mt-1 space-y-0.5">{ripple.knockOn.length ? ripple.knockOn.map(row) : <li className="text-ink-soft">None</li>}</ul>
      </div>
    </div>
  );
}
