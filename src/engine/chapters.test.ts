// Built with help from Claude (Anthropic).
// LUNA_BUILD B1–B2 rules: six chapters, five stars per chapter, Mars Cargo, the Olympus ending,
// camps on Olympus Mons, the goal track, and moving older saves to the new story.
import { describe, expect, it } from 'vitest';
import { CHAPTERS, EVENTS_BY_ID, ORDERS, START_PLACES, campOf, missionById, needsFlight, placeById, placeForMission } from '../data/content';
import sources from '../data/sources.json';
import { migrate } from '../store/save';
import { CARGO, GAUGE_PARTS } from './balance';
import { cargoStartGauge, newProgress, startMission, trackView, type MissionRun, type Progress } from './campaign';
import {
  campRadiation,
  cargoCrates,
  clearChapters,
  goalStop,
  isCleanFlight,
  missionRun,
  olympusEnding,
  recordStory,
  scoreChapter,
  totalChapterStars,
} from './chapters';
import { seeded } from './random';
import { advanceSol, applyChoice, createMissionState, gaugesOf, nextStep } from './reducer';
import { latestEvent } from './spaceWeather';
import type { GaugeId, MissionState } from './types';

const miss = () => 0.999;
const fresh = (): Progress => ({ ...newProgress('Test', 'mission'), tutorialDone: true });
const good: MissionRun = { finished: true, objectiveMet: true, neverCritical: true, bonusMet: true, rescuesUsed: 0 };
const ch = (id: number) => CHAPTERS.find((c) => c.id === id)!;
const runsFor = (id: number, run: Partial<MissionRun> | Partial<MissionRun>[] = {}) =>
  Object.fromEntries(ch(id).missions.map((m, i) => [String(m), { ...good, ...(Array.isArray(run) ? run[i] : run) }]));

/** A state with every part of the given gauges at `score`. */
function at(score: number, gauges: GaugeId[] = ['power', 'life', 'crew']): MissionState {
  const state = createMissionState(missionById(1)!, 'mission', { rng: seeded(1) });
  const parts = { ...state.parts };
  for (const g of gauges) for (const sub of GAUGE_PARTS[g]) parts[sub] = sub === 'radiation' ? 100 - score : score;
  return { ...state, parts, lowest: gaugesOf(parts), phase: 'complete' };
}

