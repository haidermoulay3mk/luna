// Built with help from Claude (Anthropic).
// The walkable base (Moonbase Horizon on the Moon, ASTER-9 on Mars), modelled on Boss's reference
// photo: a central hub with a dark observation dome, six ribbed tunnels running out to the modules,
// a glass geodesic greenhouse, hexagonal modules with round roof hatches, a regolith-covered
// radiation shelter, a rover garage, a solar field, an antenna mast and two round landing pads.
// The game gauges still show in the 3D: hub windows follow Power, the battery lights follow the
// Battery, the plants grow with Food, the solar field brightens with Solar.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { DoubleSide, EdgesGeometry, SphereGeometry, type Group, type MeshStandardMaterial } from 'three';
import type { WorldId } from '../../engine/campaign';
import { gaugesOf } from '../../engine/reducer';
import type { Parts } from '../../engine/types';
import { Bolt } from '../characters/Bolt';
import { Instances, MODULE_POSITION, type Placement } from '../kit';
import { Rocket } from '../space/Craft';
import { EARTH_DIRECTION } from '../space/Sky';
import {
  ANTENNA,
  BOLT_SPOT,
  HUB_RADIUS,
  PADS,
  RING,
  RING_MODULES,
  ROCKET_PAD,
  SOLAR_FIELD,
  TUNNEL_RADIUS,
  ringPosition,
} from './layout';
import { getCellTexture, getPanelTexture } from './textures';

const ringOf = (id: string) => RING_MODULES.find((m) => m.id === id)!;
const HEX_IDS = ['oxygen', 'recycler', 'battery'] as const;
const HEX_HEIGHT = 3.8;
const REGOLITH: Record<WorldId, string> = { moon: '#8e8d8a', mars: '#9a5a3c' };
/** The rocket on its pad: scale and how high its base sits. */
export const ROCKET_SCALE = 3.2;
export const ROCKET_BASE_Y = 0.3 + 1.45 * ROCKET_SCALE;

/** Panel texture repeated to suit a surface `w` metres around and `h` metres tall. */
function usePanel(w: number, h: number) {
  return useMemo(() => {
    const t = getPanelTexture().clone();
    t.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, h / 4));
    t.needsUpdate = true;
    return t;
  }, [w, h]);
}

export function BaseModel({
  world,
  parts,
  rocketThrust,
  rocketRef,
  rocketVisible = true,
  reduced,
}: {
  world: WorldId;
  parts: Parts;
  rocketThrust: MutableRefObject<number>;
  rocketRef?: MutableRefObject<Group | null>;
  rocketVisible?: boolean;
  reduced: boolean;
}) {
  const gauges = gaugesOf(parts);
  return (
    <group>
      <Hub power={gauges.power / 100} />
      <Tunnels />
      <HexModules battery={parts.battery / 100} />
      <Greenhouse food={parts.food / 100} />
      <Shelter world={world} />
      <Garage />
      <SolarField output={parts.solar / 100} />
      <AntennaMast spin={!reduced} />
      <Pads />
      {/* BOLT, the base robot (the island model, scaled up and moved next to the hub's door). */}
      <group position={[BOLT_SPOT[0] - MODULE_POSITION.bolt[0] * 1.3, 0, BOLT_SPOT[1] - MODULE_POSITION.bolt[1] * 1.3]} scale={1.3}>
        <Bolt />
      </group>
      {rocketVisible && (
        <group ref={rocketRef} position={[ROCKET_PAD[0], ROCKET_BASE_Y, ROCKET_PAD[1]]}>
          <group rotation={[-Math.PI / 2, 0, 0]} scale={ROCKET_SCALE}>
            <Rocket thrust={rocketThrust} reduced={reduced} />
          </group>
        </group>
      )}
    </group>
  );
}

// ---- Hub: the habitat ----

