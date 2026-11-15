// @vitest-environment jsdom
// Built with help from Claude (Anthropic).
// Plays the real screens like a first-time player: name → tutorial → all six chapters (12 Moon
// missions, launch, 6 Mars missions up Olympus Mons) → the Olympus ending, then "reloads" to
// check the save. jsdom has no WebGL, so 3D views show their fallback (flights land by
// autopilot); everything else is the real game UI.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ORDERS, chapterForMission, missionById } from '../data/content';

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

/** A fresh copy of the app, as if the page had just been opened. */
async function openGame() {
  vi.resetModules();
  const { App } = await import('../App');
  return render(<App />);
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });

/** jsdom has no WebGL, so a flight shows "Continue to the base" (the same button devices without 3D get). */
function landIfFlying(): boolean {
  const land = screen.queryByRole('button', { name: 'Continue to the base' });
  if (!land) return false;
  expect(screen.getByText(/Flight to/)).toBeTruthy();
  fireEvent.click(land);
  return true;
}

/** Plays one mission's briefing and card. Returns false if it was paused (a gauge hit 0 with no rescue left). */
function playMission(id: number, key: string): boolean {
  const mission = missionById(id)!;
  expect(screen.getByText(`Mission ${id} · Day ${mission.day} · ${mission.subtitle}`)).toBeTruthy();
  // The chapter line: "Chapter 01 · First Light · 1 of 3"
  const chapter = chapterForMission(id)!;
  expect(screen.getByText(new RegExp(`Chapter 0${chapter.id} · ${chapter.title}`))).toBeTruthy();
  for (let page = 0; page < mission.briefing.length; page++) fireEvent.click(button(/^Next/));
  expect(screen.getByText(mission.challenge)).toBeTruthy();
  fireEvent.click(button(/^Start mission/));

  // One team card per mission. SPEC Part 13: the objective is on screen at all times.
  expect(mission.eventIds).toHaveLength(1);
  expect(screen.getAllByText(mission.objective).length).toBeGreaterThan(0);
  fireEvent.keyDown(window, { key });
  expect(screen.getAllByText(/You chose/).length).toBeGreaterThan(0);
  // LUNA_BUILD B3: the Ripple view counts the systems the decision touched; Enter skips it.
  expect(screen.getByText(/That decision touched \d+ system/)).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Enter' });
  // The Why? science shows by itself inside the result card after the decision (no pop-up to close).
  expect(screen.getByRole('region', { name: 'Why?' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
  const next = screen.queryByRole('button', { name: /^(End sol|Finish mission|Next event)/ });
  if (next) fireEvent.click(next);
  return !screen.queryByText('Mission Paused');
}

describe('first-time player flow', () => {
  it('name → tutorial → six chapters → launch to Mars → the climb → an Olympus ending, and the progress is saved', async () => {
    window.localStorage.clear();
    await openGame();

    // Name entry
    fireEvent.change(screen.getByLabelText("What's your name, Commander?"), { target: { value: 'Sam' } });
    fireEvent.click(button('Begin mission'));

    // Tutorial: 4 steps, then straight into Mission 1
    const steps = ['Your base has 3 gauges', 'Every choice costs something', 'Every card has a timer', 'Your choices change the base'];
    for (const [i, title] of steps.entries()) {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
      fireEvent.click(button(i === steps.length - 1 ? 'Start Mission 1' : 'Next'));
    }

    let flights = 0;
    let chaptersDone = 0;
    const story = [...ORDERS.moon, ...ORDERS.mars];
    for (const [index, id] of story.entries()) {
      if (landIfFlying()) flights++;
      // If a mission pauses, try again with another choice (the story never moves on from a pause).
      let done = false;
      for (const key of ['1', '2', '3']) {
        done = playMission(id, key);
        if (done || id === story[story.length - 1]) break;
        fireEvent.click(button('Try again'));
      }
      expect(done || id === story[story.length - 1], `mission ${id}`).toBe(true);
      if (done) {
        expect(screen.getByText(/of 3 stars/)).toBeTruthy();
        expect(screen.getByText('Science card unlocked')).toBeTruthy();
      }
      const chapter = chapterForMission(id)!;
      if (chapter.missions[2] === id) {
        // LUNA_BUILD B7: the chapter-complete screen, then its one button.
        chaptersDone++;
        fireEvent.click(button('Chapter complete'));
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(chapter.title);
        expect(screen.getByLabelText(/of 5 stars$/)).toBeTruthy();
        fireEvent.click(button('Skip'));
        expect(screen.getByRole('img', { name: `Mission patch: Chapter ${chapter.id}, ${chapter.title}` })).toBeTruthy();
        expect(screen.getByText('Science card unlocked')).toBeTruthy();
        // Chapter 4 always ends with the launch to Mars; chapter 6 with the ending.
        const next = index === story.length - 1 ? 'Climb to the summit' : id === ORDERS.moon[ORDERS.moon.length - 1] ? 'Launch to Mars' : 'Next chapter';
        fireEvent.click(button(next));
        if (index === story.length - 1) break;
        continue;
      }
      fireEvent.click(button('Next mission'));
    }

    // Two flights: Gateway down to the Moon base, and Mars orbit down to the Mars base. The rover drives up the camps.
    expect(flights).toBe(2);
    expect(chaptersDone).toBe(6);
    const ending = screen.getByRole('heading', { level: 1 }).textContent;
    expect(['Olympus Station', 'Olympus Outpost', 'Olympus Beacon']).toContain(ending);
    expect(screen.getByText('Mission recap')).toBeTruthy();

    const saved = JSON.parse(window.localStorage.getItem('luna.save.v1') ?? '{}');
    expect(saved.commanders.sam).toMatchObject({ name: 'Sam', tutorialDone: true, storyIndex: ORDERS.moon.length, v: 2 });
    expect(saved.commanders.sam.cards).toHaveLength(story.length);
    expect(Object.keys(saved.commanders.sam.chapterStars)).toHaveLength(6);
    expect(saved.commanders.sam.cargo).toBeGreaterThanOrEqual(0);

    // Reopen the game: a returning player lands on the Solar System, not the name screen.
    cleanup();
    await openGame();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Commander Sam');
    fireEvent.click(button('Open Mars map'));
    expect(button('See your ending')).toBeTruthy();
  });

  it('a new player can skip the tutorial (still starts Mission 1) and go back to the map', async () => {
    window.localStorage.clear();
    await openGame();
    fireEvent.change(screen.getByLabelText("What's your name, Commander?"), { target: { value: 'Ana' } });
    fireEvent.click(button('Begin mission'));
    fireEvent.click(button('Skip tutorial'));
    // A brand-new commander who skips still goes straight into Mission 1: first the flight down from Gateway.
    landIfFlying();
    expect(screen.getByText('Mission 1 · Day 1 · Arrival at the Moon base')).toBeTruthy();
    expect(screen.getByText(/Autopilot landing/)).toBeTruthy();
    fireEvent.click(button('Back to the map'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Commander Ana');
  });
});
