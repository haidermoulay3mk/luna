// Built with help from Claude (Anthropic).
// Where everything stands in the walkable world, what the astronaut bumps into, and how the
// astronaut moves. Pure TypeScript (no three.js) so it can be tested.
//
// The base follows Boss's reference photo: a central hub with a dark dome, six tunnels running out
// to the modules, a glass geodesic greenhouse, a solar field in front and round landing pads.
// x = east, z = south (towards the camera at the start), y = up. Units are metres, game-sized.
import type { WorldId } from '../../engine/campaign';
import type { ModuleId } from '../../engine/types';
import { fieldSites } from './sites';
import { OLYMPUS, OLYMPUS_CENTER, TERRAIN, heightAt } from './terrain';

export type Vec2 = readonly [number, number];

/** The ring the outer modules stand on, measured from the hub's centre. */
export const RING = 22;
export const HUB_RADIUS = 7;
/** Tunnels are half-buried tubes: 2.2 m radius, so the crest is about 2.5 m up. */
export const TUNNEL_RADIUS = 2.2;

/** Outer modules: their angle around the hub (0 = south, towards the start). */
export const RING_MODULES: { id: ModuleId; angle: number; radius: number }[] = [
  { id: 'greenhouse', angle: -0.52, radius: 6.2 },
  { id: 'oxygen', angle: 0.52, radius: 4.3 },
  { id: 'recycler', angle: Math.PI / 2, radius: 4.3 },
  { id: 'shelter', angle: 2.62, radius: 5.4 },
  { id: 'rover', angle: -2.62, radius: 5 },
  { id: 'battery', angle: -Math.PI / 2, radius: 4.3 },
];

export const ringPosition = (angle: number, radius = RING): Vec2 => [Math.sin(angle) * radius, Math.cos(angle) * radius];

/** The solar field in front of the base: rows of panels on posts. */
export const SOLAR_FIELD = { center: [0, 40] as Vec2, rows: 3, perRow: 9, panel: [3, 1.8] as Vec2, gapX: 0.4, gapZ: 3.4 };
export const ANTENNA: Vec2 = [-34, -16];
/** Two landing pads; the rocket stands on the east one. */
export const PADS: Vec2[] = [
  [-38, 26],
  [38, 26],
];
export const ROCKET_PAD: Vec2 = PADS[1];
export const BOLT_SPOT: Vec2 = [4, 10.5];
/** Where a new astronaut appears: outside the hub's airlock door, facing the base. */
export const SPAWN: Vec2 = [0, 15];

type RingId = 'greenhouse' | 'oxygen' | 'recycler' | 'shelter' | 'rover' | 'battery';

/** Centre of each module in the world (the hub is the habitat). */
export const MODULE_CENTER: Record<ModuleId, Vec2> = {
  habitat: [0, 0],
  solar: SOLAR_FIELD.center,
  antenna: ANTENNA,
  bolt: BOLT_SPOT,
  ...(Object.fromEntries(RING_MODULES.map((m) => [m.id, ringPosition(m.angle)])) as Record<RingId, Vec2>),
};

/** The module's name as the crew would say it, for objectives ("Go to the greenhouse dome"). */
export const MODULE_NAME: Record<ModuleId, string> = {
  habitat: 'the habitat hub',
  solar: 'the solar field',
  battery: 'the battery bank',
  greenhouse: 'the greenhouse dome',
  recycler: 'the water recycler',
  oxygen: 'the oxygen plant',
  shelter: 'the radiation shelter',
  antenna: 'the antenna mast',
  rover: 'the rover garage',
  bolt: 'BOLT the robot',
};

/** Where to stand to work on a module: just outside it, on the side away from the hub. */
export function moduleSpot(id: ModuleId): Vec2 {
  if (id === 'habitat') return [0, HUB_RADIUS + 2.5];
  if (id === 'solar') return [SOLAR_FIELD.center[0], SOLAR_FIELD.center[1] - 7];
  if (id === 'antenna') return [ANTENNA[0] + 3.5, ANTENNA[1] + 3.5];
  if (id === 'bolt') return [BOLT_SPOT[0] - 1.8, BOLT_SPOT[1] + 1.2];
  const m = RING_MODULES.find((r) => r.id === id)!;
  return ringPosition(m.angle, RING + m.radius + 2.6);
}

// ---- Mars: the climb up Olympus Mons ----

const along = (r: number, sideways: number): Vec2 => [OLYMPUS_CENTER[0] + sideways, OLYMPUS_CENTER[1] + r];
/** The three camps from the foot of the volcano to the caldera rim (by place id in places.json). */
export const CAMP_SPOTS: Record<string, Vec2> = {
  'camp-foot': along(212, -14),
  'camp-halfway': along(124, 16),
  'camp-rim': along(36, -6),
};
/** Where the crew plants the flag: on the caldera rim, the top of the climb. */
export const SUMMIT_FLAG: Vec2 = along(OLYMPUS.calderaRadius + 3, 4);

// ---- Collisions ----

export type Collider = { kind: 'circle'; c: Vec2; r: number } | { kind: 'capsule'; a: Vec2; b: Vec2; r: number };

/** The building at a field site stands at its centre (Outposts.tsx draws it this size). */
export const SITE_STRUCTURE_RADIUS = 5;