function Hub({ power }: { power: number }) {
  const skin = usePanel(2 * Math.PI * HUB_RADIUS, 4.6);
  const tower = usePanel(2 * Math.PI * 4.2, 3.8);
  const windows = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (windows.current) windows.current.emissiveIntensity = 0.15 + power * 1.6;
  }, [power]);
  return (
    <group>
      <mesh position={[0, 2.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[HUB_RADIUS, HUB_RADIUS + 0.2, 4.6, 40]} />
        <meshStandardMaterial map={skin} roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[0, 4.75, 0]} castShadow>
        <cylinderGeometry args={[HUB_RADIUS + 0.25, HUB_RADIUS + 0.25, 0.4, 40]} />
        <meshStandardMaterial color="#b9bbbf" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 6.85, 0]} castShadow>
        <cylinderGeometry args={[4.2, 4.4, 3.8, 32]} />
        <meshStandardMaterial map={tower} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Window band: brighter with more Power */}
      <mesh position={[0, 7.3, 0]}>
        <cylinderGeometry args={[4.24, 4.24, 0.7, 32, 1, true]} />
        <meshStandardMaterial ref={windows} color="#1b1d22" emissive="#ffcf7a" emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      {/* Dark glass observation dome */}
      <mesh position={[0, 8.75, 0]} castShadow>
        <sphereGeometry args={[4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#0c0f14" metalness={0.9} roughness={0.12} />
      </mesh>
      <mesh position={[0, 11.4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 12.65, 0]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={2} />
      </mesh>
      {/* Airlock door facing the start, with a warm light strip */}
      <mesh position={[0, 1.5, HUB_RADIUS + 0.12]}>
        <boxGeometry args={[2.2, 3, 0.4]} />
        <meshStandardMaterial color="#3a3f48" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 3.15, HUB_RADIUS + 0.35]}>
        <boxGeometry args={[2.4, 0.12, 0.1]} />
        <meshStandardMaterial color="#FFB547" emissive="#FFB547" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

// ---- Tunnels: half-buried ribbed tubes from the hub to each module ----

function Tunnels() {
  const skin = usePanel(2 * Math.PI * TUNNEL_RADIUS, 4);
  const { tubes, ribs } = useMemo(() => {
    const tubes: Placement[] = [];
    const ribs: Placement[] = [];
    for (const m of RING_MODULES) {
      const start = HUB_RADIUS - 0.5;
      const end = RING - m.radius + 0.4;
      const [x, z] = ringPosition(m.angle, (start + end) / 2);
      tubes.push({ position: [x, 0.3, z], rotation: [Math.PI / 2, 0, -m.angle], scale: [1, end - start, 1] });
      for (let r = start + 1.2; r < end - 0.6; r += 2.6) {
        const [rx, rz] = ringPosition(m.angle, r);
        ribs.push({ position: [rx, 0.3, rz], rotation: [0, m.angle, 0] });
      }
    }
    return { tubes, ribs };
  }, []);
  return (
    <>
      <Instances placements={tubes}>
        <cylinderGeometry args={[TUNNEL_RADIUS, TUNNEL_RADIUS, 1, 28, 1, true]} />
        <meshStandardMaterial map={skin} roughness={0.75} metalness={0.1} side={DoubleSide} />
      </Instances>
      <Instances placements={ribs}>
        <torusGeometry args={[TUNNEL_RADIUS + 0.08, 0.14, 8, 32]} />
        <meshStandardMaterial color="#c7c9cc" roughness={0.5} metalness={0.5} />
      </Instances>
    </>
  );
}

// ---- Hexagonal modules (oxygen, water recycler, battery bank) ----

/** A point `dist` out from a ring module's centre (away from the hub), `side` metres to its right. */
function besideModule(id: string, dist: number, side: number): [number, number] {
  const m = ringOf(id);
  const [x, z] = ringPosition(m.angle);
  return [x + Math.sin(m.angle) * dist + Math.cos(m.angle) * side, z + Math.cos(m.angle) * dist - Math.sin(m.angle) * side];
}

function HexModules({ battery }: { battery: number }) {
  const skin = usePanel(6 * 4.3, HEX_HEIGHT);
  const placed = useMemo(() => {
    const at = (y: number, rotation: [number, number, number] | null): Placement[] =>
      HEX_IDS.map((id) => {
        const m = ringOf(id);
        const [x, z] = ringPosition(m.angle);
        return { position: [x, y, z], rotation: rotation ?? [0, m.angle, 0] };
      });
    // Oxygen plant: three tall tanks outside it. Water recycler: two squat drums.
    const tanks: Placement[] = [
      ...[-2.4, 0, 2.4].map((side): Placement => {
        const [x, z] = besideModule('oxygen', ringOf('oxygen').radius + 1.3, side);
        return { position: [x, 1.6, z] };
      }),
      ...[-1.6, 1.6].map((side): Placement => {
        const [x, z] = besideModule('recycler', ringOf('recycler').radius + 1.4, side);
        return { position: [x, 0.9, z], scale: [1.3, 0.55, 1.3] };
      }),
    ];
    // Battery bank: cabinets along the outside wall; their lights show the charge.
    const cells = [-2.2, -1.1, 0, 1.1, 2.2].map((side): Placement => {
      const [x, z] = besideModule('battery', ringOf('battery').radius + 0.9, side);
      return { position: [x, 1, z], rotation: [0, ringOf('battery').angle, 0] };
    });
    return { bodies: at(HEX_HEIGHT / 2, null), roofs: at(HEX_HEIGHT + 0.2, null), hatches: at(HEX_HEIGHT + 0.45, [Math.PI / 2, 0, 0]), tanks, cells };
  }, []);
  const charge = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (!charge.current) return;
    charge.current.emissiveIntensity = 0.2 + battery * 2.2;
    charge.current.emissive.set(battery < 0.3 ? '#ff5a4a' : '#6CF0A8');
  }, [battery]);
  return (
    <>
      <Instances placements={placed.bodies}>
        <cylinderGeometry args={[4.3, 4.45, HEX_HEIGHT, 6]} />
        <meshStandardMaterial map={skin} roughness={0.7} metalness={0.15} flatShading />
      </Instances>
      <Instances placements={placed.roofs}>
        <cylinderGeometry args={[3.7, 4.3, 0.45, 6]} />
        <meshStandardMaterial color="#b4b6ba" roughness={0.6} metalness={0.35} flatShading />
      </Instances>
      <Instances placements={placed.hatches}>
        <torusGeometry args={[1.3, 0.22, 8, 28]} />
        <meshStandardMaterial color="#d8d9db" roughness={0.45} metalness={0.5} />
      </Instances>
      <Instances placements={placed.tanks}>
        <cylinderGeometry args={[0.7, 0.7, 3.2, 20]} />
        <meshStandardMaterial color="#cfe4ec" roughness={0.35} metalness={0.55} />
      </Instances>
      <Instances placements={placed.cells}>
        <boxGeometry args={[0.9, 2, 0.7]} />
        <meshStandardMaterial ref={charge} color="#2d323b" emissive="#6CF0A8" emissiveIntensity={1} roughness={0.5} />
      </Instances>
    </>
  );
}

