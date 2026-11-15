// Built with help from Claude (Anthropic).
// The hopper between mission sites: real gravity matters, the ceiling holds, rocks are solid,
// soft landings are soft, and every hop on the story route has rocks to dodge but clear pads.
import { describe, expect, it } from 'vitest';
import { ORDERS, missionById } from '../data/content';
import { GRAVITY } from '../scene/walk/layout';
import { needsHop, outpostBefore, outpostOfMission } from '../scene/walk/objective';
import { heightAt } from '../scene/walk/terrain';
import { HOP, hitSpire, hopperAt, landingKind, onPad, routeSpires, stepHop, type Ground, type Hopper } from './hop';

const flat: Ground = () => 0;
const fly = (h: Hopper, input: { thrust?: number; turn?: number; lift?: number }, seconds: number, g = GRAVITY.moon, ground = flat) => {
  let s = h;
  let touch: number | null = null;
  for (let t = 0; t < seconds; t += 1 / 60) {
    const step = stepHop(s, { thrust: 0, turn: 0, lift: 0, ...input }, 1 / 60, g, ground);
    s = step.hopper;
    if (step.touchdown !== null) touch = step.touchdown;
  }
  return { h: s, touch };
};
const pad = hopperAt(0, 0, flat, { x: 0, z: -100 });

describe('hopper flight', () => {
  it('sits on the pad until lift-off, then climbs', () => {
    expect(fly(pad, { thrust: 1 }, 2).h.x).toBe(0);
    const up = fly(pad, { lift: 1 }, 2).h;
    expect(up.y).toBeGreaterThan(5);
    expect(up.grounded).toBe(false);
  });

  it('holds its height above the ground when no key is pressed', () => {
    const up = fly(pad, { lift: 1 }, 2).h;
    const held = fly(up, {}, 4).h;
    expect(Math.abs(held.y - up.y)).toBeLessThan(1.5);
  });

  it('follows the land: flying over a hill, it climbs with the ground', () => {
    // A slope rising 20 m (one metre up for every three along).
    const hill: Ground = (_x, z) => Math.max(0, Math.min(20, (-z - 40) / 3));
    const up = fly(pad, { lift: 1 }, 1.5, GRAVITY.moon, hill).h;
    const over = fly(up, { thrust: 0.6 }, 12, GRAVITY.moon, hill).h;
    expect(over.z).toBeLessThan(-110);
    expect(over.grounded).toBe(false);
    expect(over.y).toBeGreaterThan(20 + 3);
  });

  it('real gravity: hovering on Mars burns more fuel and climbs slower than on the Moon', () => {
    const hover = (g: number) => fly(fly(pad, { lift: 1 }, 1, g).h, {}, 10, g).h.fuel;
    expect(100 - hover(GRAVITY.mars)).toBeGreaterThan((100 - hover(GRAVITY.moon)) * 2);
    expect(fly(pad, { lift: 1 }, 1, GRAVITY.mars).h.y).toBeLessThan(fly(pad, { lift: 1 }, 1, GRAVITY.moon).h.y);
  });

  it('stays under the flight ceiling', () => {
    expect(fly(pad, { lift: 1 }, 30).h.y).toBeLessThanOrEqual(HOP.ceiling + 0.01);
  });

  it('flies forward along its heading and turns with A/D', () => {
    const up = fly(pad, { lift: 1 }, 1).h;
    const ahead = fly(up, { thrust: 1 }, 3).h;
    expect(ahead.z).toBeLessThan(-10);
    const turned = fly(up, { thrust: 1, turn: 1 }, 1).h;
    expect(turned.yaw).toBeGreaterThan(up.yaw);
  });

  it('a gentle descent is a soft landing on the pad; a dive or fast drift is not', () => {
    const up = fly(pad, { lift: 1 }, 2).h;
    const down = fly(up, { lift: -1 }, 12);
    expect(down.h.grounded).toBe(true);
    expect(landingKind(down.touch ?? 99)).toBe('soft');
    expect(onPad(down.h, { x: 0, z: 0 })).toBe(true);
    expect(landingKind(5)).toBe('hard');
    expect(landingKind(HOP.crashLanding + 1)).toBe('crash');
  });

  it('rock spires are solid: slow touches graze, fast ones crash, high above is clear', () => {
    const spire = [{ x: 0, z: -5, r: 2, top: 60 }];
    const slow: Hopper = { ...pad, y: 10, grounded: false, vz: -3 };
    const hit = hitSpire({ ...slow, z: -1 }, spire);
    expect(hit?.kind).toBe('graze');
    expect(Math.hypot(hit!.hopper.x, hit!.hopper.z + 5)).toBeGreaterThanOrEqual(2 + HOP.radius - 1e-6);
    expect(hitSpire({ ...slow, z: -1, vz: -20 }, spire)?.kind).toBe('crash');
    expect(hitSpire({ ...slow, y: 70, z: -1 }, spire)).toBeNull();
  });
});

describe('hops between missions', () => {
  it('the story flies between outposts: several hops on the Moon and one on Mars', () => {
    const hops = (world: 'moon' | 'mars') => ORDERS[world].filter((id) => needsHop(id)).length;
    expect(hops('moon')).toBeGreaterThanOrEqual(6);
    expect(hops('mars')).toBe(1);
    // The first mission of each world starts at the base, where the big flight lands.
    expect(needsHop(ORDERS.moon[0])).toBe(false);
    expect(needsHop(ORDERS.mars[0])).toBe(false);
  });

  it('every hop has rock spires on the way, none on the pads, and a long enough flight', () => {
    for (const world of ['moon', 'mars'] as const) {
      for (const id of ORDERS[world].filter((m) => needsHop(m))) {
        const from = outpostBefore(id);
        const to = outpostOfMission(missionById(id)!);
        const route = { from: { x: from.pad[0], z: from.pad[1] }, to: { x: to.pad[0], z: to.pad[1] } };
        const length = Math.hypot(route.to.x - route.from.x, route.to.z - route.from.z);
        expect(length).toBeGreaterThan(world === 'moon' ? 400 : 90);
        const spires = routeSpires(route, (x, z) => heightAt(world, x, z), 7);
        expect(spires.length).toBeGreaterThan(world === 'moon' ? 15 : 3);
        for (const s of spires) {
          expect(Math.hypot(s.x - route.from.x, s.z - route.from.z)).toBeGreaterThan(30);
          expect(Math.hypot(s.x - route.to.x, s.z - route.to.z)).toBeGreaterThan(30);
        }
        // Some are taller than the ceiling, so flying over everything is not an option.
        expect(spires.some((s) => s.top - heightAt(world, s.x, s.z) > HOP.ceiling)).toBe(true);
      }
    }
  });

  it('the field sites stand on flat pads', () => {
    for (const id of ORDERS.moon) {
      const o = outpostOfMission(missionById(id)!);
      const h = [0, 3, 6].map((d) => heightAt('moon', o.pad[0] + d, o.pad[1]));
      expect(Math.max(...h) - Math.min(...h)).toBeLessThan(0.05);
    }
  });
});
