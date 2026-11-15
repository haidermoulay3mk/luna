// Built with help from Claude (Anthropic).
// LUNA_BUILD B3: every knock-on rule, the tired-crew and no-parts rules, and the Ripple count.
import { describe, expect, it } from 'vitest';
import { EVENTS_BY_ID, missionById } from '../data/content';
import { FIXTURE_EVENTS, FIXTURE_MISSION } from './fixtures';
import { seeded } from './random';
import { advanceSol, applyChoice, createMissionState, gaugesOf, nextStep } from './reducer';
import { FACTORS, KNOCK_ONS, activeKnockOns, factorsOf, rippleOf, statusRules, touchedLine } from './ripple';
import type { Difficulty, MissionState, Parts } from './types';

const SAFE: Parts = { solar: 70, battery: 70, oxygen: 70, water: 70, food: 70, health: 70, morale: 70, radiation: 30 };
const mission = missionById(3)!;
const base = (difficulty: Difficulty = 'mission', parts: Partial<Parts> = {}): MissionState => {
  const s = createMissionState(mission, difficulty, { rng: seeded(4) });
  const p = { ...SAFE, ...parts };
  return { ...s, parts: p, lowest: gaugesOf(p) };
};
const fired = (parts: Partial<Parts>, difficulty: Difficulty = 'mission') =>
  Object.fromEntries(activeKnockOns({ ...SAFE, ...parts }, difficulty).map(({ rule, effects }) => [rule.id, effects.map((e) => [e.target, e.delta])]));

describe('B3 knock-on rules (per sol)', () => {
  it('each rule fires below its line with the B3 sizes, and not above it', () => {
    expect(fired({})).toEqual({});
    expect(fired({ solar: 29 })).toEqual({ solar: [['battery', -5]] });
    expect(fired({ battery: 29 })).toEqual({ battery: [['oxygen', -3], ['water', -2]] });
    expect(fired({ water: 29 })).toEqual({ water: [['food', -4]] });
    expect(fired({ food: 29 })).toEqual({ food: [['health', -3], ['morale', -3]] });
    expect(fired({ oxygen: 29 })).toEqual({ oxygen: [['health', -5]] });
    expect(fired({ radiation: 61 })).toEqual({ radiation: [['health', -3]] });
    expect(fired({ solar: 30, radiation: 60 })).toEqual({});
  });

  it('SPEC 4.4 cascades: off on Explorer, ×1.5 on Commander', () => {
    expect(fired({ solar: 10 }, 'explorer')).toEqual({});
    expect(fired({ oxygen: 10 }, 'commander')).toEqual({ oxygen: [['health', -8]] });
  });

  it('every sol: knock-ons land after the daily use, judged on the same moment, and are reported', () => {
    const state = base('mission', { water: 25 });
    const plain = advanceSol(base('mission', {})).state;
    const { state: after, report } = advanceSol(state);
    expect(report.knockOns?.map((k) => k.id)).toEqual(['water']);
    expect(report.knockOns?.[0].reason).toBe('Plants need water');
    expect(after.parts.food).toBe(plain.parts.food - 4);
  });

  it('chains travel one step per sol, not all at once', () => {
    // Solar is low: this sol only the battery drops by 5 (after the daily use the battery is still above 30).
    const { report } = advanceSol(base('mission', { solar: 20, battery: 40 }));
    expect(report.knockOns?.map((k) => k.id)).toEqual(['solar']);
  });

  it('the rules list has every row of the B3 table', () => {
    expect(KNOCK_ONS.map((r) => r.id)).toEqual(['solar', 'battery', 'water', 'food', 'oxygen', 'radiation']);
  });
});

describe('B3 status rules', () => {
  const [riskyChoice] = FIXTURE_EVENTS[0].choices; // riskChance 0.3
  const fixtureState = (morale: number): MissionState => {
    const s = createMissionState(FIXTURE_MISSION, 'mission', { rng: seeded(2) });
    return { ...s, parts: { ...s.parts, morale } };
  };
  it('a tired crew (Morale under 30) makes a shown risk 10% more likely', () => {
    const roll = () => 0.35; // misses 30%, hits 40%
    expect(applyChoice(fixtureState(70), FIXTURE_EVENTS[0], riskyChoice.id, { rng: roll }).outcome.riskTriggered).toBe(false);
    expect(applyChoice(fixtureState(20), FIXTURE_EVENTS[0], riskyChoice.id, { rng: roll }).outcome.riskTriggered).toBe(true);
  });

  it('with no spare parts there is no rescue: an empty gauge pauses the mission', () => {
    const empty: MissionState = { ...base('explorer', { solar: 3, battery: 3 }), spareParts: 0 };
    const drained = advanceSol(empty).state;
    expect(drained.phase).toBe('paused');
    const withParts = advanceSol({ ...empty, spareParts: 2 }).state;
    expect(withParts.phase).not.toBe('paused');
  });

  it('both status rules are named for the Ripple view', () => {
    expect(statusRules({ parts: { ...SAFE, morale: 10 }, spareParts: 0 }).map((r) => r.id)).toEqual(['tired', 'noParts']);
    expect(statusRules({ parts: SAFE, spareParts: 2 })).toEqual([]);
  });
});

describe('the Ripple of one decision', () => {
  it('12 tracked factors', () => {
    expect(FACTORS).toHaveLength(12);
  });

  it('a gauge effect names all its parts; Time names the sols', () => {
    expect(factorsOf([{ target: 'power', delta: 5 }, { target: 'time', delta: 1 }]).sort()).toEqual(['battery', 'solar', 'sols']);
  });

  it('a decision that costs time and supplies touches 10+ systems, direct first, knock-ons after', () => {
    const before = base();
    const event = EVENTS_BY_ID.get('m3e1')!;
    const choice = event.choices[1]; // Search a nearby crater: 2 sols, Supplies −1, Water +15
    const chosen = applyChoice(before, event, choice.id, { rng: seeded(1) }).state;
    const after = nextStep(chosen, mission).state;
    const ripple = rippleOf(before, after, choice.effects, [], true);
    expect(ripple.direct.sort()).toEqual(['sols', 'spareParts', 'water']);
    expect(ripple.knockOn).toEqual(expect.arrayContaining(['solar', 'battery', 'oxygen', 'food', 'health', 'morale', 'radiation']));
    expect(ripple.touched).toBeGreaterThanOrEqual(10);
    expect(touchedLine(ripple.touched)).toBe(`That decision touched ${ripple.touched} systems.`);
  });

  it('counts honestly: with no time passing, only what it names (and the cargo, when Power falls under 60)', () => {
    const before = base();
    const event = EVENTS_BY_ID.get('m9e1')!; // Mission 9 passes no sol
    const choice = event.choices[2]; // Use more transmission power: Power −15, Morale +10
    const after = nextStep(applyChoice(before, event, choice.id, { rng: seeded(1) }).state, missionById(9)!).state;
    const ripple = rippleOf(before, after, choice.effects, [], true);
    expect(ripple.direct.sort()).toEqual(['battery', 'morale', 'solar']);
    // Power 70 → 55: one fewer crate would go into the rocket.
    expect(ripple.knockOn).toEqual(['cargo']);
    expect(ripple.deltas.cargo).toBe(-1);
    expect(ripple.touched).toBe(4);
  });
});
