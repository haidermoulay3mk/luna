// Built with help from Claude (Anthropic).
// Demo jump (LUNA_BUILD B5): F2 opens every chapter and flight, all unlocked, so a slow
// laptop or a crash never stops the pitch. It plays as a separate "Demo" commander.
import { useEffect, useState } from 'react';
import { CHAPTERS, missionById, needsFlight, placeById, placeForMission } from '../../data/content';
import { placeBefore, useGameStore } from '../../store/gameStore';
import { Dialog } from './Dialog';

/**
 * F2, but not while typing a name. It used to be Shift + D, but Shift (run) + D (right) is a movement
 * combo, so it popped up while walking or flying (friend's report, 15 Nov).
 */
export function isDemoKey(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat' | 'target'>): boolean {
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return false;
  if (e.key !== 'F2') return false;
  const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]') !== null;
  return !typing;
}

const FLIGHT_NAME = { 'earth-moon': 'Flight 1 · to the Moon', 'moon-mars': 'Flight 2 · to Mars' } as const;

export function DemoJump() {
  const [open, setOpen] = useState(false);
  const demoJump = useGameStore((s) => s.demoJump);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isDemoKey(e)) return;
      if (useGameStore.getState().screen === 'flight') return;
      e.preventDefault();
      setOpen((o) => !o);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const jump = (id: number, fly: boolean) => {
    setOpen(false);
    demoJump(id, fly);
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Demo jump">
      <p className="text-base text-ink-soft">Everything is unlocked. Plays as the Demo commander, so saves are safe.</p>
      <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {CHAPTERS.map((chapter) => {
          const first = chapter.missions[0];
          const flies = chapter.flightIn && needsFlight(placeById(placeBefore(first)), placeForMission(first));
          return (
            <section key={chapter.id} aria-label={`Chapter ${chapter.id}: ${chapter.title}`}>
              <h3 className="mb-2 flex items-baseline gap-2">
                <span className="font-mono text-[11px] font-bold text-sun">{String(chapter.id).padStart(2, '0')}</span>
                <span className="font-display text-base font-bold uppercase tracking-[0.08em]">{chapter.title}</span>
              </h3>
              {flies && chapter.flightIn && (
                <button type="button" onClick={() => jump(first, true)} className="btn-secondary mb-2 min-h-11 w-full px-3 text-sm">
                  {FLIGHT_NAME[chapter.flightIn]}
                </button>
              )}
              <ul className="grid gap-2 sm:grid-cols-3">
                {chapter.missions.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => jump(id, false)}
                      aria-label={`Play ${missionById(id)?.title}`}
                      className="btn-secondary min-h-11 w-full px-2 text-xs normal-case tracking-normal"
                    >
                      {missionById(id)?.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
