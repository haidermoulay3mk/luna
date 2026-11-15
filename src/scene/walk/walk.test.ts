// Built with help from Claude (Anthropic).
// The walkable world: the base sits on flat ground, the astronaut can't walk through buildings,
// jumps follow real gravity, every mission has a reachable site, and the climb goes up.
import { describe, expect, it } from 'vitest';
import { ORDERS, chapterById, missionById } from '../../data/content';
import { CAMP_SPOTS, GRAVITY, MODULE_CENTER, SPAWN, baseColliders, bodyAt, pushOut, stepBody, type Body, type Vec2 } from './layout';
import { ROCKET_SITE, SUMMIT_SITE, missionSite, outpostOfMission } from './objective';
import { OLYMPUS, OLYMPUS_CENTER, TERRAIN, heightAt } from './terrain';

const inside = (p: Vec2, pad = 0.4) =>
  baseColliders().some((c) => {
    const [x, z] = p;
    if (c.kind === 'circle') return Math.hypot(x - c.c[0], z - c.c[1]) < c.r + pad;
    const abx = c.b[0] - c.a[0];
    const abz = c.b[1] - c.a[1];
    const t = Math.max(0, Math.min(1, ((x - c.a[0]) * abx + (z - c.a[1]) * abz) / (abx * abx + abz * abz)));
    return Math.hypot(x - (c.a[0] + abx * t), z - (c.a[1] + abz * t)) < c.r + pad;
  });

/** Jump from flat ground with no input; returns the peak height and the time in the air. */
function jump(world: 'moon' | 'mars') {
  let b: Body = bodyAt(world, [0, 12]);
  let peak = 0;
  let t = 0;
  b = stepBody(world, b, { dirX: 0, dirZ: 0, run: false, jump: true }, 1 / 60);
  while (!b.grounded && t < 10) {
    b = stepBody(world, b, { dirX: 0, dirZ: 0, run: false, jump: false }, 1 / 60);
    peak = Math.max(peak, b.y);
    t += 1 / 60;
  }
  return { peak, t };
}

describe('walkable world', () => {
  it('the base stands on flat ground on both worlds (not floating)', () => {
    for (const world of ['moon', 'mars'] as const) {
      for (const p of [[0, 0], SPAWN, ...Object.values(MODULE_CENTER)] as Vec2[]) expect(Math.abs(heightAt(world, p[0], p[1]))).toBeLessThan(0.01);
    }
  });

  it('the land around the base has relief: craters and hills, not a flat plate', () => {
    const heights = [];
    for (let i = 0; i < 200; i++) heights.push(heightAt('moon', Math.cos(i) * (90 + i), Math.sin(i) * (90 + i)));
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(8);
  });

  it('the astronaut cannot walk into the hub or a module', () => {
    const [x, z] = pushOut([0.5, 0.5], 0.45);
    expect(Math.hypot(x, z)).toBeGreaterThan(7);
    let b: Body = bodyAt('moon', SPAWN);
    for (let i = 0; i < 400; i++) b = stepBody('moon', b, { dirX: 0, dirZ: -1, run: true, jump: false }, 1 / 60);
    expect(inside([b.x, b.z], -0.05)).toBe(false);
  });

  it('walking moves the astronaut and running is faster', () => {
    const walk = (run: boolean) => {
      let b: Body = bodyAt('moon', [60, 60]);
      for (let i = 0; i < 120; i++) b = stepBody('moon', b, { dirX: 1, dirZ: 0, run, jump: false }, 1 / 60);
      return b.x - 60;
    };
    expect(walk(false)).toBeGreaterThan(4);
    expect(walk(true)).toBeGreaterThan(walk(false));
  });

  it('jumps follow real gravity: higher and longer on the Moon than on Mars', () => {
    expect(GRAVITY.moon).toBeLessThan(GRAVITY.mars);
    const moon = jump('moon');
    const mars = jump('mars');
    expect(moon.peak).toBeGreaterThan(mars.peak * 2);
    expect(moon.t).toBeGreaterThan(mars.t * 2);
  });

  it('the astronaut stays on the map', () => {
    let b: Body = bodyAt('moon', [0, 20]);
    for (let i = 0; i < 6000; i++) b = stepBody('moon', b, { dirX: 0, dirZ: 1, run: true, jump: false }, 1 / 30);
    expect(Math.hypot(b.x, b.z - TERRAIN.moon.centerZ)).toBeLessThanOrEqual(TERRAIN.moon.limit + 0.01);
  });
});

describe('mission sites', () => {
  it('every story mission has a site the astronaut can stand on, inside the map', () => {
    for (const world of ['moon', 'mars'] as const) {
      for (const id of ORDERS[world]) {
        const site = missionSite(missionById(id)!);
        expect(inside([site.x, site.z], 0)).toBe(false);
        expect(baseColliders(world).some((c) => c.kind === 'circle' && Math.hypot(site.x - c.c[0], site.z - c.c[1]) < c.r)).toBe(false);
        expect(Math.hypot(site.x, site.z - TERRAIN[world].centerZ)).toBeLessThan(TERRAIN[world].limit);
        expect(site.line.length).toBeGreaterThan(5);
      }
    }
  });

  it('Moon missions happen at the base or a field site the hopper flies to; the climb is at the camps up Olympus Mons', () => {
    for (const id of ORDERS.moon) {
      const s = missionSite(missionById(id)!);
      const o = outpostOfMission(missionById(id)!);
      expect(Math.hypot(s.x - o.center[0], s.z - o.center[1])).toBeLessThan(60);
    }
    const climb = chapterById(6)!.missions.map((id) => missionSite(missionById(id)!));
    const heights = climb.map((s) => heightAt('mars', s.x, s.z));
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(Object.keys(CAMP_SPOTS)).toHaveLength(3);
  });

  it('the summit flag is the top of the climb, on the caldera rim', () => {
    const summit = heightAt('mars', SUMMIT_SITE.x, SUMMIT_SITE.z);
    const rimCamp = CAMP_SPOTS['camp-rim'];
    expect(summit).toBeGreaterThan(heightAt('mars', rimCamp[0], rimCamp[1]));
    expect(summit).toBeGreaterThan(OLYMPUS.height * 0.8);
    expect(heightAt('mars', OLYMPUS_CENTER[0], OLYMPUS_CENTER[1])).toBeLessThan(summit); // the caldera dips in the middle
  });

  it('the rocket can be reached on its launch pad', () => {
    expect(inside([ROCKET_SITE.x, ROCKET_SITE.z], 0)).toBe(false);
  });
});
