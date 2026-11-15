// Built with help from Claude (Anthropic).
// Zustand store: who is playing, their saved progress, and the mission being played.
// The rules live in src/engine; this file calls them and saves the results.
import { create } from 'zustand';
import {
  CHAPTERS,
  EVENTS_BY_ID,
  MISSIONS,
  ORDERS,
  START_PLACES,
  campOf,
  chapterForMission,
  missionById,
  needsFlight,
  placeById,
  placeForMission,
  worldOf,
} from '../data/content';
import {
  isStoryRun,
  isUnlocked,
  mergeTrack,
  newProgress,
  restartStory,
  startMission,
  totalStars,
  trackView,
  unlockCard,
  worldUnlocked,
  type Progress,
  type WorldId,
} from '../engine/campaign';
import { campRadiation, clearChapters, isCleanFlight, recordStory } from '../engine/chapters';
import { NO_FLIGHT, flightEffects, type FlightResult } from '../engine/flight';
import { spaceWeatherEffects } from '../engine/spaceWeather';
import type { Effect, RiskLevel } from '../engine/types';
import { KNOCK_ONS, rippleOf, type Ripple } from '../engine/ripple';
import { useSpaceWeather, type WeatherStatus } from './spaceWeather';
import { applyChoice, applyTimeout, cardSeconds, checkEnd, createMissionState, eventFocus, nextStep } from '../engine/reducer';
import type { ChoiceOutcome, Difficulty, GameEvent, Mission, MissionState, ModuleId, SolReport } from '../engine/types';
import { findCommander, lastCommander, saveProgress } from './save';
import { hasWebGL } from '../scene/space/webgl';
import { ROCKET_PAD } from '../scene/walk/layout';
import { needsHop, outpostOfMission } from '../scene/walk/objective';
import { useWalk } from './walk';

const rng = Math.random;

/** Actions the online party may intercept (guests forward them to the host; the host turns choices into votes). */
export type GatedAction =
  | 'choose' | 'timeout' | 'next' | 'nextBriefingPage' | 'skipBriefing' | 'begin' | 'reachObjective' | 'playNextStory'
  | 'launchToMars' | 'boardRocket' | 'showChapterComplete' | 'retry' | 'showSummit' | 'showEnding' | 'arrive' | 'playMission'
  | 'goHome' | 'showSystem' | 'openWorld' | 'retryChapter' | 'newStory' | 'setDifficulty' | 'finishHop';
type Gate = (action: GatedAction, args: unknown[]) => boolean;
let gate: Gate | null = null;
/** Solo play has no gate. The party layer sets one while a crew is connected. */
export function setActionGate(next: Gate | null): void {
  gate = next;
}
/** Runs `fn` with the gate open (the host applying the crew decision). */
export function ungated(fn: () => void): void {
  const saved = gate;
  gate = null;
  try {
    fn();
  } finally {
    gate = saved;
  }
}
const gated = (action: GatedAction, args: unknown[]): boolean => gate?.(action, args) ?? false;

/**
 * Screen flow: welcome → tutorial → system (the Solar System) ⇄ home (a world's map: the Moon
 * or Mars) → flight → play → … → ending.
 */
export type Screen =
  | 'welcome'
  | 'tutorial'
  | 'system'
  | 'home'
  | 'flight'
  | 'play'
  | 'chapter'
  | 'ending'
  | 'credits'
  /** Walk to the rocket on the Moon base and launch for Mars. */
  | 'board'
  /** Climb the last stretch of Olympus Mons and plant the flag. */
  | 'summit'
  /** The online party lobby (create or join a crew). */
  | 'party'
  /** Fly the hopper low over the ground to the next mission's outpost, dodging rock spires. */
  | 'hop';
/** Inside a mission: walk to the mission site first (3D), then the story pages, then the event card. */
export type Step = 'walk' | 'briefing' | 'playing';

/** The walkable 3D world is used on every device that can draw WebGL (Luna is 3D only; no 2D switch). */
export function canWalk(): boolean {
  return hasWebGL();
}

