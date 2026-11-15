// Built with help from Claude (Anthropic).
// The Flight Deck helpers that decide what the player reads: honest data tags (never "LIVE"
// for stored data), timeline states, and sparkline points.
import { describe, expect, it } from 'vitest';
import { dataTagText, shortDate } from './components/deck/DataTag';
import { sparkPoints } from './components/deck/GaugeTile';
import { stopsFrom } from './components/deck/Timeline';

describe('DataTag text', () => {
  it('says LIVE only for live data, and the saved date otherwise', () => {
    expect(dataTagText('NASA DONKI', 'live', '2026-11-14T18:00:00Z')).toBe('NASA DONKI · LIVE');
    expect(dataTagText('NASA DONKI', 'saved', '2026-11-14T18:00:00Z')).toBe('NASA DONKI · SAVED 14 NOV');
    expect(dataTagText('NASA DONKI', 'archived', '2026-11-03T01:00:00Z')).toBe('NASA DONKI · SAVED 3 NOV');
    expect(dataTagText('NASA DONKI', 'loading', '2026-11-03T01:00:00Z')).not.toContain('LIVE');
  });

  it('never crashes on a broken date', () => {
    expect(shortDate('not a date')).toBe('UNKNOWN DATE');
  });
});

describe('Timeline stops', () => {
  it('marks stops before the current one done, the current one current, the rest next', () => {
    expect(stopsFrom(['Earth', 'Moon', 'Mars'], 1).map((s) => s.state)).toEqual(['done', 'current', 'next']);
    expect(stopsFrom(['Earth', 'Moon'], 5).map((s) => s.state)).toEqual(['done', 'done']);
  });
});

describe('sparkline', () => {
  it('maps 0–100 from the bottom to the top of the box', () => {
    expect(sparkPoints([0, 100], 10, 10)).toBe('0.0,10.0 10.0,0.0');
    expect(sparkPoints([50], 10, 10)).toBe('0,5 10,5');
  });
});
