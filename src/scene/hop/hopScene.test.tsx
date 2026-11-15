// @vitest-environment jsdom
// Built with help from Claude (Anthropic).
// A real play-test of the hop flight, run without a screen: the whole 3D scene (terrain, base,
// field sites, spires, hopper, VFX) is built and run frame by frame, and a simple pilot flies it
// using only the player's controls (the same touch axes the on-screen buttons set). It must lift
// off, find the beacon, not get stuck, and land on the next mission's pad.
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { ORDERS, missionById } from '../../data/content';
import { createMissionState } from '../../engine/reducer';
import type { FlightResult } from '../../engine/flight';
import { touchAxes } from '../flight/input';
import { needsHop, outpostBefore, outpostOfMission } from '../walk/objective';
import { HopWorld, useHopHud } from './HopScene';

vi.mock('../../ui/sound', () => ({ sfx: new Proxy({}, { get: () => () => {} }), setEngine: () => {}, stopEngine: () => {} }));

/** Steer towards the beacon with the arrow the HUD shows; slow down and sink over the pad. */
function pilot() {
  const hud = useHopHud.getState();
  touchAxes.turn = Math.max(-1, Math.min(1, hud.bearing * 2));
  const facing = Math.abs(hud.bearing) < 0.5;
  if (hud.phase === 'pad') {
    touchAxes.lift = 1;
    touchAxes.thrust = 0;
    return;
  }
  if (hud.rock && hud.rock.distance < 45 && hud.distance > 40) {
    // The rock-ahead warning: ease off, turn away from the side it is on, and climb.
    touchAxes.turn = -hud.rock.side;
    touchAxes.thrust = hud.speed > 12 ? -0.5 : 0.4;
    touchAxes.lift = 1;
  } else if (hud.distance > 25) {
    touchAxes.thrust = facing ? 1 : 0.2;
    touchAxes.lift = hud.altitude < 22 ? 1 : 0;
  } else if (hud.distance > 7) {
    // Close: creep towards the beacon at walking pace, holding height (hop up again if it set down short).
    touchAxes.thrust = !facing ? 0 : hud.speed > 5 ? -1 : 0.5;
    touchAxes.lift = hud.altitude < 3 ? 1 : 0;
  } else {
    // Over the pad: brake, then sink.
    touchAxes.thrust = hud.speed > 3 ? -1 : 0;
    touchAxes.lift = hud.speed < 5 ? -1 : 0;
  }
}

describe('hop flight play-test (whole 3D scene, no screen)', () => {
  const hops = (['moon', 'mars'] as const).flatMap((world) => ORDERS[world].filter((id) => needsHop(id)).map((id) => ({ world, id })));

  it.each(hops)('$world hop to mission $id: lifts off, dodges the rocks, lands on the pad', async ({ world, id }) => {
    const mission = missionById(id)!;
    const from = outpostBefore(id);
    const to = outpostOfMission(mission);
    const landed = vi.fn<(r: FlightResult) => void>();
    const parts = createMissionState(mission, 'mission', { rng: () => 0.5, startSol: mission.day }).parts;
    const renderer = await ReactThreeTestRenderer.create(
      <HopWorld world={world} from={from} to={to} parts={parts} flare={false} reduced={false} onLanded={landed} lowPower />,
    );
    const startDistance = Math.hypot(from.pad[0] - to.pad[0], from.pad[1] - to.pad[1]);
    let lifted = false;
    let best = Infinity;
    for (let second = 0; second < 150 && !landed.mock.calls.length; second++) {
      for (let f = 0; f < 6; f++) {
        pilot();
        await ReactThreeTestRenderer.act(async () => renderer.advanceFrames(10, 1 / 60));
      }
      const hud = useHopHud.getState();
      if (hud.phase === 'flying') lifted = true;
      best = Math.min(best, hud.distance);
    }
    Object.assign(touchAxes, { thrust: 0, turn: 0, lift: 0, pitch: 0 });
    const hud = useHopHud.getState();
    console.info(`${from.name} -> ${to.name}: ${startDistance.toFixed(0)} m, safety ${hud.safety}, grazes ${hud.grazes}, crashes ${hud.crashes}, fuel left ${hud.fuel.toFixed(0)}%, ended ${hud.phase} ${hud.distance.toFixed(0)} m from the pad (closest ${best.toFixed(0)} m)`);
    expect(lifted).toBe(true);
    expect(landed).toHaveBeenCalledTimes(1);
    expect(landed.mock.calls[0][0].autopilot).toBe(false);
    await renderer.unmount();
    useHopHud.setState({ phase: 'pad', distance: 0, bearing: 0, rock: null });
  }, 120_000);
});

/** WASD only (friend, 15 Nov): never touches climb or sink. W lifts off; height and landing are automatic. */
function wasdPilot() {
  const hud = useHopHud.getState();
  touchAxes.lift = 0;
  touchAxes.pitch = 0;
  touchAxes.turn = Math.max(-1, Math.min(1, hud.bearing * 2));
  const facing = Math.abs(hud.bearing) < 0.5;
  if (hud.phase === 'pad') {
    touchAxes.thrust = 1;
    return;
  }
  if (hud.rock && hud.rock.distance < 45 && hud.distance > 40) {
    touchAxes.turn = -hud.rock.side;
    touchAxes.thrust = hud.speed > 12 ? -0.5 : 0.4;
  } else if (hud.distance > 30) touchAxes.thrust = facing ? 1 : 0.2;
  else touchAxes.thrust = !facing ? 0 : hud.speed > 4 ? -1 : hud.distance > 5 ? 0.4 : 0;
}

describe('hop flight with W A S D only', () => {
  const hops = ORDERS.moon.filter((id) => needsHop(id)).slice(0, 2);

  it.each(hops)('moon hop to mission %i lands with W A S D only', async (id) => {
    const mission = missionById(id)!;
    const landed = vi.fn<(r: FlightResult) => void>();
    const parts = createMissionState(mission, 'mission', { rng: () => 0.5, startSol: mission.day }).parts;
    const renderer = await ReactThreeTestRenderer.create(
      <HopWorld world="moon" from={outpostBefore(id)} to={outpostOfMission(mission)} parts={parts} flare={false} reduced={false} onLanded={landed} lowPower />,
    );
    for (let second = 0; second < 150 && !landed.mock.calls.length; second++) {
      for (let f = 0; f < 6; f++) {
        wasdPilot();
        await ReactThreeTestRenderer.act(async () => renderer.advanceFrames(10, 1 / 60));
      }
    }
    Object.assign(touchAxes, { thrust: 0, turn: 0, lift: 0, pitch: 0 });
    const hud = useHopHud.getState();
    console.info(`WASD only -> mission ${id}: ended ${hud.phase} ${hud.distance.toFixed(0)} m from the pad, crashes ${hud.crashes}`);
    expect(landed).toHaveBeenCalledTimes(1);
    await renderer.unmount();
    useHopHud.setState({ phase: 'pad', distance: 0, bearing: 0, rock: null });
  }, 120_000);
});
