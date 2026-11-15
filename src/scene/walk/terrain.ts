// Built with help from Claude (Anthropic).
// The ground the astronaut walks on, as pure maths (no three.js), so the same height is used for
// the terrain mesh, the player's feet, the rocks and the tests.
// Moon: grey regolith (Moon soil) to the horizon, craters with raised rims, hills far away.
// Mars: rust plains with dunes and, to the north, a walkable Olympus Mons with its caldera.
// The base sits on a flattened pad at the origin. Sizes are game sizes, not to scale.
import type { WorldId } from '../../engine/campaign';
import { fieldSites } from './sites';

// ---- Noise (value noise + fbm, seeded, repeatable) ----

function hash2(ix: number, iz: number, seed: number): number {
  const s = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function noise2(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Fractal noise in about [-0.5, 0.5]. */
export function fbm(x: number, z: number, seed = 1, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += (noise2(x * freq, z * freq, seed + i * 17) - 0.5) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---- Olympus Mons (Mars only) ----

/** Centre of the volcano, north of the base (scene units are metres in the game, not to scale). */
export const OLYMPUS_CENTER: readonly [number, number] = [0, -330];
export const OLYMPUS = { radius: 250, height: 88, calderaRadius: 24, calderaDepth: 12 } as const;

/** A broad shield volcano: gentle slopes, a flat-ish top, a caldera (collapsed crater) with a rim. */
export function olympusHeight(x: number, z: number): number {
  const r = Math.hypot(x - OLYMPUS_CENTER[0], z - OLYMPUS_CENTER[1]);
  if (r >= OLYMPUS.radius) return 0;
  const t = r / OLYMPUS.radius;
  let h = OLYMPUS.height * Math.pow(1 - t * t, 1.2);
  // Old lava flows: small terraces on the flank.
  h += Math.sin(r * 0.11) * 0.9 * (1 - t);
  const c = r / OLYMPUS.calderaRadius;
  if (c < 1) h -= OLYMPUS.calderaDepth * (1 - c * c);
  const rim = (c - 1) / 0.35;
  h += 3 * Math.exp(-rim * rim);
  return h;
}

// ---- Craters ----

export interface Crater {
  x: number;
  z: number;
  r: number;
  depth: number;
}

/** Seeded crater field. None inside `keepClear` of the base, so the pad stays flat. */
function makeCraters(seed: number, count: number, keepClear: number, spread: number): Crater[] {
  let a = seed;
  const rand = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const out: Crater[] = [];
  for (let i = 0; i < count; i++) {
    const big = rand() < 0.12;
    const r = big ? 26 + rand() * 34 : 3 + rand() * rand() * 22;
    const angle = rand() * Math.PI * 2;
    const dist = keepClear + r + rand() * spread;
    out.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, r, depth: r * (0.16 + rand() * 0.08) });
  }
  return out;
}

// Spread out to the field sites the hopper flies to (sites.ts), hundreds of metres away.
const MOON_CRATERS = makeCraters(4242, 120, 62, 600);
const MARS_CRATERS = makeCraters(9001, 30, 62, 260).filter(
  (c) => Math.hypot(c.x - OLYMPUS_CENTER[0], c.z - OLYMPUS_CENTER[1]) > OLYMPUS.radius + c.r,
);

function craterHeight(x: number, z: number, list: readonly Crater[]): number {
  let h = 0;
  for (const c of list) {
    const dx = x - c.x;
    const dz = z - c.z;
    const reach = c.r * 1.8;
    if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
    const d = Math.sqrt(dx * dx + dz * dz) / c.r;
    if (d < 1) h -= c.depth * (1 - d * d);
    const rim = (d - 1) / 0.32;
    h += c.depth * 0.38 * Math.exp(-rim * rim);
  }
  return h;
}

// ---- Height ----

/** The base pad: flat inside this radius, blending into the land by BASE_BLEND. */
export const BASE_FLAT = 52;
const BASE_BLEND = 82;

function rawHeight(world: WorldId, x: number, z: number): number {
  const r = Math.hypot(x, z);
  const pad = smoothstep(BASE_FLAT, BASE_BLEND, r);
  if (world === 'moon') {
    let h = fbm(x * 0.018, z * 0.018, 3) * 7 + fbm(x * 0.09, z * 0.09, 9, 3) * 0.9;
    h += craterHeight(x, z, MOON_CRATERS);
    // Hills on the horizon, like the rim of a big old crater.
    h += smoothstep(170, 340, r) * (18 + fbm(x * 0.006, z * 0.006, 21) * 70);
    return h * pad;
  }
  const volcano = olympusHeight(x, z);
  // Dunes, stretched by the wind, and low hills far away (not on the volcano).
  let h = fbm(x * 0.014, z * 0.014, 5) * 6 + fbm(x * 0.07 + 3, z * 0.03, 13, 3) * 1.6;
  h += craterHeight(x, z, MARS_CRATERS);
  h += smoothstep(260, 420, r) * (10 + fbm(x * 0.007, z * 0.007, 31) * 40) * (1 - smoothstep(0, 30, volcano));
  return h * pad + volcano;
}

/** Each field site sits on its own levelled pad, at the height of the land there. */
const SITE_PADS: Record<WorldId, { x: number; z: number; flat: number; h: number }[]> = {
  moon: fieldSites('moon').map((o) => ({ x: o.center[0], z: o.center[1], flat: o.flat, h: rawHeight('moon', o.center[0], o.center[1]) })),
  mars: fieldSites('mars').map((o) => ({ x: o.center[0], z: o.center[1], flat: o.flat, h: rawHeight('mars', o.center[0], o.center[1]) })),
};

export function heightAt(world: WorldId, x: number, z: number): number {
  let h = rawHeight(world, x, z);
  for (const s of SITE_PADS[world]) {
    const dx = Math.abs(x - s.x);
    const dz = Math.abs(z - s.z);
    const reach = s.flat * 1.8;
    if (dx > reach || dz > reach) continue;
    const w = smoothstep(s.flat, reach, Math.hypot(dx, dz));
    h = s.h + (h - s.h) * w;
  }
  return h;
}

/** How steep the ground is (0 flat, 1 = 45° or more), for colouring crater walls and slopes. */
export function slopeAt(world: WorldId, x: number, z: number): number {
  const e = 1.5;
  const dx = heightAt(world, x + e, z) - heightAt(world, x - e, z);
  const dz = heightAt(world, x, z + e) - heightAt(world, x, z - e);
  return Math.min(1, Math.hypot(dx, dz) / (2 * e));
}

/** Size of the walkable ground square, its centre, and how far the player may go from the centre. */
export const TERRAIN = {
  moon: { size: 1560, segments: 300, centerZ: 0, limit: 700 },
  mars: { size: 1100, segments: 240, centerZ: -200, limit: 470 },
} as const;
