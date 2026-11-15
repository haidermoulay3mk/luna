// Built with help from Claude (Anthropic).
// LUNA_BUILD B1–B2 as pure functions: six chapters of three missions, five stars per chapter,
// the Mars Cargo the Moon base loads into the rocket, the goal track (Earth → Olympus summit),
// the camps on Olympus Mons and the three-tier "First Light on Olympus" ending.
// Every number here is a DRAFT game rule from balance.ts, not a NASA fact.
import {
  BONUS_FOR_STAR,
  CAMP_RADIATION,
  CARGO,
  CLEAN_FLIGHT_SAFETY,
  DIFFICULTY,
  GAUGE_IDS,
  OLYMPUS_TIERS,
  STARS_PER_CHAPTER,
} from './balance';
import { isStoryRun, recordMission, type FlightId, type MissionRun, type Progress, type WorldId } from './campaign';
import type { FlightResult } from './flight';
import { checkEnd, gaugesOf } from './reducer';
import { isOlympusEnding, scoreMission, type OlympusEnding } from './scoring';
import type { Mission, MissionState } from './types';

export interface Chapter {
  id: number;
  world: WorldId;
  title: string;
  /** Three missions, in story order. */
  missions: number[];
  teaches: string;
  /** The flight that brings the crew into this chapter (its Clean flight counts for star 5). */
  flightIn?: FlightId;
}

// ---- One mission's part in its chapter ----

export function missionRun(state: MissionState, mission: Mission): MissionRun {
  const score = scoreMission(state, mission);
  return {
    finished: score.finished,
    objectiveMet: score.finished && score.objectiveMet,
    neverCritical: score.neverCritical,
    bonusMet: score.finished && score.bonusMet,
    rescuesUsed: Math.max(0, DIFFICULTY[state.difficulty].rescues - state.rescuesLeft),
    crates: mission.world !== 'mars' && state.phase === 'complete' ? cargoCrates(state) : 0,
  };
}

// ---- Five stars per chapter ----

export interface ChapterScore {
  /** The five checks in order: finished, never critical, all objectives, 2+ bonus, clean record. */
  checks: [boolean, boolean, boolean, boolean, boolean];
  stars: number;
}

/** What each of the five stars is for (the clean record also needs a clean flight in chapters with a flight in). */
export function starRules(chapter: Pick<Chapter, 'flightIn'>): string[] {
  return [
    'Chapter finished',
    'No gauge ever went critical (below 30)',
    'All 3 mission objectives met',
    `At least ${BONUS_FOR_STAR} bonus objectives met`,
    chapter.flightIn ? 'Clean record: no rescue used, and a Clean flight in' : 'Clean record: no rescue used',
  ];
}

export function scoreChapter(
  chapter: Chapter,
  runs: Partial<Record<string, MissionRun>>,
  cleanFlight?: boolean,
): ChapterScore {
  const list = chapter.missions.map((id) => runs[String(id)]);
  const played = list.every((r): r is MissionRun => r !== undefined);
  const all = (test: (r: MissionRun) => boolean) => played && list.every((r) => test(r!));
  const checks: ChapterScore['checks'] = [
    all((r) => r.finished),
    all((r) => r.neverCritical),
    all((r) => r.objectiveMet),
    list.filter((r) => r?.bonusMet).length >= BONUS_FOR_STAR,
    all((r) => r.rescuesUsed === 0) && (!chapter.flightIn || cleanFlight === true),
  ];
  return { checks, stars: checks.filter(Boolean).length };
}

export const MAX_STARS = (chapters: readonly Chapter[]) => chapters.length * STARS_PER_CHAPTER;

export const totalChapterStars = (progress: Progress, chapters: readonly Chapter[]) =>
  chapters.reduce((sum, c) => sum + (progress.chapterStars?.[String(c.id)] ?? 0), 0);

// ---- Mars Cargo ----

/** Crates after one Moon mission: +1 for each gauge at 60 or above. */
export function cargoCrates(state: MissionState): number {
  const gauges = gaugesOf(state.parts);
  return GAUGE_IDS.filter((id) => Math.round(gauges[id]) >= CARGO.perGaugeAt).length;
}

// ---- Flights ----

/** A Clean flight: flown by hand and landed with Safety 80+ (no Safety yet: no rock hit). */
export function isCleanFlight(result: Pick<FlightResult, 'autopilot' | 'hits'> & { safety?: number }): boolean {
  if (result.autopilot) return false;
  const safety = result.safety ?? (result.hits === 0 ? CLEAN_FLIGHT_SAFETY : 0);
  return safety >= CLEAN_FLIGHT_SAFETY;
}

// ---- The Olympus ending ----

