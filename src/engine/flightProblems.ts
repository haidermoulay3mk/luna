// Built with help from Claude (Anthropic).
// Problems that pop up during a flight, as a message from Mission Control or the crew.
// Each one changes how the ship flies for a few seconds and names the real skill it practises.
// DRAFT text written by Claude for the team to check (Boss asked for pop-up problems).
// The "skill" lines describe how crews work, not NASA numbers.
import type { FlightMods } from './flight';
import type { Rng } from './random';

export type ProblemId = 'rocks' | 'flare' | 'leak' | 'overheat' | 'drift' | 'comms';

export interface FlightProblem {
  id: ProblemId;
  from: 'Mission Control' | 'Engineering' | 'Navigation';
  title: string;
  message: string;
  /** What to do now, in one short line. */
  action: string;
  /** The real astronaut skill this practises. */
  skill: string;
  /** Seconds the problem lasts. */
  seconds: number;
  mods?: FlightMods;
  /** Extra rocks placed ahead of the ship. */
  extraRocks?: number;
  /** A solar flare: land or dock before the time runs out, or the crew takes extra radiation dose. */
  flare?: boolean;
}

export const FLIGHT_PROBLEMS: readonly FlightProblem[] = [
  {
    id: 'rocks',
    from: 'Navigation',
    title: 'Rocks ahead',
    message: 'A cluster of rocks is crossing your path.',
    action: 'Steer around them with A and D, or rise with Space.',
    skill: 'Crews plan their route around danger before they reach it.',
    seconds: 14,
    extraRocks: 10,
  },
  {
    id: 'flare',
    from: 'Mission Control',
    title: 'Solar flare warning',
    message: 'The Sun just flared. Radiation around you may rise.',
    action: 'Land or dock before the timer runs out to stay shielded.',
    skill: 'During solar storms, astronauts move to the most shielded place they can reach.',
    seconds: 25,
    flare: true,
  },
  {
    id: 'leak',
    from: 'Engineering',
    title: 'Fuel leak',
    message: 'Fuel pressure is dropping fast while the engine runs.',
    action: 'Ease off the engine (W) until the leak is sealed.',
    skill: 'In an emergency, crews stop, check the problem, then act.',
    seconds: 8,
    mods: { fuelScale: 4 },
  },
  {
    id: 'overheat',
    from: 'Engineering',
    title: 'Engine running hot',
    message: 'The main engine is overheating.',
    action: 'Top speed is limited until it cools down.',
    skill: 'Pilots watch their instruments and slow down before something breaks.',
    seconds: 10,
    mods: { maxSpeedScale: 0.55 },
  },
  {
    id: 'drift',
    from: 'Navigation',
    title: 'Thruster stuck',
    message: 'A small thruster is stuck on and pushing you off course.',
    action: 'Correct your heading with A and D.',
    skill: 'Pilots fix small errors early instead of waiting for big ones.',
    seconds: 8,
    mods: { drift: 0.35 },
  },
  {
    id: 'comms',
    from: 'Mission Control',
    title: 'Status check',
    message: 'Commander, please confirm your heading to the landing site.',
    action: 'Follow the blue arrow to the light beam.',
    skill: 'Crews report to Mission Control often, so help always knows where they are.',
    seconds: 6,
  },
];

/** Seconds before the first problem, then between problems. */
export const PROBLEM_TIMING = { first: 7, gapMin: 10, gapMax: 15 } as const;

/**
 * Picks the next problem: never the same one twice in a row, and each problem once before
 * any repeats. `flareWeight` (from the space weather risk) makes flares more or less likely.
 */
export function nextProblem(rng: Rng, used: readonly ProblemId[], flareWeight = 1): FlightProblem {
  const last = used[used.length - 1];
  const fresh = FLIGHT_PROBLEMS.filter((p) => !used.includes(p.id));
  const pool = (fresh.length > 0 ? fresh : FLIGHT_PROBLEMS).filter((p) => p.id !== last);
  const weights = pool.map((p) => (p.id === 'flare' ? flareWeight : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
