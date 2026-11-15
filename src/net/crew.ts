// Built with help from Claude (Anthropic).
// Crew Mode rules (LUNA_BUILD B6), pure TypeScript with tests (crew.test.ts):
// roles, arm-stripe colours, and how a crew's votes on a card become one decision.
// Majority wins. A tie is decided by the officer whose gauge the card mainly affects.
// Nobody voted = the card's standard plan (the same as when the timer runs out).
import { GAUGE_PARTS } from '../engine/balance';
import type { GameEvent, GaugeId } from '../engine/types';

export interface Role {
  id: GaugeId | 'specialist';
  name: string;
  /** Arm-stripe colour on the astronaut (the gauge's own colour). */
  band: string;
}

/** Join order: host first. A fourth friend joins as Mission Specialist (votes, no tie-break). */
export const ROLES: readonly Role[] = [
  { id: 'power', name: 'Power Engineer', band: '#FFB547' },
  { id: 'life', name: 'Life Support Officer', band: '#3DD6D0' },
  { id: 'crew', name: 'Flight Doctor', band: '#FF6B8A' },
  { id: 'specialist', name: 'Mission Specialist', band: '#9fb3ff' },
];
export const MAX_CREW = ROLES.length;

/** The gauge a card mainly affects: the one its choices move the most, in total. */
export function mainGauge(event: Pick<GameEvent, 'choices'>): GaugeId {
  const weight: Record<GaugeId, number> = { power: 0, life: 0, crew: 0 };
  for (const choice of event.choices) {
    for (const effect of [...choice.effects, ...(choice.riskEffects ?? [])]) {
      const t = effect.target as string;
      if (t === 'power' || t === 'life' || t === 'crew') weight[t] += Math.abs(effect.delta);
      for (const g of Object.keys(GAUGE_PARTS) as GaugeId[]) {
        if ((GAUGE_PARTS[g] as readonly string[]).includes(t)) weight[g] += Math.abs(effect.delta);
      }
    }
  }
  return (Object.keys(weight) as GaugeId[]).reduce((best, g) => (weight[g] > weight[best] ? g : best), 'power');
}

export interface Voter {
  id: string;
  /** Index into ROLES. */
  role: number;
}

/**
 * The crew's decision. `votes` maps a voter id to a choice id. Returns null when nobody voted
 * (the caller then uses the card's standard plan).
 */
export function tallyVotes(
  votes: Readonly<Record<string, string>>,
  voters: readonly Voter[],
  choiceIds: readonly string[],
  tieBreak: GaugeId,
): string | null {
  const count = new Map<string, number>();
  for (const voter of voters) {
    const choice = votes[voter.id];
    if (choice && choiceIds.includes(choice)) count.set(choice, (count.get(choice) ?? 0) + 1);
  }
  if (count.size === 0) return null;
  const top = Math.max(...count.values());
  const tied = choiceIds.filter((id) => count.get(id) === top);
  if (tied.length === 1) return tied[0];
  // A split: the officer of the card's main gauge decides, if they voted for one of the tied choices.
  const officer = voters.find((v) => ROLES[v.role]?.id === tieBreak);
  const theirs = officer ? votes[officer.id] : undefined;
  if (theirs && tied.includes(theirs)) return theirs;
  // Otherwise the first of the tied choices in card order.
  return tied[0];
}

/** Have all crew members voted? */
export const allVoted = (votes: Readonly<Record<string, string>>, voters: readonly Voter[]) => voters.every((v) => Boolean(votes[v.id]));

/** A short party code people can read out loud: no 0/O or 1/I. */
export function partyCode(rand: () => number = Math.random): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => letters[Math.floor(rand() * letters.length)]).join('');
}

/** Names on screen: 1–16 visible characters, no control characters or angle brackets. */
export function cleanName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
}
