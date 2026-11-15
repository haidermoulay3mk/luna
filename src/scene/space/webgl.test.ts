// @vitest-environment jsdom
// Built with help from Claude (Anthropic).
// Regression test for the black-screen glitch (Boss, 15 Nov): checking for WebGL used to open a new
// WebGL context on every screen and never close it. Browsers allow about 16, then kill the oldest,
// which was often the game's own 3D view. Now the check runs once and releases its context.
import { describe, expect, it, vi } from 'vitest';

describe('WebGL check', () => {
  it('opens at most one test context, releases it, and caches the answer', async () => {
    vi.resetModules();
    const loseContext = vi.fn();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ({ getExtension: () => ({ loseContext }) }) as unknown as RenderingContext);
    const { hasWebGL, useCan3D } = await import('./webgl');
    for (let i = 0; i < 20; i++) {
      expect(hasWebGL()).toBe(true);
      expect(useCan3D()).toBe(true);
    }
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(loseContext).toHaveBeenCalledTimes(1);
    getContext.mockRestore();
  });

  it('a 3D crash rebuilds the view after a back-off, without ever switching to 2D', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const { restart3D, useGfx } = await import('./webgl');
    const { useSettings } = await import('../../store/settings');
    restart3D('test 1');
    restart3D('test 1 again'); // a second call while one is waiting does nothing
    vi.advanceTimersByTime(500);
    expect(useGfx.getState().epoch).toBe(1);
    restart3D('test 2');
    vi.advanceTimersByTime(500);
    expect(useGfx.getState().epoch).toBe(1); // backing off: the second rebuild waits longer
    vi.advanceTimersByTime(500);
    expect(useGfx.getState().epoch).toBe(2);
    expect(useSettings.getState().lite).toBe(false);
    vi.useRealTimers();
  });

  it('a closed view releasing its context does not rebuild the 3D (the reset bug)', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const { watchContextLoss, useGfx } = await import('./webgl');
    const canvas = document.createElement('canvas'); // not on the page: the view has closed
    watchContextLoss({ gl: { domElement: canvas } } as never);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    vi.advanceTimersByTime(10_000);
    expect(useGfx.getState().epoch).toBe(0);
    vi.useRealTimers();
  });
});