interface GameStore {
  screen: Screen;
  progress: Progress | null;
  /** The world whose map, story and ending are on screen. */
  world: WorldId;
  mission: Mission;
  state: MissionState;
  /** This mission continues the story (true) or is a replay for stars (false). */
  storyRun: boolean;
  step: Step;
  briefingPage: number;
  /** What happened on the last card. Stays on screen until the next card appears. */
  outcome: ChoiceOutcome | null;
  solReports: SolReport[];
  /** The Why? pop-up: opens by itself after each decision (after the Ripple view), closed by the player. */
  whyOpen: boolean;
  /** LUNA_BUILD B3: what the last decision touched, shown for about 2 s after each choice. */
  ripple: Ripple | null;
  rippleOpen: boolean;
  /** LUNA_BUILD B7: the chapter whose results are on the chapter-complete screen. */
  chapterShown: number | null;
  /** The mission the rocket is flying to. */
  flightTarget: number | null;
  /** What happened on the flight to this mission (shown on the first briefing page). */
  arrival: FlightResult | null;
  /** NASA space weather at the start of this mission and what it changed (SPEC 4.5). */
  weather: { level: RiskLevel; status: WeatherStatus; effects: Effect[] } | null;

  signIn: (name: string, difficulty: Difficulty) => void;
  continueAs: (name: string) => void;
  switchCommander: () => void;
  showTutorial: () => void;
  finishTutorial: () => void;
  goHome: () => void;
  /** Open a world's map (Mars only once the Moon story is finished). */
  openWorld: (world: WorldId) => void;
  showSystem: () => void;
  /** Credits and "Real NASA data used" (SPEC Part 14). */
  showCredits: () => void;
  showEnding: () => void;
  /** `again`: the same mission restarted (no hop: the crew is already there). */
  playMission: (id: number, again?: boolean) => void;
  /** The hopper landed at the next mission's outpost: step out and start the mission there. */
  finishHop: (result: FlightResult) => void;
  /** The rocket has landed (or autopilot took over): start the mission at that place. */
  arrive: (result: FlightResult) => void;
  playNextStory: () => void;
  /** The Moon story is done (chapter 4 always ends with launch): walk to the rocket (3D), then fly to Mars. */
  launchToMars: () => void;
  /** The rocket has lifted off from the Moon base: fly to Mars and start chapter 5. */
  boardRocket: () => void;
  /** The astronaut reached the mission site: the briefing opens. */
  reachObjective: () => void;
  /** After the climb: walk to the summit and plant the flag (3D), then the ending. */
  showSummit: () => void;
  showParty: () => void;
  /** Play a chapter of the story again from its first mission, with a fresh base (the Olympus "Try again"). */
  retryChapter: (chapterId: number) => void;
  nextBriefingPage: () => void;
  skipBriefing: () => void;
  begin: () => void;
  choose: (choiceId: string) => void;
  timeout: () => void;
  next: () => void;
  retry: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
  toggleWhy: () => void;
  closeWhy: () => void;
  /** The Ripple view has played (or was skipped): now the Why? pop-up opens. */
  finishRipple: () => void;
  /** Opens the chapter-complete screen for the chapter just finished. */
  showChapterComplete: () => void;
  newStory: () => void;
  /**
   * Demo jump (F2, for the pitch): play any mission, or fly to it, with everything
   * before it unlocked. Uses a separate "Demo" commander so a real player's save is never touched.
   */
  demoJump: (missionId: number, fly: boolean) => void;
}

/** The commander used by the demo jump. */
export const DEMO_COMMANDER = 'Demo';

/** Where the rocket is on a world: its saved place, or the world's start if that place no longer exists (older saves). */
export function rocketPlace(progress: Progress, world: WorldId): string {
  const saved = trackView(progress, world).location;
  return saved && placeById(saved) ? saved : START_PLACES[world];
}

/** Where the rocket is before a mission in story order: the previous mission's place, or the world's start. */
export function placeBefore(missionId: number): string {
  const mission = missionById(missionId);
  if (!mission) return START_PLACES.moon;
  const world = worldOf(mission);
  const order = ORDERS[world];
  const index = order.indexOf(missionId);
  return index > 0 ? placeForMission(order[index - 1]).id : START_PLACES[world];
}

