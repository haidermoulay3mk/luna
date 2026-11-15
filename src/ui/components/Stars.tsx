// Built with help from Claude (Anthropic).
// Mission stars (SPEC 4.6): finish with the objective, no gauge critical, bonus objective.
// Earned stars are filled and say "Earned", so they read without colour.
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { scoreMission } from '../../engine/scoring';
import { usePrefersReducedMotion } from '../hooks';
import { sfx } from '../sound';
import type { Mission, MissionState } from '../../engine/types';
import { StarIcon } from '../icons/Icons';

export function Stars({ state, mission }: { state: MissionState; mission: Mission }) {
  const score = scoreMission(state, mission);
  const reduced = usePrefersReducedMotion();
  const base = score.finished && score.objectiveMet;
  // Stars stamp in one by one, each with its own sound (SPEC Part 8).
  useEffect(() => {
    for (let i = 0; i < score.stars; i++) sfx.stamp(i);
    // Only when the card first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rows = [
    { earned: base, text: `Objective: ${mission.objective}` },
    { earned: base && score.neverCritical, text: 'No gauge went critical' },
    { earned: base && score.bonusMet, text: `Bonus: ${mission.bonusObjective}` },
  ];
  return (
    <section aria-label="Stars" className="mt-3">
      <h3 className="font-display text-xl font-bold">
        {base ? 'Mission complete' : 'Objective missed'} · {score.stars} of 3 stars
      </h3>
      <ul className="mt-2 space-y-1 text-base">
        {rows.map((row, index) => (
          <li key={row.text} className="flex items-center gap-3">
            <motion.span
              className="shrink-0"
              initial={row.earned && !reduced ? { scale: 2.2, opacity: 0, rotate: -25 } : false}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.15 + index * 0.25, type: 'spring', stiffness: 400, damping: 18 }}
            >
              <StarIcon filled={row.earned} className={`text-lg ${row.earned ? 'text-sun' : 'text-ink-faint'}`} />
            </motion.span>
            <span>{row.text}</span>
            <span className={`ml-auto text-base font-bold ${row.earned ? 'text-sun' : 'text-ink-faint'}`}>
              {row.earned ? 'Earned' : 'Not yet'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