describe('B1: six chapters of three missions', () => {
  it('Moon chapters 1–4 and Mars chapters 5–6, each with 3 missions on its own world', () => {
    expect(CHAPTERS.map((c) => c.title)).toEqual(['First Light', 'Living Off the Land', 'Keep It Running', 'The Storm', 'Red Landing', 'The Climb']);
    for (const c of CHAPTERS) {
      expect(c.missions, c.title).toHaveLength(3);
      for (const id of c.missions) expect(missionById(id)?.world ?? 'moon', `${c.title} ${id}`).toBe(c.world);
    }
    expect(ORDERS.moon).toHaveLength(12);
    expect(ORDERS.mars).toEqual([101, 102, 104, 105, 108, 114]);
  });

  it('the team cards M3, M6, M7, M9, M12, M15 are in the chapters with their NASA links', () => {
    const urls = new Map(sources.map((s) => [s.id, s.url]));
    for (const id of [3, 6, 7, 9, 12, 15]) {
      const event = EVENTS_BY_ID.get(`m${id}e1`)!;
      expect(ORDERS.moon).toContain(id);
      expect(urls.get(event.why.sourceId), `M${id}`).toMatch(/^https:\/\/(www|science)\.nasa\.gov\//);
    }
  });

  it('B10: all 16 team links are in sources.json, and M12 no longer mentions oxygen', () => {
    const links = sources.map((s) => s.url).filter((u) => /nasa\.gov/.test(u) && /(moonbase|eclss|moon-water|growing-plants|dust-shield|rovers|shadows|protect-astronauts|propagation|seismic|moonquakes|spacesuits|meteoroid|solar-storms-and-flares|fitness|spacewalking)/.test(u));
    expect(new Set(links).size).toBe(16);
    expect(EVENTS_BY_ID.get('m12e1')!.why.text.toLowerCase()).not.toContain('oxygen');
    expect(EVENTS_BY_ID.get('m1e1')!.why.text).toContain('other power sources for the long lunar night');
  });

  it('flights only from space: Gateway → Moon base and Mars orbit → base; the rover drives up the camps', () => {
    expect(needsFlight(placeById(START_PLACES.moon), placeForMission(1))).toBe(true);
    expect(needsFlight(placeById(START_PLACES.mars), placeForMission(101))).toBe(true);
    expect(needsFlight(placeForMission(104), placeForMission(105))).toBe(false);
    expect(needsFlight(placeForMission(105), placeForMission(108))).toBe(false);
    expect(campOf(105)?.rank).toBe(0);
    expect(campOf(114)?.rank).toBe(2);
    expect(campOf(101)).toBeNull();
  });
});

describe('B2: five stars per chapter', () => {
  it('a perfect chapter is 5 stars; chapter 1 also needs a clean flight in', () => {
    expect(scoreChapter(ch(2), runsFor(2)).stars).toBe(5);
    expect(scoreChapter(ch(1), runsFor(1), true).stars).toBe(5);
    expect(scoreChapter(ch(1), runsFor(1), false).checks).toEqual([true, true, true, true, false]);
    expect(scoreChapter(ch(5), runsFor(5)).checks[4]).toBe(false);
  });

  it('each rule takes away its own star', () => {
    expect(scoreChapter(ch(2), runsFor(2, [{}, { finished: false }, {}])).checks[0]).toBe(false);
    expect(scoreChapter(ch(2), runsFor(2, [{ neverCritical: false }, {}, {}])).checks[1]).toBe(false);
    expect(scoreChapter(ch(2), runsFor(2, [{}, {}, { objectiveMet: false }])).checks[2]).toBe(false);
    // Two bonuses are enough, one is not.
    expect(scoreChapter(ch(2), runsFor(2, [{ bonusMet: false }, {}, {}])).checks[3]).toBe(true);
    expect(scoreChapter(ch(2), runsFor(2, [{ bonusMet: false }, { bonusMet: false }, {}])).checks[3]).toBe(false);
    expect(scoreChapter(ch(2), runsFor(2, [{}, { rescuesUsed: 1 }, {}])).checks[4]).toBe(false);
  });

  it('a chapter with a mission not played yet earns no "all missions" stars', () => {
    const runs = runsFor(3);
    delete runs[String(ch(3).missions[2])];
    expect(scoreChapter(ch(3), runs).checks).toEqual([false, false, false, true, false]);
  });

  it('a mission run counts rescues used', () => {
    const state = { ...at(70), rescuesLeft: 0 };
    expect(missionRun(state, missionById(1)!).rescuesUsed).toBe(1);
  });

  it('a clean flight is flown by hand with Safety 80+', () => {
    expect(isCleanFlight({ autopilot: false, hits: 0, safety: 85 })).toBe(true);
    expect(isCleanFlight({ autopilot: false, hits: 0, safety: 60 })).toBe(false);
    expect(isCleanFlight({ autopilot: true, hits: 0, safety: 100 })).toBe(false);
    expect(isCleanFlight({ autopilot: false, hits: 0 })).toBe(true);
    expect(isCleanFlight({ autopilot: false, hits: 2 })).toBe(false);
  });
});

describe('B2: Mars Cargo', () => {
  it('+1 crate for each gauge at 60 or above after a Moon mission', () => {
    expect(cargoCrates(at(80))).toBe(3);
    expect(cargoCrates(at(59))).toBe(0);
    expect(cargoCrates({ ...at(80), parts: at(40, ['power']).parts })).toBe(2);
  });

  it('cargo builds up over the Moon story and never passes 36', () => {
    let p = fresh();
    for (const id of ORDERS.moon) {
      const mission = missionById(id)!;
      p = recordStory(p, mission, at(90), ORDERS.moon, CHAPTERS);
    }
    expect(p.cargo).toBe(CARGO.max);
    expect(recordStory({ ...p, storyIndex: 0 }, missionById(1)!, at(90), ORDERS.moon, CHAPTERS).cargo).toBe(CARGO.max);
  });

  it('Mars missions and replays load no cargo', () => {
    const p = { ...fresh(), storyIndex: 3, cargo: 5 };
    expect(recordStory(p, missionById(1)!, at(90), ORDERS.moon, CHAPTERS).cargo).toBe(5); // replay
  });

  it('cargo sets the starting gauges on Mars: 28+ → 85, 20–27 → 75, under 20 → 65', () => {
    expect([cargoStartGauge(36), cargoStartGauge(28), cargoStartGauge(27), cargoStartGauge(20), cargoStartGauge(19), cargoStartGauge(0)]).toEqual([85, 85, 75, 75, 65, 65]);
    const p = { ...fresh(), storyIndex: ORDERS.moon.length, cargo: 22 };
    const marsStart = startMission(trackView(p, 'mars'), missionById(101)!, ORDERS.mars, seeded(3));
    const g = gaugesOf(marsStart.parts);
    expect([Math.round(g.power), Math.round(g.life), Math.round(g.crew)]).toEqual([75, 75, 75]);
  });
});

describe('B2: the Olympus ending', () => {
  it('24–30 stars Station, 15–23 Outpost, 0–14 Beacon', () => {
    expect([30, 24, 23, 15, 14, 0].map(olympusEnding)).toEqual(['station', 'station', 'outpost', 'outpost', 'beacon', 'beacon']);
  });

  it('the last mission of the climb picks the ending from all chapter stars', () => {
    const mars = ORDERS.mars;
    const p: Progress = { ...fresh(), storyIndex: mars.length - 1, chapterStars: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 4 }, runs: runsFor(6) };
    const rim = missionById(mars[mars.length - 1])!;
    const after = recordStory(p, rim, at(85), mars, CHAPTERS);
    expect(after.chapterStars?.['6']).toBeGreaterThanOrEqual(4);
    expect(totalChapterStars(after, CHAPTERS)).toBeGreaterThanOrEqual(28);
    expect(after.ending).toBe('station');
  });

  it('a whole game played through the engine reaches an Olympus ending', () => {
    let p = fresh();
    for (const world of ['moon', 'mars'] as const) {
      for (const id of ORDERS[world]) {
        const view = trackView(p, world);
        const mission = missionById(id)!;
        let state = startMission(view, mission, ORDERS[world], seeded(id));
        const event = EVENTS_BY_ID.get(mission.eventIds[0])!;
        state = applyChoice(state, event, event.choices[0].id, { rng: miss }).state;
        if (state.phase !== 'paused') state = nextStep(state, mission).state;
        const next = recordStory(view, mission, state, ORDERS[world], CHAPTERS);
        p = world === 'moon' ? { ...next, worlds: p.worlds } : { ...p, stars: next.stars, cards: next.cards, runs: next.runs, chapterStars: next.chapterStars, cargo: next.cargo, worlds: { ...p.worlds, mars: { storyIndex: next.storyIndex, carry: next.carry, ending: next.ending, location: next.location } } };
        if (state.phase === 'paused' && id !== ORDERS.mars[ORDERS.mars.length - 1]) break;
      }
    }
    expect(['station', 'outpost', 'beacon']).toContain(trackView(p, 'mars').ending);
  });

  it('starting Mars again clears the Mars chapters but keeps the Moon chapters and cargo', () => {
    const p: Progress = { ...fresh(), chapterStars: { 1: 5, 5: 3 }, runs: { '1': good, '101': good }, cargo: 30, cleanFlights: { 'earth-moon': true, 'moon-mars': true } };
    const cleared = clearChapters(p, 'mars', CHAPTERS);
    expect(cleared).toMatchObject({ chapterStars: { 1: 5 }, runs: { '1': good }, cargo: 30, cleanFlights: { 'earth-moon': true } });
    expect(clearChapters(p, 'moon', CHAPTERS).cargo).toBe(0);
  });
});

