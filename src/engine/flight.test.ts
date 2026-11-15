// Built with help from Claude (Anthropic).
// LUNA_BUILD B5 flight rules: Safety, grazes and crashes, real NASA asteroids (NeoWs) in Flight 2,
// and the deep-space start of both big flights.
import { describe, expect, it } from 'vitest';
import { CHAPTERS, NEOWS, placeForMission } from '../data/content';
import { isCleanFlight } from './chapters';
import {
  MOON_RADIUS,
  SAFETY,
  add,
  asteroidRadius,
  asteroidSpeed,
  changeSafety,
  contactKind,
  deepSpaceStart,
  didPass,
  distance,
  dot,
  flightPhase,
  latLonToVec,
  length,
  normalize,
  scale,
  sub,
  type FlightKind,
  type Vec3,
} from './flight';

describe('Safety (B5)', () => {
  it('starts at 50; a clean pass is +5, a graze −15; it stays between 0 and 100', () => {
    expect(SAFETY.start).toBe(50);
    expect(changeSafety(50, 'pass')).toBe(55);
    expect(changeSafety(50, 'graze')).toBe(35);
    expect(changeSafety(98, 'pass')).toBe(100);
    expect(changeSafety(10, 'graze')).toBe(0);
  });

  it('80+ at landing is a clean flight: six clean passes and no graze from the start', () => {
    let safety: number = SAFETY.start;
    for (let i = 0; i < 6; i++) safety = changeSafety(safety, 'pass');
    expect(isCleanFlight({ autopilot: false, hits: 0, safety })).toBe(true);
    expect(isCleanFlight({ autopilot: false, hits: 1, safety: changeSafety(safety, 'graze') })).toBe(false);
  });

  it('a slow touch is a graze, a fast one is a crash (which restarts the flight)', () => {
    expect(contactKind(2)).toBe('graze');
    expect(contactKind(SAFETY.crashSpeed)).toBe('graze');
    expect(contactKind(SAFETY.crashSpeed + 0.1)).toBe('crash');
  });

  it('an obstacle counts as passed when it goes from ahead to behind, close enough sideways', () => {
    expect(didPass(3, -1, 5)).toBe(true);
    expect(didPass(3, -1, SAFETY.passLateral + 1)).toBe(false);
    expect(didPass(-2, -3, 5)).toBe(false);
    expect(didPass(4, 2, 5)).toBe(false);
  });

  it('flight phases: Launch, Cruise, Approach, Landing', () => {
    expect(flightPhase(1, 400, false)).toBe('launch');
    expect(flightPhase(12, 400, false)).toBe('cruise');
    expect(flightPhase(12, 120, false)).toBe('approach');
    expect(flightPhase(12, 120, true)).toBe('landing');
  });
});

describe('Flight 2: real near-Earth asteroids from NASA NeoWs (B8)', () => {
  it('the saved snapshot is real NeoWs data with a date, and the game reads it offline', () => {
    expect(Number.isFinite(Date.parse(NEOWS.fetchedAt))).toBe(true);
    expect(NEOWS.source).toContain('NeoWs');
    expect(NEOWS.asteroids.length).toBeGreaterThan(5);
    for (const a of NEOWS.asteroids) {
      expect(a.name.length, 'name').toBeGreaterThan(0);
      expect(a.diameterM, a.name).toBeGreaterThan(0);
      expect(a.speedKmS, a.name).toBeGreaterThan(0);
      expect(typeof a.hazardous).toBe('boolean');
    }
  });

  it('bigger real asteroids are bigger rocks, faster ones drift faster, within limits', () => {
    expect(asteroidRadius(1000)).toBeGreaterThan(asteroidRadius(100));
    expect(asteroidRadius(100)).toBeGreaterThan(asteroidRadius(10));
    expect(asteroidRadius(0)).toBeGreaterThanOrEqual(0.8);
    expect(asteroidRadius(1e6)).toBeLessThanOrEqual(4.2);
    expect(asteroidSpeed(30)).toBeGreaterThan(asteroidSpeed(10));
    expect(asteroidSpeed(0.1)).toBeGreaterThanOrEqual(0.5);
    expect(asteroidSpeed(100)).toBeLessThanOrEqual(5.5);
  });
});

describe('the two big flights start out in deep space (B5)', () => {
  const site = (missionId: number): Vec3 => {
    const p = placeForMission(missionId);
    const up = normalize(latLonToVec(p.lat, p.lon, 1));
    return scale(up, MOON_RADIUS + 3.35);
  };
  const flights: [FlightKind, number][] = CHAPTERS.filter((c) => c.flightIn).map((c) => [c.flightIn!, c.missions[0]]);

  it('Flight 1 lands at the Moon base, Flight 2 at the Mars base', () => {
    expect(flights).toEqual([
      ['earth-moon', 1],
      ['moon-mars', 101],
    ]);
  });

  it('starts far away, nose on the landing point, and the straight path never goes through the world', () => {
    for (const [kind, missionId] of flights) {
      const land = site(missionId);
      const ship = deepSpaceStart(land, kind);
      expect(distance(ship.pos, land), kind).toBeGreaterThan(kind === 'moon-mars' ? 500 : 300);
      expect(dot(ship.forward, normalize(sub(land, ship.pos)))).toBeCloseTo(1, 5);
      expect(Math.abs(dot(ship.up, ship.forward))).toBeLessThan(1e-6);
      for (let u = 0; u <= 1; u += 0.02) {
        const p = add(ship.pos, scale(sub(land, ship.pos), u));
        expect(length(p), `${kind} at ${u.toFixed(2)}`).toBeGreaterThan(MOON_RADIUS);
      }
    }
  });
});
