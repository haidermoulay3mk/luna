// Built with help from Claude (Anthropic).
// The goal track (LUNA_BUILD B1), always on screen as a thin strip:
// Earth · Moon · Deep space · Mars · Olympus summit, with the crew's position marked and the
// Mars Cargo meter beside it (crates the Moon base has loaded into the rocket).
import { ORDERS, START_PLACES } from '../../data/content';
import { CARGO } from '../../engine/balance';
import { GOAL_STOPS, goalStop } from '../../engine/chapters';
import { useGameStore } from '../../store/gameStore';
import { Timeline, stopsFrom } from './deck/Timeline';

/** The one-line goal (LUNA_BUILD B1), on the title screen and in the HUD. */
export const GOAL_LINE = 'Reach the summit of Olympus Mons and switch on Olympus Station.';

export function CargoMeter({ crates, className = '' }: { crates: number; className?: string }) {
  const share = Math.max(0, Math.min(1, crates / CARGO.max));
  return (
    <div className={`min-w-[7.5rem] ${className}`} role="group" aria-label={`Mars Cargo: ${crates} of ${CARGO.max} crates`}>
      <p className="flex items-baseline justify-between gap-2">
        <span className="hud-label">Mars cargo</span>
        <span className="font-mono text-xs font-bold text-ink">
          {crates}
          <span className="text-ink-faint">/{CARGO.max}</span>
        </span>
      </p>
      <span aria-hidden className="mt-1 flex h-1 gap-px">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={`flex-1 ${i < Math.round(share * 12) ? 'bg-sun' : 'bg-white/10'}`} />
        ))}
      </span>
    </div>
  );
}

export function GoalStrip({ className = '' }: { className?: string }) {
  const progress = useGameStore((s) => s.progress);
  if (!progress) return null;
  const stop = goalStop(progress, ORDERS.moon.length, START_PLACES);
  return (
    <div className={`hud plain flex items-center gap-4 px-3 py-1.5 ${className}`}>
      <p className="hidden max-w-[13rem] font-mono text-[11px] uppercase leading-tight tracking-[0.12em] text-ink-soft xl:block">{GOAL_LINE}</p>
      <Timeline label="Goal track" stops={stopsFrom(GOAL_STOPS, stop)} className="min-w-0 flex-1" />
      <CargoMeter crates={progress.cargo ?? 0} className="shrink-0" />
    </div>
  );
}
