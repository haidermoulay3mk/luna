// Built with help from Claude (Anthropic).
// Who speaks on the cards. Moon crew from SPEC Part 3; Mars crew from the team's Mars sheet.
import type { Speaker } from '../engine/types';

export const SPEAKERS: Record<Speaker, { name: string; role?: string; text: string }> = {
  nova: { name: 'Dr. Nova', role: 'Life-support scientist', text: 'text-nova' },
  rex: { name: 'Rex', role: 'Engineer', text: 'text-rex' },
  luna: { name: 'Luna', role: 'Botanist', text: 'text-luna' },
  bolt: { name: 'BOLT', text: 'text-bolt' },
  earth: { name: 'Earth', text: 'text-sun' },
  aster: { name: 'NOVA', role: 'Base computer', text: 'text-sun' },
  zara: { name: 'Dr. Zara', role: 'Mission biologist', text: 'text-luna' },
  alex: { name: 'Engineer Alex', text: 'text-rex' },
};

export const speakerFor = (id: string) => (id in SPEAKERS ? SPEAKERS[id as Speaker] : undefined);
