// Built with help from Claude (Anthropic).
// Engine rules from SPEC Part 4.3 and the Part 13 checklist:
// no free choices, no instant game-over, all endings reachable.
import { describe, expect, it } from 'vitest';
import { EVENTS, EVENTS_BY_ID, MISSIONS, ORDERS, PLACES, START_PLACE, STORY_ORDER, missionById, placeById, placeForMission, worldOf } from '../data/content';
import {
  isUnlocked,
  mergeTrack,
  newProgress,
  orderStars,
  recordMission,
  restartStory,
  startMission,
  trackView,
  worldUnlocked,
  type Progress,
} from './campaign';
import { FIXTURE_EVENTS as FAKE_EVENTS, FIXTURE_MISSION as FAKE_MISSION } from './fixtures';
import sources from '../data/sources.json';
import { DIFFICULTY, DRAIN_PER_SOL, GAUGE_IDS, GAUGE_PARTS, RESCUE, TIMEOUT_MESSAGE } from './balance';
import {
  FLIGHT,
  MOON_RADIUS,
  MOON_RADIUS_KM,
  NO_FLIGHT,
  add,
  altitudeKm,
  canArrive,
  dot,
  flightEffects,
  hitRock,
  latLonToVec,
  length,
  shipAt,
  stepShip,
  sub,
  type Ship,
  type ShipInput,
} from './flight';
import { FLIGHT_PROBLEMS, nextProblem, type ProblemId } from './flightProblems';
import spaceweatherSnapshot from '../data/spaceweather.snapshot.json';
import { seeded, type Rng } from './random';
import { FLARE_WEIGHT, riskSentence, riskSummary, spaceWeatherEffects } from './spaceWeather';
import {
  advanceSol,
  applyChoice,
  cardSeconds,
  applyTimeout,
  checkEnd,
  createMissionState,
  eventFocus,
  gaugesOf,
  isCost,
  nextStep,
  solsAfterEvent,
} from './reducer';
import { pickEnding, rankFor, scoreMission } from './scoring';
import { CHAPTERS } from '../data/content';
import { recordStory } from './chapters';
import type { Choice, Difficulty, GameEvent, GaugeId, Mission, MissionState, SpaceWeatherSnapshot } from './types';
import { TODO_VERIFY, validateEvent, validateMission } from './validate';

// The team's missions (events.json / missions.json) plus the test fixture with a shown risk.
const ALL_EVENTS: GameEvent[] = [...EVENTS, ...FAKE_EVENTS];
const ALL_MISSIONS: Mission[] = [...MISSIONS, FAKE_MISSION];

const SOURCE_IDS = new Set(sources.map((s) => s.id));
const EVENT_MAP = new Map(ALL_EVENTS.map((e) => [e.id, e]));
const DIFFICULTIES = Object.keys(DIFFICULTY) as Difficulty[];

const hit: Rng = () => 0; // every risk roll happens
const miss: Rng = () => 0.999; // no risk roll happens
const dust = FAKE_EVENTS[0];
const [wipe, lightsOff, wait] = dust.choices;

function start(difficulty: Difficulty = 'mission', seed = 1): MissionState {
  return createMissionState(FAKE_MISSION, difficulty, { rng: seeded(seed) });
}

/** Sets every part of the given gauges to `score` (radiation dose is flipped). */
function withScore(state: MissionState, score: number, gauges: readonly GaugeId[] = GAUGE_IDS): MissionState {
  const parts = { ...state.parts };
  for (const gauge of gauges) {
    for (const sub of GAUGE_PARTS[gauge]) parts[sub] = sub === 'radiation' ? 100 - score : score;
  }
  return { ...state, parts, lowest: gaugesOf(parts) };
}

function eventWith(choices: Choice[], overrides: Partial<GameEvent> = {}): GameEvent {
  return { ...dust, id: 'test-event', urgent: false, defaultChoiceId: undefined, choices, ...overrides };
}

const drainPower: Choice = { ...lightsOff, id: 'drain', effects: [{ target: 'power', delta: -25 }] };

