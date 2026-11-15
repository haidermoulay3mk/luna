// Built with help from Claude (Anthropic).
// The hopper: a small lander that flies the crew low over the ground from one mission site to the
// next (Boss: "a flying simulator all across the missions"). Pure TypeScript, no three.js, so the
// rules are tested (hop.test.ts). The scene passes in the ground height and the world's gravity.
//
// Real data in play: the world's surface gravity pulls the hopper down, so hovering on Mars burns
// more than twice the fuel it does on the Moon and the hopper climbs slower there.
// All other numbers here are game tuning (DRAFT), not NASA facts.
import { SAFETY, changeSafety } from './flight';

export interface Hopper {
  x: number;
  /** Height of the hopper's feet above the zero level (not above the ground). */
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Heading in radians; 0 faces −z (north), positive turns right (towards +x). */
  yaw: number;
  /** 0–100. */
  fuel: number;
  grounded: boolean;
  /** Height above the ground the hover assist holds when no lift key is pressed (it follows the land). */
  hold: number;
}

/** Each axis −1…1. thrust: W/S · turn: A/D · lift: Space/Shift. */
export interface HopInput {
  thrust: number;
  turn: number;
  lift: number;
}

export const HOP = {
  /** Forward engine, m/s². */
  accel: 12,
  maxSpeed: 30,
  /** Share of horizontal speed kept each second (flight assist, gentle for young players). */
  drag: 0.7,
  /** Radians per second. */
  turnRate: 1.5,
  /** Main engine straight down, m/s² (gravity is taken off this, so the climb is slower on Mars). */
  liftAccel: 9.5,
  /** Share of the main engine the small top thrusters can push down with. */
  downThrust: 0.6,
  /** Hover assist: wanted climb and sink speeds, m/s. */
  climbSpeed: 12,
  sinkSpeed: 5,
  /** Fuel per second at full forward thrust, and per (m/s²) of gravity held up while hovering. */
  thrustFuel: 0.55,
  hoverFuel: 0.32,
  /** With an empty tank the engines give this share (reserve cells), so nobody gets stuck. */
  reserve: 0.45,
  /** Flight ceiling above the ground: the hopper flies low to stay in radio range of the crew. */
  ceiling: 55,
  /** Touching down slower than this (m/s, down) is a soft landing; faster is a hard one. */
  softLanding: 3.2,
  /** Hitting the ground faster than this (down) is a crash. */
  crashLanding: 7,
  /** Hitting a rock faster than this (m/s, straight at it) is a crash; slower is a graze. */
  crashSpeed: 14,
  /** The hover assist looks this many seconds ahead at the ground, to climb before a hill. */
  lookAhead: 1.6,
  /** Hopper body radius for spire contacts, m. */
  radius: 2.2,
  /** Land within this distance of the target pad's centre. */
  padRadius: 11,
} as const;

/** A tall rock pillar (or a building) the hopper must fly around. */
export interface Spire {
  x: number;
  z: number;
  r: number;
  /** Top of the spire above the zero level. */
  top: number;
}

export type Ground = (x: number, z: number) => number;

export const hopSpeed = (h: Pick<Hopper, 'vx' | 'vz'>) => Math.hypot(h.vx, h.vz);
export const heightAboveGround = (h: Pick<Hopper, 'x' | 'y' | 'z'>, ground: Ground) => h.y - ground(h.x, h.z);

/** Sitting on a pad, facing the target. */
export function hopperAt(x: number, z: number, ground: Ground, facing: { x: number; z: number }, fuel = 100): Hopper {
  return { x, y: ground(x, z), z, vx: 0, vy: 0, vz: 0, yaw: Math.atan2(facing.x - x, -(facing.z - z)), fuel, grounded: true, hold: 0 };
}

export interface HopStep {
  hopper: Hopper;
  /**
   * Touched the ground this frame: how hard (m/s). The larger of the speed coming down and half
   * the speed along the ground, so flying into a hillside counts too.
   */
  touchdown: number | null;
}