// ---- Greenhouse: a glass geodesic dome on a low wall, plants inside ----

const PLANTS: Placement[] = [-2, -1, 0, 1, 2].flatMap((row) => [-2, -1, 0, 1, 2].map((col): Placement => ({ position: [col * 1.7, 0.25, row * 1.5] })));

function Greenhouse({ food }: { food: number }) {
  const m = ringOf('greenhouse');
  const [x, z] = ringPosition(m.angle);
  const wall = usePanel(2 * Math.PI * m.radius, 1.2);
  const { dome, edges } = useMemo(() => {
    const dome = new SphereGeometry(m.radius, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    return { dome, edges: new EdgesGeometry(dome, 1) };
  }, [m.radius]);
  useEffect(
    () => () => {
      dome.dispose();
      edges.dispose();
    },
    [dome, edges],
  );
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[m.radius, m.radius, 1.2, 28]} />
        <meshStandardMaterial map={wall} roughness={0.7} />
      </mesh>
      <group position={[0, 1.2, 0]}>
        <mesh geometry={dome}>
          <meshStandardMaterial color="#9fb6c4" metalness={0.85} roughness={0.08} transparent opacity={0.32} flatShading depthWrite={false} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#dfe3e8" />
        </lineSegments>
      </group>
      {/* Plant beds: taller with more Food */}
      <group position={[0, 1.2, 0]} scale={[1, 0.25 + food * 1.6, 1]}>
        <Instances placements={PLANTS} castShadow={false}>
          <boxGeometry args={[1.2, 0.5, 1]} />
          <meshStandardMaterial color="#5fae3a" emissive="#2d6b1a" emissiveIntensity={0.5} roughness={0.8} />
        </Instances>
      </group>
    </group>
  );
}