describe('content rules', () => {
  it('every event passes validation', () => {
    for (const event of ALL_EVENTS) expect(validateEvent(event, SOURCE_IDS), event.id).toEqual([]);
  });

  it('every mission passes validation', () => {
    for (const mission of ALL_MISSIONS) expect(validateMission(mission, EVENT_MAP)).toEqual([]);
  });

  it('no free choice: every choice in the game costs something', () => {
    for (const event of ALL_EVENTS) {
      for (const choice of event.choices) expect(choice.effects.some(isCost), choice.id).toBe(true);
    }
  });

  it('fails a choice whose effects are all zero', () => {
    const free = { ...lightsOff, id: 'free', effects: [{ target: 'power' as const, delta: 0 }] };
    expect(validateEvent(eventWith([free, wait]), SOURCE_IDS).join('\n')).toMatch(/free choice/);
  });

  it('fails a choice whose effects are all positive', () => {
    const free = { ...lightsOff, id: 'free', effects: [{ target: 'power' as const, delta: 10 }] };
    expect(validateEvent(eventWith([free, wait]), SOURCE_IDS).join('\n')).toMatch(/free choice/);
  });

  it('counts more radiation dose as a cost and less as a gain', () => {
    expect(isCost({ target: 'radiation', delta: 10 })).toBe(true);
    expect(isCost({ target: 'radiation', delta: -10 })).toBe(false);
    const shieldOnly = { ...lightsOff, id: 'shield', effects: [{ target: 'radiation' as const, delta: -10 }] };
    expect(validateEvent(eventWith([shieldOnly, wait]), SOURCE_IDS).join('\n')).toMatch(/free choice/);
  });

  it('urgent events need a default choice that exists', () => {
    expect(validateEvent({ ...dust, defaultChoiceId: undefined }, SOURCE_IDS).join('\n')).toMatch(/defaultChoiceId/);
    expect(validateEvent({ ...dust, defaultChoiceId: 'nope' }, SOURCE_IDS).join('\n')).toMatch(/not one of its choices/);
  });

  it('a random risk must be shown on the card', () => {
    const hidden = { ...wipe, risk: undefined };
    expect(validateEvent(eventWith([hidden, wait]), SOURCE_IDS).join('\n')).toMatch(/risk text/);
  });

  it('enforces text limits: 2–4 choices, labels ≤ 5 words, context ≤ 25 words', () => {
    const long = Array.from({ length: 26 }, () => 'word').join(' ');
    expect(validateEvent({ ...dust, context: long }, SOURCE_IDS).join('\n')).toMatch(/25 words/);
    const wordy = { ...wait, label: 'one two three four five six' };
    expect(validateEvent(eventWith([wordy, lightsOff]), SOURCE_IDS).join('\n')).toMatch(/5 words/);
    expect(validateEvent(eventWith([wait]), SOURCE_IDS).join('\n')).toMatch(/2–4 choices/);
    const five = [0, 1, 2, 3, 4].map((i) => ({ ...wait, id: `c${i}` }));
    expect(validateEvent(eventWith(five), SOURCE_IDS).join('\n')).toMatch(/2–4 choices/);
  });

  it('keeps effects between ±5 and ±25', () => {
    const huge = { ...lightsOff, id: 'huge', effects: [{ target: 'power' as const, delta: -40 }] };
    expect(validateEvent(eventWith([huge, wait]), SOURCE_IDS).join('\n')).toMatch(/outside/);
  });

  it('only accepts sourceIds from sources.json, or TODO_VERIFY', () => {
    const why = (sourceId: string) => ({ ...dust, why: { ...dust.why, sourceId } });
    expect(validateEvent(why('made-up'), SOURCE_IDS).join('\n')).toMatch(/not in sources.json/);
    expect(validateEvent(why(TODO_VERIFY), SOURCE_IDS)).toEqual([]);
    expect(validateEvent(why('donki'), SOURCE_IDS)).toEqual([]);
  });
});

describe('starting a mission', () => {
  it('every gauge starts between 70 and 85, never 100', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const gauges = gaugesOf(start('mission', seed).parts);
      for (const id of GAUGE_IDS) {
        expect(gauges[id]).toBeGreaterThanOrEqual(70);
        expect(gauges[id]).toBeLessThanOrEqual(85);
      }
    }
  });

  it('gives rescues by difficulty: Explorer 2, Mission 1, Commander 0', () => {
    expect(start('explorer').rescuesLeft).toBe(2);
    expect(start('mission').rescuesLeft).toBe(1);
    expect(start('commander').rescuesLeft).toBe(0);
  });
});

describe('choices', () => {
  it('applies effects now and queues delayed ones for the right sol', () => {
    const before = start();
    const { state, outcome } = applyChoice(before, dust, wipe.id, { rng: miss });
    expect(state.parts.battery).toBe(before.parts.battery - 10);
    expect(state.parts.solar).toBe(before.parts.solar); // the +20 waits for next sol
    expect(outcome.scheduled).toHaveLength(1);
    expect(outcome.scheduled[0].dueSol).toBe(before.sol + 1);
    expect(state.phase).toBe('outcome');
  });

  it('never changes the state it was given', () => {
    const before = start();
    const copy = structuredClone(before);
    applyChoice(before, dust, wipe.id, { rng: hit });
    expect(before).toEqual(copy);
  });

  it('a risk only happens on a hit roll, and only as shown on the card', () => {
    const before = start();
    const lucky = applyChoice(before, dust, wipe.id, { rng: miss });
    expect(lucky.outcome.riskTriggered).toBe(false);
    expect(lucky.state.bolt).toBe(before.bolt);
    const unlucky = applyChoice(before, dust, wipe.id, { rng: hit });
    expect(unlucky.outcome.riskTriggered).toBe(true);
    expect(unlucky.state.bolt).toBe(before.bolt - 15);
    // A choice with no shown risk never rolls, even with the unluckiest generator.
    expect(applyChoice(before, dust, lightsOff.id, { rng: hit }).outcome.riskTriggered).toBe(false);
  });

  it('timer running out plays the default choice and explains why', () => {
    const { outcome } = applyTimeout(start(), dust, { rng: miss });
    expect(outcome.choiceId).toBe(dust.defaultChoiceId);
    expect(outcome.timedOut).toBe(true);
    expect(outcome.message).toBe(TIMEOUT_MESSAGE);
  });

  it('the camera goes to the event focus, or else the first choice module', () => {
    expect(eventFocus(dust)).toBe('solar');
    expect(eventFocus({ ...dust, focus: undefined, choices: [lightsOff, wipe] })).toBe('greenhouse');
  });

  it('refuses a second choice on the same card', () => {
    const { state } = applyChoice(start(), dust, wait.id, { rng: miss });
    expect(() => applyChoice(state, dust, wait.id, { rng: miss })).toThrow();
  });
});

