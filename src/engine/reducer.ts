// Built with help from Claude (Anthropic).
// The game rules as pure functions: state in, new state out. No React, and no
// randomness except through the Rng passed in, so every rule can be tested.
import {
  BOLT_START,
  DIFFICULTY,
  DRAIN_PER_SOL,
  GAUGE_IDS,
  GAUGE_PARTS,
  INVERTED_PARTS,
  RESCUE,
  SPARE_PARTS,
  START_RANGE,
  STORM_SECONDS,
  SUB_IDS,
  THRESHOLDS,
  TIMEOUT_MESSAGE,
} from './balance';
import { randInt, type Rng } from './random';
import { KNOCK_LINE, TIRED_RISK_BONUS, activeKnockOns } from './ripple';
import type {
  ChoiceOutcome,
  Difficulty,
  Effect,
  EffectTarget,
  GameEvent,
  GaugeId,
  Gauges,
  GaugeState,
  Mission,
  MissionState,
  ModuleId,
  Parts,
  PendingEffect,
  RescueReport,
  SolReport,
  SubId,
} from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isGauge = (target: EffectTarget): target is GaugeId =>
  target === 'power' || target === 'life' || target === 'crew';

// ---- Reading gauges ----

/** How good a part is, 0–100, higher is better (the radiation dose is flipped). */
export function partScore(sub: SubId, value: number): number {
  return INVERTED_PARTS.has(sub) ? 100 - value : value;
}

/** A gauge is the average score of its parts. */
export function gaugeValue(parts: Parts, gauge: GaugeId): number {
  const subs = GAUGE_PARTS[gauge];
  return subs.reduce((sum, sub) => sum + partScore(sub, parts[sub]), 0) / subs.length;
}

export function gaugesOf(parts: Parts): Gauges {
  return { power: gaugeValue(parts, 'power'), life: gaugeValue(parts, 'life'), crew: gaugeValue(parts, 'crew') };
}

/** Uses the rounded value the player sees, so the state always matches the number on screen. */
export function gaugeState(value: number): GaugeState {
  const shown = Math.round(value);
  if (shown >= THRESHOLDS.good) return 'good';
  if (shown >= THRESHOLDS.caution) return 'caution';
  return 'critical';
}

/** Reads any target as "higher is better" (radiation becomes 100 − dose). */
export function readTarget(state: MissionState, target: EffectTarget): number {
  if (target === 'spareParts') return state.spareParts;
  if (target === 'bolt') return state.bolt;
  if (target === 'progress') return state.progress;
  if (target === 'time') return state.extraSols;
  if (isGauge(target)) return gaugeValue(state.parts, target);
  return partScore(target, state.parts[target]);
}

/** The module the camera flies to when this event appears (SPEC Part 5 "SCENE CUE"). */
export function eventFocus(event: GameEvent): ModuleId {
  return event.focus ?? event.choices[0].sceneCue.module;
}

/** Radiation is a dose and time is sols spent, so for both a higher number is worse. */
const higherIsWorse = (target: EffectTarget) => target === 'radiation' || target === 'time';

/** True when an effect makes things worse. */
export function isCost(effect: Effect): boolean {
  return higherIsWorse(effect.target) ? effect.delta > 0 : effect.delta < 0;
}

export function isBenefit(effect: Effect): boolean {
  return higherIsWorse(effect.target) ? effect.delta < 0 : effect.delta > 0;
}

// ---- Changing state ----

/** Applies one effect right now (ignores delaySols). */
export function applyEffectNow(state: MissionState, effect: Effect): MissionState {
  const { target, delta } = effect;
  if (target === 'spareParts') return { ...state, spareParts: clamp(state.spareParts + delta, 0, SPARE_PARTS.max) };
  if (target === 'bolt') return { ...state, bolt: clamp(state.bolt + delta, 0, 100) };
  if (target === 'progress') return { ...state, progress: clamp(state.progress + delta, 0, 100) };
  if (target === 'time') return { ...state, extraSols: Math.max(0, state.extraSols + delta) };

  const parts = { ...state.parts };
  const subs = isGauge(target) ? GAUGE_PARTS[target] : [target];
  for (const sub of subs) {
    // "Crew +10" means the crew gets better, so it lowers the radiation dose.
    const change = isGauge(target) && INVERTED_PARTS.has(sub) ? -delta : delta;
    parts[sub] = clamp(parts[sub] + change, 0, 100);
  }
  return { ...state, parts };
}

/** Applies effects now, or queues the ones with delaySols for a later sol. */
function applyEffects(
  state: MissionState,
  effects: readonly Effect[],
  fromChoiceId: string,
): { state: MissionState; scheduled: PendingEffect[] } {
  let next = state;
  const scheduled: PendingEffect[] = [];
  for (const effect of effects) {
    if (effect.delaySols && effect.delaySols > 0) {
      scheduled.push({ effect, dueSol: state.sol + effect.delaySols, fromChoiceId });
    } else {
      next = applyEffectNow(next, effect);
    }
  }
  if (scheduled.length > 0) next = { ...next, pending: [...next.pending, ...scheduled] };
  return { state: next, scheduled };
}

