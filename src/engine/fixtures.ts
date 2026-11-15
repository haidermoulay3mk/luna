// Built with help from Claude (Anthropic).
// TEST FIXTURE: a made-up event with a shown risk, used only by engine.test.ts.
// missions arrive. Text and numbers follow the worked example in SPEC Part 5
// (Mission 5). Anything marked PLACEHOLDER was filled in by us and must be replaced
// by Member 3's real content in Phase 3.
import type { GameEvent, Mission } from './types';
import { TODO_VERIFY } from './validate';

export const FIXTURE_EVENTS: GameEvent[] = [
  {
    id: 'fake-m5e1',
    missionId: 5,
    title: 'Dust on the Panels',
    speaker: 'rex',
    line: 'Uh… Commander? The rover came back VERY dusty. So are the solar panels.',
    context: 'Moon dust is sharp and sticky. The panels are making less power.',
    urgent: true,
    defaultChoiceId: 'fake-m5e1b',
    focus: 'solar', // SPEC Part 5: "camera → solar array"
    choices: [
      {
        id: 'fake-m5e1a',
        label: 'Send BOLT to wipe them',
        cost: 'Battery −10 now',
        benefit: 'Power +20 next sol',
        risk: 'BOLT might scratch a wheel (30%)',
        effects: [
          { target: 'battery', delta: -10 },
          { target: 'power', delta: 20, delaySols: 1 },
        ],
        riskChance: 0.3,
        riskEffects: [{ target: 'bolt', delta: -15 }], // PLACEHOLDER size
        result: "BOLT rolls out, wipes the panels and they glow brighter, but he's wobbling on one wheel.",
        sceneCue: { module: 'solar', anim: 'boltWipe' },
      },
      {
        id: 'fake-m5e1b',
        label: 'Turn off greenhouse lights',
        cost: 'Crops grow slower',
        benefit: 'Saves 10 power',
        effects: [
          { target: 'power', delta: 10 },
          { target: 'food', delta: -10 }, // PLACEHOLDER size
        ],
        result: 'The greenhouse goes dark and the little plants droop.', // PLACEHOLDER
        sceneCue: { module: 'greenhouse', anim: 'lightsOff' },
      },
      {
        id: 'fake-m5e1c',
        label: 'Wait for the next sol',
        cost: 'Power −15 next sol',
        benefit: 'Nothing changes now',
        effects: [{ target: 'power', delta: -15, delaySols: 1 }],
        result: 'The panels stay grey with dust and glow dimmer.', // PLACEHOLDER
        sceneCue: { module: 'solar', anim: 'dustSettle' },
      },
    ],
    why: {
      text: 'Solar panels turn sunlight into electricity. Moon dust has sharp, jagged edges and clings to things, so even a thin layer blocks light. Astronauts on the Apollo missions said dust got on everything.',
      sourceId: TODO_VERIFY, // SPEC: "to be checked by Member 4"
    },
  },
];

export const FIXTURE_MISSION: Mission = {
  day: 12,
  subtitle: 'Test fixture',
  challenge: 'Keep the power on.',
  id: 5,
  chapter: 2,
  tier: 1,
  title: 'Dust on the Panels',
  objective: 'Keep Power above 40',
  bonusObjective: 'Keep BOLT in top shape', // PLACEHOLDER
  briefing: [{ speaker: 'rex', line: 'PLACEHOLDER briefing. Member 3 writes the real one.' }],
  eventIds: ['fake-m5e1'],
  sols: 1,
  successIf: [{ gauge: 'power', min: 40 }],
  bonusIf: [{ target: 'bolt', min: 80 }], // PLACEHOLDER
  teaches: 'Dust, maintenance and power are connected',
  scienceCardId: 'fake-card-dust',
};