describe('sols', () => {
  it('README drain: Power −6, Life −4, Crew −2; Explorer ×0.6, Commander ×1.3', () => {
    expect(DRAIN_PER_SOL).toEqual({ power: 6, life: 4, crew: 2 });
    expect(DIFFICULTY.explorer.drainMultiplier).toBe(0.6);
    expect(DIFFICULTY.mission.drainMultiplier).toBe(1);
    expect(DIFFICULTY.commander.drainMultiplier).toBe(1.3);
  });

  it.each(DIFFICULTIES)('drains every gauge once per sol on %s', (difficulty) => {
    const before = withScore(start(difficulty), 80);
    const { state } = advanceSol(before);
    const gauges = gaugesOf(state.parts);
    for (const id of GAUGE_IDS) {
      expect(gauges[id]).toBeCloseTo(80 - DRAIN_PER_SOL[id] * DIFFICULTY[difficulty].drainMultiplier);
    }
    expect(state.sol).toBe(before.sol + 1);
  });

  it('a delayed effect lands on the next sol, not before', () => {
    const chosen = applyChoice(withScore(start(), 80), dust, wait.id, { rng: miss }).state;
    expect(gaugesOf(chosen.parts).power).toBeCloseTo(80);
    const { state } = nextStep(chosen, FAKE_MISSION);
    expect(gaugesOf(state.parts).power).toBeCloseTo(80 - 6 - 15);
    expect(state.pending).toEqual([]);
  });

  it("spreads a mission's sols evenly over its events", () => {
    const mission = (events: number, sols: number): Mission => ({
      ...FAKE_MISSION,
      eventIds: Array.from({ length: events }, (_, i) => `e${i}`),
      sols,
    });
    const spread = (m: Mission) => m.eventIds.map((_, i) => solsAfterEvent(m, i));
    expect(spread(mission(3, 3))).toEqual([1, 1, 1]);
    expect(spread(mission(2, 5))).toEqual([2, 3]);
    expect(spread(mission(4, 2))).toEqual([0, 1, 0, 1]);
  });
});

describe('"Time" costs (team sheet: "Cost: 2 Time")', () => {
  const slow: Choice = { ...lightsOff, id: 'slow', effects: [{ target: 'power', delta: 10 }, { target: 'time', delta: 2 }] };

  it('each Time is one more sol of daily use before the mission moves on', () => {
    const chosen = applyChoice(withScore(start(), 80), eventWith([slow, wait]), slow.id, { rng: miss }).state;
    expect(chosen.extraSols).toBe(2);
    const own = solsAfterEvent(FAKE_MISSION, 0);
    const { state, sols } = nextStep(chosen, FAKE_MISSION);
    expect(sols).toHaveLength(own + 2);
    expect(state.sol).toBe(chosen.sol + own + 2);
    expect(state.extraSols).toBe(0);
    expect(gaugesOf(state.parts).power).toBeCloseTo(80 + 10 - DRAIN_PER_SOL.power * (own + 2));
  });

  it('a Time cost counts as a cost, must be 1–3 whole sols, and cannot be delayed', () => {
    expect(isCost({ target: 'time', delta: 1 })).toBe(true);
    expect(validateEvent(eventWith([slow, wait]), SOURCE_IDS)).toEqual([]);
    const timeOnly: Choice = { ...slow, effects: [{ target: 'power', delta: 10 }, { target: 'time', delta: 1 }] };
    expect(validateEvent(eventWith([timeOnly, wait]), SOURCE_IDS).join('\n')).not.toMatch(/free choice/);
    const bad = (effect: { target: 'time'; delta: number; delaySols?: number }) =>
      validateEvent(eventWith([{ ...slow, effects: [{ target: 'power', delta: -10 }, effect] }, wait]), SOURCE_IDS).join('\n');
    expect(bad({ target: 'time', delta: 4 })).toMatch(/1 to 3 sols/);
    expect(bad({ target: 'time', delta: 1.5 })).toMatch(/1 to 3 sols/);
    expect(bad({ target: 'time', delta: 1, delaySols: 1 })).toMatch(/cannot be delayed/);
  });

  it('a lone "&" in a label is not a word', () => {
    const amp: Choice = { ...slow, label: 'Shut off heaters & science lab' };
    expect(validateEvent(eventWith([amp, wait]), SOURCE_IDS)).toEqual([]);
  });
});