// ---- Radiation shelter: a mound of regolith (Moon soil) piled over a buried module ----

function Shelter({ world }: { world: WorldId }) {
  const m = ringOf('shelter');
  const [x, z] = ringPosition(m.angle);
  return (
    <group position={[x, 0, z]} rotation={[0, m.angle, 0]}>
      <mesh scale={[1, 0.62, 1]} castShadow receiveShadow>
        <sphereGeometry args={[m.radius + 0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={REGOLITH[world]} roughness={1} flatShading />
      </mesh>
      {/* The entrance, facing away from the hub */}
      <mesh position={[0, 1.2, m.radius + 0.2]} castShadow>
        <boxGeometry args={[2.4, 2.4, 1.6]} />
        <meshStandardMaterial color="#d9d8d3" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.1, m.radius + 1.02]}>
        <boxGeometry args={[1.4, 2, 0.05]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.5, m.radius + 1.02]}>
        <boxGeometry args={[0.5, 0.18, 0.05]} />
        <meshStandardMaterial color="#FFB547" emissive="#FFB547" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

// ---- Rover garage and the rover parked outside ----

const WHEELS: Placement[] = [-1.1, 0, 1.1].flatMap((zz) =>
  [-1.05, 1.05].map((xx): Placement => ({ position: [xx, 0.42, zz], rotation: [0, 0, Math.PI / 2] })),
);

function Garage() {
  const m = ringOf('rover');
  const [x, z] = ringPosition(m.angle);
  const skin = usePanel(30, 3.6);
  return (
    <group position={[x, 0, z]} rotation={[0, m.angle, 0]}>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.5, 3.6, 7]} />
        <meshStandardMaterial map={skin} roughness={0.75} />
      </mesh>
      <mesh position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[4.25, 4.25, 7, 24, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#c9cacc" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.6, 3.52]}>
        <boxGeometry args={[5, 3, 0.05]} />
        <meshStandardMaterial color="#14171c" roughness={0.9} />
      </mesh>
      {/* The pressurised rover, parked in front of the door */}
      <group position={[2.2, 0, 7.2]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[2.1, 0.9, 3.4]} />
          <meshStandardMaterial color="#e8e7e2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.75, 0.55]} castShadow>
          <boxGeometry args={[1.8, 0.6, 1.6]} />
          <meshStandardMaterial color="#d7d6d1" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.78, 1.36]}>
          <boxGeometry args={[1.6, 0.4, 0.02]} />
          <meshStandardMaterial color="#10141a" metalness={0.9} roughness={0.1} />
        </mesh>
        <Instances placements={WHEELS}>
          <cylinderGeometry args={[0.42, 0.42, 0.34, 16]} />
          <meshStandardMaterial color="#3a3d44" roughness={0.9} />
        </Instances>
      </group>
    </group>
  );
}

// ---- Solar field ----

