// Built with help from Claude (Anthropic).
// Story mode rules (SPEC Parts 3 and 4.6). Tier 1 missions are played in order, the base
// carries over from one story mission to the next ("every earlier decision has brought you
// to this moment"), and the last one leads to one of the four endings. Replaying a finished
// mission starts from a fresh base and can only raise its stars.
import { CARGO_START, INVERTED_PARTS, RESUPPLY, SUB_IDS } from './balance';
import type { Rng } from './random';
import { applyEffectNow, checkEnd, createMissionState, gaugesOf, settle } from './reducer';
import { scoreMission, type EndingId } from './scoring';
import type { Difficulty, Effect, Mission, MissionState, Parts } from './types';

export interface Carry {
  parts: Parts;
  spareParts: number;
  bolt: number;
  /** The sol the last story mission ended on (missing in saves from before Time costs). */
  sol?: number;
}

export interface Progress {
  name: string;
  difficulty: Difficulty;
  tutorialDone: boolean;
  /** Best stars per mission id in this story run. */
  stars: Record<string, number>;
  /** Position in the story order of the next story mission. */
  storyIndex: number;
  /** The base as it was at the end of the last finished story mission. */
  carry: Carry | null;
  /** Place id where the rocket is parked (missing in older saves: treated as the station). */
  location?: string;
  /** Science Cards unlocked (SPEC 4.6). */
  cards: string[];
  ending: EndingId | null;
  /**
   * Story progress on other worlds (Mars). The Moon's story uses the fields above, so saves
   * from before Mars still work.
   */
  worlds?: Partial<Record<WorldId, Track>>;
  // ---- LUNA_BUILD chapters (all optional, so older saves still load) ----
  /** Save layout version: 2 = six chapters (older saves are moved over in save.ts). */
  v?: number;
  /** Best stars (0–5) per chapter id. */
  chapterStars?: Record<string, number>;
  /** How each story mission went the last time it was played in the story (for chapter stars). */
  runs?: Record<string, MissionRun>;
  /** Mars Cargo crates loaded on the Moon (0–36). */
  cargo?: number;
  /** Whether the flight into a chapter was a Clean flight (Safety 80+ at landing). */
  cleanFlights?: Partial<Record<FlightId, boolean>>;
}

/** The two big flights between chapters (LUNA_BUILD B1). */
export type FlightId = 'earth-moon' | 'moon-mars';

/** What one story mission left behind, for the chapter's five stars (LUNA_BUILD B2). */
export interface MissionRun {
  finished: boolean;
  objectiveMet: boolean;
  neverCritical: boolean;
  bonusMet: boolean;
  rescuesUsed: number;
  /** Mars Cargo crates this Moon mission loaded (0 on Mars). */
  crates?: number;
}

/** Where a story is played. The Moon comes first, then Mars (NASA's Moon-to-Mars order). */
export type WorldId = 'moon' | 'mars';

/** One world's story: how far it got, the base it carries, its ending and where the rocket is. */
export interface Track {
  storyIndex: number;
  carry: Carry | null;
  ending: EndingId | null;
  location?: string;
}

const EMPTY_TRACK: Track = { storyIndex: 0, carry: null, ending: null };

/**
 * The progress as seen from one world: the same name, level, stars and cards, with that
 * world's story fields. Every rule below works on a view, so it works the same on any world.
 */
export function trackView(progress: Progress, world: WorldId): Progress {
  if (world === 'moon') return progress;
  const track = progress.worlds?.[world] ?? EMPTY_TRACK;
  return { ...progress, storyIndex: track.storyIndex, carry: track.carry, ending: track.ending, location: track.location };
}

/** Puts a changed view back: shared things (stars, cards, level) and that world's story fields. */
export function mergeTrack(progress: Progress, world: WorldId, view: Progress): Progress {
  if (world === 'moon') return { ...view, worlds: progress.worlds };
  const track: Track = { storyIndex: view.storyIndex, carry: view.carry, ending: view.ending, location: view.location };
  return {
    ...progress,
    difficulty: view.difficulty,
    tutorialDone: view.tutorialDone,
    stars: view.stars,
    cards: view.cards,
    // Chapter results, cargo and flights are shared by both worlds, like stars.
    chapterStars: view.chapterStars,
    runs: view.runs,
    cargo: view.cargo,
    cleanFlights: view.cleanFlights,
    worlds: { ...progress.worlds, [world]: track },
  };
}

/** The Moon is always open; Mars opens once the Moon story is finished. */
export function worldUnlocked(progress: Progress, world: WorldId, moonOrder: readonly number[]): boolean {
  return world === 'moon' || progress.storyIndex >= moonOrder.length;
}

/** Stars earned on the missions of one story. */
export const orderStars = (progress: Progress, order: readonly number[]) =>
  order.reduce((sum, id) => sum + (progress.stars[String(id)] ?? 0), 0);

export function newProgress(name: string, difficulty: Difficulty): Progress {
  return { name, difficulty, tutorialDone: false, stars: {}, storyIndex: 0, carry: null, cards: [], ending: null, v: 2 };
}

export const totalStars = (progress: Progress) => Object.values(progress.stars).reduce((sum, stars) => sum + stars, 0);

