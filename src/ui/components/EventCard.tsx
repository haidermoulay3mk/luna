// Built with help from Claude (Anthropic).
// The event card (SPEC Parts 4.1, 5, 6): story briefing → event with choices → result.
// On desktop it floats over the 3D base; on phones it sits under it like a bottom sheet.
// The briefing pages the team's story so no card is a wall of text.
// Flight Deck: the event card is a glass Frame (one of at most two glass frames on screen;
// no blur in Lite mode).
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { GAUGE_IDS, GAUGE_LABEL } from '../../engine/balance';
import { cardSeconds, solsToPass } from '../../engine/reducer';
import { worldUnlocked } from '../../engine/campaign';
import { campRadiation, type Chapter } from '../../engine/chapters';
import { EVENT_NAME, latestEvent } from '../../engine/spaceWeather';
import { ORDERS, campOf, chapterForMission } from '../../data/content';
import { useSpaceWeather } from '../../store/spaceWeather';
import { useCardTimer } from '../../store/cardTimer';
import { useParty } from '../../net/party';
import { WhyContent } from './WhyPanel';
import { DataTag, shortDate } from './deck/DataTag';
import { useDonkiTag } from './SpaceWeatherChip';
import { flightEffects, type FlightResult } from '../../engine/flight';
import type { ChoiceOutcome, Effect, GameEvent, SolReport } from '../../engine/types';
import { currentEvent, difficultyOf, eventById, useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';
import { effectText, signed } from '../format';
import { usePrefersReducedMotion } from '../hooks';
import { sfx } from '../sound';
import { CautionIcon, ClockIcon, RiskIcon, RocketIcon, SignalIcon, StarIcon, TargetIcon } from '../icons/Icons';
import { SPEAKERS, speakerFor } from '../speakers';
import { ChoiceButton } from './ChoiceButton';
import { scoreMission } from '../../engine/scoring';
import { DeltaChip } from './DeltaChip';
import { ScienceCard } from './ScienceCard';
import { Stars } from './Stars';
import { TimerBar } from './TimerRing';

export function EventCard({ className = '' }: { className?: string }) {
  const step = useGameStore((s) => s.step);
  const phase = useGameStore((s) => s.state.phase);
  const event = useGameStore(currentEvent);
  const outcome = useGameStore((s) => s.outcome);
  const last = outcome ? eventById(outcome.eventId) : undefined;

  const reduced = usePrefersReducedMotion();
  let body: ReactNode = null;
  let key: string = step;
  if (step === 'briefing') body = <BriefingView />;
  else if (phase === 'choosing' && event) {
    body = <ChoosingView key={event.id} event={event} />;
    key = `choose-${event.id}`;
  } else if (last && outcome) {
    body = <OutcomeView event={last} outcome={outcome} />;
    key = `outcome-${outcome.eventId}`;
  }

  // SPEC Part 8: each new card springs up from below (a simple fade with reduced motion).
  return (
    <motion.article
      key={key}
      aria-label="Mission card"
      className={`hud glass w-full p-4 lg:p-5 ${className}`}
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 28 }}
    >
      {body}
    </motion.article>
  );
}

/** Moves keyboard focus to the main button without scrolling the page. */
function usePrimaryFocus(key: string) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [key]);
  return ref;
}

// ---- Briefing: the team's story, one short page at a time ----

