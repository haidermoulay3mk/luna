// Built with help from Claude (Anthropic).
// A small modal built on the native <dialog> element (focus stays inside, Esc closes it),
// plus the Settings and How to play dialogs used on the home and play screens.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { DIFFICULTY } from '../../engine/balance';
import type { Difficulty } from '../../engine/types';
import { difficultyOf, useGameStore } from '../../store/gameStore';
import { DIFFICULTY_NOTE } from '../format';
import { useSettings } from '../../store/settings';
import { CautionIcon, CloseIcon, CriticalIcon, GoodIcon, SoundIcon } from '../icons/Icons';

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Older browsers (and the test DOM) may not have showModal: fall back to a plain open dialog.
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="w-[min(32rem,calc(100%-2rem))] rounded-panel border border-line bg-space-900 p-0 text-white shadow-panel backdrop:bg-space-950/80"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-secondary w-14 shrink-0 px-0">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  );
}

/** Explorer / Mission / Commander (SPEC 4.4). */
export function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (difficulty: Difficulty) => void }) {
  return (
    <>
      <div role="group" aria-label="Difficulty" className="grid grid-cols-3 gap-2">
        {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={`min-h-14 rounded-btn border px-1 font-mono text-sm font-bold uppercase tracking-[0.1em] ${
              value === d ? 'border-sun bg-sun text-space-950' : 'border-line text-ink hover:bg-space-800'
            }`}
          >
            {DIFFICULTY[d].label}
          </button>
        ))}
      </div>
      <p className="mt-2">{DIFFICULTY_NOTE[value]}</p>
    </>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const difficulty = useGameStore(difficultyOf);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const inMission = useGameStore((s) => s.screen === 'play');
  const showCredits = useGameStore((s) => s.showCredits);
  const { muted, volume, setMuted, setVolume } = useSettings();
  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <p className="hud-label mb-2">Difficulty</p>
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      {inMission && <p className="mt-2 text-base text-ink-faint">Changing difficulty restarts this mission.</p>}
      <p className="hud-label mb-2 mt-5">Sound</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-pressed={!muted} onClick={() => setMuted(!muted)} className="btn-secondary">
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <label className="flex flex-1 items-center gap-2">
          <span className="text-ink-soft">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-8 flex-1 accent-[#FFB547]"
            aria-label="Volume"
          />
        </label>
      </div>
      <button type="button" onClick={showCredits} className="btn-secondary mt-5 w-full">
        Credits and real NASA data
      </button>
    </Dialog>
  );
}

/** SPEC Part 9: the mute button is always on screen. */
export function SoundToggle() {
  const muted = useSettings((s) => s.muted);
  const setMuted = useSettings((s) => s.setMuted);
  return (
    <button
      type="button"
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => setMuted(!muted)}
      className="hud-btn fixed bottom-3 right-3 z-40"
    >
      <SoundIcon muted={muted} />
    </button>
  );
}

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="How to play">
      <ul className="space-y-2">
        <li>
          Walking: <kbd className="key">W</kbd> <kbd className="key">A</kbd> <kbd className="key">S</kbd> <kbd className="key">D</kbd> move,{" "}
          <kbd className="key">Shift</kbd> run, <kbd className="key">Space</kbd> jump. Drag the mouse (or <kbd className="key">Q</kbd>/
          <kbd className="key">R</kbd>) to look around, the wheel zooms.
        </li>
        <li>
          Follow the amber beacon to the mission site, then press <kbd className="key">E</kbd> to start the mission there.
        </li>
        <li>
          Choosing: tap a choice, or press <kbd className="key">1</kbd>–<kbd className="key">4</kbd>.
        </li>
        <li>
          Press <kbd className="key">Space</kbd> to carry on.
        </li>
        <li>
          After each choice, a Why? card explains the real science. Press <kbd className="key">W</kbd> to open it again.
        </li>
        <li>
          Flying: <kbd className="key">W</kbd>/<kbd className="key">S</kbd> engine and brake, <kbd className="key">A</kbd>/
          <kbd className="key">D</kbd> turn, <kbd className="key">Space</kbd>/<kbd className="key">Shift</kbd> rise and sink.
        </li>
        <li>
          Hopper (between sites): hold <kbd className="key">Space</kbd> to lift off. Let go to hold height. Follow the arrow, dodge the
          rock spires, and sink gently onto the beacon pad with <kbd className="key">Shift</kbd>.
        </li>
        <li>Tap a gauge to see what it is made of.</li>
      </ul>
      <p className="hud-label mt-5">Gauge signs</p>
      <ul className="mt-2 space-y-1">
        <li className="flex items-center gap-2">
          <GoodIcon className="text-xl text-ok" /> Good: 60 to 100
        </li>
        <li className="flex items-center gap-2">
          <CautionIcon className="text-xl text-warn" /> Caution: 30 to 59
        </li>
        <li className="flex items-center gap-2">
          <CriticalIcon className="text-xl text-bad" /> Critical: 0 to 29
        </li>
      </ul>
      <p className="mt-5 text-base text-ink-faint">Built with help from Claude (Anthropic).</p>
    </Dialog>
  );
}
