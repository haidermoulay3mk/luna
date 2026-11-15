// @vitest-environment jsdom
// Built with help from Claude (Anthropic).
// LUNA_BUILD Phase 0, the safety net: no screen can be blank, a 3D failure switches to Lite
// mode, and Shift + D opens the demo jump with every mission unlocked.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(cleanup);

async function openGame() {
  vi.resetModules();
  const { App } = await import('../App');
  const { useGameStore } = await import('../store/gameStore');
  const { useSettings } = await import('../store/settings');
  return { ...render(<App />), useGameStore, useSettings };
}

describe('Phase 0 safety net', () => {
  it('a screen that needs a commander shows the name screen instead of a blank page', async () => {
    window.localStorage.clear();
    const { useGameStore } = await openGame();
    useGameStore.setState({ screen: 'home' });
    expect(await screen.findByLabelText("What's your name, Commander?")).toBeTruthy();
  });

  it('a crash in the 3D rebuilds the 3D view: no 2D switch, no restart button, nothing skipped', async () => {
    window.localStorage.clear();
    const { useSettings } = await openGame();
    const { restart3D, useGfx } = await import('../scene/space/webgl');
    const before = useGfx.getState().epoch;
    vi.useFakeTimers();
    restart3D('test');
    vi.advanceTimersByTime(7000);
    vi.useRealTimers();
    expect(useGfx.getState().epoch).toBe(before + 1);
    expect(useSettings.getState().lite).toBe(false);
    expect(screen.queryByText(/3D view could not start/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Restart 3D/ })).toBeNull();
  });

  it('Shift + D is the demo key, but not while typing a name', async () => {
    const { isDemoKey } = await import('./components/DemoJump');
    const base = { key: 'F2', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, repeat: false, target: document.body };
    expect(isDemoKey(base)).toBe(true);
    expect(isDemoKey({ ...base, shiftKey: true, key: 'D' })).toBe(false); // Shift + D is run right: never the demo
    expect(isDemoKey({ ...base, repeat: true })).toBe(false);
    expect(isDemoKey({ ...base, target: document.createElement('input') })).toBe(false);
  });

  it('the demo jump opens a locked Mars mission at once, as the Demo commander', async () => {
    window.localStorage.clear();
    const { useGameStore } = await openGame();
    expect(screen.queryAllByRole('button', { name: /^Play / })).toHaveLength(0);
    fireEvent.keyDown(window, { key: 'F2' });
    const plays = await screen.findAllByRole('button', { name: /^Play / });
    expect(plays).toHaveLength(18);
    const { ORDERS, missionById } = await import('../data/content');
    const marsFirst = ORDERS.mars[0];
    fireEvent.click(plays[ORDERS.moon.length]);
    const mission = missionById(marsFirst)!;
    expect(useGameStore.getState()).toMatchObject({ screen: 'play', world: 'mars' });
    expect(useGameStore.getState().mission.id).toBe(marsFirst);
    expect(screen.getByText(new RegExp(mission.subtitle))).toBeTruthy();
    expect(useGameStore.getState().progress?.name).toBe('Demo');
  });
});