function BriefingView() {
  const mission = useGameStore((s) => s.mission);
  const page = useGameStore((s) => s.briefingPage);
  const difficulty = useGameStore(difficultyOf);
  const nextPage = useGameStore((s) => s.nextBriefingPage);
  const skip = useGameStore((s) => s.skipBriefing);
  const primary = usePrimaryFocus(`briefing-${mission.id}-${page}`);
  const pages = mission.briefing;
  const onChallenge = page >= pages.length;
  const first = eventById(mission.eventIds[0]);
  const timer = first ? cardSeconds(difficulty, first) : null;
  const arrival = useGameStore((s) => s.arrival);
  const weather = useGameStore((s) => s.weather);
  const chapter = chapterForMission(mission.id);
  const camp = campOf(mission.id);
  // Boss: fewer buttons. Story lines play like radio calls and move on by themselves (Space is faster).
  // A party guest's game follows the host's, so only the host (or a solo player) runs the clock.
  const guest = useParty((s) => s.status === 'playing' && !s.isHost);
  const lineMs = onChallenge ? 0 : Math.max(3400, pages[page].line.length * 62);
  useEffect(() => {
    if (onChallenge || guest) return;
    const id = window.setTimeout(nextPage, lineMs);
    return () => window.clearTimeout(id);
  }, [page, onChallenge, guest, lineMs, nextPage]);

  return (
    <>
      {arrival && page === 0 && <ArrivalReport result={arrival} />}
      {weather && page === 0 && <WeatherReport {...weather} />}
      {mission.id === 8 && page === 0 && <LatestDonkiEvent />}
      {camp && page === 0 && <CampReport name={camp.place.name} dose={campRadiation(camp.rank, camp.place.heightKm)} />}
      {chapter && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sun">
          Chapter {String(chapter.id).padStart(2, '0')} · {chapter.title} · {chapter.missions.indexOf(mission.id) + 1} of {chapter.missions.length}
        </p>
      )}
      <p className="eyebrow">
        Mission {mission.id} · Day {mission.day} · {mission.subtitle}
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{mission.title}</h2>
      {onChallenge ? (
        <>
          <p className="mt-2 text-lg">
            <b className="font-display">Your challenge:</b> {mission.challenge}
          </p>
          <dl className="mt-4 grid gap-2">
            <BriefRow icon={<TargetIcon className="text-sun" />} label="Objective">
              {mission.objective}
            </BriefRow>
            <BriefRow icon={<StarIcon className="text-sun" />} label="Bonus">
              {mission.bonusObjective}
            </BriefRow>
            <BriefRow icon={<ClockIcon className="text-ink-soft" />} label="Timer">
              {timer ? `${timer} seconds to decide` : 'No timer on Explorer'}
            </BriefRow>
          </dl>
        </>
      ) : (
        <div key={page} className="rise-in">
          <BriefingLine speaker={pages[page].speaker} line={pages[page].line} />
          {!guest && (
            <div aria-hidden className="mt-3 h-0.5 overflow-hidden bg-white/10">
              <div className="brief-bar h-full bg-sun/70" style={{ animationDuration: `${lineMs}ms` }} />
            </div>
          )}
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button ref={primary} type="button" onClick={nextPage} className={`btn-primary ${onChallenge ? 'pulse-soft' : ''}`}>
          {onChallenge ? 'Start mission' : 'Next'} <kbd className="key">Space</kbd>
        </button>
        {!onChallenge && (
          <button type="button" onClick={skip} className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint underline-offset-4 hover:text-ink hover:underline">
            Skip story
          </button>
        )}
        <span className="ml-auto font-mono text-sm text-ink-faint">
          {String(page + 1).padStart(2, '0')} / {String(pages.length + 1).padStart(2, '0')}
        </span>
      </div>
    </>
  );
}

/** What the flight here did to the base (rock-hit repairs, astronauts picked up). */
function ArrivalReport({ result }: { result: FlightResult }) {
  const effects = flightEffects(result);
  return (
    <p className="mb-3 flex items-start gap-2 rounded-btn border border-line bg-white/[0.04] px-3 py-2 text-base">
      <RocketIcon className="mt-0.5 shrink-0 text-sun" />
      <span>
        <b className="font-display">{result.autopilot ? 'Autopilot landing.' : 'You landed!'}</b>{' '}
        {effects.length === 0
          ? 'No change to the base.'
          : effects.map((e) => (e.target === 'power' ? `Rock repairs: ${effectText(e)}` : `Astronauts aboard: ${effectText(e)}`)).join(' · ')}
      </span>
    </p>
  );
}

/** What real NASA space weather changed at the start of this mission (SPEC 4.5). */
function WeatherReport({ level, status, effects }: { level: string; status: string; effects: Effect[] }) {
  const source = status === 'live' ? 'live NASA data' : status === 'saved' ? 'saved NASA data' : 'archived NASA data';
  return (
    <p className="mb-3 flex items-start gap-2 rounded-btn border border-warn/30 bg-warn/[0.06] px-3 py-2 text-base">
      <SignalIcon className="mt-0.5 shrink-0 text-warn" />
      <span>
        <b className="font-display">Space weather: {level.toLowerCase()}</b> ({source}).{' '}
        {effects.length === 0 ? 'No extra effect on the base.' : effects.map(effectText).join(' · ')}
      </span>
    </p>
  );
}

function BriefingLine({ speaker, line }: { speaker: string; line: string }) {
  if (speaker === 'alert') {
    return (
      <p className="mt-4 flex items-start gap-3 rounded-panel border border-warn/50 bg-warn/10 px-4 py-3 text-xl font-bold text-warn">
        <CautionIcon className="mt-1 shrink-0" /> {line}
      </p>
    );
  }
  const who = speakerFor(speaker);
  if (who) {
    return (
      <p className="mt-3 text-lg">
        <span className={`font-display font-bold ${who.text}`}>
          {who.name}
          {who.role ? `, ${who.role}` : ''}:
        </span>{' '}
        “{line}”
      </p>
    );
  }
  return <p className="mt-3 text-lg leading-relaxed">{line}</p>;
}

function BriefRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <dt className="hud-label w-24 shrink-0">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

// ---- Event with choices ----

function ChoosingView({ event }: { event: GameEvent }) {
  const difficulty = useGameStore(difficultyOf);
  const choose = useGameStore((s) => s.choose);
  const timeout = useGameStore((s) => s.timeout);
  const seconds = cardSeconds(difficulty, event);
  const left = useCountdown(seconds, timeout);
  // Desktop shows this countdown as a ring in the right rail; the card keeps its bar on smaller screens.
  useEffect(() => {
    useCardTimer.setState({ left, total: seconds });
  }, [left, seconds]);
  useEffect(() => () => useCardTimer.setState({ left: null, total: null }), []);
  const speaker = SPEAKERS[event.speaker];
  return (
    <>
      {seconds !== null && left !== null && (
        <div className="lg:hidden">
          <TimerBar left={left} total={seconds} />
        </div>
      )}
      <p className="hud-label">{event.spaceWeatherLinked ? 'Storm decision' : event.urgent ? 'Urgent decision' : 'Decision'}</p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{event.title}</h2>
      <p className="mt-2 text-lg">
        <span className={`font-display font-bold ${speaker.text}`}>
          {speaker.name}
          {speaker.role ? `, ${speaker.role}` : ''}:
        </span>{' '}
        “{event.line}”
      </p>
      <p className="mt-1 text-base text-ink-soft">{event.context}</p>
      <ol className="mt-3 grid gap-2.5 lg:auto-cols-fr lg:grid-flow-col">
        {event.choices.map((choice, i) => (
          <li key={choice.id} className="flex">
            <ChoiceButton
              choice={choice}
              index={i}
              onPick={() => {
                sfx.click();
                choose(choice.id);
              }}
            />
          </li>
        ))}
      </ol>
    </>
  );
}

function useCountdown(seconds: number | null, onExpire: () => void): number | null {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    setLeft(seconds);
    if (seconds === null) return;
    const deadline = performance.now() + seconds * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (deadline - performance.now()) / 1000);
      setLeft(remaining);
      if (remaining === 0) {
        window.clearInterval(id);
        expire.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds]);
  return left;
}

