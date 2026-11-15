// Built with help from Claude (Anthropic).
// Stars, endings and ranks (SPEC Part 3 "Endings", Part 4.6 "Progression").
import { ENDING, GAUGE_IDS, RANKS } from './balance';
import { gaugesOf, gaugeState, readTarget } from './reducer';
import type { Gauges, Mission, MissionState } from './types';

export interface MissionScore {
  /** Reached the end of the mission without being paused. */
  finished: boolean;
  /** Every successIf holds at the end. */
  objectiveMet: boolean;
  /** No gauge dropped into critical (below 30) during the mission. */
  neverCritical: boolean;
  bonusMet: boolean;
  stars: 0 | 1 | 2 | 3;
}

/** Star 1: finish with the objective met. Star 2: no gauge ever critical. Star 3: bonus objective. */
export function scoreMission(state: MissionState, mission: Mission): MissionScore {
  const finished = state.phase === 'complete';
  const final = gaugesOf(state.parts);
  const objectiveMet = mission.successIf.every((c) => Math.round(final[c.gauge]) >= c.min);
  const neverCritical = GAUGE_IDS.every((id) => gaugeState(state.lowest[id]) !== 'critical');
  const bonus = mission.bonusIf ?? [];
  const bonusMet = bonus.length > 0 && bonus.every((c) => Math.round(readTarget(state, c.target)) >= c.min);
  const stars = finished && objectiveMet ? 1 + Number(neverCritical) + Number(bonusMet) : 0;
  return { finished, objectiveMet, neverCritical, bonusMet, stars: stars as MissionScore['stars'] };
}

/** LUNA_BUILD B2: "First Light on Olympus", by total stars: Olympus Station, Outpost, or Beacon. */
export type OlympusEnding = 'station' | 'outpost' | 'beacon';
/** The four older endings (SPEC Part 3) are only read from old saves. */
export type LegacyEnding = 'complete' | 'bumpy' | 'closeCall' | 'paused';
export type EndingId = OlympusEnding | LegacyEnding;

export const isOlympusEnding = (id: EndingId | null | undefined): id is OlympusEnding => id === 'station' || id === 'outpost' || id === 'beacon';

export interface EndingInput {
  finalGauges: Gauges;
  stars: number;
  maxStars: number;
  /** The last mission ended paused (a gauge hit 0 with no rescue left). */
  paused: boolean;
}

export function endingScore({ finalGauges, stars, maxStars }: EndingInput): number {
  const average = GAUGE_IDS.reduce((sum, id) => sum + finalGauges[id], 0) / GAUGE_IDS.length;
  const starShare = maxStars > 0 ? stars / maxStars : 0;
  return ENDING.gaugeWeight * average + ENDING.starWeight * starShare * 100;
}

/**
 * One of the four endings in SPEC Part 3. Never harsh: the lowest is "Mission Paused",
 * where the crew safely waits for the supply lander.
 */
export function pickEnding(input: EndingInput): EndingId {
  if (input.paused) return 'paused';
  const score = endingScore(input);
  const allGood = GAUGE_IDS.every((id) => gaugeState(input.finalGauges[id]) === 'good');
  if (score >= ENDING.complete && allGood) return 'complete';
  if (score >= ENDING.bumpy) return 'bumpy';
  if (gaugeState(input.finalGauges.crew) !== 'critical') return 'closeCall'; // crew safe, base needs repairs
  return 'paused';
}

/** Cadet → Specialist → Flight Lead → Commander, by share of all stars earned. */
export function rankFor(totalStars: number, maxStars: number) {
  const share = maxStars > 0 ? totalStars / maxStars : 0;
  return [...RANKS].reverse().find((rank) => share >= rank.minShare) ?? RANKS[0];
}