/** One frame of flight. dt is capped so a slow frame cannot teleport the hopper. */
export function stepHop(h: Hopper, input: HopInput, dtRaw: number, gravity: number, ground: Ground): HopStep {
  const dt = Math.min(Math.max(dtRaw, 0), 0.05);
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const thrust = clamp(input.thrust);
  const turn = clamp(input.turn);
  const lift = clamp(input.lift);
  const power = h.fuel > 0 ? 1 : HOP.reserve;

  // On the pad the hopper only lifts off (no sliding along the ground).
  const flying = !h.grounded || lift > 0;
  const yaw = h.yaw + (flying ? turn * HOP.turnRate * dt : 0);
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);

  let vx = h.vx;
  let vz = h.vz;
  if (flying) {
    vx += fx * thrust * HOP.accel * power * dt;
    vz += fz * thrust * HOP.accel * power * dt;
  }
  const keep = Math.pow(HOP.drag, dt);
  vx *= keep;
  vz *= keep;
  const v = Math.hypot(vx, vz);
  if (v > HOP.maxSpeed) {
    vx *= HOP.maxSpeed / v;
    vz *= HOP.maxSpeed / v;
  }

  // Vertical: hover assist steers towards the wanted climb/sink speed using the engine, which
  // has to hold up the world's gravity first. Less spare thrust on Mars, so it climbs slower.
  let vy = h.vy;
  let hoverBurn = 0;
  const agl = h.y - ground(h.x, h.z);
  // Terrain radar: the highest ground just ahead, so the hopper climbs before a hill, not into it.
  const t = HOP.lookAhead;
  const ahead = Math.max(ground(h.x, h.z), ground(h.x + h.vx * t * 0.5, h.z + h.vz * t * 0.5), ground(h.x + h.vx * t, h.z + h.vz * t));
  const clearance = h.y - ahead;
  let hold = lift !== 0 || h.grounded ? Math.max(0, agl) : h.hold;
  if (flying) {
    // Sinking slows near the ground (a landing radar), so a careful descent is a soft one.
    const sink = Math.min(HOP.sinkSpeed, 1.2 + Math.max(0, agl) * 0.45);
    // No lift key: hold the height above the land, climbing over hills and dipping into dips.
    const follow = Math.max(-HOP.sinkSpeed, Math.min(HOP.climbSpeed, (hold - Math.min(agl, clearance)) * 1.4));
    const want = lift > 0 ? HOP.climbSpeed : lift < 0 ? -sink : follow;
    const maxUp = HOP.liftAccel * power;
    // The engine acceleration needed to reach the wanted speed this frame, gravity included.
    const need = (want - vy) / Math.max(dt, 1e-3) + gravity;
    // Small thrusters on top can push down too (to stop a climb quickly in low gravity).
    const engine = Math.max(-maxUp * HOP.downThrust, Math.min(maxUp, need));
    vy += (engine - gravity) * dt;
    hoverBurn = (Math.abs(engine) / HOP.liftAccel) * gravity * HOP.hoverFuel;
  } else vy = 0;

  let x = h.x + vx * dt;
  let z = h.z + vz * dt;
  let y = h.y + vy * dt;

  // The ceiling: above it the hopper is held back down.
  const floor = ground(x, z);
  if (y - floor > HOP.ceiling) {
    y = floor + HOP.ceiling;
    if (vy > 0) vy = 0;
    hold = Math.min(hold, HOP.ceiling);
  }

  let grounded = false;
  let touchdown: number | null = null;
  if (y <= floor) {
    if (!h.grounded) touchdown = Math.max(0, -vy, Math.hypot(vx, vz) * 0.5);
    y = floor;
    vy = 0;
    // Feet on the ground: friction stops the hopper quickly.
    vx *= Math.pow(0.02, dt);
    vz *= Math.pow(0.02, dt);
    grounded = lift <= 0;
  }

  const burn = Math.abs(flying ? thrust : 0) * HOP.thrustFuel + hoverBurn;
  const fuel = Math.max(0, h.fuel - burn * dt);
  x = Number.isFinite(x) ? x : h.x;
  z = Number.isFinite(z) ? z : h.z;
  return { hopper: { x, y, z, vx, vy, vz, yaw, fuel, grounded, hold: grounded ? 0 : hold }, touchdown };
}

/** How a touchdown went: soft (fine), hard (a graze: Safety drops) or a crash (restart). */
export function landingKind(downSpeed: number): 'soft' | 'hard' | 'crash' {
  if (downSpeed <= HOP.softLanding) return 'soft';
  return downSpeed <= HOP.crashLanding ? 'hard' : 'crash';
}

export interface SpireContact {
  index: number;
  kind: 'graze' | 'crash';
  hopper: Hopper;
}

/** Touching a spire: pushed out and bounced back; slow is a graze, fast a crash (same rule as the big flights). */
export function hitSpire(h: Hopper, spires: readonly Spire[]): SpireContact | null {
  for (let i = 0; i < spires.length; i++) {
    const s = spires[i];
    if (h.y > s.top + 0.5) continue;
    const dx = h.x - s.x;
    const dz = h.z - s.z;
    const d = Math.hypot(dx, dz);
    const min = s.r + HOP.radius;
    if (d >= min) continue;
    const nx = d > 1e-6 ? dx / d : 1;
    const nz = d > 1e-6 ? dz / d : 0;
    const closing = -(h.vx * nx + h.vz * nz);
    const kind = closing > HOP.crashSpeed ? 'crash' : 'graze';
    // Bounce: remove the speed into the rock and reflect a little of it.
    const into = Math.max(0, closing);
    const vx = h.vx + nx * into * 1.4;
    const vz = h.vz + nz * into * 1.4;
    return { index: i, kind, hopper: { ...h, x: s.x + nx * min, z: s.z + nz * min, vx, vz } };
  }
  return null;
}