function SolarField({ output }: { output: number }) {
  const cells = useMemo(() => {
    const t = getCellTexture().clone();
    t.repeat.set(2, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  const { panels, posts } = useMemo(() => {
    const panels: Placement[] = [];
    const posts: Placement[] = [];
    const { center, rows, perRow, panel, gapX, gapZ } = SOLAR_FIELD;
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < perRow; i++) {
        const x = center[0] + (i - (perRow - 1) / 2) * (panel[0] + gapX);
        const z = center[1] + (row - (rows - 1) / 2) * gapZ;
        panels.push({ position: [x, 1.6, z], rotation: [-0.62, 0, 0] });
        posts.push({ position: [x, 0.8, z] });
      }
    }
    return { panels, posts };
  }, []);
  const material = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (material.current) material.current.emissiveIntensity = 0.05 + output * 0.35;
  }, [output]);
  return (
    <>
      <Instances placements={panels}>
        <boxGeometry args={[SOLAR_FIELD.panel[0], 0.08, SOLAR_FIELD.panel[1]]} />
        <meshStandardMaterial ref={material} map={cells} metalness={0.55} roughness={0.28} emissive="#2a4a9a" emissiveIntensity={0.2} />
      </Instances>
      <Instances placements={posts}>
        <cylinderGeometry args={[0.07, 0.09, 1.6, 8]} />
        <meshStandardMaterial color="#8d929b" metalness={0.7} roughness={0.4} />
      </Instances>
    </>
  );
}

// ---- Antenna mast with a dish pointed at Earth ----

function AntennaMast({ spin }: { spin: boolean }) {
  const head = useRef<Group>(null);
  const aim = useMemo(() => Math.atan2(EARTH_DIRECTION.x, EARTH_DIRECTION.z), []);
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.y = aim + (spin ? Math.sin(clock.elapsedTime * 0.2) * 0.08 : 0);
  });
  return (
    <group position={[ANTENNA[0], 0, ANTENNA[1]]}>
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.35, 14, 8]} />
        <meshStandardMaterial color="#b9bcc2" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[1.4, 1.6, 0.6, 12]} />
        <meshStandardMaterial color="#8a8c90" roughness={0.8} />
      </mesh>
      <group ref={head} position={[0, 14, 0]}>
        <group rotation={[-0.35, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.4]} castShadow>
            <sphereGeometry args={[2.6, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
            <meshStandardMaterial color="#eeeeea" metalness={0.3} roughness={0.45} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 6]} />
            <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---- Landing pads: round pads with radial fins and edge lights ----

function Pads() {
  const { fins, lights } = useMemo(() => {
    const fins: Placement[] = [];
    const lights: Placement[] = [];
    for (const [px, pz] of PADS) {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        fins.push({ position: [px + Math.sin(a) * 4.6, 0.42, pz + Math.cos(a) * 4.6], rotation: [0, a + 0.35, 0] });
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        lights.push({ position: [px + Math.sin(a) * 6.9, 0.38, pz + Math.cos(a) * 6.9] });
      }
    }
    return { fins, lights };
  }, []);
  return (
    <>
      {PADS.map(([px, pz]) => (
        <group key={px} position={[px, 0, pz]}>
          <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[7, 7.3, 0.3, 48]} />
            <meshStandardMaterial color="#8f8f8c" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[5.6, 6.4, 48]} />
            <meshStandardMaterial color="#d8d8d4" roughness={0.6} />
          </mesh>
        </group>
      ))}
      <Instances placements={fins}>
        <boxGeometry args={[0.18, 0.25, 1.9]} />
        <meshStandardMaterial color="#b8b9bb" metalness={0.5} roughness={0.4} />
      </Instances>
      <Instances placements={lights} castShadow={false}>
        <boxGeometry args={[0.25, 0.12, 0.25]} />
        <meshStandardMaterial color="#FFB547" emissive="#FFB547" emissiveIntensity={1.5} />
      </Instances>
    </>
  );
}