describe('recoverable: one bad choice never ends the game', () => {
  // The harshest choice the rules allow: −25 on every gauge, plus a certain −25 risk.
  const worst: Choice = {
    ...lightsOff,
    id: 'worst',
    effects: [
      { target: 'power', delta: -25 },
      { target: 'life', delta: -25 },
      { target: 'crew', delta: -25 },
    ],
    risk: 'Everything gets worse',
    riskChance: 1,
    riskEffects: [{ target: 'power', delta: -25 }],
  };
  const worstEvent = eventWith([worst, wait]);

  it('the harshest test choice is itself legal', () => {
    expect(validateEvent(worstEvent, SOURCE_IDS)).toEqual([]);
  });

  it('from a fresh start, no single choice pauses the mission, on any difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 40; seed++) {
        for (const event of [...ALL_EVENTS, worstEvent]) {
          for (const choice of event.choices) {
            for (const rng of [hit, miss]) {
              const chosen = applyChoice(start(difficulty, seed), event, choice.id, { rng }).state;
              expect(checkEnd(chosen)).toBeNull();
              expect(advanceSol(chosen).state.phase).not.toBe('paused');
            }
          }
        }
      }
    }
  });

  it('a gauge hitting 0 triggers one rescue per mission on Mission difficulty, at a cost', () => {
    const before = withScore(start('mission'), 20, ['power']);
    const first = applyChoice(before, eventWith([drainPower, wait]), 'drain', { rng: miss });
    expect(first.outcome.rescues).toEqual([{ gauge: 'power', message: RESCUE.message.power }]);
    expect(Math.round(gaugesOf(first.state.parts).power)).toBe(RESCUE.restoreTo);
    expect(first.state.spareParts).toBe(before.spareParts - 1);
    expect(first.state.bolt).toBe(before.bolt - 10);
    expect(first.state.phase).toBe('outcome');

    // Same mission, empty again: no rescue left, so it pauses (the gentle ending, not a game over).
    const again = { ...withScore(first.state, 20, ['power']), phase: 'choosing' as const };
    const second = applyChoice(again, eventWith([drainPower, wait]), 'drain', { rng: miss });
    expect(second.outcome.rescues).toEqual([]);
    expect(second.state.phase).toBe('paused');
  });

  it('Explorer gets two rescues and Commander none', () => {
    const event = eventWith([drainPower, wait]);
    let state = start('explorer');
    for (const expected of ['outcome', 'outcome', 'paused']) {
      state = applyChoice({ ...withScore(state, 20, ['power']), phase: 'choosing' }, event, 'drain', { rng: miss }).state;
      expect(state.phase).toBe(expected);
    }
    const commander = applyChoice(withScore(start('commander'), 20, ['power']), event, 'drain', { rng: miss });
    expect(commander.state.phase).toBe('paused');
  });
});

describe('stars', () => {
  function play(choiceId: string, rng: Rng): MissionState {
    const chosen = applyChoice(withScore(start(), 80), dust, choiceId, { rng }).state;
    return nextStep(chosen, FAKE_MISSION).state;
  }

  it('plays the fake mission from start to finish', () => {
    expect(checkEnd(play(lightsOff.id, miss))).toBe('complete');
  });

  it('3 stars: objective met, never critical, bonus met', () => {
    expect(scoreMission(play(lightsOff.id, miss), FAKE_MISSION).stars).toBe(3);
  });

  it('loses the bonus star when the risk shown on the card happens', () => {
    const score = scoreMission(play(wipe.id, hit), FAKE_MISSION);
    expect(score.bonusMet).toBe(false);
    expect(score.stars).toBe(2);
  });

  it('loses the "never critical" star if any gauge went critical', () => {
    const end = play(lightsOff.id, miss);
    const score = scoreMission({ ...end, lowest: { ...end.lowest, life: 20 } }, FAKE_MISSION);
    expect(score.neverCritical).toBe(false);
    expect(score.stars).toBe(2);
  });

  it('0 stars if the objective is missed or the mission is paused', () => {
    const end = play(lightsOff.id, miss);
    expect(scoreMission(end, { ...FAKE_MISSION, successIf: [{ gauge: 'power', min: 99 }] }).stars).toBe(0);
    expect(scoreMission({ ...end, phase: 'paused' }, FAKE_MISSION).stars).toBe(0);
  });
});

describe('endings and ranks', () => {
  const gauges = (power: number, life: number, crew: number) => ({ power, life, crew });

  it('all four endings are reachable', () => {
    expect(pickEnding({ finalGauges: gauges(80, 80, 80), stars: 18, maxStars: 18, paused: false })).toBe('complete');
    expect(pickEnding({ finalGauges: gauges(50, 50, 50), stars: 12, maxStars: 18, paused: false })).toBe('bumpy');
    expect(pickEnding({ finalGauges: gauges(25, 25, 45), stars: 6, maxStars: 18, paused: false })).toBe('closeCall');
    expect(pickEnding({ finalGauges: gauges(10, 10, 10), stars: 0, maxStars: 18, paused: false })).toBe('paused');
    expect(pickEnding({ finalGauges: gauges(80, 80, 80), stars: 18, maxStars: 18, paused: true })).toBe('paused');
  });

  it('strong gauges alone are not "Mission Complete" without the objectives', () => {
    expect(pickEnding({ finalGauges: gauges(80, 80, 80), stars: 0, maxStars: 18, paused: false })).not.toBe('complete');
  });

  it('ranks go Cadet → Specialist → Flight Lead → Commander', () => {
    expect(rankFor(0, 18).label).toBe('Cadet');
    expect(rankFor(6, 18).label).toBe('Specialist');
    expect(rankFor(12, 18).label).toBe('Flight Lead');
    expect(rankFor(17, 18).label).toBe('Commander');
  });
});

