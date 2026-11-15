// @vitest-environment jsdom
// Built with help from Claude (Anthropic).
// "Make sure the rocket is working" (Boss): a real play-test of both big flights, run without a
// screen. The rocket, its flame, the satellites, debris and real NASA asteroids are built and run
// frame by frame; a simple pilot steers at the landing marker using only the player's controls.
// The rocket must fly, get close, play the landing cut-scene and land (onArrive called once).
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { NEOWS, START_PLACES, chapterById, placeById, placeForMission } from '../../data/content';
import type { FlightKind, FlightResult } from '../../engine/flight';
import { useFlightHud } from '../../store/flightHud';
import { touchAxes } from './input';
import { FlightWorld } from './FlightScene';

// jsdom has no matchMedia (used for reduced motion): no reduced motion here.
window.matchMedia ??= ((query: string) =>
  ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList);

vi.mock('../../ui/sound', () => ({ sfx: new Proxy({}, { get: () => () => {} }), setEngine: () => {}, stopEngine: () => {} }));

/** Point the nose at the landing marker (the guide the HUD shows) and fly at it. */
function pilot() {
  const { guide, status } = useFlightHud.getState();
  if (status !== 'flying') {
    Object.assign(touchAxes, { thrust: 0, turn: 0, pitch: 0, lift: 0 });
    return;
  }
  const behind = !guide.onScreen;
  touchAxes.turn = behind ? 1 : Math.max(-1, Math.min(1, guide.x * 3));
  touchAxes.pitch = behind ? 0 : Math.max(-1, Math.min(1, guide.y * 3));
  touchAxes.thrust = behind ? 0.3 : Math.abs(guide.x) < 0.3 ? 1 : 0.4;
}

const flights: { kind: FlightKind; world: 'moon' | 'mars'; chapter: number }[] = [
  { kind: 'earth-moon', world: 'moon', chapter: 1 },
  { kind: 'moon-mars', world: 'mars', chapter: 5 },
];

describe('rocket flight play-test (whole 3D flight, no screen)', () => {
  it.each(flights)('$kind: the rocket flies, gets to the landing site and lands', async ({ kind, world, chapter }) => {
    const arrived = vi.fn<(r: FlightResult) => void>();
    const target = chapterById(chapter)!.missions[0];
    const from = placeById(START_PLACES[world])!;
    const to = placeForMission(target);
    const renderer = await ReactThreeTestRenderer.create(
      <FlightWorld world={world} from={from} to={to} onArrive={arrived} lowPower kind={kind} asteroids={kind === 'moon-mars' ? NEOWS.asteroids : []} flareWeight={0} />,
    );
    let flew = false;
    let closest = Infinity;
    let thrustSeen = 0;
    for (let second = 0; second < 240 && !arrived.mock.calls.length; second++) {
      for (let f = 0; f < 6; f++) {
        pilot();
        await ReactThreeTestRenderer.act(async () => renderer.advanceFrames(10, 1 / 60));
      }
      const hud = useFlightHud.getState();
      if (hud.speedMs > 0) flew = true;
      thrustSeen = Math.max(thrustSeen, hud.thrust);
      closest = Math.min(closest, hud.targetKm);
      // Skip the touchdown animation once it starts, as a player can.
      if (hud.status === 'landing') useFlightHud.setState({ skipLanding: true });
    }
    Object.assign(touchAxes, { thrust: 0, turn: 0, pitch: 0, lift: 0 });
    const hud = useFlightHud.getState();
    console.info(`${kind}: ${hud.status}, closest ${closest.toFixed(0)} km, safety ${hud.safety}, hits ${hud.hits}, restarts ${hud.crashes}, fuel ${hud.fuel.toFixed(0)}%`);
    expect(flew).toBe(true);
    expect(thrustSeen).toBeGreaterThan(0);
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(arrived.mock.calls[0][0].autopilot).toBe(false);
    await renderer.unmount();
  }, 180_000);
});
