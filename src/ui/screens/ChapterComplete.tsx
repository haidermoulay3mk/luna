// Built with help from Claude (Anthropic).
// Chapter complete (LUNA_BUILD B7). In order, each with its own sound: the stars stamp in one by
// one out of 5 → the chapter's mission patch spins in → crates fly into the rocket and the Mars
// Cargo meter rises → the goal track advances one step → rank update → one "Why?" science card.
// One button: Next chapter (Launch to Mars after chapter 4, See your ending after chapter 6).
// Skippable; with reduced motion everything is shown at once.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CHAPTERS, chapterById, firstEvent, missionById } from '../../data/content';
import { CARGO, STARS_PER_CHAPTER } from '../../engine/balance';
import { MAX_STARS, scoreChapter, starRules, totalChapterStars } from '../../engine/chapters';
import { rankFor } from '../../engine/scoring';
import { useGameStore } from '../../store/gameStore';
import { Frame, PrimaryButton, Timeline, stopsFrom } from '../components/deck';
import { MissionPatch } from '../components/MissionPatch';
import { WhyContent } from '../components/WhyPanel';
import { usePrefersReducedMotion } from '../hooks';
import { sfx } from '../sound';
import { StarIcon } from '../icons/Icons';

/** When each step appears, in seconds after the screen opens. */
const STEPS = { stars: 0.3, patch: 2.1, cargo: 3.0, track: 4.0, rank: 4.8, card: 5.6, done: 6.3 } as const;
type Step = keyof typeof STEPS;
const ORDER: Step[] = ['stars', 'patch', 'cargo', 'track', 'rank', 'card', 'done'];

