// Built with help from Claude (Anthropic).
// Live Space Weather (SPEC Part 4.5): turns real NASA DONKI events into a risk level,
// and the risk level into game effects, so NASA data changes how the game plays
// (NASA's Relevance criterion), not just a label on screen.
import type { Effect, RiskLevel, SpaceWeatherSnapshot } from './types';

const DAY = 24 * 60 * 60 * 1000;

export interface RiskSummary {
  level: RiskLevel;
  /** Counts in the 7 days before the reference time. */
  mFlares: number;
  xFlares: number;
  cmes: number;
  seps: number;
  /** Any solar energetic particle event in the last 3 days. */
  recentSep: boolean;
}

const within = (iso: string, ref: number, days: number) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t <= ref && t >= ref - days * DAY;
};

/**
 * SPEC 4.5 rules, over the last 7 days (UTC) before `reference`:
 * HIGH = any X-class flare, or any SEP event in the last 3 days.
 * MODERATE = any M-class flare, or any CME. LOW = none of these.
 * For archived data the reference is when it was fetched, so old data is judged as it was then.
 */
export function riskSummary(snapshot: SpaceWeatherSnapshot, reference: number): RiskSummary {
  const flares = snapshot.flares.filter((f) => within(f.time, reference, 7));
  const mFlares = flares.filter((f) => f.classType.toUpperCase().startsWith('M')).length;
  const xFlares = flares.filter((f) => f.classType.toUpperCase().startsWith('X')).length;
  const cmes = snapshot.cme.filter((c) => within(c.time, reference, 7)).length;
  const seps = snapshot.sep.filter((s) => within(s.time, reference, 7)).length;
  const recentSep = snapshot.sep.some((s) => within(s.time, reference, 3));
  const level: RiskLevel = xFlares > 0 || recentSep ? 'HIGH' : mFlares > 0 || cmes > 0 ? 'MODERATE' : 'LOW';
  return { level, mFlares, xFlares, cmes, seps, recentSep };
}

/** How often a solar flare warning pops up during flights, per risk level. */
export const FLARE_WEIGHT: Record<RiskLevel, number> = { LOW: 0.5, MODERATE: 1.5, HIGH: 3 };

/**
 * Extra stress at the start of a mission that is linked to space weather (SPEC 4.5:
 * MODERATE makes radiation more likely; HIGH adds a real shelter alarm and power stress).
 */
export function spaceWeatherEffects(level: RiskLevel, linked: boolean): Effect[] {
  if (!linked) return [];
  if (level === 'HIGH') return [{ target: 'radiation', delta: 10 }, { target: 'power', delta: -5 }];
  if (level === 'MODERATE') return [{ target: 'radiation', delta: 5 }];
  return [];
}

export type EventKind = 'flare' | 'sep' | 'cme';
export const EVENT_NAME: Record<EventKind, string> = {
  flare: 'solar flare',
  sep: 'solar particle event',
  cme: 'coronal mass ejection (a cloud of solar material)',
};

/**
 * LUNA_BUILD B8: the most recent real event in the data, for Mission 8's briefing.
 * Only events at or before `reference` count; null when the lists are empty.
 */
export function latestEvent(snapshot: SpaceWeatherSnapshot, reference = Date.parse(snapshot.fetchedAt)): { kind: EventKind; time: string; classType?: string } | null {
  const all: { kind: EventKind; time: string; classType?: string }[] = [
    ...snapshot.flares.map((f) => ({ kind: 'flare' as const, time: f.time, classType: f.classType })),
    ...snapshot.sep.map((s) => ({ kind: 'sep' as const, time: s.time })),
    ...snapshot.cme.map((c) => ({ kind: 'cme' as const, time: c.time })),
  ].filter((e) => Number.isFinite(Date.parse(e.time)) && Date.parse(e.time) <= reference);
  if (all.length === 0) return null;
  return all.reduce((a, b) => (Date.parse(b.time) > Date.parse(a.time) ? b : a));
}

/** A short, honest sentence about what NASA recorded (no safety advice). */
export function riskSentence(summary: RiskSummary, missing: readonly string[] = []): string {
  const strong = summary.xFlares + summary.mFlares;
  const parts: string[] = [];
  if (strong > 0) parts.push(`${strong} strong solar flare${strong === 1 ? '' : 's'}`);
  if (summary.cmes > 0) parts.push(`${summary.cmes} coronal mass ejection${summary.cmes === 1 ? '' : 's'} (clouds of solar material)`);
  if (summary.seps > 0) parts.push(`${summary.seps} solar particle event${summary.seps === 1 ? '' : 's'}`);
  const seen = parts.length > 0 ? `NASA recorded ${parts.join(', ')} in that week.` : 'NASA recorded no major solar storms in that week.';
  return missing.includes('flares') ? `${seen} NASA's flare list could not be loaded.` : seen;
}
