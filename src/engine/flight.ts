// Built with help from Claude (Anthropic).
// Rocket flight between Moon places, as pure functions (no three.js, no React) so the
// rules can be tested. The 3D scene calls stepShip() every frame and turns the result of
// a flight (rock hits, astronauts picked up) into effects on the next mission.
import type { Effect } from './types';

export type Vec3 = [number, number, number];

// ---- Scale ----

/** Moon radius from NASA's CGI Moon Kit (sources.json "nasa-cgi-moon-kit"). */
export const MOON_RADIUS_KM = 1737.4;
/** The Moon in the 3D scene is this many units across its radius. */
export const MOON_RADIUS = 100;
export const KM_PER_UNIT = MOON_RADIUS_KM / MOON_RADIUS;
/**
 * Game time runs faster than real time so a trip takes about a minute, not hours.
 * The speed shown on the HUD is divided by this, and the HUD says "Time ×200".
 */
export const TIME_WARP = 200;

// ---- Tuning (ours, not NASA facts) ----

export const FLIGHT = {
  /** Units per second² at full thrust. */
  thrust: 11,
  /** Flight assist: the share of speed kept each second (gentle, for young players). */
  drag: 0.55,
  maxSpeed: 20,
  /** Radians per second. */
  turnRate: 1.6,
  /** Up/down thrusters (Space/Shift), units per second², like a real craft's small side thrusters. */
  liftThrust: 9,
  /** Fuel (0–100) used per second at full thrust (the deep-space flights last about a minute). */
  fuelPerSecond: 1.0,
  /** With an empty tank the engine still gives this share of thrust (reserve cells), so nobody gets stuck. */
  reserveThrust: 0.35,
  shipRadius: 2,
  /** Fly inside this distance of a landing site or the station to land or dock. */
  arriveRadius: 7,
  /** Lowest safe height above the surface; below it the ship is pushed back up. */
  minAltitude: 1.5,
} as const;

/** What a flight costs or gives to the next mission. */
export const FLIGHT_EFFECTS = {
  /** Each rock hit means repairs on arrival. Counted up to maxHits. */
  powerPerHit: -5,
  maxHits: 3,
  /** A solar flare caught in the open adds radiation dose to the crew (counted up to maxFlares). */
  radiationPerFlare: 5,
  maxFlares: 2,
  /** Each astronaut picked up at the station cheers the crew up (more hands to help). */
  moralePerAstronaut: 5,
  astronautsPerDock: 2,
} as const;

// ---- Small vector maths ----

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l > 1e-9 ? scale(a, 1 / l) : [0, 1, 0];
};
export const distance = (a: Vec3, b: Vec3) => length(sub(a, b));

/** Rotates v around the unit axis by angle (Rodrigues' formula). */
export function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
}

/** A point on (or above) the Moon from latitude and longitude in degrees. +y is north, +z faces lon 0. */
export function latLonToVec(lat: number, lon: number, radius: number): Vec3 {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return [radius * Math.cos(phi) * Math.sin(lambda), radius * Math.sin(phi), radius * Math.cos(phi) * Math.cos(lambda)];
}

// ---- The ship ----

export interface Ship {
  pos: Vec3;
  vel: Vec3;
  /** Unit vector the nose points along. */
  forward: Vec3;
  /** Unit vector out of the ship's roof, always at a right angle to forward. */
  up: Vec3;
  /** 0–100. */
  fuel: number;
}

/**
 * Each axis from −1 to 1. thrust: W/S · turn: A/D (+ is right) · pitch: ↑/↓ nose up/down ·
 * lift: Space/Shift moves straight up/down (away from or towards the ground).
 */
export interface ShipInput {
  thrust: number;
  turn: number;
  pitch: number;
  lift: number;
}

/** Temporary changes from in-flight problems (an overheating engine, a fuel leak, drifting). */
export interface FlightMods {
  thrustScale?: number;
  maxSpeedScale?: number;
  fuelScale?: number;
  /** Added to the turn input: the ship slowly drifts off course. */
  drift?: number;
}