/** Landed on the target pad: on the ground, inside the pad, nearly stopped. */
export const onPad = (h: Hopper, pad: { x: number; z: number }) =>
  h.grounded && Math.hypot(h.x - pad.x, h.z - pad.z) < HOP.padRadius && hopSpeed(h) < 2;

// ---- The route: rock spires along the way ----

export interface Route {
  from: { x: number; z: number };
  to: { x: number; z: number };
}

/**
 * Rock spires scattered along the route (repeatable from the seed): most stand near the straight
 * line, so the player has to weave between them; many are taller than the ceiling, so flying over
 * them is not an option. None stand within `clear` metres of either pad or of `keepClear` points.
 */
export function routeSpires(
  route: Route,
  ground: Ground,
  seed: number,
  keepClear: readonly { x: number; z: number; r: number }[] = [],
  clear = 45,
): Spire[] {
  let a = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rand = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const dx = route.to.x - route.from.x;
  const dz = route.to.z - route.from.z;
  const len = Math.hypot(dx, dz);
  if (len < 1) return [];
  const ux = dx / len;
  const uz = dz / len;
  const count = Math.round(len / 13);
  const out: Spire[] = [];
  for (let i = 0; i < count * 3 && out.length < count; i++) {
    const t = rand();
    const side = (rand() - 0.5) * 2;
    // Bunched close to the line, a few further out.
    const off = Math.sign(side) * Math.pow(Math.abs(side), 1.6) * 70;
    const x = route.from.x + ux * len * t - uz * off;
    const z = route.from.z + uz * len * t + ux * off;
    const r = 3 + rand() * rand() * 9;
    const tall = rand() < 0.6;
    const height = tall ? HOP.ceiling + 8 + rand() * 40 : 14 + rand() * 26;
    const nearPad = Math.hypot(x - route.from.x, z - route.from.z) < clear + r || Math.hypot(x - route.to.x, z - route.to.z) < clear + r;
    if (nearPad) continue;
    if (keepClear.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + r)) continue;
    if (out.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + r + 6)) continue;
    out.push({ x, z, r, top: ground(x, z) + height });
  }
  return out;
}

/** Where a spire is from the hopper: metres ahead (negative = behind) and sideways. */
export function aheadOf(h: Pick<Hopper, 'x' | 'z' | 'yaw'>, s: Pick<Spire, 'x' | 'z'>): { ahead: number; lateral: number } {
  const fx = Math.sin(h.yaw);
  const fz = -Math.cos(h.yaw);
  const dx = s.x - h.x;
  const dz = s.z - h.z;
  return { ahead: dx * fx + dz * fz, lateral: Math.abs(dx * fz - dz * fx) };
}

/**
 * The nearest rock (or building) in the hopper's path: ahead within `range` metres, close enough
 * sideways to hit, and taller than the hopper is high. `side` is where it is (+1 right, -1 left),
 * so the warning can say which way to turn. Null when the way is clear.
 */
export function rockAhead(
  h: Pick<Hopper, 'x' | 'y' | 'z' | 'yaw'>,
  solids: readonly Spire[],
  range = 60,
): { index: number; distance: number; side: 1 | -1 } | null {
  let best: { index: number; distance: number; side: 1 | -1 } | null = null;
  const fx = Math.sin(h.yaw);
  const fz = -Math.cos(h.yaw);
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (s.top < h.y - 1) continue;
    const dx = s.x - h.x;
    const dz = s.z - h.z;
    const ahead = dx * fx + dz * fz;
    if (ahead <= 0 || ahead > range) continue;
    const across = dx * -fz + dz * fx;
    if (Math.abs(across) > s.r + HOP.radius + 3) continue;
    const distance = Math.max(0, ahead - s.r);
    if (!best || distance < best.distance) best = { index: i, distance, side: across >= 0 ? 1 : -1 };
  }
  return best;
}

// ---- Solar flares from NASA DONKI ----

/**
 * Chance that a flare warning comes during a hop, from the real space-weather risk
 * (FLARE_WEIGHT: LOW 0.5, MODERATE 1.5, HIGH 3). Land before the deadline or the crew takes a dose.
 */
export const hopFlareChance = (flareWeight: number) => Math.max(0, Math.min(1, flareWeight / 3));
/** The warning comes `at` seconds after lift-off; land within `deadline` seconds of it. */
export const HOP_FLARE = { at: 9, deadline: 30 } as const;

// ---- The result for the next mission (same shape as the big flights) ----

export interface HopTally {
  safety: number;
  grazes: number;
  flares: number;
}

export const newTally = (): HopTally => ({ safety: SAFETY.start, grazes: 0, flares: 0 });
export const tallyPass = (t: HopTally): HopTally => ({ ...t, safety: changeSafety(t.safety, 'pass') });
export const tallyGraze = (t: HopTally): HopTally => ({ ...t, grazes: t.grazes + 1, safety: changeSafety(t.safety, 'graze') });