export const eventById = (id: string): GameEvent | undefined => EVENTS_BY_ID.get(id);

export function currentEvent({ mission, state }: Pick<GameStore, 'mission' | 'state'>): GameEvent | undefined {
  return EVENTS_BY_ID.get(mission.eventIds[state.eventIndex]);
}

export const difficultyOf = (store: Pick<GameStore, 'progress'>): Difficulty => store.progress?.difficulty ?? 'mission';

/**
 * Which module the 3D camera should look at: the event's module while choosing,
 * the chosen choice's module while showing the result, and the whole base otherwise.
 */
export function sceneFocus(store: Pick<GameStore, 'mission' | 'state' | 'screen' | 'step' | 'outcome'>): ModuleId | null {
  if (store.screen !== 'play' || store.step !== 'playing') return null;
  const { phase } = store.state;
  if (phase === 'choosing') {
    const event = currentEvent(store);
    return event ? eventFocus(event) : null;
  }
  if (phase === 'outcome' && store.outcome) {
    const { eventId, choiceId } = store.outcome;
    return eventById(eventId)?.choices.find((c) => c.id === choiceId)?.sceneCue.module ?? null;
  }
  return null;
}

function firstScreen(progress: Progress | null): Screen {
  if (!progress) return 'welcome';
  return progress.tutorialDone ? 'system' : 'tutorial';
}

/** The progress as seen from the world on screen (its story, base, ending and rocket place). */
export const viewOf = (progress: Progress, world: WorldId) => trackView(progress, world);

const savedProgress = lastCommander();

