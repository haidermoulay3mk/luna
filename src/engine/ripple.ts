// Built with help from Claude (Anthropic).
// LUNA_BUILD B3, "Ripple": every decision touches many systems. Twelve tracked factors, the
// knock-on rules between them (checked every sol), and a Ripple summary of what one decision
// changed, directly and through knock-ons. All numbers are DRAFT game rules for the team to
// approve, not NASA facts. Pure TypeScript, no React.
import { CARGO, DIFFICULTY, GAUGE_IDS, GAUGE_PARTS, INVERTED_PARTS } from './balance';
import type { Difficulty, Effect, MissionState, Parts, SubId } from './types';

/** Crates this mission would load if it ended now (the same rule as chapters.ts, kept here so the reducer can use this file). */
function crates(parts: Parts): number {
  return GAUGE_IDS.filter((id) => {
    const subs = GAUGE_PARTS[id];
    const value = subs.reduce((sum, sub) => sum + (INVERTED_PARTS.has(sub) ? 100 - parts[sub] : parts[sub]), 0) / subs.length;
    return Math.round(value) >= CARGO.perGaugeAt;
  }).length;
}

/** The 12 tracked factors. */
export type Factor = SubId | 'spareParts' | 'bolt' | 'sols' | 'cargo';
export const FACTORS: readonly Factor[] = ['solar', 'battery', 'oxygen', 'water', 'food', 'health', 'morale', 'radiation', 'spareParts', 'bolt', 'sols', 'cargo'];

export const FACTOR_LABEL: Record<Factor, string> = {
  solar: 'Solar',
  battery: 'Battery',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  health: 'Health',
  morale: 'Morale',
  radiation: 'Radiation dose',
  spareParts: 'Spare parts',
  bolt: 'BOLT',
  sols: 'Sols',
  cargo: 'Mars cargo',
};

/** For these a higher number is worse (a dose, time spent). */
export const HIGHER_IS_WORSE: ReadonlySet<Factor> = new Set<Factor>(['radiation', 'sols']);

/** The critical line for the knock-on rules (the same 30 as the gauges). */
export const KNOCK_LINE = 30;
/** Radiation dose above this harms health. */
export const DOSE_LINE = 60;

export interface KnockOnRule {
  id: string;
  /** The factor whose low (or high) value starts the rule. */
  from: SubId;
  test: (parts: Parts) => boolean;
  /** Per sol. */
  effects: { target: SubId; delta: number }[];
  /** The reason shown to the player. */
  reason: string;
}

/** B3 knock-on rules, applied once per sol (DRAFT, team to approve). */
export const KNOCK_ONS: readonly KnockOnRule[] = [
  { id: 'solar', from: 'solar', test: (p) => p.solar < KNOCK_LINE, effects: [{ target: 'battery', delta: -5 }], reason: 'Panels are not refilling the batteries' },
  {
    id: 'battery',
    from: 'battery',
    test: (p) => p.battery < KNOCK_LINE,
    effects: [
      { target: 'oxygen', delta: -3 },
      { target: 'water', delta: -2 },
    ],
    reason: 'Air and water machines need power',
  },
  { id: 'water', from: 'water', test: (p) => p.water < KNOCK_LINE, effects: [{ target: 'food', delta: -4 }], reason: 'Plants need water' },
  {
    id: 'food',
    from: 'food',
    test: (p) => p.food < KNOCK_LINE,
    effects: [
      { target: 'health', delta: -3 },
      { target: 'morale', delta: -3 },
    ],
    reason: 'A hungry crew gets weak and unhappy',
  },
  { id: 'oxygen', from: 'oxygen', test: (p) => p.oxygen < KNOCK_LINE, effects: [{ target: 'health', delta: -5 }], reason: 'Thin air makes the crew unwell' },
  { id: 'radiation', from: 'radiation', test: (p) => p.radiation > DOSE_LINE, effects: [{ target: 'health', delta: -3 }], reason: 'A high radiation dose harms health' },
];

/** SPEC 4.4 "Cascades": off on Explorer, the B3 sizes on Mission, 1.5 times as big on Commander (DRAFT). */
export const CASCADE_SCALE: Record<'off' | 'some' | 'more', number> = { off: 0, some: 1, more: 1.5 };

/** Morale under 30: the risks shown on cards are this much more likely ("Tired crews make mistakes"). */
export const TIRED_RISK_BONUS = 0.1;