describe('camps on Olympus Mons (B8, DRAFT rule)', () => {
  it('higher camp, more radiation each sol: by rank until the heights arrive, then by height', () => {
    expect([0, 1, 2].map((rank) => campRadiation(rank, null))).toEqual([2, 4, 6]);
    expect(campRadiation(0, 20)).toBeGreaterThan(campRadiation(0, 5));
  });

  it('the tick is added every sol and reported', () => {
    const plain = createMissionState(missionById(105)!, 'mission', { rng: seeded(2) });
    const { state: after, report } = advanceSol({ ...plain, radiationPerSol: 4 });
    expect(report.radiation).toBe(4);
    expect(after.parts.radiation).toBe(advanceSol(plain).state.parts.radiation + 4);
  });
});

describe('goal track', () => {
  const goal = (p: Progress) => goalStop(p, ORDERS.moon.length, START_PLACES);
  it('Earth → Moon → Deep space → Mars → Olympus summit', () => {
    const p = fresh();
    expect(goal(p)).toBe(0);
    expect(goal({ ...p, location: 'horizon' })).toBe(1);
    expect(goal({ ...p, storyIndex: 3 })).toBe(1);
    const moonDone = { ...p, storyIndex: ORDERS.moon.length };
    expect(goal(moonDone)).toBe(2);
    expect(goal({ ...moonDone, worlds: { mars: { storyIndex: 1, carry: null, ending: null } } })).toBe(3);
    expect(goal({ ...moonDone, worlds: { mars: { storyIndex: 5, carry: null, ending: 'outpost' } } })).toBe(4);
  });
});