export function isUnlocked(progress: Progress, missionId: number, order: readonly number[]): boolean {
  const index = order.indexOf(missionId);
  return index >= 0 && index <= progress.storyIndex;
}

/** True when this mission is the next one in the story (as opposed to a replay). */
export function isStoryRun(progress: Progress, missionId: number, order: readonly number[]): boolean {
  return order[progress.storyIndex] === missionId;
}

/**
 * A story run continues from the carried-over base; a replay starts fresh (gauges 70–85).
 * `arrival` holds what the flight there did (rock-hit repairs, astronauts picked up).
 */
export function startMission(
  progress: Progress,
  mission: Mission,
  order: readonly number[],
  rng: Rng,
  arrival: readonly Effect[] = [],
): MissionState {
  const state = carried(progress, mission, order, rng);
  if (arrival.length === 0) return state;
  let next = state;
  for (const effect of arrival) next = applyEffectNow(next, effect);
  // A flight can never empty a gauge: settle() rescues it like any other change.
  return { ...settle(next).state, lowest: gaugesOf(next.parts) };
}

/** LUNA_BUILD B2: the Mars Cargo sets every starting gauge on Mars (28+ crates → 85, 20–27 → 75, under 20 → 65). */
export function cargoStartGauge(crates: number): number {
  return (CARGO_START.find((row) => crates >= row.minCrates) ?? CARGO_START[CARGO_START.length - 1]).gauge;
}

/** Every part at the same score (the radiation dose is flipped). */
function partsAt(score: number): Parts {
  const parts = {} as Parts;
  for (const sub of SUB_IDS) parts[sub] = INVERTED_PARTS.has(sub) ? 100 - score : score;
  return parts;
}

function carried(progress: Progress, mission: Mission, order: readonly number[], rng: Rng): MissionState {
  const fresh = createMissionState(mission, progress.difficulty, { rng, startSol: mission.day });
  if (!isStoryRun(progress, mission.id, order)) return fresh;
  if (!progress.carry) {
    // The first Mars mission starts with what the rocket brought from the Moon.
    if (mission.world === 'mars' && progress.cargo !== undefined) {
      const parts = partsAt(cargoStartGauge(progress.cargo));
      return { ...fresh, parts, lowest: gaugesOf(parts) };
    }
    return fresh;
  }
  const { carry } = progress;
  const parts = { ...carry.parts };
  // "Time" costs can push the clock past the next mission's day; the story never goes back in time.
  const sol = Math.max(mission.day, carry.sol ?? 0);
  return { ...fresh, sol, parts, spareParts: carry.spareParts, bolt: carry.bolt, lowest: gaugesOf(parts) };
}

/** The supply lander after a paused mission: every part to at least RESUPPLY.minScore, some spare parts and BOLT. */
export function resupply(carry: Carry): Carry {
  const parts = { ...carry.parts };
  for (const sub of SUB_IDS) {
    parts[sub] = INVERTED_PARTS.has(sub) ? Math.min(parts[sub], 100 - RESUPPLY.minScore) : Math.max(parts[sub], RESUPPLY.minScore);
  }
  return { ...carry, parts, spareParts: Math.max(carry.spareParts, RESUPPLY.spareParts), bolt: Math.max(carry.bolt, RESUPPLY.bolt) };
}

export function unlockCard(progress: Progress, cardId: string): Progress {
  return progress.cards.includes(cardId) ? progress : { ...progress, cards: [...progress.cards, cardId] };
}

/**
 * Call once when a mission ends (complete or paused): mission stars, the Science Card, and for a
 * story run the next story step and the base carried over. A paused story mission does not move
 * the story on (the player tries again). Endings are decided by the chapter rules (chapters.ts).
 */
export function recordMission(progress: Progress, mission: Mission, state: MissionState, order: readonly number[]): Progress {
  const end = checkEnd(state);
  if (!end) return progress;
  const key = String(mission.id);
  const stars = scoreMission(state, mission).stars;
  let next: Progress = { ...progress, stars: { ...progress.stars, [key]: Math.max(progress.stars[key] ?? 0, stars) } };
  if (end === 'complete') next = unlockCard(next, mission.scienceCardId);
  if (!isStoryRun(progress, mission.id, order)) return next;
  // Paused: the story waits, and the supply lander tops the base up, so the next try can succeed.
  if (end === 'paused') return progress.carry ? { ...next, carry: resupply(progress.carry) } : next;
  return {
    ...next,
    storyIndex: progress.storyIndex + 1,
    carry: { parts: { ...state.parts }, spareParts: state.spareParts, bolt: state.bolt, sol: state.sol },
  };
}

/**
 * Start this story again: keeps the name, level, tutorial, Science Cards and the other world's
 * stars, chapter results and cargo (chapters.ts clears this world's chapter results).
 */
export function restartStory(progress: Progress, order: readonly number[]): Progress {
  const stars = Object.fromEntries(Object.entries(progress.stars).filter(([id]) => !order.includes(Number(id))));
  return {
    ...newProgress(progress.name, progress.difficulty),
    tutorialDone: progress.tutorialDone,
    cards: progress.cards,
    stars,
    worlds: progress.worlds,
    chapterStars: progress.chapterStars,
    runs: progress.runs,
    cargo: progress.cargo,
    cleanFlights: progress.cleanFlights,
  };
}