function trackLowest(state: MissionState): MissionState {
  const now = gaugesOf(state.parts);
  const lowest = { ...state.lowest };
  for (const id of GAUGE_IDS) lowest[id] = Math.min(lowest[id], now[id]);
  return { ...state, lowest };
}

/** Raises an empty gauge back to RESCUE.restoreTo and pays the rescue cost. */
function rescue(state: MissionState, gauge: GaugeId): MissionState {
  const parts = { ...state.parts };
  for (const sub of GAUGE_PARTS[gauge]) {
    parts[sub] = INVERTED_PARTS.has(sub)
      ? Math.min(parts[sub], 100 - RESCUE.restoreTo)
      : Math.max(parts[sub], RESCUE.restoreTo);
  }
  let next: MissionState = { ...state, parts, rescuesLeft: state.rescuesLeft - 1 };
  for (const cost of RESCUE.cost) next = applyEffectNow(next, cost);
  return { ...next, log: [...next.log, { sol: next.sol, text: RESCUE.message[gauge] }] };
}

/**
 * Runs after every change (SPEC "rescue"). A gauge at 0 triggers a rescue while the
 * mission still has some; with none left the mission is paused, which leads to the
 * gentle "Mission Paused" ending, never a harsh game over.
 */
export function settle(state: MissionState): { state: MissionState; rescues: RescueReport[] } {
  let next = state;
  const rescues: RescueReport[] = [];
  for (const gauge of GAUGE_IDS) {
    if (Math.round(gaugeValue(next.parts, gauge)) > 0) continue;
    // LUNA_BUILD B3: with no spare parts left there is nothing to fix it with, so no rescue.
    if (next.rescuesLeft <= 0 || next.spareParts <= 0) return { state: { ...next, phase: 'paused' }, rescues };
    next = rescue(next, gauge);
    rescues.push({ gauge, message: RESCUE.message[gauge] });
  }
  return { state: next, rescues };
}

// ---- Mission flow ----

export interface StartOptions {
  rng: Rng;
  startSol?: number;
}

export function createMissionState(mission: Mission, difficulty: Difficulty, { rng, startSol = 1 }: StartOptions): MissionState {
  const parts = {} as Parts;
  for (const sub of SUB_IDS) {
    const score = randInt(rng, START_RANGE.min, START_RANGE.max);
    parts[sub] = INVERTED_PARTS.has(sub) ? 100 - score : score;
  }
  return {
    missionId: mission.id,
    difficulty,
    sol: startSol,
    parts,
    spareParts: SPARE_PARTS.start,
    bolt: BOLT_START,
    progress: 0,
    extraSols: 0,
    eventIndex: 0,
    phase: mission.eventIds.length > 0 ? 'choosing' : 'complete',
    pending: [],
    rescuesLeft: DIFFICULTY[difficulty].rescues,
    lowest: gaugesOf(parts),
    log: [],
  };
}

export interface ChoiceOptions {
  rng: Rng;
  timedOut?: boolean;
}

/** SPEC "applyChoice": the player picks a choice on the current event card. */
export function applyChoice(
  state: MissionState,
  event: GameEvent,
  choiceId: string,
  { rng, timedOut = false }: ChoiceOptions,
): { state: MissionState; outcome: ChoiceOutcome } {
  if (state.phase !== 'choosing') throw new Error(`applyChoice: mission is "${state.phase}", not "choosing"`);
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`applyChoice: no choice "${choiceId}" in event "${event.id}"`);

  const before = gaugesOf(state.parts);
  let { state: next, scheduled } = applyEffects(state, choice.effects, choice.id);

  // A random roll can only make the risk shown on the card happen (SPEC 4.3: no luck-only outcomes).
  let riskTriggered = false;
  if (choice.risk && choice.riskChance && choice.riskEffects?.length) {
    // LUNA_BUILD B3: a tired crew (Morale under 30) makes the shown risk 10% more likely.
    const chance = Math.min(1, choice.riskChance + (state.parts.morale < KNOCK_LINE ? TIRED_RISK_BONUS : 0));
    riskTriggered = rng() < chance;
    if (riskTriggered) {
      const risky = applyEffects(next, choice.riskEffects, choice.id);
      next = risky.state;
      scheduled = [...scheduled, ...risky.scheduled];
    }
  }

  const text = `${event.title}: ${choice.label}${timedOut ? ' (time ran out)' : ''}`;
  next = trackLowest({ ...next, log: [...next.log, { sol: state.sol, text }] });
  const settled = settle(next);
  next = settled.state.phase === 'paused' ? settled.state : { ...settled.state, phase: 'outcome' };

  return {
    state: next,
    outcome: {
      eventId: event.id,
      choiceId: choice.id,
      timedOut,
      riskTriggered,
      before,
      after: gaugesOf(next.parts),
      scheduled,
      rescues: settled.rescues,
      message: timedOut ? TIMEOUT_MESSAGE : undefined,
    },
  };
}