describe('older saves move to the six chapters', () => {
  it('the next Moon mission is found again by its id; old endings become Olympus endings', () => {
    const old = { ...fresh(), v: undefined, storyIndex: 3, ending: 'bumpy' as const }; // next was M5 in the old order
    const moved = migrate(old);
    expect(ORDERS.moon[moved.storyIndex]).toBe(5);
    expect(moved.ending).toBeNull();
    const finished = migrate({ ...fresh(), v: undefined, storyIndex: 6, worlds: { mars: { storyIndex: 6, carry: null, ending: 'complete' } } });
    expect(finished.storyIndex).toBe(ORDERS.moon.length);
    expect(finished.worlds?.mars?.ending).toBe('station');
    expect(migrate({ ...fresh(), storyIndex: 4 }).storyIndex).toBe(4); // already new
  });
});

describe('B8: Mission 8 names the latest real DONKI event', () => {
  it('picks the most recent event at or before the fetch time', () => {
    const snapshot = {
      fetchedAt: '2026-11-14T00:00:00Z',
      source: 'test',
      flares: [{ time: '2026-11-10T00:00:00Z', classType: 'M1.2' }],
      sep: [],
      cme: [{ time: '2026-11-12T08:00:00Z' }, { time: '2026-11-20T00:00:00Z' }],
    };
    expect(latestEvent(snapshot)).toMatchObject({ kind: 'cme', time: '2026-11-12T08:00:00Z' });
    expect(latestEvent({ ...snapshot, flares: [], cme: [] })).toBeNull();
  });
});

// Keeps the helper honest: a played mission's run is what the chapter reads.
it('missionRun reads the mission score', () => {
  const mission = missionById(3)!;
  let state = startMission(fresh(), mission, ORDERS.moon, seeded(5));
  const event = EVENTS_BY_ID.get('m3e1')!;
  state = nextStep(applyChoice(state, event, 'm3e1c', { rng: miss }).state, mission).state;
  expect(missionRun(state, mission).finished).toBe(state.phase === 'complete');
});