export function olympusEnding(totalStars: number): OlympusEnding {
  return (OLYMPUS_TIERS.find((tier) => totalStars >= tier.minStars) ?? OLYMPUS_TIERS[OLYMPUS_TIERS.length - 1]).id;
}

// ---- Camps on Olympus Mons ----

/** Extra radiation dose per sol at a camp: from its height once the team sends it, by its rank until then. */
export function campRadiation(rank: number, heightKm: number | null | undefined): number {
  if (heightKm !== null && heightKm !== undefined && Number.isFinite(heightKm)) {
    return Math.max(1, Math.round(CAMP_RADIATION.base + CAMP_RADIATION.perKm * heightKm));
  }
  return CAMP_RADIATION.byRank[Math.max(0, Math.min(CAMP_RADIATION.byRank.length - 1, rank))];
}

// ---- Recording a story step ----

export const chapterOf = (chapters: readonly Chapter[], missionId: number) => chapters.find((c) => c.missions.includes(missionId));

/**
 * Call once when a mission ends. Does everything recordMission does, and for a story run also
 * remembers how the mission went, loads Mars Cargo after Moon missions, scores the chapter when
 * its last mission is done, and picks the Olympus ending after the final chapter.
 * The final mission of the game always leads to an ending, even if it was paused (never stuck).
 */
export function recordStory(
  progress: Progress,
  mission: Mission,
  state: MissionState,
  order: readonly number[],
  chapters: readonly Chapter[],
): Progress {
  const end = checkEnd(state);
  if (!end) return progress;
  const storyRun = isStoryRun(progress, mission.id, order);
  let next = recordMission(progress, mission, state, order);
  if (!storyRun) return next;

  const runs = { ...(progress.runs ?? {}), [String(mission.id)]: missionRun(state, mission) };
  next = { ...next, runs };
  if (mission.world !== 'mars' && end === 'complete') {
    next = { ...next, cargo: Math.min(CARGO.max, (progress.cargo ?? 0) + cargoCrates(state)) };
  }

  const chapter = chapterOf(chapters, mission.id);
  if (!chapter) return next;
  const lastOfChapter = chapter.missions[chapter.missions.length - 1] === mission.id;
  const finalOfGame = lastOfChapter && chapter.id === chapters[chapters.length - 1].id;
  if (lastOfChapter && (end === 'complete' || finalOfGame)) {
    const score = scoreChapter(chapter, runs, chapter.flightIn ? next.cleanFlights?.[chapter.flightIn] : undefined);
    const key = String(chapter.id);
    next = { ...next, chapterStars: { ...(next.chapterStars ?? {}), [key]: Math.max(next.chapterStars?.[key] ?? 0, score.stars) } };
  }
  if (finalOfGame) next = { ...next, ending: olympusEnding(totalChapterStars(next, chapters)) };
  return next;
}

/** Starting a world's story again also clears that world's chapter stars, runs, flights (and the cargo on the Moon). */
export function clearChapters(progress: Progress, world: WorldId, chapters: readonly Chapter[]): Progress {
  const mine = chapters.filter((c) => c.world === world);
  const missionIds = new Set(mine.flatMap((c) => c.missions.map(String)));
  const chapterIds = new Set(mine.map((c) => String(c.id)));
  const flights = new Set(mine.map((c) => c.flightIn).filter(Boolean));
  const keep = <T,>(record: Record<string, T> | undefined, drop: Set<string | undefined>) =>
    record ? Object.fromEntries(Object.entries(record).filter(([k]) => !drop.has(k))) : record;
  return {
    ...progress,
    chapterStars: keep(progress.chapterStars, chapterIds),
    runs: keep(progress.runs, missionIds),
    cleanFlights: keep(progress.cleanFlights as Record<string, boolean> | undefined, flights as Set<string | undefined>),
    cargo: world === 'moon' ? 0 : progress.cargo,
  };
}

// ---- The goal track ----

export const GOAL_STOPS = ['Earth', 'Moon', 'Deep space', 'Mars', 'Olympus summit'] as const;

/**
 * Where the crew is on the way to Olympus: 0 Earth (before the first flight), 1 the Moon,
 * 2 deep space (Moon done, not landed on Mars), 3 Mars, 4 the summit (ending reached).
 */
export function goalStop(progress: Progress, moonMissions: number, starts: Record<WorldId, string>): number {
  const mars = progress.worlds?.mars;
  if (isOlympusEnding(mars?.ending)) return 4;
  if (progress.storyIndex >= moonMissions) {
    const landed = mars !== undefined && (mars.storyIndex > 0 || (mars.location !== undefined && mars.location !== starts.mars));
    return landed ? 3 : 2;
  }
  const landed = progress.storyIndex > 0 || (progress.location !== undefined && progress.location !== starts.moon);
  return landed ? 1 : 0;
}

export { STARS_PER_CHAPTER };