/**
 * LUNA_BUILD B4: seconds to decide on this card. Explorer has no timer; otherwise every card gets
 * the difficulty's timer, and storm cards (linked to space weather) get STORM_SECONDS at most.
 */
export function cardSeconds(difficulty: Difficulty, event: Pick<GameEvent, 'spaceWeatherLinked'>): number | null {
  const base = DIFFICULTY[difficulty].timerSeconds;
  if (base === null) return null;
  return event.spaceWeatherLinked ? Math.min(base, STORM_SECONDS) : base;
}

/** The choice played when time runs out: the card's own default, or its first choice (the team's convention, M14). */
export const defaultChoiceOf = (event: GameEvent): string => event.defaultChoiceId ?? event.choices[0].id;

/** The timer ran out: play the event's default choice and say why. */
export function applyTimeout(state: MissionState, event: GameEvent, { rng }: { rng: Rng }) {
  return applyChoice(state, event, defaultChoiceOf(event), { rng, timedOut: true });
}

/** How many sols pass after event `index`: the mission's sols are spread evenly over its events. */
export function solsAfterEvent(mission: Mission, index: number): number {
  const count = mission.eventIds.length;
  if (count === 0) return 0;
  return Math.floor(((index + 1) * mission.sols) / count) - Math.floor((index * mission.sols) / count);
}

/** SPEC "advanceSol": one sol passes. Passive drain, then any delayed effects that are now due. */
export function advanceSol(state: MissionState): { state: MissionState; report: SolReport } {
  const before = gaugesOf(state.parts);
  const multiplier = DIFFICULTY[state.difficulty].drainMultiplier;
  const drain = {} as Gauges;
  let next = state;
  for (const gauge of GAUGE_IDS) {
    drain[gauge] = DRAIN_PER_SOL[gauge] * multiplier;
    next = applyEffectNow(next, { target: gauge, delta: -drain[gauge] });
  }
  // High camps on Olympus Mons: less air overhead, more radiation dose each sol.
  const radiation = state.radiationPerSol ?? 0;
  if (radiation > 0) next = applyEffectNow(next, { target: 'radiation', delta: radiation });
  // LUNA_BUILD B3 knock-ons: low systems drag down the ones that depend on them (all judged on the same moment).
  const knockOns = activeKnockOns(next.parts, state.difficulty).map(({ rule, effects }) => ({ id: rule.id, reason: rule.reason, effects }));
  for (const k of knockOns) for (const e of k.effects) next = applyEffectNow(next, e);

  const sol = state.sol + 1;
  const arrived = next.pending.filter((p) => p.dueSol <= sol);
  next = { ...next, sol, pending: next.pending.filter((p) => p.dueSol > sol) };
  for (const p of arrived) next = applyEffectNow(next, p.effect);

  const settled = settle(trackLowest(next));
  return {
    state: settled.state,
    report: { sol, drain, radiation, knockOns, arrived, rescues: settled.rescues, before, after: gaugesOf(settled.state.parts) },
  };
}

/** Sols that pass when the player taps "next": the mission's own, plus any "Time" the choice cost. */
export function solsToPass(state: MissionState, mission: Mission): number {
  return solsAfterEvent(mission, state.eventIndex) + state.extraSols;
}

/** The player taps "next": the scheduled sols pass, then the next event comes up or the mission ends. */
export function nextStep(state: MissionState, mission: Mission): { state: MissionState; sols: SolReport[] } {
  if (state.phase !== 'outcome') throw new Error(`nextStep: mission is "${state.phase}", not "outcome"`);
  const count = solsToPass(state, mission);
  let next: MissionState = { ...state, extraSols: 0 };
  const sols: SolReport[] = [];
  for (let i = 0; i < count; i++) {
    const step = advanceSol(next);
    next = step.state;
    sols.push(step.report);
    if (next.phase === 'paused') return { state: next, sols };
  }
  const eventIndex = state.eventIndex + 1;
  const phase = eventIndex >= mission.eventIds.length ? 'complete' : 'choosing';
  return { state: { ...next, eventIndex, phase }, sols };
}

/** SPEC "checkEnd": null while the mission is still going. */
export function checkEnd(state: MissionState): 'complete' | 'paused' | null {
  return state.phase === 'complete' || state.phase === 'paused' ? state.phase : null;
}
