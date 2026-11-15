// Built with help from Claude (Anthropic).
// Loads the team's missions and events (Phase 3). engine.test.ts validates every entry,
// so a broken mission makes `npm test` fail instead of breaking the game.
import type { WorldId } from '../engine/campaign';
import type { Chapter } from '../engine/chapters';
import type { GameEvent, Mission } from '../engine/types';
import chaptersJson from './chapters.json';
import eventsJson from './events.json';
import missionsJson from './missions.json';
import placesJson from './places.json';
import neowsJson from './neows.snapshot.json';
import type { NeoWsSnapshot } from '../engine/flight';

export const MISSIONS = missionsJson as unknown as Mission[];
export const EVENTS = eventsJson as unknown as GameEvent[];
export const EVENTS_BY_ID: ReadonlyMap<string, GameEvent> = new Map(EVENTS.map((event) => [event.id, event]));

export const worldOf = (mission: Pick<Mission, 'world'>): WorldId => mission.world ?? 'moon';

/** LUNA_BUILD B1: six chapters of three missions (Moon 1–4, Mars 5–6). */
export const CHAPTERS = chaptersJson as Chapter[];
export const chapterById = (id: number): Chapter | undefined => CHAPTERS.find((c) => c.id === id);
export const chapterForMission = (missionId: number): Chapter | undefined => CHAPTERS.find((c) => c.missions.includes(missionId));

/** Each world's story path: its chapters' missions in order. Missions switched off (M10, M11, M13, M16) are not in it. */
export const ORDERS: Record<WorldId, readonly number[]> = {
  moon: CHAPTERS.filter((c) => c.world === 'moon').flatMap((c) => c.missions),
  mars: CHAPTERS.filter((c) => c.world === 'mars').flatMap((c) => c.missions),
};
/** The Moon story, the first one every commander plays. */
export const STORY_ORDER = ORDERS.moon;

export const WORLD_NAME: Record<WorldId, string> = { moon: 'the Moon', mars: 'Mars' };

/**
 * Radius in km, for the altitude shown while flying. Moon: NASA CGI Moon Kit ("nasa-cgi-moon-kit").
 * Mars: TODO_VERIFY (team to send the NASA Mars fact sheet link).
 */
export const WORLD_RADIUS_KM: Record<WorldId, number> = { moon: 1737.4, mars: 3389.5 };

export const missionById = (id: number): Mission | undefined => MISSIONS.find((m) => m.id === id);

/** The first event of a mission: its Science Card shows that event's Why? text. */
export const firstEvent = (mission: Mission): GameEvent | undefined => EVENTS_BY_ID.get(mission.eventIds[0]);

// ---- Places on the Moon map (real locations; outposts are game-only) ----

/** 'camp': a stop on the climb up Olympus Mons (reached by rover, not by rocket). */
export type PlaceKind = 'base' | 'outpost' | 'landmark' | 'station' | 'orbit' | 'camp';
export interface Place {
  id: string;
  /** Missing means the Moon. */
  world?: WorldId;
  name: string;
  kind: PlaceKind;
  where: string;
  lat: number;
  lon: number;
  missions: number[];
  about: string;
  sourceId: string;
  /** Camps only: height in km from NASA Mars Trek, sent by the team (null until then: TODO_VERIFY). */
  heightKm?: number | null;
}

export const PLACES = placesJson as Place[];
/** Where the rocket starts a story: the Moon's Gateway station, or high orbit above Mars. */
export const START_PLACES: Record<WorldId, string> = { moon: 'gateway', mars: 'mars-orbit' };
export const START_PLACE = START_PLACES.moon;
export const placesOn = (world: WorldId): Place[] => PLACES.filter((p) => (p.world ?? 'moon') === world);
/** Height of the station above the surface, in scene units (the Moon's radius is 100). */
export const STATION_HEIGHT = 42;

export const placeById = (id: string): Place | undefined => PLACES.find((p) => p.id === id);
/** The place a mission happens at (the home base if none is listed). */
export const placeForMission = (missionId: number): Place => {
  const world = worldOf(missionById(missionId) ?? {});
  return PLACES.find((p) => p.missions.includes(missionId)) ?? placesOn(world).find((p) => p.kind === 'base')!;
};

/** The rocket flies only when it starts in space (a station or orbit). On the ground the rover drives. */
export const needsFlight = (from: Place | undefined, to: Place): boolean =>
  from !== undefined && from.id !== to.id && (from.kind === 'station' || from.kind === 'orbit');

/** A camp's rank on the climb (0 foot, 1 halfway, 2 rim) from its order in its chapter. */
export function campOf(missionId: number): { place: Place; rank: number } | null {
  const place = placeForMission(missionId);
  if (place.kind !== 'camp') return null;
  const chapter = chapterForMission(missionId);
  return { place, rank: Math.max(0, chapter?.missions.indexOf(missionId) ?? 0) };
}

/** LUNA_BUILD B8: real near-Earth asteroids NASA tracked, saved by `npm run snapshot` (the rocks in Flight 2). */
export const NEOWS = neowsJson as NeoWsSnapshot;