describe('story mode (Phase 3)', () => {
  const order = STORY_ORDER;
  const fresh = (difficulty: Difficulty = 'mission'): Progress => ({ ...newProgress('Test', difficulty), tutorialDone: true });

  /** Plays one mission, always picking choice number `pick` (or the last one if there are fewer). */
  function playMission(progress: Progress, id: number, pick: number) {
    const mission = missionById(id)!;
    let state = startMission(progress, mission, order, seeded(id));
    for (const eventId of mission.eventIds) {
      const event = EVENTS_BY_ID.get(eventId)!;
      const choice = event.choices[Math.min(pick, event.choices.length - 1)];
      state = applyChoice(state, event, choice.id, { rng: miss }).state;
      if (state.phase === 'paused') break;
      state = nextStep(state, mission).state;
    }
    return { mission, state };
  }

  it('LUNA_BUILD B1: the Moon story is chapters 1–4, three team missions each', () => {
    expect(order).toEqual([1, 2, 7, 3, 4, 15, 5, 6, 12, 8, 9, 14]);
  });

  it('B4: every card has a timer (20 s on Mission, 15 s on Commander), storm cards 10 s, Explorer none', () => {
    const final = EVENTS_BY_ID.get('m14e1')!;
    expect(final.defaultChoiceId).toBe('m14e1a');
    expect(cardSeconds('mission', EVENTS_BY_ID.get('m1e1')!)).toBe(20);
    expect(cardSeconds('commander', EVENTS_BY_ID.get('m1e1')!)).toBe(15);
    for (const storm of ['m8e1', 'm14e1', 'mars8e1', 'mars14e1']) {
      expect(cardSeconds('mission', EVENTS_BY_ID.get(storm)!), storm).toBe(10);
      expect(cardSeconds('explorer', EVENTS_BY_ID.get(storm)!), storm).toBeNull();
    }
    // Timer end = the card's default choice: its own, or the first one.
    const card = EVENTS_BY_ID.get('m3e1')!;
    const timedOut = applyTimeout(startMission(fresh(), missionById(3)!, order, seeded(2)), card, { rng: miss });
    expect(timedOut.outcome.choiceId).toBe(card.choices[0].id);
    expect(timedOut.outcome.timedOut).toBe(true);
  });

  it('every mission can earn at least 1 star from a fresh start', () => {
    for (const mission of MISSIONS.filter((m) => !m.off)) {
      const best = Math.max(...[0, 1, 2].map((pick) => scoreMission(playMission(fresh(), mission.id, pick).state, mission).stars));
      expect(best, `mission ${mission.id}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('a full Moon story run finishes the Moon (no ending yet: Mars comes next), on every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const pick of [0, 1, 2]) {
        let progress = fresh(difficulty);
        for (const id of order) {
          const { mission, state } = playMission(progress, id, pick);
          progress = recordStory(progress, mission, state, order, CHAPTERS);
          if (state.phase === 'paused') break;
        }
        if (progress.storyIndex === order.length) {
          expect(progress.ending).toBeNull();
          expect(worldUnlocked(progress, 'mars', order)).toBe(true);
        }
      }
    }
  });

  it('the base carries over to the next story mission; replays start fresh', () => {
    let progress = fresh();
    const { mission, state } = playMission(progress, 1, 0);
    progress = recordMission(progress, mission, state, order);
    expect(progress.storyIndex).toBe(1);
    expect(progress.stars['1']).toBe(scoreMission(state, mission).stars);
    expect(progress.cards).toContain(mission.scienceCardId);
    expect(startMission(progress, missionById(2)!, order, seeded(9)).parts).toEqual(state.parts);
    expect(isUnlocked(progress, 2, order)).toBe(true);
    expect(isUnlocked(progress, 4, order)).toBe(false);
    const replay = gaugesOf(startMission(progress, mission, order, seeded(9)).parts);
    for (const id of GAUGE_IDS) expect(replay[id]).toBeGreaterThanOrEqual(70);
  });

  it('Time spent in one story mission pushes the next one later; the clock never goes back', () => {
    // Mission 8 (Day 15, choice A costs 2 Time) is followed by Mission 9 (also Day 15).
    const at8 = { ...fresh(), storyIndex: order.indexOf(8) };
    const { mission, state } = playMission(at8, 8, 0);
    expect(state.sol).toBe(mission.day + 2);
    const after = recordMission(at8, mission, state, order);
    expect(startMission(after, missionById(9)!, order, seeded(3)).sol).toBe(mission.day + 2);
    // An old save without a carried sol starts on the mission's own day.
    const old = { ...after, carry: { ...after.carry!, sol: undefined } };
    expect(startMission(old, missionById(9)!, order, seeded(3)).sol).toBe(missionById(9)!.day);
  });

  it('a paused story mission does not move the story on; the last mission of the game still leads to an ending', () => {
    const first = missionById(order[0])!;
    const pausedFirst = { ...startMission(fresh(), first, order, seeded(1)), phase: 'paused' as const };
    const afterFirst = recordStory(fresh(), first, pausedFirst, order, CHAPTERS);
    expect(afterFirst.storyIndex).toBe(0);
    expect(afterFirst.ending).toBeNull();

    // The Moon's last mission paused: the player tries again.
    const atMoonEnd = { ...fresh(), storyIndex: order.length - 1 };
    const moonFinal = missionById(order[order.length - 1])!;
    const pausedMoon = { ...startMission(atMoonEnd, moonFinal, order, seeded(1)), phase: 'paused' as const };
    expect(recordStory(atMoonEnd, moonFinal, pausedMoon, order, CHAPTERS)).toMatchObject({ storyIndex: order.length - 1, ending: null });

    // The climb's last mission paused: the Olympus ending still comes (never stuck).
    const mars = ORDERS.mars;
    const atRim = { ...fresh(), storyIndex: mars.length - 1 };
    const rim = missionById(mars[mars.length - 1])!;
    const pausedRim = { ...startMission(atRim, rim, mars, seeded(1)), phase: 'paused' as const };
    const afterRim = recordStory(atRim, rim, pausedRim, mars, CHAPTERS);
    expect(['station', 'outpost', 'beacon']).toContain(afterRim.ending);
  });

  it('starting the story again keeps the name, tutorial and Science Cards', () => {
    const played = { ...fresh(), storyIndex: 3, stars: { '1': 3 }, cards: ['card-m1'], ending: 'bumpy' as const };
    const again = restartStory(played, order);
    expect(again).toMatchObject({ name: 'Test', tutorialDone: true, cards: ['card-m1'], storyIndex: 0, stars: {}, ending: null, carry: null });
  });
});

describe('rocket flight (Moon map)', () => {
  const still: ShipInput = { thrust: 0, turn: 0, pitch: 0, lift: 0 };
  const run = (ship: Ship, input: ShipInput, seconds: number) => {
    let s = ship;
    for (let t = 0; t < seconds; t += 1 / 60) s = stepShip(s, input, 1 / 60);
    return s;
  };
  const base = latLonToVec(0, 0, MOON_RADIUS);

  it('W pushes the ship forward and uses fuel; letting go slows it down (flight assist)', () => {
    const start = shipAt(base);
    const moving = run(start, { ...still, thrust: 1 }, 2);
    expect(dot(sub(moving.pos, start.pos), start.forward)).toBeGreaterThan(5);
    expect(moving.fuel).toBeLessThan(100);
    const coasting = run(moving, still, 3);
    expect(length(coasting.vel)).toBeLessThan(length(moving.vel) / 2);
    expect(coasting.fuel).toBe(moving.fuel);
  });

  it('never goes faster than the speed limit and never flies into the ground', () => {
    const start = shipAt(base);
    const fast = run(start, { ...still, thrust: 1 }, 20);
    expect(length(fast.vel)).toBeLessThanOrEqual(FLIGHT.maxSpeed + 1e-9);
    const dive = run(start, { ...still, thrust: 1, pitch: -1, lift: -1 }, 6);
    expect(length(dive.pos)).toBeGreaterThanOrEqual(MOON_RADIUS + FLIGHT.minAltitude - 1e-9);
  });

  it('Space lifts the ship straight up without W (the bug Boss found), Shift brings it down', () => {
    const start = shipAt(base);
    const up = run(start, { ...still, lift: 1 }, 2);
    expect(length(up.pos)).toBeGreaterThan(length(start.pos) + 4);
    const down = run(up, { ...still, lift: -1 }, 2);
    expect(length(down.pos)).toBeLessThan(length(up.pos));
  });

  it('in-flight problems change the ship: overheating caps speed, a leak burns fuel faster, drift turns it', () => {
    const start = shipAt(base);
    const capped = run(start, { ...still, thrust: 1 }, 10);
    const hot = (() => {
      let s = start;
      for (let t = 0; t < 10; t += 1 / 60) s = stepShip(s, { ...still, thrust: 1 }, 1 / 60, { maxSpeedScale: 0.5 });
      return s;
    })();
    expect(length(hot.vel)).toBeLessThanOrEqual(FLIGHT.maxSpeed * 0.5 + 1e-9);
    expect(length(capped.vel)).toBeGreaterThan(length(hot.vel));
    const leak = stepShip(start, { ...still, thrust: 1 }, 0.05, { fuelScale: 3 });
    const normal = stepShip(start, { ...still, thrust: 1 }, 0.05);
    expect(100 - leak.fuel).toBeCloseTo((100 - normal.fuel) * 3);
    const drifted = stepShip(start, still, 0.05, { drift: 1 });
    expect(dot(drifted.forward, start.forward)).toBeLessThan(1);
  });

  it('an empty tank still moves slowly on reserve cells, so nobody gets stuck', () => {
    const empty = run({ ...shipAt(base), fuel: 0 }, { ...still, thrust: 1 }, 2);
    expect(length(empty.vel)).toBeGreaterThan(0);
    expect(length(empty.vel)).toBeLessThan(length(run(shipAt(base), { ...still, thrust: 1 }, 2).vel));
  });

  it('A/D turn the nose; the roof stays at a right angle to it', () => {
    const start = shipAt(base);
    const turned = run(start, { ...still, turn: 1 }, 0.5);
    expect(dot(turned.forward, start.forward)).toBeLessThan(0.9);
    expect(Math.abs(dot(turned.forward, turned.up))).toBeLessThan(1e-6);
    expect(length(turned.forward)).toBeCloseTo(1);
  });

  it('rock hits cost Power on arrival, astronauts raise Morale, autopilot changes nothing', () => {
    expect(flightEffects({ hits: 2, astronauts: 2, autopilot: false })).toEqual([
      { target: 'power', delta: -10 },
      { target: 'morale', delta: 10 },
    ]);
    expect(flightEffects({ hits: 9, astronauts: 0, autopilot: false })).toEqual([{ target: 'power', delta: -15 }]);
    expect(flightEffects(NO_FLIGHT)).toEqual([]);
    expect(flightEffects({ hits: 0, astronauts: 0, flares: 1, autopilot: false })).toEqual([{ target: 'radiation', delta: 5 }]);
    const ship = shipAt(base);
    expect(hitRock(ship, [{ pos: ship.pos, radius: 1 }])).toBe(0);
    expect(hitRock(ship, [{ pos: add(ship.pos, [50, 0, 0]), radius: 1 }])).toBe(-1);
    expect(canArrive(ship, base)).toBe(false);
    expect(canArrive({ pos: add(base, [0, 0, 3]) }, base)).toBe(true);
  });

  it('flight effects are applied when the mission starts (and can never empty a gauge)', () => {
    const progress: Progress = { ...newProgress('Test', 'mission'), tutorialDone: true };
    const mission = missionById(STORY_ORDER[0])!;
    const plain = startMission(progress, mission, STORY_ORDER, seeded(4));
    const arrived = startMission(progress, mission, STORY_ORDER, seeded(4), flightEffects({ hits: 3, astronauts: 0, autopilot: false }));
    expect(gaugesOf(arrived.parts).power).toBeCloseTo(gaugesOf(plain.parts).power - 15);
  });

  it('every mission has a place on the map, and HUD numbers use the real Moon radius', () => {
    for (const id of STORY_ORDER) expect(placeForMission(id).lat).toBeTypeOf('number');
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    expect(placeById(START_PLACE)?.kind).toBe('station');
    expect(altitudeKm({ pos: [0, MOON_RADIUS * 2, 0] })).toBeCloseTo(MOON_RADIUS_KM);
  });
});

describe('in-flight problems', () => {
  it('every problem says what to do and which real skill it practises', () => {
    for (const p of FLIGHT_PROBLEMS) {
      expect(p.title && p.message && p.action && p.skill, p.id).toBeTruthy();
      expect(p.seconds).toBeGreaterThan(0);
    }
  });

  it('shows each problem once before repeating, never twice in a row', () => {
    const rng = seeded(11);
    const used: ProblemId[] = [];
    for (let i = 0; i < FLIGHT_PROBLEMS.length; i++) used.push(nextProblem(rng, used).id);
    expect(new Set(used).size).toBe(FLIGHT_PROBLEMS.length);
    for (let i = 0; i < 30; i++) {
      const next = nextProblem(rng, used).id;
      expect(next).not.toBe(used[used.length - 1]);
      used.push(next);
    }
  });

  it('a high space-weather risk makes the flare warning more likely', () => {
    const count = (weight: number) => {
      const rng = seeded(5);
      let flares = 0;
      for (let i = 0; i < 400; i++) if (nextProblem(rng, ['comms'], weight).id === 'flare') flares++;
      return flares;
    };
    expect(count(4)).toBeGreaterThan(count(1));
  });
});

describe('two worlds: the Moon story, then Mars', () => {
  const moon = ORDERS.moon;
  const mars = ORDERS.mars;
  const fresh = (): Progress => ({ ...newProgress('Test', 'mission'), tutorialDone: true });
  function playStory(progress: Progress, world: 'moon' | 'mars', pick = 0): Progress {
    let p = progress;
    for (const id of ORDERS[world]) {
      const mission = missionById(id)!;
      // A paused mission is tried again (after the supply lander) with the next choice, like a player would.
      for (const tryPick of [pick, 0, 1, 2, 0, 1, 2]) {
        const tryView = trackView(p, world);
        let state = startMission(tryView, mission, ORDERS[world], seeded(id));
        for (const eventId of mission.eventIds) {
          const event = EVENTS_BY_ID.get(eventId)!;
          state = applyChoice(state, event, event.choices[tryPick].id, { rng: miss }).state;
          if (state.phase === 'paused') break;
          state = nextStep(state, mission).state;
        }
        p = mergeTrack(p, world, recordStory(tryView, mission, state, ORDERS[world], CHAPTERS));
        if (state.phase !== 'paused') break;
      }
    }
    return p;
  }

  it('the Mars story is the team Mars sheet: 6 missions, all on Mars', () => {
    expect(mars).toEqual([101, 102, 104, 105, 108, 114]);
    for (const id of mars) expect(worldOf(missionById(id)!)).toBe('mars');
    for (const id of moon) expect(worldOf(missionById(id)!)).toBe('moon');
  });

  it('B0: every story mission plays one team card; the six draft cards stay out of the chapters', () => {
    for (const id of [...moon, ...mars]) {
      const mission = missionById(id)!;
      expect(mission.eventIds, `mission ${id}`).toHaveLength(1);
      expect(EVENTS_BY_ID.get(mission.eventIds[0])!.draft, `mission ${id}`).toBeFalsy();
    }
  });

  it('B1: M10, M11, M13 and M16 are in the data but switched off', () => {
    for (const id of [10, 11, 13, 16]) {
      expect(missionById(id)?.off, `mission ${id}`).toBe(true);
      expect([...moon, ...mars]).not.toContain(id);
    }
  });

  it('Mars opens only after the Moon story is finished', () => {
    const start = fresh();
    expect(worldUnlocked(start, 'mars', moon)).toBe(false);
    const done = playStory(start, 'moon');
    expect(done.ending).toBeNull(); // the Moon has no ending of its own any more: Mars comes next
    expect(worldUnlocked(done, 'mars', moon)).toBe(true);
  });

  it('each world keeps its own story, base and ending; stars and cards are shared', () => {
    const afterMoon = playStory(fresh(), 'moon');
    const afterMars = playStory(afterMoon, 'mars', 1);
    expect(afterMars.storyIndex).toBe(moon.length); // the Moon story is untouched
    expect(afterMars.ending).toBe(afterMoon.ending);
    const marsView = trackView(afterMars, 'mars');
    expect(marsView.storyIndex).toBe(mars.length);
    expect(['station', 'outpost', 'beacon']).toContain(marsView.ending);
    expect(orderStars(afterMars, moon)).toBe(orderStars(afterMoon, moon));
    expect(orderStars(afterMars, mars)).toBeGreaterThan(0);
    // Starting Mars again keeps the Moon's stars.
    const again = mergeTrack(afterMars, 'mars', restartStory(trackView(afterMars, 'mars'), mars));
    expect(orderStars(again, moon)).toBe(orderStars(afterMoon, moon));
    expect(trackView(again, 'mars').storyIndex).toBe(0);
    expect(again.storyIndex).toBe(moon.length);
  });
});

describe('Live Space Weather (SPEC 4.5)', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  const snap = (over: Partial<SpaceWeatherSnapshot>): SpaceWeatherSnapshot => ({
    fetchedAt: '2026-11-14T12:00:00Z',
    source: 'test',
    flares: [],
    sep: [],
    cme: [],
    ...over,
  });

  it('LOW with nothing, MODERATE with an M flare or a CME, HIGH with an X flare or a SEP in the last 3 days', () => {
    expect(riskSummary(snap({}), now).level).toBe('LOW');
    expect(riskSummary(snap({ flares: [{ time: '2026-11-12T00:00Z', classType: 'M1.2' }] }), now).level).toBe('MODERATE');
    expect(riskSummary(snap({ cme: [{ time: '2026-11-10T00:00Z' }] }), now).level).toBe('MODERATE');
    expect(riskSummary(snap({ flares: [{ time: '2026-11-13T00:00Z', classType: 'X1.0' }] }), now).level).toBe('HIGH');
    expect(riskSummary(snap({ sep: [{ time: '2026-11-13T00:00Z' }] }), now).level).toBe('HIGH');
    // Older than 7 days (or a SEP older than 3 days) does not count as HIGH.
    expect(riskSummary(snap({ flares: [{ time: '2026-11-01T00:00Z', classType: 'X2.0' }] }), now).level).toBe('LOW');
    expect(riskSummary(snap({ sep: [{ time: '2026-11-09T00:00Z' }] }), now).level).toBe('LOW');
  });

  it('the risk changes the game: more flare warnings and harder storm missions, nothing for unlinked missions', () => {
    expect(FLARE_WEIGHT.HIGH).toBeGreaterThan(FLARE_WEIGHT.MODERATE);
    expect(FLARE_WEIGHT.MODERATE).toBeGreaterThan(FLARE_WEIGHT.LOW);
    expect(spaceWeatherEffects('LOW', true)).toEqual([]);
    expect(spaceWeatherEffects('MODERATE', true)).toEqual([{ target: 'radiation', delta: 5 }]);
    expect(spaceWeatherEffects('HIGH', true).some((e) => isCost(e))).toBe(true);
    expect(spaceWeatherEffects('HIGH', false)).toEqual([]);
    for (const level of ['LOW', 'MODERATE', 'HIGH'] as const) {
      for (const e of spaceWeatherEffects(level, true)) expect(Math.abs(e.delta)).toBeGreaterThanOrEqual(5);
    }
  });

  it('the archived snapshot is real DONKI data with a date, judged as of when it was fetched', () => {
    const archive = spaceweatherSnapshot as SpaceWeatherSnapshot;
    expect(Number.isFinite(Date.parse(archive.fetchedAt))).toBe(true);
    expect(archive.source).toMatch(/DONKI/);
    const summary = riskSummary(archive, Date.parse(archive.fetchedAt));
    expect(['LOW', 'MODERATE', 'HIGH']).toContain(summary.level);
    expect(riskSentence(summary, archive.missing)).toMatch(/NASA/);
  });
});
