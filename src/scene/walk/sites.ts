// Built with help from Claude (Anthropic).
// Outposts: the places the hopper flies between (Boss: "flying from mission to mission").
// The base is in the middle; field sites stand hundreds of metres away across the land. A mission
// happens at the outpost its problem is about (a lost signal at the relay mast, the water search
// at the ice crater); everything else happens at the base. Pure data, no imports, so the terrain
// can flatten a pad at each site. Positions are game positions, not real places.
import type { WorldId } from '../../engine/campaign';

export type OutpostId = 'base' | 'ridge' | 'ice' | 'rover' | 'relay' | 'olympus';

export interface Outpost {
  id: OutpostId;
  world: WorldId;
  name: string;
  /** Centre of the flat ground at the site. */
  center: readonly [number, number];
  /** Where the hopper lands. */
  pad: readonly [number, number];
  /** Where the astronaut works on the problem (the objective). */
  work: readonly [number, number];
  /** Radius of the flattened ground. */
  flat: number;
}

export const OUTPOSTS: readonly Outpost[] = [
  { id: 'base', world: 'moon', name: 'Moonbase Horizon', center: [0, 0], pad: [-38, 26], work: [0, 9.5], flat: 0 },
  { id: 'ridge', world: 'moon', name: 'Rim solar array', center: [430, -250], pad: [412, -236], work: [438, -258], flat: 30 },
  { id: 'ice', world: 'moon', name: 'Ice crater drill site', center: [-470, -310], pad: [-452, -292], work: [-478, -318], flat: 30 },
  { id: 'rover', world: 'moon', name: 'Rover breakdown site', center: [-400, 380], pad: [-382, 364], work: [-408, 388], flat: 28 },
  { id: 'relay', world: 'moon', name: 'Relay mast', center: [470, 330], pad: [452, 316], work: [476, 338], flat: 28 },
  { id: 'base', world: 'mars', name: 'ASTER-9 base', center: [0, 0], pad: [-38, 26], work: [0, 9.5], flat: 0 },
  { id: 'olympus', world: 'mars', name: 'Foot of Olympus Mons', center: [-34, -84], pad: [-34, -84], work: [-14, -118], flat: 14 },
];

export const outpostOn = (world: WorldId, id: OutpostId): Outpost =>
  OUTPOSTS.find((o) => o.world === world && o.id === id) ?? OUTPOSTS.find((o) => o.world === world && o.id === 'base')!;

/** The field sites (not the base) on a world, for flattening the ground and drawing their buildings. */
export const fieldSites = (world: WorldId): Outpost[] => OUTPOSTS.filter((o) => o.world === world && o.id !== 'base');
