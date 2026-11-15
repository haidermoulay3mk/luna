// Built with help from Claude (Anthropic).
// "First Light on Olympus" (LUNA_BUILD B2), the bookend to Mission 1: the station's lights come
// on at the summit of Olympus Mons. How many depends on the stars from all six chapters:
// Olympus Station (24–30), Olympus Outpost (15–23) or Olympus Beacon (0–14). Never a harsh fail
// screen: the lowest ending still has the crew safe, with a big Try again and one tip.
import { useEffect, useRef, type CSSProperties } from 'react';
import { CHAPTERS, chapterById } from '../../data/content';
import { GAUGE_IDS, GAUGE_LABEL, STARS_PER_CHAPTER } from '../../engine/balance';
import { trackView } from '../../engine/campaign';
import { MAX_STARS, totalChapterStars } from '../../engine/chapters';
import { gaugesOf, gaugeState } from '../../engine/reducer';
import { isOlympusEnding, type OlympusEnding } from '../../engine/scoring';
import { useGameStore } from '../../store/gameStore';
import { STATE_LABEL, STATE_TEXT } from '../format';
import { DataTag, Frame, PrimaryButton } from '../components/deck';
import { useDonkiTag } from '../components/SpaceWeatherChip';
import { StarIcon, StateIcon } from '../icons/Icons';

const MODULES = ['Habitat', 'Solar panels', 'Greenhouse', 'Antenna'] as const;

export const OLYMPUS: Record<OlympusEnding, { title: string; text: string; lit: number; tip?: string }> = {
  station: {
    title: 'Olympus Station',
    text: 'The lights come on one by one. Habitat, panels, greenhouse, antenna: all online. First light on Olympus, Commander.',
    lit: 4,
  },
  outpost: {
    title: 'Olympus Outpost',
    text: 'A small base wakes up on the summit. Some modules stay dark for now.',
    lit: 2,
    tip: 'Try for more stars? Replay the climb and switch on the whole station.',
  },
  beacon: {
    title: 'Olympus Beacon',
    text: 'One relay light shines on the summit. The crew returns safely to base camp.',
    lit: 0,
    tip: 'Tip: keep every gauge above 30. That earns the second star in each chapter.',
  },
};

export function Ending() {
  const progress = useGameStore((s) => s.progress);
  const goHome = useGameStore((s) => s.goHome);
  const newStory = useGameStore((s) => s.newStory);
  const retryChapter = useGameStore((s) => s.retryChapter);
  const donki = useDonkiTag();
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, []);
  const mars = progress ? trackView(progress, 'mars') : null;
  if (!progress || !mars || !isOlympusEnding(mars.ending)) return null;

  const ending = OLYMPUS[mars.ending];
  const stars = totalChapterStars(progress, CHAPTERS);
  const crew = mars.carry ? gaugesOf(mars.carry.parts) : null;
  const finalChapter = CHAPTERS[CHAPTERS.length - 1];
  const low = mars.ending === 'beacon';

  return (
    <div className="flex min-h-full flex-col justify-end gap-3 pb-14 lg:max-w-[40rem] lg:justify-center lg:pb-3">
      <Frame index="06" label="First light on Olympus" className="pointer-events-auto" bodyClassName="p-5">
        <h1 className="font-title text-3xl uppercase tracking-[0.08em] lg:text-4xl">{ending.title}</h1>
        <p className="mt-3 text-xl">{ending.text}</p>
        <Station lit={ending.lit} />
        {ending.tip && <p className="mt-3 text-ink-soft">{ending.tip}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          {low || mars.ending === 'outpost' ? (
            <PrimaryButton ref={primary} onClick={() => retryChapter(finalChapter.id)} className={low ? 'min-h-16 px-8 text-lg' : ''}>
              Try again: {finalChapter.title}
            </PrimaryButton>
          ) : null}
          <PrimaryButton ref={low || mars.ending === 'outpost' ? undefined : primary} secondary={low || mars.ending === 'outpost'} noArrow onClick={goHome}>
            Back to the map
          </PrimaryButton>
          <PrimaryButton secondary noArrow onClick={newStory}>
            Play Mars again
          </PrimaryButton>
        </div>
      </Frame>

      <Frame index="07" label="Mission recap" className="pointer-events-auto" bodyClassName="grid gap-4 p-4 sm:grid-cols-2" order={1}>
        <div>
          <p className="hud-label">Stars</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="hud-value text-4xl text-sun">{stars}</span>
            <span className="font-mono text-sm text-ink-faint">/ {MAX_STARS(CHAPTERS)}</span>
          </p>
          <ul className="mt-2 space-y-1">
            {CHAPTERS.map((c) => {
              const got = progress.chapterStars?.[String(c.id)] ?? 0;
              return (
                <li key={c.id} className="flex items-center gap-2 text-base">
                  <span className="font-mono text-xs text-ink-faint">{String(c.id).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate">{chapterById(c.id)?.title}</span>
                  <span className="flex items-center gap-1 font-mono text-sm">
                    <StarIcon filled={got > 0} className={got > 0 ? 'text-sun' : 'text-ink-faint'} />
                    {got}/{STARS_PER_CHAPTER}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="hud-label">Crew status</p>
          {crew ? (
            <ul className="mt-2 space-y-1.5">
              {GAUGE_IDS.map((id) => {
                const state = gaugeState(crew[id]);
                return (
                  <li key={id} className="flex items-center gap-2 text-base">
                    <span className="flex-1">{GAUGE_LABEL[id]}</span>
                    <span className="hud-value text-lg">{Math.round(crew[id])}</span>
                    <span className={`flex items-center gap-1 font-mono text-[11px] uppercase ${STATE_TEXT[state]}`}>
                      <StateIcon state={state} /> {STATE_LABEL[state]}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-ink-soft">Everyone is safe.</p>
          )}
          <p className="hud-label mt-4">Real NASA data that shaped your mission</p>
          <ul className="mt-2 space-y-1.5 text-base">
            <li>
              Solar storm risk in chapters 4 and 6 <DataTag live={donki.live}>{donki.text}</DataTag>
            </li>
            <li>
              Moon and Mars maps <DataTag>NASA LRO · Viking</DataTag>
            </li>
          </ul>
        </div>
      </Frame>
    </div>
  );
}

/** The station on the summit: each module's light is on (filled, "online") or off (hollow, "dark"). */
function Station({ lit }: { lit: number }) {
  return (
    <ul aria-label="Olympus Station modules" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MODULES.map((name, i) => {
        const on = i < lit;
        return (
          <li
            key={name}
            className="frame-in flex items-center gap-2 rounded-btn border border-line px-2.5 py-2"
            style={{ '--i': i * 4 } as CSSProperties}
          >
            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? 'bg-sun shadow-[0_0_10px_#FFB547]' : 'border border-ink-faint'}`} />
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold">{name}</span>
              <span className={`block font-mono text-[11px] uppercase tracking-[0.12em] ${on ? 'text-sun' : 'text-ink-faint'}`}>{on ? 'Online' : 'Dark'}</span>
            </span>
          </li>
        );
      })}
      {lit === 0 && (
        <li className="col-span-full flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sun">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sun" /> Summit relay light: on
        </li>
      )}
    </ul>
  );
}
