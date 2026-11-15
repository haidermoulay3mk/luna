// Built with help from Claude (Anthropic).
// Where each mission happens in the walkable world: at the module its first card is about
// (the greenhouse for a food problem, the antenna for a lost signal...), or at a camp on
// Olympus Mons for the climb. Pure TypeScript, tested in walk.test.ts.
import { ORDERS, campOf, firstEvent, missionById, worldOf } from '../../data/content';
import { eventFocus } from '../../engine/reducer';
import type { Mission } from '../../engine/types';
import { CAMP_SPOTS, MODULE_NAME, ROCKET_PAD, SUMMIT_FLAG, moduleSpot } from './layout';
import { outpostOn, type Outpost, type OutpostId } from './sites';

export interface Site {
  x: number;
  z: number;
  /** Short name for the marker: "Greenhouse dome". */
  name: string;
  /** The objective line: "Go to the greenhouse dome". */
  line: string;
  /** How close the astronaut must be to start (metres). */
  radius: number;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const strip = (s: string) => s.replace(/^the /, '');

/**
 * The outpost a mission happens at. The climb is at Olympus Mons; on the Moon the solar, antenna,
 * rover and water problems are out at the field sites (sites.ts); the rest happen at the base.
 */
export function outpostOfMission(mission: Mission): Outpost {
  const world = worldOf(mission);
  if (campOf(mission.id)) return outpostOn(world, 'olympus');
  if (world === 'moon') {
    const event = firstEvent(mission);
    const focus = event ? eventFocus(event) : 'habitat';
    const field: Partial<Record<string, OutpostId>> = { solar: 'ridge', antenna: 'relay', rover: 'rover', recycler: 'ice' };
    const id = field[focus];
    if (id) return outpostOn(world, id);
  }
  return outpostOn(world, 'base');
}

/** Where the crew is just before a story mission: at the previous mission's outpost (the base before the first). */
export function outpostBefore(missionId: number): Outpost {
  const mission = missionById(missionId);
  const world = mission ? worldOf(mission) : 'moon';
  const order = ORDERS[world];
  const i = order.indexOf(missionId);
  const prev = i > 0 ? missionById(order[i - 1]) : undefined;
  return prev ? outpostOfMission(prev) : outpostOn(world, 'base');
}

/** The hopper flies only when the next mission is at another outpost. */
export function needsHop(missionId: number): boolean {
  const mission = missionById(missionId);
  return Boolean(mission) && outpostBefore(missionId).id !== outpostOfMission(mission!).id;
}

export function missionSite(mission: Mission): Site {
  const outpost = outpostOfMission(mission);
  if (outpost.id !== 'base' && outpost.id !== 'olympus') {
    return { x: outpost.work[0], z: outpost.work[1], name: outpost.name, line: `Go to the ${outpost.name.toLowerCase()}`, radius: 6 };
  }
  const camp = campOf(mission.id);
  const spot = camp ? CAMP_SPOTS[camp.place.id] : undefined;
  if (camp && spot) {
    return { x: spot[0], z: spot[1], name: camp.place.name, line: `Climb to ${camp.place.name}`, radius: 7 };
  }
  const event = firstEvent(mission);
  const module = event ? eventFocus(event) : 'habitat';
  const [x, z] = moduleSpot(module);
  return { x, z, name: capital(strip(MODULE_NAME[module])), line: `Go to ${MODULE_NAME[module]}`, radius: 5 };
}

/** The rocket on its pad: walk up to it to board. */
export const ROCKET_SITE: Site = { x: ROCKET_PAD[0] - 4.5, z: ROCKET_PAD[1] - 2, name: 'Rocket', line: 'Walk to the rocket on the launch pad', radius: 6 };

/** The top of the climb: the caldera rim of Olympus Mons. */
export const SUMMIT_SITE: Site = { x: SUMMIT_FLAG[0], z: SUMMIT_FLAG[1] + 2.5, name: 'Summit', line: 'Climb to the summit of Olympus Mons', radius: 6 };
