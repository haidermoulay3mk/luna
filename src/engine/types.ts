// Built with help from Claude (Anthropic).
// Every type in the game. Content types match SPEC Part 11; the runtime types
// below them are what the engine passes around while a mission is played.

export type GaugeId = 'power' | 'life' | 'crew';
export type SubId = 'solar' | 'battery' | 'oxygen' | 'water' | 'food' | 'health' | 'morale' | 'radiation';
export type ModuleId =
  | 'habitat'
  | 'solar'
  | 'battery'
  | 'greenhouse'
  | 'recycler'
  | 'oxygen'
  | 'shelter'
  | 'antenna'
  | 'rover'
  | 'bolt';
/** 'time' is the team's "Time" cost: each 1 means one more sol passes before the mission moves on. */
export type EffectTarget = GaugeId | SubId | 'spareParts' | 'bolt' | 'progress' | 'time';
/**
 * Moon crew (SPEC Part 3): Dr. Nova (life support), Rex (engineer), Luna (botanist), BOLT (robot).
 * Mars crew (the team's Mars sheet): NOVA the base computer ('aster'), Dr. Zara (biologist), Engineer Alex.
 */
export type Speaker = 'nova' | 'rex' | 'luna' | 'bolt' | 'earth' | 'aster' | 'zara' | 'alex';
export type Difficulty = 'explorer' | 'mission' | 'commander';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type GaugeState = 'good' | 'caution' | 'critical';

/** A change to one number. A gauge target moves every part of that gauge by `delta`. */
export interface Effect {
  target: EffectTarget;
  delta: number;
  /** Apply this many sols later instead of now. */
  delaySols?: number;
}

export interface Choice {
  id: string; // "m5e1a"
  label: string; // ≤ 5 words
  cost: string;
  benefit: string;
  risk?: string;
  effects: Effect[]; // must include at least one cost (tested)
  riskChance?: number; // 0–1, only for the risk that is shown
  riskEffects?: Effect[];
  result: string; // 1 sentence, describes what you SEE
  sceneCue: { module: ModuleId; anim: string };
  followUpEventId?: string;
}

export interface GameEvent {
  id: string;
  missionId: number;
  title: string;
  speaker: Speaker;
  line: string;
  context: string; // ≤ 25 words
  urgent: boolean;
  defaultChoiceId?: string; // required if urgent
  spaceWeatherLinked?: boolean;
  /** Not in SPEC Part 11: the module the camera flies to (Part 5 "SCENE CUE"). Defaults to the first choice's module. */
  focus?: ModuleId;
  choices: Choice[]; // 2–4
  why: { text: string; sourceId: string }; // sourceId → sources.json
  variants?: Partial<GameEvent>[];
  /** Written by Claude when Boss asked for more problems per mission; the team still has to check it. */
  draft?: boolean;
}

/** A checkable objective. Values read "higher is better" (radiation is read as 100 − dose). */
export interface Condition {
  target: EffectTarget;
  min: number;
}

export interface Mission {
  id: number;
  /** LUNA_BUILD B1 chapter (1–6); 0 for missions switched off this weekend. */
  chapter: number;
  tier: 1 | 2 | 3;
  /** Kept in the data but not played (LUNA_BUILD B1: M10, M11, M13, M16). */
  off?: boolean;
  /** Which world the mission is on. Missing means the Moon. */
  world?: 'moon' | 'mars';
  title: string;
  /** Not in SPEC Part 11: the team's "DAY n · SUBTITLE" line. The mission starts on this sol. */
  day: number;
  subtitle: string;
  /** Not in SPEC Part 11: the team's "Your challenge" sentence. */
  challenge: string;
  objective: string;
  bonusObjective: string;
  /** Story pages. speaker "" = narration, "alert" = a warning on the base display, otherwise a Speaker id. */
  briefing: { speaker: string; line: string }[];
  eventIds: string[];
  /** Sols that pass during the mission (0 if the next mission is the same day). */
  sols: number;
  successIf: { gauge: GaugeId; min: number }[];
  /** Not in SPEC Part 11: the checkable form of bonusObjective, needed to award star 3. */
  bonusIf?: Condition[];
  teaches: string;
  scienceCardId: string;
}

export interface Source {
  id: string;
  title: string;
  org: 'NASA' | 'CSA';
  url: string;
  usedFor: string;
  checkedBy?: string;
}

export interface SpaceWeatherSnapshot {
  fetchedAt: string;
  source: string;
  flares: { time: string; classType: string }[];
  sep: { time: string }[];
  cme: { time: string }[];
  /** Lists NASA did not return (for example 'flares' when the FLR endpoint fails). */
  missing?: ('flares' | 'sep' | 'cme')[];
}

// ---- Runtime state ----

/** Raw part values, 0–100. Radiation is a dose, so for it a higher number is worse. */
export type Parts = Record<SubId, number>;
export type Gauges = Record<GaugeId, number>;
export type Phase = 'choosing' | 'outcome' | 'complete' | 'paused';

export interface PendingEffect {
  effect: Effect;
  dueSol: number;
  fromChoiceId: string;
}

export interface LogEntry {
  sol: number;
  text: string;
}

export interface MissionState {
  missionId: number;
  difficulty: Difficulty;
  sol: number;
  parts: Parts;
  spareParts: number;
  bolt: number;
  progress: number;
  /** Extra sols that choices with a "Time" cost add to the next "End sol". */
  extraSols: number;
  eventIndex: number;
  phase: Phase;
  pending: PendingEffect[];
  rescuesLeft: number;
  /** Lowest value each gauge reached this mission, before any rescue. */
  lowest: Gauges;
  log: LogEntry[];
  /**
   * Extra radiation dose each sol (LUNA_BUILD B8: camps on Olympus Mons; higher camp = less air
   * overhead). Missing means 0.
   */
  radiationPerSol?: number;
}

export interface RescueReport {
  gauge: GaugeId;
  message: string;
}

export interface ChoiceOutcome {
  eventId: string;
  choiceId: string;
  timedOut: boolean;
  riskTriggered: boolean;
  before: Gauges;
  after: Gauges;
  /** Effects queued for a later sol. */
  scheduled: PendingEffect[];
  rescues: RescueReport[];
  message?: string;
}

export interface SolReport {
  /** The sol that just started. */
  sol: number;
  drain: Gauges;
  /** Extra radiation dose this sol from the camp's height (0 when none). */
  radiation?: number;
  /** LUNA_BUILD B3 knock-on rules that fired this sol. */
  knockOns?: { id: string; reason: string; effects: Effect[] }[];
  arrived: PendingEffect[];
  rescues: RescueReport[];
  before: Gauges;
  after: Gauges;
}
