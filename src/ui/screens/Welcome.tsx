// Built with help from Claude (Anthropic).
// Title screen (LUNA_BUILD A2.5): full-bleed scene, the real Moon as the hero on the right.
// Left column, aligned to the bottom: the team tag, LUNA in Michroma, the one-line goal, the name
// entry with "Begin mission". Bottom strip: the goal track and the space-weather tag. Settings and
// mute top right. Progress is saved under the name, on this device only.
import { useState, type FormEvent, type ReactNode } from 'react';
import type { Difficulty } from '../../engine/types';
import { GOAL_STOPS } from '../../engine/chapters';
import { HeroScene } from '../../scene/HeroScene';
import { useGameStore } from '../../store/gameStore';
import { listCommanders } from '../../store/save';
import { useSettings } from '../../store/settings';
import { DifficultyPicker, SettingsDialog } from '../components/Dialog';
import { DataTag, PrimaryButton, Timeline, stopsFrom } from '../components/deck';
import { GOAL_LINE } from '../components/GoalStrip';
import { useDonkiTag } from '../components/SpaceWeatherChip';
import { CautionIcon, SettingsIcon, SoundIcon } from '../icons/Icons';

export function Welcome({ crewSlot }: { crewSlot?: ReactNode }) {
  const signIn = useGameStore((s) => s.signIn);
  const continueAs = useGameStore((s) => s.continueAs);
  const showParty = useGameStore((s) => s.showParty);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('mission');
  const [error, setError] = useState('');
  const [known] = useState(listCommanders);
  const [settings, setSettings] = useState(false);
  const donki = useDonkiTag();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Type your name first.');
      return;
    }
    signIn(name, difficulty);
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      <HeroScene body="moon" />
      <p className="sr-only">The Moon, from NASA's real LRO map, lit by the Sun from the left.</p>

      <div className="absolute right-3 top-3 z-20 flex gap-2">
        <MuteButton />
        <button type="button" aria-label="Settings" title="Settings" onClick={() => setSettings(true)} className="hud-btn">
          <SettingsIcon />
        </button>
      </div>

      {/* mt-auto (not justify-end) keeps the column at the bottom and still lets short windows scroll. */}
      <div className="absolute inset-0 z-10 flex flex-col gap-4 overflow-y-auto p-4 pb-3 sm:p-6 lg:pb-5">
        <form onSubmit={submit} className="frame-in mt-auto w-full max-w-[34rem]">
          <DataTag>Team Sol One · NASA Space Apps 2026</DataTag>
          <h1 className="mt-3 font-title text-[clamp(64px,11vw,128px)] uppercase leading-none tracking-[0.06em] text-white">Luna</h1>
          <p className="mt-3 max-w-[30rem] font-display text-xl font-bold leading-snug text-ink">{GOAL_LINE}</p>

          <div className="hud mt-5 p-4">
            <label htmlFor="commander-name" className="hud-label block">
              What's your name, Commander?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="commander-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                placeholder="Your name"
                aria-describedby="name-help"
                aria-invalid={error ? true : undefined}
                className="min-h-14 min-w-0 flex-1 rounded-btn border border-line-strong bg-space-950/80 px-4 font-display text-xl text-white placeholder:text-ink-faint"
              />
              <PrimaryButton type="submit">Begin mission</PrimaryButton>
            </div>
            <p id="name-help" className="mt-2 text-base text-ink-soft">
              A nickname is fine. It is only saved on this device.
            </p>
            {error && (
              <p role="alert" className="mt-2 flex items-center gap-2 font-bold text-warn">
                <CautionIcon /> {error}
              </p>
            )}
            <p className="hud-label mt-4">Level</p>
            <div className="mt-2">
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>
            {crewSlot ?? (
              <PrimaryButton secondary onClick={showParty} className="mt-4 w-full">
                Crew mode · play online with friends
              </PrimaryButton>
            )}
            {known.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="hud-label">Welcome back</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {known.slice(0, 4).map((commander) => (
                    <PrimaryButton key={commander} secondary noArrow onClick={() => continueAs(commander)} className="min-h-12 normal-case tracking-normal">
                      {commander}
                    </PrimaryButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Bottom strip: where the story goes, and where the space weather comes from. */}
        <div className="hud plain flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 lg:mr-16">
          <Timeline label="Goal track" stops={stopsFrom(GOAL_STOPS, 0)} className="min-w-[18rem] flex-1" />
          <DataTag live={donki.live}>{donki.text}</DataTag>
        </div>
      </div>
      <SettingsDialog open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}

/** Mute, top right on the title screen (the other screens keep it bottom right). */
function MuteButton() {
  const muted = useSettings((s) => s.muted);
  const setMuted = useSettings((s) => s.setMuted);
  return (
    <button
      type="button"
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => setMuted(!muted)}
      className="hud-btn"
    >
      <SoundIcon muted={muted} />
    </button>
  );
}
