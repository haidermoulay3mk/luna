// Built with help from Claude (Anthropic).
// Every tunable number. These are game-balance values from SPEC Part 4.3–4.4
// (or picked by us where the README gives none). They are not NASA facts.
import type { Difficulty, Effect, EffectTarget, GaugeId, Gauges, SubId } from './types';

export const GAUGE_IDS: readonly GaugeId[] = ['power', 'life', 'crew'];

export const GAUGE_PARTS: Record<GaugeId, readonly SubId[]> = {
  power: ['solar', 'battery'],
  life: ['oxygen', 'water', 'food'],
  crew: ['health', 'morale', 'radiation'],
};

export const SUB_IDS: readonly SubId[] = GAUGE_IDS.flatMap((id) => GAUGE_PARTS[id]);

/** Radiation is a dose: a higher number is worse. Every other part is "higher is better". */
export const INVERTED_PARTS: ReadonlySet<SubId> = new Set<SubId>(['radiation']);

export const GAUGE_LABEL: Record<GaugeId, string> = {
  power: 'Power',
  life: 'Life Support',
  crew: 'Crew',
};

export const TARGET_LABEL: Record<EffectTarget, string> = {
  ...GAUGE_LABEL,
  solar: 'Solar input',
  battery: 'Battery reserve',
  oxygen: 'Oxygen',
  water: 'Water',
  food: 'Food',
  health: 'Health',
  morale: 'Morale',
  radiation: 'Radiation dose',
  // The team's sheet calls these "Supplies" (the README's spare parts).
  spareParts: 'Supplies',
  bolt: 'BOLT',
  progress: 'Mission progress',
  time: 'Time',
};

/** A "Time" cost: 1 to this many extra sols on one choice. */
export const TIME_MAX = 3;

/** Each part starts with a score in this range, so every gauge starts at 70–85, never 100. */
export const START_RANGE = { min: 70, max: 85 } as const;
export const SPARE_PARTS = { start: 3, max: 5 } as const;
export const BOLT_START = 80;

/** Passive drain per sol at Mission difficulty (scaled by drainMultiplier). */
export const DRAIN_PER_SOL: Gauges = { power: 6, life: 4, crew: 2 };

/** 60–100 good, 30–59 caution, 0–29 critical. */
export const THRESHOLDS = { good: 60, caution: 30 } as const;

/** Effects on gauges, parts and BOLT stay this size so bars move visibly but nothing is instant. */
export const EFFECT_SIZE = { min: 5, max: 25 } as const;

export const TEXT_LIMITS = {
  titleWords: [2, 4],
  labelWords: 5,
  contextWords: 25,
  choices: [2, 4],
} as const;

export interface DifficultyConfig {
  label: string;
  /** Seconds on urgent events; null means no timer. */
  timerSeconds: number | null;
  drainMultiplier: number;
  hints: 'always' | 'onRequest' | 'none';
  /** Rescue events allowed per mission. */
  rescues: number;
  cascades: 'off' | 'some' | 'more';
}

/**
 * After a paused story mission the supply lander comes (DRAFT rule, so no story can get stuck):
 * every part back to at least `minScore`, and at least `spareParts` spare parts and `bolt` BOLT.
 */
export const RESUPPLY = { minScore: 45, spareParts: 1, bolt: 50 } as const;

/** LUNA_BUILD B4: every card has the difficulty's timer; storm cards (linked to space weather) get this many seconds. */
export const STORM_SECONDS = 10;

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  explorer: { label: 'Explorer', timerSeconds: null, drainMultiplier: 0.6, hints: 'always', rescues: 2, cascades: 'off' },
  mission: { label: 'Mission', timerSeconds: 20, drainMultiplier: 1, hints: 'onRequest', rescues: 1, cascades: 'some' },
  commander: { label: 'Commander', timerSeconds: 15, drainMultiplier: 1.3, hints: 'none', rescues: 0, cascades: 'more' },
};

// ---- LUNA_BUILD B2: chapters, stars, Mars Cargo, the Olympus ending (all DRAFT, team to check) ----

/** Five stars per chapter, six chapters. */
export const STARS_PER_CHAPTER = 5;
/** Star 4: at least this many bonus objectives met in the chapter. */
export const BONUS_FOR_STAR = 2;
/** A flight landed with Safety at or above this is a "Clean flight" (star 5 in chapters 1 and 5). */
export const CLEAN_FLIGHT_SAFETY = 80;

/** After each Moon mission: +1 crate for each gauge at or above `perGaugeAt`. 3 gauges × 12 missions = 36 at most. */
export const CARGO = { perGaugeAt: 60, max: 36 } as const;
/** Cargo sets every starting gauge on Mars: 28+ crates → 85, 20–27 → 75, under 20 → 65. */
export const CARGO_START: readonly { minCrates: number; gauge: number }[] = [
  { minCrates: 28, gauge: 85 },
  { minCrates: 20, gauge: 75 },
  { minCrates: 0, gauge: 65 },
];

/** "First Light on Olympus": total stars (of 30) → which station switches on. */
export const OLYMPUS_TIERS: readonly { id: 'station' | 'outpost' | 'beacon'; minStars: number }[] = [
  { id: 'station', minStars: 24 },
  { id: 'outpost', minStars: 15 },
  { id: 'beacon', minStars: 0 },
];

/**
 * LUNA_BUILD B8 (DRAFT game rule, not a NASA fact): the higher the camp on Olympus Mons, the less
 * air overhead, so the more radiation dose each sol. Dose per sol = base + perKm × height in km.
 * Until the team sends the Mars Trek heights, camps use `byRank` (foot, halfway, rim).
 */
export const CAMP_RADIATION = { base: 2, perKm: 0.2, byRank: [2, 4, 6] } as const;

/** A gauge reaching 0 triggers a rescue: it is raised back to `restoreTo`, at a cost. */
export const RESCUE: { restoreTo: number; cost: readonly Effect[]; message: Record<GaugeId, string> } = {
  restoreTo: 30,
  cost: [
    { target: 'spareParts', delta: -1 },
    { target: 'bolt', delta: -10 },
  ],
  message: {
    power: 'BOLT reroutes emergency power from the backup cells.',
    life: 'BOLT reroutes emergency power to life support.',
    crew: 'BOLT reroutes emergency power to the crew quarters.',
  },
};

export const TIMEOUT_MESSAGE = 'Time ran out, so the crew followed the standard plan.';

/** Ending score = gaugeWeight × average final gauge + starWeight × share of stars earned (0–100). */
export const ENDING = { gaugeWeight: 0.6, starWeight: 0.4, complete: 70, bumpy: 50 } as const;

export const RANKS = [
  { id: 'cadet', label: 'Cadet', minShare: 0 },
  { id: 'specialist', label: 'Specialist', minShare: 1 / 3 },
  { id: 'flightLead', label: 'Flight Lead', minShare: 2 / 3 },
  { id: 'commander', label: 'Commander', minShare: 0.9 },
] as const;