/** Everything solid at the base (the same layout on both worlds), plus the field sites of `world`. */
export function baseColliders(world?: WorldId): Collider[] {
  const list: Collider[] = [{ kind: 'circle', c: [0, 0], r: HUB_RADIUS + 0.3 }];
  for (const m of RING_MODULES) {
    list.push({ kind: 'circle', c: ringPosition(m.angle), r: m.radius + 0.4 });
    list.push({ kind: 'capsule', a: ringPosition(m.angle, HUB_RADIUS), b: ringPosition(m.angle, RING - m.radius), r: TUNNEL_RADIUS + 0.1 });
  }
  const { center, rows, gapZ, perRow, panel, gapX } = SOLAR_FIELD;
  const half = (perRow * (panel[0] + gapX)) / 2;
  for (let row = 0; row < rows; row++) {
    const z = center[1] + (row - (rows - 1) / 2) * gapZ;
    list.push({ kind: 'capsule', a: [center[0] - half, z], b: [center[0] + half, z], r: 0.9 });
  }
  list.push({ kind: 'circle', c: ANTENNA, r: 1.6 });
  list.push({ kind: 'circle', c: ROCKET_PAD, r: 2.6 });
  list.push({ kind: 'circle', c: BOLT_SPOT, r: 0.7 });
  if (world) {
    for (const site of fieldSites(world)) {
      if (site.id === 'olympus') continue;
      list.push({ kind: 'circle', c: site.center, r: SITE_STRUCTURE_RADIUS });
      // The parked hopper on its pad.
      list.push({ kind: 'circle', c: site.pad, r: 2.4 });
    }
  }
  return list;
}

const COLLIDERS = baseColliders();
const WORLD_COLLIDERS: Record<WorldId, Collider[]> = { moon: baseColliders('moon'), mars: baseColliders('mars') };

/** Moves a point out of every collider it is inside (the astronaut is a circle of `radius`). */
export function pushOut(p: [number, number], radius: number, colliders: readonly Collider[] = COLLIDERS): [number, number] {
  let [x, z] = p;
  for (const c of colliders) {
    let cx: number;
    let cz: number;
    if (c.kind === 'circle') {
      [cx, cz] = c.c;
    } else {
      const abx = c.b[0] - c.a[0];
      const abz = c.b[1] - c.a[1];
      const t = Math.max(0, Math.min(1, ((x - c.a[0]) * abx + (z - c.a[1]) * abz) / (abx * abx + abz * abz)));
      cx = c.a[0] + abx * t;
      cz = c.a[1] + abz * t;
    }
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    const min = c.r + radius;
    if (d < min) {
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      x = cx + nx * min;
      z = cz + nz * min;
    }
  }
  return [x, z];
}

// ---- Movement ----

/**
 * Surface gravity in m/s², so a jump on the Moon floats and one on Mars is shorter.
 * Moon 1.62, Mars 3.71: TODO_VERIFY against NASA's planetary fact sheets (team to add the link).
 */
export const GRAVITY: Record<WorldId, number> = { moon: 1.62, mars: 3.71 };
/** Game numbers (DRAFT): walking 3.4 m/s, running 6.5 m/s, jump take-off 2.4 m/s. */
export const MOVE = { walk: 3.4, run: 6.5, jump: 2.4, radius: 0.45, accel: 9 } as const;

export interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grounded: boolean;
}

export interface MoveInput {
  /** Wanted direction in world space (length 0–1). */
  dirX: number;
  dirZ: number;
  run: boolean;
  jump: boolean;
}

/** One physics step: steer towards the wanted speed, fall with the world's gravity, stay out of buildings. */
export function stepBody(world: WorldId, body: Body, input: MoveInput, dt: number): Body {
  const speed = input.run ? MOVE.run : MOVE.walk;
  // Less grip in the air: steering is slower while jumping.
  const grip = Math.min(1, dt * (body.grounded ? MOVE.accel : MOVE.accel * 0.25));
  const vx = body.vx + (input.dirX * speed - body.vx) * grip;
  const vz = body.vz + (input.dirZ * speed - body.vz) * grip;
  let vy = body.vy - GRAVITY[world] * dt;
  if (input.jump && body.grounded) vy = MOVE.jump;
  let [x, z] = pushOut([body.x + vx * dt, body.z + vz * dt], MOVE.radius, WORLD_COLLIDERS[world]);
  // Stay on the map.
  const t = TERRAIN[world];
  const dz0 = z - t.centerZ;
  const d = Math.hypot(x, dz0);
  if (d > t.limit) {
    x = (x / d) * t.limit;
    z = t.centerZ + (dz0 / d) * t.limit;
  }
  let y = body.y + vy * dt;
  const ground = heightAt(world, x, z);
  let grounded = false;
  // Walking downhill: keep the boots on the ground instead of floating off every slope.
  const snap = body.grounded && !input.jump && y > ground && y - ground < 0.15 + speed * dt;
  if (y <= ground || snap) {
    y = ground;
    vy = Math.max(0, vy);
    grounded = vy === 0;
  }
  return { x, y, z, vx, vy, vz, grounded };
}

export const distance2D = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** A body standing still at a spot on the ground. */
export const bodyAt = (world: WorldId, [x, z]: Vec2): Body => ({ x, y: heightAt(world, x, z), z, vx: 0, vy: 0, vz: 0, grounded: true });