export const useGameStore = create<GameStore>()((set, get) => {
  /** Saves and stores the new progress. */
  const commit = (progress: Progress) => {
    saveProgress(progress);
    set({ progress });
  };

  /** Opens the Why? pop-up. SPEC 4.6: reading Why? unlocks the Science Card. */
  const openWhy = () => {
    const { progress, mission } = get();
    set({ whyOpen: true });
    if (progress) {
      const updated = unlockCard(progress, mission.scienceCardId);
      if (updated !== progress) commit(updated);
    }
  };

  /** Starts a mission at the place the rocket is at. */
  const begin = (mission: Mission, result: FlightResult, flew: boolean) => {
    const { progress } = get();
    if (!progress) return;
    const world = worldOf(mission);
    const view = trackView(progress, world);
    // Real NASA space weather changes missions that are linked to it (SPEC 4.5).
    const { summary, status } = useSpaceWeather.getState();
    const linked = mission.eventIds.some((id) => EVENTS_BY_ID.get(id)?.spaceWeatherLinked);
    const weatherEffects = spaceWeatherEffects(summary.level, linked);
    const camp = campOf(mission.id);
    const started = startMission(view, mission, ORDERS[world], rng, [...flightEffects(result), ...weatherEffects]);
    set({
      screen: 'play',
      world,
      mission,
      weather: linked ? { level: summary.level, status, effects: weatherEffects } : null,
      // LUNA_BUILD B8: higher camps on Olympus Mons add radiation dose every sol.
      state: camp ? { ...started, radiationPerSol: campRadiation(camp.rank, camp.place.heightKm) } : started,
      storyRun: isStoryRun(view, mission.id, ORDERS[world]),
      // Luna is a 3D game: walk to the mission site first (straight to the briefing only if 3D cannot run).
      step: canWalk() ? 'walk' : 'briefing',
      briefingPage: 0,
      outcome: null,
      solReports: [],
      whyOpen: false,
      ripple: null,
      rippleOpen: false,
      flightTarget: null,
      arrival: flew ? result : null,
    });
  };

  /**
   * After a choice: the Ripple of that decision (the base just before it compared with the end of
   * the sols it leads to; nextStep has no randomness, so this is exactly what will happen).
   */
  const decide = (before: MissionState, result: { state: MissionState; outcome: ChoiceOutcome }) => {
    const { mission } = get();
    const event = EVENTS_BY_ID.get(result.outcome.eventId);
    const choice = event?.choices.find((c) => c.id === result.outcome.choiceId);
    const effects = [...(choice?.effects ?? []), ...(result.outcome.riskTriggered ? (choice?.riskEffects ?? []) : [])];
    const preview = result.state.phase === 'outcome' ? nextStep(result.state, mission) : { state: result.state, sols: [] };
    const fired = preview.sols.flatMap((sol) => sol.knockOns ?? []).flatMap((k) => KNOCK_ONS.filter((rule) => rule.id === k.id));
    const ripple = rippleOf(before, preview.state, effects, fired, worldOf(mission) === 'moon');
    set({ state: result.state, outcome: result.outcome, solReports: [], ripple, rippleOpen: true, whyOpen: false });
    recordIfOver(result.state);
  };

  /** Records the mission once it has just ended (complete or paused). */
  const recordIfOver = (state: MissionState) => {
    const { progress, mission } = get();
    if (!progress || !checkEnd(state)) return;
    const world = worldOf(mission);
    commit(mergeTrack(progress, world, recordStory(trackView(progress, world), mission, state, ORDERS[world], CHAPTERS)));
  };

  return {
    screen: firstScreen(savedProgress),
    progress: savedProgress,
    world: 'moon',
    mission: MISSIONS[0],
    state: createMissionState(MISSIONS[0], savedProgress?.difficulty ?? 'mission', { rng, startSol: MISSIONS[0].day }),
    storyRun: false,
    step: 'briefing',
    briefingPage: 0,
    outcome: null,
    solReports: [],
    whyOpen: false,
    ripple: null,
    rippleOpen: false,
    chapterShown: null,
    flightTarget: null,
    arrival: null,
    weather: null,

    signIn: (name, difficulty) => {
      const clean = name.trim().slice(0, 16);
      if (!clean) return;
      const progress = { ...(findCommander(clean) ?? newProgress(clean, difficulty)), difficulty };
      commit(progress);
      set({ screen: firstScreen(progress) });
    },

    continueAs: (name) => {
      const progress = findCommander(name);
      if (!progress) return;
      commit(progress);
      set({ screen: firstScreen(progress) });
    },

    switchCommander: () => set({ screen: 'welcome' }),

    showTutorial: () => set({ screen: 'tutorial' }),

    finishTutorial: () => {
      const { progress } = get();
      if (!progress) return;
      const done = { ...progress, tutorialDone: true };
      commit(done);
      // First time through: go straight into Mission 1. Otherwise back to the Solar System.
      if (done.storyIndex === 0 && totalStars(done) === 0) {
        set({ world: 'moon' });
        get().playNextStory();
      } else set({ screen: 'system' });
    },

    goHome: () => {
      if (gated('goHome', [])) return;
      set({ screen: 'home', whyOpen: false });
    },

    openWorld: (world) => {
      if (gated('openWorld', [world])) return;
      const { progress } = get();
      if (!progress || !worldUnlocked(progress, world, ORDERS.moon)) return;
      set({ world, screen: 'home', whyOpen: false });
    },

    showSystem: () => {
      if (gated('showSystem', [])) return;
      set({ screen: 'system', whyOpen: false });
    },

    showCredits: () => set({ screen: 'credits', whyOpen: false }),

    // The ending is on Mars, at the summit of Olympus Mons.
    showEnding: () => {
      if (gated('showEnding', [])) return;
      set({ screen: 'ending', world: 'mars' });
    },

    playMission: (id, again = false) => {
      if (gated('playMission', [id, again])) return;
      const { progress } = get();
      const mission = missionById(id);
      if (!progress || !mission) return;
      const world = worldOf(mission);
      const view = trackView(progress, world);
      if (!worldUnlocked(progress, world, ORDERS.moon) || !isUnlocked(view, id, ORDERS[world])) return;
      // Boss: finished missions can be viewed (map and mission log) but not played again. Only the next one plays.
      if (!isStoryRun(view, id, ORDERS[world])) return;
      const here = placeById(rocketPlace(progress, world));
      const there = placeForMission(id);
      // Arriving from space (a station or orbit): fly down first.
      if (needsFlight(here, there)) {
        set({ screen: 'flight', world, flightTarget: id, whyOpen: false });
        return;
      }
      // On the ground the rover drives the crew (for example up the camps on Olympus Mons).
      if (here?.id !== there.id) commit(mergeTrack(progress, world, { ...view, location: there.id }));
      // Boss: a flying simulator between missions. The next mission is at another outpost: fly the hopper there.
      if (!again && canWalk() && needsHop(id)) {
        set({ screen: 'hop', world, flightTarget: id, whyOpen: false, rippleOpen: false });
        return;
      }
      begin(mission, NO_FLIGHT, false);
    },

    finishHop: (result) => {
      if (gated('finishHop', [result])) return;
      const { flightTarget, screen } = get();
      const mission = flightTarget === null ? undefined : missionById(flightTarget);
      if (!mission || screen !== 'hop') return;
      // Step out beside the hopper, facing the work site.
      const outpost = outpostOfMission(mission);
      const [px, pz] = outpost.pad;
      const [wx, wz] = outpost.work;
      const d = Math.hypot(wx - px, wz - pz) || 1;
      const sx = px + ((wx - px) / d) * 8;
      const sz = pz + ((wz - pz) / d) * 8;
      useWalk.getState().save(worldOf(mission), sx, sz, Math.atan2(wx - sx, wz - sz));
      begin(mission, result, true);
    },

    arrive: (result) => {
      if (gated('arrive', [result])) return;
      const { progress, flightTarget } = get();
      const mission = flightTarget === null ? undefined : missionById(flightTarget);
      if (!progress || !mission) return;
      const world = worldOf(mission);
      let next = mergeTrack(progress, world, { ...trackView(progress, world), location: placeForMission(mission.id).id });
      // The flight into chapter 1 or 5 counts for that chapter's fifth star when it is clean.
      const chapter = chapterForMission(mission.id);
      if (chapter?.flightIn && chapter.missions[0] === mission.id) {
        next = { ...next, cleanFlights: { ...next.cleanFlights, [chapter.flightIn]: isCleanFlight(result) } };
      }
      commit(next);
      // Step out of the rocket on the landing pad.
      useWalk.getState().save(world, ROCKET_PAD[0] - 7, ROCKET_PAD[1] - 3, -Math.PI / 2);
      begin(mission, result, true);
    },

    playNextStory: () => {
      if (gated('playNextStory', [])) return;
      const { progress, world } = get();
      const id = progress ? ORDERS[world][trackView(progress, world).storyIndex] : undefined;
      if (id !== undefined) get().playMission(id);
    },

    retryChapter: (chapterId) => {
      if (gated('retryChapter', [chapterId])) return;
      const { progress } = get();
      const chapter = CHAPTERS.find((c) => c.id === chapterId);
      if (!progress || !chapter) return;
      const order = ORDERS[chapter.world];
      const view = trackView(progress, chapter.world);
      commit(mergeTrack(progress, chapter.world, { ...view, storyIndex: order.indexOf(chapter.missions[0]), carry: null, ending: null }));
      set({ world: chapter.world });
      get().playMission(chapter.missions[0]);
    },

    launchToMars: () => {
      if (gated('launchToMars', [])) return;
      const { progress } = get();
      if (!progress || !worldUnlocked(progress, 'mars', ORDERS.moon)) return;
      if (canWalk()) set({ screen: 'board', world: 'moon', whyOpen: false, rippleOpen: false });
      else get().boardRocket();
    },

    boardRocket: () => {
      if (gated('boardRocket', [])) return;
      const { progress } = get();
      if (!progress || !worldUnlocked(progress, 'mars', ORDERS.moon)) return;
      set({ world: 'mars', whyOpen: false });
      get().playNextStory();
    },

    reachObjective: () => {
      if (gated('reachObjective', [])) return;
      if (get().screen === 'play' && get().step === 'walk') set({ step: 'briefing', briefingPage: 0 });
    },

    showSummit: () => {
      if (gated('showSummit', [])) return;
      canWalk() ? set({ screen: 'summit', world: 'mars', whyOpen: false }) : get().showEnding();
    },

    showParty: () => set({ screen: 'party', whyOpen: false }),

    nextBriefingPage: () => {
      if (gated('nextBriefingPage', [])) return;
      const { briefingPage, mission } = get();
      // Pages 0…n-1 are the story; page n shows the challenge and the Start button.
      if (briefingPage < mission.briefing.length) set({ briefingPage: briefingPage + 1 });
      else set({ step: 'playing' });
    },

    skipBriefing: () => {
      if (gated('skipBriefing', [])) return;
      set({ briefingPage: get().mission.briefing.length });
    },

    begin: () => {
      if (gated('begin', [])) return;
      set({ step: 'playing' });
    },

    choose: (choiceId) => {
      if (gated('choose', [choiceId])) return;
      const store = get();
      const event = currentEvent(store);
      if (!event || store.state.phase !== 'choosing') return;
      decide(store.state, applyChoice(store.state, event, choiceId, { rng }));
    },

    timeout: () => {
      if (gated('timeout', [])) return;
      const store = get();
      const event = currentEvent(store);
      if (!event || cardSeconds(difficultyOf(store), event) === null || store.state.phase !== 'choosing') return;
      decide(store.state, applyTimeout(store.state, event, { rng }));
    },

    next: () => {
      if (gated('next', [])) return;
      const { state, mission } = get();
      if (state.phase !== 'outcome') return;
      const step = nextStep(state, mission);
      if (step.state.phase === 'choosing') {
        set({ state: step.state, solReports: step.sols, outcome: null, whyOpen: false });
      } else {
        set({ state: step.state, solReports: step.sols });
        recordIfOver(step.state);
      }
    },

    retry: () => {
      if (gated('retry', [])) return;
      get().playMission(get().mission.id, true);
    },

    setDifficulty: (difficulty) => {
      if (gated('setDifficulty', [difficulty])) return;
      const { progress, screen, mission } = get();
      if (!progress) return;
      commit({ ...progress, difficulty });
      if (screen === 'play') get().playMission(mission.id, true); // restarts this mission
    },

    toggleWhy: () => (get().whyOpen ? set({ whyOpen: false }) : openWhy()),

    closeWhy: () => set({ whyOpen: false }),

    finishRipple: () => {
      if (!get().rippleOpen) return;
      // Boss: fewer buttons. The Why? science now shows inside the result card (no pop-up to close),
      // and seeing it unlocks the Science Card (SPEC 4.6).
      set({ rippleOpen: false });
      const { progress, mission } = get();
      if (progress) {
        const updated = unlockCard(progress, mission.scienceCardId);
        if (updated !== progress) commit(updated);
      }
    },

    showChapterComplete: () => {
      if (gated('showChapterComplete', [])) return;
      const { mission } = get();
      const chapter = chapterForMission(mission.id);
      if (chapter) set({ screen: 'chapter', chapterShown: chapter.id, world: chapter.world, whyOpen: false, rippleOpen: false });
    },

    newStory: () => {
      if (gated('newStory', [])) return;
      const { progress, world } = get();
      if (!progress) return;
      const restarted = mergeTrack(progress, world, restartStory(trackView(progress, world), ORDERS[world]));
      commit(clearChapters(restarted, world, CHAPTERS));
      set({ screen: 'home' });
    },

    demoJump: (missionId, fly) => {
      const mission = missionById(missionId);
      if (!mission) return;
      const world = worldOf(mission);
      const order = ORDERS[world];
      const base = findCommander(DEMO_COMMANDER) ?? newProgress(DEMO_COMMANDER, get().progress?.difficulty ?? 'mission');
      let progress: Progress = { ...base, tutorialDone: true };
      // Mars opens once the Moon story is done, so a jump to Mars marks the Moon story as done.
      if (world === 'mars') progress = { ...progress, storyIndex: Math.max(progress.storyIndex, ORDERS.moon.length) };
      const location = fly ? placeBefore(missionId) : placeForMission(missionId).id;
      const view = trackView(progress, world);
      progress = mergeTrack(progress, world, { ...view, storyIndex: Math.max(0, order.indexOf(missionId)), carry: null, ending: null, location });
      commit(progress);
      if (fly && needsFlight(placeById(location), placeForMission(missionId))) set({ screen: 'flight', world, flightTarget: missionId, whyOpen: false });
      else begin(mission, NO_FLIGHT, false);
    },
  };
});