// ---- Result, then mission complete ----

function OutcomeView({ event, outcome }: { event: GameEvent; outcome: ChoiceOutcome }) {
  const state = useGameStore((s) => s.state);
  const mission = useGameStore((s) => s.mission);
  const solReports = useGameStore((s) => s.solReports);
  const next = useGameStore((s) => s.next);
  // A correct decision keeps the mission objective on track: a "verified" sound and a green light.
  // Otherwise a short warning and an amber light (Boss, 15 Nov).
  const good = scoreMission(state, mission).objectiveMet;
  useEffect(() => {
    if (good) sfx.verified();
    else sfx.warning();
  }, [outcome]); // eslint-disable-line react-hooks/exhaustive-deps
  const primary = usePrimaryFocus(state.phase);
  const choice = event.choices.find((c) => c.id === outcome.choiceId);
  if (!choice) return null;

  const over = state.phase === 'complete' || state.phase === 'paused';
  const changes = GAUGE_IDS.map((id) => ({ id, delta: Math.round(outcome.after[id]) - Math.round(outcome.before[id]) })).filter(
    (c) => c.delta !== 0,
  );
  const lastEvent = state.eventIndex >= mission.eventIds.length - 1;
  const nextLabel = solsToPass(state, mission) > 0 ? `End sol ${state.sol}` : lastEvent ? 'Finish mission' : 'Next event';
  // Only a risk with a dice roll can "come true"; the team's other risks are warnings shown on the card.
  const rolled = choice.risk && choice.riskChance;

  return (
    <>
      <p
        role="status"
        className={`mb-2 inline-flex items-center gap-2 rounded-btn border px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] ${good ? 'border-ok/60 text-ok' : 'border-warn/60 text-warn'}`}
      >
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${good ? 'decision-good bg-ok' : 'bg-warn'}`} />
        {good ? '✓ Good call · objective on track' : '○ Risky · objective at risk'}
      </p>
      <p className="eyebrow">{event.title} · You chose</p>
      <h2 className="mt-1 font-display text-xl font-bold tracking-tight">{choice.label}</h2>
      {outcome.timedOut && <Notice icon={<ClockIcon className="text-warn" />}>{outcome.message}</Notice>}
      <p className="mt-2 text-lg" aria-live="polite">
        {choice.result}
      </p>
      {changes.length > 0 ? (
        <div aria-label="Gauge changes" className="mt-3 flex flex-wrap gap-2">
          {changes.map(({ id, delta }) => (
            <DeltaChip key={id} gauge={id} delta={delta} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-ink-soft">No change to the gauges yet.</p>
      )}
      {rolled && (
        <p className="mt-3 flex items-start gap-2">
          <RiskIcon className="mt-1 shrink-0 text-warn" />
          {outcome.riskTriggered ? (
            <span>
              <b>Risk came true:</b> {choice.risk}. {choice.riskEffects?.map(effectText).join(', ')}
            </span>
          ) : (
            <span>
              <b>Risk avoided:</b> {choice.risk}
            </span>
          )}
        </p>
      )}
      {outcome.scheduled.length > 0 && (
        <p className="mt-2 flex items-start gap-2">
          <ClockIcon className="mt-1 shrink-0 text-ink-soft" />
          <span>
            <b>Next sol:</b> {outcome.scheduled.map((p) => effectText(p.effect)).join(', ')}
          </span>
        </p>
      )}
      {state.phase === 'outcome' && state.extraSols > 0 && (
        <p className="mt-2 flex items-start gap-2">
          <ClockIcon className="mt-1 shrink-0 text-ink-soft" />
          <span>
            <b>This takes time:</b> {state.extraSols} more {state.extraSols === 1 ? 'sol passes' : 'sols pass'}, and the base
            keeps using power, air and food.
          </span>
        </p>
      )}
      {outcome.rescues.map((r) => (
        <Notice key={r.gauge} icon={<CautionIcon className="text-warn" />}>
          {r.message}
        </Notice>
      ))}

      <InlineWhy event={event} />

      {over && solReports.length > 0 && <SolSummary reports={solReports} />}
      {state.phase === 'complete' && <Stars state={state} mission={mission} />}
      {state.phase === 'complete' && <ScienceCard event={event} />}
      {state.phase === 'paused' && <Paused />}

      <div className="mt-5 flex flex-wrap gap-3">
        {state.phase === 'outcome' ? (
          <button ref={primary} type="button" onClick={next} className="btn-primary">
            {nextLabel} <kbd className="key">Space</kbd>
          </button>
        ) : (
          <EndActions primary={primary} />
        )}
      </div>
    </>
  );
}

/**
 * SPEC 4.6 "Why?" appears by itself after each decision. Boss (15 Nov): fewer buttons, so it now
 * shows inside the result card (no pop-up to close). W still opens it large.
 */
function InlineWhy({ event }: { event: GameEvent }) {
  const rippleOpen = useGameStore((s) => s.rippleOpen);
  if (rippleOpen) return null;
  return (
    <section aria-label="Why?" className="rise-in mt-4 border-l-2 border-sun bg-sun/5 px-3 py-2 text-base">
      <p className="hud-label mb-1 text-sun">Why? · the real science</p>
      <WhyContent event={event} />
    </section>
  );
}

/** The chapter this mission just finished, if it was the chapter's last story mission (null otherwise). */
function useFinishedChapter(): Chapter | null {
  const mission = useGameStore((s) => s.mission);
  const phase = useGameStore((s) => s.state.phase);
  const storyRun = useGameStore((s) => s.storyRun);
  const progress = useGameStore((s) => s.progress);
  const chapter = chapterForMission(mission.id);
  if (!storyRun || !chapter || !progress || chapter.missions[chapter.missions.length - 1] !== mission.id) return null;
  const scored = progress.chapterStars?.[String(chapter.id)] !== undefined;
  return phase === 'complete' || (phase === 'paused' && scored) ? chapter : null;
}

/**
 * What to do after a mission: the next mission or chapter, launch to Mars after the Moon's last
 * chapter (always: progress is never blocked), the ending after the climb, or try again.
 */
function EndActions({ primary }: { primary: RefObject<HTMLButtonElement> }) {
  const phase = useGameStore((s) => s.state.phase);
  const storyRun = useGameStore((s) => s.storyRun);
  const world = useGameStore((s) => s.world);
  const progress = useGameStore((s) => s.progress);
  const retry = useGameStore((s) => s.retry);
  const goHome = useGameStore((s) => s.goHome);
  const playNextStory = useGameStore((s) => s.playNextStory);
  const launchToMars = useGameStore((s) => s.launchToMars);
  const showChapterComplete = useGameStore((s) => s.showChapterComplete);
  const finished = useFinishedChapter();

  // LUNA_BUILD B7: the chapter's last mission leads to the chapter-complete screen
  // (which then offers the next chapter, the launch to Mars, or the Olympus ending).
  if (finished) {
    return (
      <button ref={primary} type="button" onClick={showChapterComplete} className="btn-primary">
        Chapter complete
      </button>
    );
  }
  const moonDone = storyRun && world === 'moon' && progress !== null && worldUnlocked(progress, 'mars', ORDERS.moon);
  const main =
    phase === 'paused'
      ? { label: 'Try again', action: retry }
      : moonDone
        ? { label: 'Launch to Mars', action: launchToMars }
        : { label: 'Next mission', action: playNextStory };
  return (
    <>
      <button ref={primary} type="button" onClick={main.action} className="btn-primary">
        {main.label}
      </button>
      <button type="button" onClick={goHome} className="btn-secondary">
        Back to the map
      </button>
    </>
  );
}

/** LUNA_BUILD B8: Mission 8's briefing names the most recent real event NASA recorded, with its date. */
function LatestDonkiEvent() {
  const snapshot = useSpaceWeather((s) => s.snapshot);
  const tag = useDonkiTag();
  const latest = latestEvent(snapshot);
  if (!latest) return null;
  const name = latest.kind === 'flare' && latest.classType ? `${latest.classType} ${EVENT_NAME.flare}` : EVENT_NAME[latest.kind];
  return (
    <p className="mb-3 flex flex-wrap items-start gap-2 rounded-btn border border-warn/30 bg-warn/[0.06] px-3 py-2 text-base">
      <SignalIcon className="mt-1 shrink-0 text-warn" />
      <span className="min-w-0 flex-1">
        <b className="font-display">Real event:</b> NASA recorded a {name} on {shortDate(latest.time)}.
      </span>
      <DataTag live={tag.live}>{tag.text}</DataTag>
    </p>
  );
}

/** Camps on Olympus Mons: the higher the camp, the less air overhead (a DRAFT game rule). */
function CampReport({ name, dose }: { name: string; dose: number }) {
  return (
    <p className="mb-3 flex items-start gap-2 rounded-btn border border-line px-3 py-2 text-base">
      <RocketIcon className="mt-1 shrink-0 text-sun" />
      <span>
        <b className="font-display">The rover drives the crew to {name}.</b> Higher up, less air shields you: Radiation dose +{dose}{' '}
        each sol.
      </span>
    </p>
  );
}

function SolSummary({ reports }: { reports: SolReport[] }) {
  return (
    <div className="mt-3 space-y-1.5 rounded-btn border border-line bg-space-950/40 p-3 text-sm">
      {reports.map((report) => (
        <div key={report.sol}>
          <p className="text-ink">
            <b className="font-mono text-white">SOL {report.sol - 1} OVER.</b> Daily use:{' '}
            {GAUGE_IDS.map((id) => `${GAUGE_LABEL[id]} ${signed(-report.drain[id])}`).join(' · ')}
            {report.radiation ? ` · Thin air: Radiation dose ${signed(report.radiation)}` : ''}
          </p>
          {report.arrived.length > 0 && (
            <p className="text-ink">Arrived: {report.arrived.map((p) => effectText(p.effect)).join(', ')}</p>
          )}
          {report.rescues.map((r) => (
            <p key={r.gauge} className="text-warn">
              {r.message}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function Paused() {
  return (
    <section className="mt-4 rounded-panel border border-line p-4">
      <h3 className="font-display text-xl font-bold">Mission Paused</h3>
      <p className="mt-2">The crew boards the supply lander to wait for support. Everyone is safe.</p>
      <p className="mt-2">The lander brings supplies and spare parts, so your next try starts from a steadier base.</p>
      <p className="mt-2 text-ink-soft">Tip: when a gauge shows the red octagon, fix that one first.</p>
    </section>
  );
}

function Notice({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-3 rounded-panel border border-warn/40 bg-warn/5 px-4 py-3">
      <span className="mt-1 shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
