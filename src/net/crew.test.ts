// Built with help from Claude (Anthropic).
// Crew Mode (LUNA_BUILD B6): three crew members vote on one card; majority wins; a split goes to
// the officer of the card's main gauge; nobody voting means the standard plan.
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../data/content';
import { ROLES, allVoted, cleanName, mainGauge, partyCode, tallyVotes, type Voter } from './crew';

const crew: Voter[] = [
  { id: 'p1', role: 0 }, // Power Engineer
  { id: 'p2', role: 1 }, // Life Support Officer
  { id: 'p3', role: 2 }, // Flight Doctor
];
const choices = ['a', 'b', 'c'];

describe('crew voting', () => {
  it('three players vote on one card and the majority choice is applied', () => {
    expect(tallyVotes({ p1: 'b', p2: 'b', p3: 'a' }, crew, choices, 'power')).toBe('b');
    expect(allVoted({ p1: 'b', p2: 'b', p3: 'a' }, crew)).toBe(true);
  });

  it('a three-way split is decided by the officer whose gauge the card mainly affects', () => {
    const split = { p1: 'a', p2: 'b', p3: 'c' };
    expect(tallyVotes(split, crew, choices, 'power')).toBe('a');
    expect(tallyVotes(split, crew, choices, 'life')).toBe('b');
    expect(tallyVotes(split, crew, choices, 'crew')).toBe('c');
  });

  it('nobody voted: no crew choice (the card falls back to its standard plan)', () => {
    expect(tallyVotes({}, crew, choices, 'power')).toBeNull();
    expect(allVoted({ p1: 'a' }, crew)).toBe(false);
  });

  it('votes for choices that are not on the card are ignored', () => {
    expect(tallyVotes({ p1: 'z', p2: 'c' }, crew, choices, 'power')).toBe('c');
  });

  it('every card has a main gauge, so every split can be decided', () => {
    for (const event of EVENTS) expect(['power', 'life', 'crew']).toContain(mainGauge(event));
  });

  it('roles have their own stripe colours', () => {
    expect(new Set(ROLES.map((r) => r.band)).size).toBe(ROLES.length);
  });
});

describe('party codes and names', () => {
  it('codes are 5 characters with no look-alike letters', () => {
    for (let i = 0; i < 50; i++) expect(partyCode()).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  });

  it('names are trimmed, short and safe to show', () => {
    expect(cleanName('  Sam  ')).toBe('Sam');
    expect(cleanName('<b>Sam</b>')).toBe('bSam/b');
    expect(cleanName('A very long astronaut name')).toHaveLength(16);
  });
});
