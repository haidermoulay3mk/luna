// @vitest-environment jsdom
// Built with help from Claude (Anthropic).
// The Solar System effects build and run for a few seconds without errors (no screen needed):
// corona, atmospheres, asteroid belt, orbit trails, comet and the selection ring.
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { AsteroidBelt, Atmosphere, OrbitTrails, SelectionRing, SunCorona, SystemComet } from './SystemFx';

describe('Solar System VFX', () => {
  it('every effect builds and animates', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <>
        <SunCorona size={7} reduced={false} />
        <Atmosphere size={1.6} color="#6fb3ff" />
        <AsteroidBelt inner={43} outer={49} count={50} reduced={false} />
        <OrbitTrails radii={[15, 21, 29]} angles={() => [0.5, 1, 2]} />
        <SystemComet reduced={false} />
        <SelectionRing target={() => new Vector3(29, 0, 0)} size={() => 1.6} reduced={false} />
      </>,
    );
    await ReactThreeTestRenderer.act(async () => renderer.advanceFrames(120, 1 / 60));
    expect(renderer.scene.children.length).toBeGreaterThanOrEqual(6);
    await renderer.unmount();
  });
});