/** The rules firing for these parts, with their effects scaled for the difficulty (empty on Explorer). */
export function activeKnockOns(parts: Parts, difficulty: Difficulty): { rule: KnockOnRule; effects: Effect[] }[] {
  const scaleBy = CASCADE_SCALE[DIFFICULTY[difficulty].cascades];
  if (scaleBy === 0) return [];
  return KNOCK_ONS.filter((rule) => rule.test(parts)).map((rule) => ({
    rule,
    // Rounded away from zero, so ×1.5 of −5 is −8.
    effects: rule.effects.map((e) => ({ target: e.target, delta: Math.sign(e.delta) * Math.round(Math.abs(e.delta) * scaleBy) })),
  }));
}

/** Status rules that change how the game plays, shown next to the knock-ons. */
export function statusRules(state: Pick<MissionState, 'parts' | 'spareParts'>): { id: 'tired' | 'noParts'; text: string }[] {
  const rules: { id: 'tired' | 'noParts'; text: string }[] = [];
  if (state.parts.morale < KNOCK_LINE) rules.push({ id: 'tired', text: 'Morale under 30: shown risks are 10% more likely. Tired crews make mistakes.' });
  if (state.spareParts <= 0) rules.push({ id: 'noParts', text: 'Spare parts at 0: no rescue available. Nothing left to fix it with.' });
  return rules;
}

// ---- What one decision touched ----

export type FactorValues = Record<Factor, number>;

/** Every factor's value now. Mars cargo is the crates this Moon mission would load if it ended now (0 on Mars). */
export function factorValues(state: MissionState, onMoon: boolean): FactorValues {
  return {
    ...state.parts,
    spareParts: state.spareParts,
    bolt: state.bolt,
    sols: state.sol + state.extraSols,
    cargo: onMoon ? crates(state.parts) : 0,
  };
}

export interface Ripple {
  /** Change per factor from just before the choice to the end of the sols it leads to. */
  deltas: Partial<Record<Factor, number>>;
  /** Factors the choice itself changed (they light up first). */
  direct: Factor[];
  /** Factors changed through time passing and knock-on rules (they light up next, 0.3 s apart). */
  knockOn: Factor[];
  /** Knock-on rules that fired on the way, with their reasons. */
  rules: KnockOnRule[];
  touched: number;
}

/** The factors an effect list names (a gauge names all its parts; "time" names sols). */
export function factorsOf(effects: readonly Effect[]): Factor[] {
  const out = new Set<Factor>();
  for (const e of effects) {
    if (e.target === 'power' || e.target === 'life' || e.target === 'crew') GAUGE_PARTS[e.target].forEach((p) => out.add(p));
    else if (e.target === 'time') out.add('sols');
    else if (e.target !== 'progress') out.add(e.target);
  }
  return [...out];
}

/**
 * The Ripple of one decision: compare the base just before the choice with the base after the
 * sols that choice leads to. Direct = what the choice names; knock-on = everything else that moved.
 */
export function rippleOf(
  before: MissionState,
  after: MissionState,
  choiceEffects: readonly Effect[],
  firedRules: readonly KnockOnRule[],
  onMoon: boolean,
): Ripple {
  const a = factorValues(before, onMoon);
  const b = factorValues(after, onMoon);
  const deltas: Partial<Record<Factor, number>> = {};
  for (const f of FACTORS) {
    const d = Math.round(b[f] - a[f]);
    if (d !== 0) deltas[f] = d;
  }
  const named = new Set(factorsOf(choiceEffects));
  const changed = FACTORS.filter((f) => deltas[f] !== undefined);
  const direct = changed.filter((f) => named.has(f));
  const knockOn = changed.filter((f) => !named.has(f));
  const rules = [...new Map(firedRules.map((r) => [r.id, r])).values()];
  return { deltas, direct, knockOn, rules, touched: changed.length };
}

/** The lines on the Ripple map: knock-on rules, daily use, rescues and the cargo. */
export const RIPPLE_LINKS: readonly [Factor, Factor][] = [
  ['solar', 'battery'],
  ['battery', 'oxygen'],
  ['battery', 'water'],
  ['water', 'food'],
  ['food', 'health'],
  ['food', 'morale'],
  ['oxygen', 'health'],
  ['radiation', 'health'],
  ['sols', 'solar'],
  ['sols', 'oxygen'],
  ['sols', 'morale'],
  ['spareParts', 'bolt'],
  ['battery', 'cargo'],
  ['food', 'cargo'],
  ['health', 'cargo'],
];

/** "That decision touched 11 systems." */
export const touchedLine = (n: number) => `That decision touched ${n} ${n === 1 ? 'system' : 'systems'}.`;