/** A ship hovering above a place (or beside the station), nose pointing along the surface. */
export function shipAt(place: Vec3, fuel = 100, height = 8): Ship {
  const up = normalize(place);
  const side: Vec3 = Math.abs(up[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const forward = normalize(cross(cross(up, side), up));
  return { pos: add(place, scale(up, height)), vel: [0, 0, 0], forward, up, fuel };
}

export const altitude = (ship: Pick<Ship, 'pos'>) => length(ship.pos) - MOON_RADIUS;
export const speed = (ship: Pick<Ship, 'vel'>) => length(ship.vel);

/** HUD numbers in real units: km above the surface and m/s of "real" speed (game speed ÷ TIME_WARP). */
export const altitudeKm = (ship: Pick<Ship, 'pos'>, radiusKm = MOON_RADIUS_KM) =>
  Math.max(0, (altitude(ship) * radiusKm) / MOON_RADIUS);
export const speedMs = (ship: Pick<Ship, 'vel'>, radiusKm = MOON_RADIUS_KM) =>
  (speed(ship) * (radiusKm / MOON_RADIUS) * 1000) / TIME_WARP;

/** Moves the ship one frame. dt in seconds (capped so a slow frame cannot teleport it). */
export function stepShip(ship: Ship, input: ShipInput, dtRaw: number, mods: FlightMods = {}): Ship {
  const dt = Math.min(Math.max(dtRaw, 0), 0.05);
  const clampAxis = (x: number) => Math.max(-1, Math.min(1, x));
  const thrust = clampAxis(input.thrust);
  const turn = clampAxis(input.turn + (mods.drift ?? 0));
  const pitch = clampAxis(input.pitch);
  const lift = clampAxis(input.lift);

  // Turn (yaw) around the roof, pitch around the wing.
  let forward = normalize(rotate(ship.forward, ship.up, -turn * FLIGHT.turnRate * dt));
  const right = normalize(cross(forward, ship.up));
  forward = normalize(rotate(forward, right, pitch * FLIGHT.turnRate * dt));
  // Keep the roof pointing away from the Moon where possible, so the horizon stays level.
  const radial = normalize(ship.pos);
  const level = sub(radial, scale(forward, dot(radial, forward)));
  let up = length(level) > 0.2 ? normalize(level) : normalize(cross(right, forward));
  up = normalize(sub(up, scale(forward, dot(up, forward))));

  // Main engine along the nose, up/down thrusters along the roof, then flight assist (drag), then the speed limit.
  const power = (ship.fuel > 0 ? 1 : FLIGHT.reserveThrust) * (mods.thrustScale ?? 1);
  let vel = add(ship.vel, scale(forward, thrust * FLIGHT.thrust * power * dt));
  vel = add(vel, scale(up, lift * FLIGHT.liftThrust * power * dt));
  vel = scale(vel, Math.pow(FLIGHT.drag, dt));
  const limit = FLIGHT.maxSpeed * (mods.maxSpeedScale ?? 1);
  const v = length(vel);
  if (v > limit) vel = scale(vel, limit / v);

  let pos = add(ship.pos, scale(vel, dt));
  // Never fly into the ground: push back to the minimum height and stop any downward speed.
  const floor = MOON_RADIUS + FLIGHT.minAltitude;
  if (length(pos) < floor) {
    const outward = normalize(pos);
    pos = scale(outward, floor);
    const down = dot(vel, outward);
    if (down < 0) vel = sub(vel, scale(outward, down));
  }

  const burn = (Math.abs(thrust) + Math.abs(lift) * 0.5) * FLIGHT.fuelPerSecond * (mods.fuelScale ?? 1);
  const fuel = Math.max(0, ship.fuel - burn * dt);
  return { pos, vel, forward, up, fuel };
}

// ---- Rocks, landing and docking ----

export interface Rock {
  pos: Vec3;
  radius: number;
}

/** Index of the first rock the ship touches, or -1. */
export function hitRock(ship: Pick<Ship, 'pos'>, rocks: readonly Rock[]): number {
  return rocks.findIndex((rock) => distance(ship.pos, rock.pos) < rock.radius + FLIGHT.shipRadius);
}

/** True when the ship is close enough to a landing site or the station. */
export const canArrive = (ship: Pick<Ship, 'pos'>, target: Vec3) => distance(ship.pos, target) < FLIGHT.arriveRadius;

// ---- LUNA_BUILD B5: the two big flights, Safety, grazes and crashes ----

/** Flight 1 brings the crew from Earth to the Moon (satellites and debris); Flight 2 from the Moon to Mars (real asteroids). */
export type FlightKind = 'earth-moon' | 'moon-mars';

/**
 * Safety 0–100 (DRAFT game rule): starts at 50; each obstacle passed cleanly +5; a graze −15.
 * A crash restarts the flight. 80+ at landing is a "Clean flight" (star 5 in chapters 1 and 5).
 */
export const SAFETY = {
  start: 50,
  pass: 5,
  graze: -15,
  clean: 80,
  /** Touching an obstacle faster than this (closing speed, units/s) is a crash, slower is a graze. */
  crashSpeed: 7,
  /** An obstacle counts as passed when it goes behind the ship within this sideways distance. */
  passLateral: 14,
} as const;

export function changeSafety(safety: number, event: 'pass' | 'graze'): number {
  return Math.max(0, Math.min(100, safety + (event === 'pass' ? SAFETY.pass : SAFETY.graze)));
}

/** A touch is a graze when slow, a crash when fast. `closingSpeed` is how fast ship and obstacle move towards each other. */
export const contactKind = (closingSpeed: number): 'graze' | 'crash' => (closingSpeed > SAFETY.crashSpeed ? 'crash' : 'graze');

/** An obstacle was ahead last frame and is beside or behind the ship now, close enough sideways to count as passed. */
export const didPass = (aheadBefore: number, aheadNow: number, lateral: number) =>
  aheadBefore > 0 && aheadNow <= 0 && lateral <= SAFETY.passLateral;

/** One real near-Earth asteroid from NASA NeoWs (src/data/neows.snapshot.json). */
export interface Asteroid {
  name: string;
  /** Average of NASA's estimated minimum and maximum diameter, metres. */
  diameterM: number;
  /** Relative velocity at close approach, km/s. */
  speedKmS: number;
  hazardous: boolean;
  approachDate: string;
}

/** The saved NeoWs file (src/data/neows.snapshot.json). */
export interface NeoWsSnapshot {
  fetchedAt: string;
  source: string;
  startDate: string;
  endDate: string;
  asteroids: Asteroid[];
}

/**
 * Size on screen grows with the real diameter (logarithmic, so a 1 km rock is bigger than a 10 m
 * one without filling the screen): 10 m → 0.8 units, 100 m → 1.7, 1 km → 2.6, capped at 4.2.
 */
export function asteroidRadius(diameterM: number): number {
  const d = Math.max(1, diameterM);
  return Math.max(0.8, Math.min(4.2, 0.8 + 0.9 * Math.log10(Math.max(10, d) / 10)));
}

/** Drift speed grows with the real velocity: 0.18 units/s per km/s, between 0.5 and 5.5. */
export function asteroidSpeed(speedKmS: number): number {
  return Math.max(0.5, Math.min(5.5, speedKmS * 0.18));
}

/** Where a big flight starts: out in space, above and to the side of the landing site (scene units). */
export const FLIGHT_START: Record<FlightKind, { up: number; side: number }> = {
  'earth-moon': { up: 150, side: 360 },
  'moon-mars': { up: 220, side: 620 },
};

/** The ship out in deep space, nose pointing straight at the landing point. */
export function deepSpaceStart(landPoint: Vec3, kind: FlightKind, fuel = 100): Ship {
  const up = normalize(landPoint);
  const helper: Vec3 = Math.abs(up[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const side = normalize(cross(up, helper));
  const { up: high, side: away } = FLIGHT_START[kind];
  const pos = add(scale(up, MOON_RADIUS + high), scale(side, away));
  const forward = normalize(sub(landPoint, pos));
  const radial = normalize(pos);
  const roof = sub(radial, scale(forward, dot(radial, forward)));
  return { pos, vel: [0, 0, 0], forward, up: length(roof) > 1e-6 ? normalize(roof) : normalize(cross(forward, side)), fuel };
}

export type FlightPhase = 'launch' | 'cruise' | 'approach' | 'landing';
export const FLIGHT_PHASES: readonly FlightPhase[] = ['launch', 'cruise', 'approach', 'landing'];
export const FLIGHT_PHASE_LABEL: Record<FlightPhase, string> = { launch: 'Launch', cruise: 'Cruise', approach: 'Approach', landing: 'Landing' };

/** Launch for the first seconds, Approach within 150 units of the site, Landing once touchdown begins. */
export function flightPhase(elapsed: number, targetDistance: number, landing: boolean): FlightPhase {
  if (landing) return 'landing';
  if (targetDistance < 150) return 'approach';
  return elapsed < 5 ? 'launch' : 'cruise';
}

// ---- What a flight means for the next mission ----

export interface FlightResult {
  hits: number;
  astronauts: number;
  /** Solar flares the crew was caught in, outside the station or a base. */
  flares?: number;
  /** True when the player chose autopilot. */
  autopilot: boolean;
  /** Safety (0–100) at landing (LUNA_BUILD B5). Missing for older flights and autopilot. */
  safety?: number;
}

export const NO_FLIGHT: FlightResult = { hits: 0, astronauts: 0, flares: 0, autopilot: true };

/** Rock hits cost Power for repairs, flares add radiation dose, astronauts raise Morale. Sizes stay inside the engine's 5–25 rule. */
export function flightEffects(result: FlightResult): Effect[] {
  const effects: Effect[] = [];
  const hits = Math.min(result.hits, FLIGHT_EFFECTS.maxHits);
  if (hits > 0) effects.push({ target: 'power', delta: hits * FLIGHT_EFFECTS.powerPerHit });
  const flares = Math.min(result.flares ?? 0, FLIGHT_EFFECTS.maxFlares);
  if (flares > 0) effects.push({ target: 'radiation', delta: flares * FLIGHT_EFFECTS.radiationPerFlare });
  const astronauts = Math.min(result.astronauts, FLIGHT_EFFECTS.astronautsPerDock * 2);
  if (astronauts > 0) effects.push({ target: 'morale', delta: astronauts * FLIGHT_EFFECTS.moralePerAstronaut });
  return effects;
}
