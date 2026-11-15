// Built with help from Claude (Anthropic).
// The Mission Log (LUNA_BUILD B7): the six mission patches (earned or still to win) and every
// "Why?" science card unlocked so far, each with its NASA source.
import { useState } from 'react';
import { CHAPTERS, MISSIONS, firstEvent } from '../../data/content';
import { STARS_PER_CHAPTER } from '../../engine/balance';
import { useGameStore } from '../../store/gameStore';
import { Dialog } from './Dialog';
import { MissionPatch } from './MissionPatch';
import { WhyContent } from './WhyPanel';

export function MissionLogButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`hud-btn w-auto px-3 font-mono text-xs font-bold uppercase tracking-[0.12em] lg:w-auto ${className}`}>
        Mission log
      </button>
      <MissionLog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function MissionLog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const progress = useGameStore((s) => s.progress);
  const cards = MISSIONS.filter((m) => progress?.cards.includes(m.scienceCardId));
  return (
    <Dialog open={open} onClose={onClose} title="Mission log">
      <p className="hud-label">Mission patches</p>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {CHAPTERS.map((c) => {
          const stars = progress?.chapterStars?.[String(c.id)];
          const earned = stars !== undefined;
          return (
            <li key={c.id} className="flex flex-col items-center text-center">
              <MissionPatch chapter={c} earned={earned} size={88} />
              <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                {earned ? `${stars}/${STARS_PER_CHAPTER} stars` : 'Not yet'}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="hud-label mt-5">Science cards ({cards.length})</p>
      {cards.length === 0 ? (
        <p className="mt-2 text-ink-soft">Finish a mission to unlock its card.</p>
      ) : (
        <ul className="mt-2 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
          {cards.map((m) => {
            const event = firstEvent(m);
            return (
              <li key={m.id} className="rounded-btn border border-line p-3">
                <p className="font-display font-bold">{m.title}</p>
                {event && (
                  <div className="mt-1 text-base">
                    <WhyContent event={event} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