export function ChapterComplete() {
  const progress = useGameStore((s) => s.progress);
  const chapterId = useGameStore((s) => s.chapterShown);
  const playNextStory = useGameStore((s) => s.playNextStory);
  const launchToMars = useGameStore((s) => s.launchToMars);
  const showSummit = useGameStore((s) => s.showSummit);
  const reduced = usePrefersReducedMotion();
  const [reached, setReached] = useState<number>(reduced ? ORDER.length : 0);
  const next = useRef<HTMLButtonElement>(null);

  const chapter = chapterId === null ? undefined : chapterById(chapterId);
  const score = chapter && progress ? scoreChapter(chapter, progress.runs ?? {}, chapter.flightIn ? progress.cleanFlights?.[chapter.flightIn] : undefined) : null;

  // Each step appears on time, with its own sound.
  useEffect(() => {
    if (reduced || !score) return;
    const timers = ORDER.map((step, i) =>
      window.setTimeout(() => {
        setReached((r) => Math.max(r, i + 1));
        if (step === 'stars') for (let s = 0; s < score.stars; s++) sfx.stamp(s);
        if (step === 'patch') sfx.patch();
        if (step === 'cargo') for (let c = 0; c < 4; c++) sfx.crate(c);
        if (step === 'track') sfx.step();
        if (step === 'rank') sfx.rank();
        if (step === 'card') sfx.card();
      }, STEPS[step] * 1000),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // Plays once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = reached >= ORDER.length;
  useEffect(() => {
    if (done) next.current?.focus({ preventScroll: true });
  }, [done]);

  if (!chapter || !progress || !score) return null;
  const shown = (step: Step) => reached > ORDER.indexOf(step);
  const rules = starRules(chapter);
  const index = CHAPTERS.findIndex((c) => c.id === chapter.id);
  const last = index === CHAPTERS.length - 1;
  const moonDone = chapter.world === 'moon' && CHAPTERS[index + 1]?.world === 'mars';
  const action = last ? { label: 'Climb to the summit', run: showSummit } : moonDone ? { label: 'Launch to Mars', run: launchToMars } : { label: 'Next chapter', run: playNextStory };

  const crates = chapter.missions.reduce((sum, id) => sum + (progress.runs?.[String(id)]?.crates ?? 0), 0);
  const cargo = progress.cargo ?? 0;
  const total = totalChapterStars(progress, CHAPTERS);
  const before = Math.max(0, total - score.stars);
  const max = MAX_STARS(CHAPTERS);
  const rankNow = rankFor(total, max);
  const promoted = rankFor(before, max).id !== rankNow.id;
  const cardMission = missionById(chapter.missions[chapter.missions.length - 1]);
  const cardEvent = cardMission ? firstEvent(cardMission) : undefined;

  return (
    <div className="flex min-h-full flex-col gap-3 pb-14 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,30rem)] lg:items-start lg:gap-5 lg:pb-3">
      <Frame index={String(chapter.id).padStart(2, '0')} label="Chapter complete" className="pointer-events-auto" bodyClassName="flex flex-col items-center p-5 text-center">
        <h1 className="font-title text-2xl uppercase tracking-[0.08em] lg:text-3xl">{chapter.title}</h1>
        {/* Stars stamp in one by one, out of 5. */}
        <p className="mt-3 flex gap-1.5" aria-label={`${score.stars} of ${STARS_PER_CHAPTER} stars`}>
          {Array.from({ length: STARS_PER_CHAPTER }, (_, i) => {
            const earned = i < score.stars;
            return (
              <span
                key={i}
                className={shown('stars') && earned && !reduced ? 'touchdown-stamp' : ''}
                style={{ animationDelay: `${i * 0.3}s` } as CSSProperties}
              >
                <StarIcon filled={shown('stars') && earned} className={`text-4xl ${shown('stars') && earned ? 'text-sun' : 'text-ink-faint'}`} />
              </span>
            );
          })}
        </p>
        <p className="mt-1 font-mono text-sm">
          {score.stars} / {STARS_PER_CHAPTER} stars
        </p>
        <ul className="mt-3 w-full space-y-1 text-left text-base">
          {rules.map((rule, i) => (
            <li key={rule} className="flex items-center gap-2">
              <StarIcon filled={score.checks[i]} className={score.checks[i] ? 'text-sun' : 'text-ink-faint'} />
              <span className="flex-1">{rule}</span>
              <span className={`font-mono text-[11px] uppercase ${score.checks[i] ? 'text-sun' : 'text-ink-faint'}`}>{score.checks[i] ? 'Earned' : 'Missed'}</span>
            </li>
          ))}
        </ul>
        {/* The mission patch spins in. */}
        <div className={`mt-4 ${shown('patch') ? (reduced ? '' : 'patch-in') : 'invisible'}`}>
          <MissionPatch chapter={chapter} size={150} />
        </div>
      </Frame>

      <div className="pointer-events-auto flex flex-col gap-3">
        <Step show={shown('cargo')} index="02" label={chapter.world === 'moon' ? 'Mars cargo' : 'Cargo from the Moon'}>
          {chapter.world === 'moon' ? (
            <>
              <p className="text-base">
                {crates} {crates === 1 ? 'crate' : 'crates'} loaded into the rocket this chapter.
              </p>
              <Crates count={crates} reduced={reduced} />
              <CargoBar from={cargo - crates} to={cargo} animate={!reduced} />
            </>
          ) : (
            <p className="text-base">
              The crates you loaded on the Moon ({cargo} of {CARGO.max}) set your starting gauges on Mars.
            </p>
          )}
        </Step>
        <Step show={shown('track')} index="03" label="Goal track">
          <Timeline label="Chapters" stops={stopsFrom(CHAPTERS.map((c) => c.title), shown('track') ? index + 1 : index)} />
        </Step>
        <Step show={shown('rank')} index="04" label="Rank">
          <p className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold">{rankNow.label}</span>
            {promoted && <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-sun">▲ Promoted</span>}
          </p>
          <p className="font-mono text-sm text-ink-soft">
            {total} / {max} stars in all
          </p>
        </Step>
        {cardEvent && (
          <Step show={shown('card')} index="05" label="Science card unlocked">
            <p className="font-display text-lg font-bold">{cardEvent.title}</p>
            <div className="mt-1 text-base">
              <WhyContent event={cardEvent} />
            </div>
          </Step>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {done ? (
            <PrimaryButton ref={next} onClick={action.run}>
              {action.label}
            </PrimaryButton>
          ) : (
            <PrimaryButton secondary noArrow onClick={() => setReached(ORDER.length)}>
              Skip
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ show, index, label, children }: { show: boolean; index: string; label: string; children: ReactNode }) {
  if (!show) return null;
  return (
    <Frame index={index} label={label} bodyClassName="p-3">
      {children}
    </Frame>
  );
}

/** Crates flying into the rocket's hold, one after another. */
function Crates({ count, reduced }: { count: number; reduced: boolean }) {
  return (
    <div aria-hidden className="mt-2 flex h-8 items-end gap-1">
      {Array.from({ length: Math.min(count, 9) }, (_, i) => (
        <span
          key={i}
          className={`block h-5 w-5 rounded-[3px] border border-sun bg-sun/25 ${reduced ? '' : 'crate-in'}`}
          style={{ animationDelay: `${i * 0.09}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** The Mars Cargo meter rising from what was loaded before this chapter to now. */
function CargoBar({ from, to, animate }: { from: number; to: number; animate: boolean }) {
  const [now, setNow] = useState(animate ? from : to);
  useEffect(() => {
    const id = window.setTimeout(() => setNow(to), 120);
    return () => window.clearTimeout(id);
  }, [to]);
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between">
        <span className="hud-label">Mars cargo</span>
        <span className="font-mono text-sm font-bold">
          {to} <span className="text-ink-faint">/ {CARGO.max}</span>
        </span>
      </div>
      <div aria-hidden className="mt-1 h-1.5 bg-white/10">
        <div className="h-full bg-sun motion-safe:transition-[width] motion-safe:duration-700" style={{ width: `${(now / CARGO.max) * 100}%` }} />
      </div>
    </div>
  );
}
