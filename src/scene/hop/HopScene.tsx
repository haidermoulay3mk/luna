// Built with help from Claude (Anthropic).
// The hop flight (Boss: "a flying simulator all across the missions, going from mission to
// mission, to find a location and avoid any obstacles"). The hopper lifts off from the pad the
// crew is at and flies low over the real walkable land (the same terrain, base and field sites),
// weaving between tall rock spires, to find the beacon at the next mission's outpost and land
// softly on its pad. Real gravity (Moon 1.62, Mars 3.71 m/s²) pulls it down the whole way.
// VFX: engine flame, dust blown off the ground under the engine, sparks on a graze, a dust ring on
// touchdown, a camera shake on hits, and fine dust streaming past to show speed.
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { SpaceReflections } from '../flight/FlightScene';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { BufferAttribute, BufferGeometry, Color, Object3D, Vector3, type Group, type InstancedMesh } from 'three';

/** WASD hopper: the height above the ground it climbs to by itself after lift-off (metres). */
const CRUISE_AGL = 20;

/** Where the hop camera wants to look this frame (smoothed into cam.look). */
const hopLookWant = new Vector3();
import { create } from 'zustand';
import type { WorldId } from '../../engine/campaign';
import { SAFETY, didPass, type FlightResult } from '../../engine/flight';
import {
  HOP,
  HOP_FLARE,
  aheadOf,
  heightAboveGround,
  hitSpire,
  hopSpeed,
  hopperAt,
  landingKind,
  newTally,
  onPad,
  rockAhead,
  routeSpires,
  stepHop,
  tallyGraze,
  tallyPass,
  type Ground,
  type Hopper as HopperState,
  type HopTally,
  type Spire,
} from '../../engine/hop';
import type { Parts } from '../../engine/types';
import { setEngine, sfx, stopEngine } from '../../ui/sound';
import { walkLive } from '../../store/walk';
import { readInput, useFlightKeyboard } from '../flight/input';
import { SceneBoundary } from '../MoonbaseScene';
import { Beacon, makeRockGeometry } from '../space/Craft';
import { SparkBurst, type SparkTrigger } from '../space/Fx';
import { Sky } from '../space/Sky';
import { DPR, FpsWatch, isLowPowerDevice, watchContextLoss } from '../space/webgl';
import { BaseModel } from '../walk/BaseModel';
import { Boulders, MarsSky, Terrain } from '../walk/Ground';
import { ANTENNA, GRAVITY, HUB_RADIUS, PADS, RING, RING_MODULES, ROCKET_PAD, SITE_STRUCTURE_RADIUS, ringPosition } from '../walk/layout';
import { Hopper, Outposts, PAD_RADIUS, PAD_TOP } from '../walk/Outposts';
import { fieldSites, type Outpost } from '../walk/sites';
import { heightAt } from '../walk/terrain';
import { SunRig } from '../walk/WalkScene';

// ---- HUD state (updated about 10 times a second) ----

export type HopPhase = 'pad' | 'flying' | 'landed' | 'crashed';

export interface HopHud {
  phase: HopPhase;
  distance: number;
  /** Target bearing relative to the nose, radians (0 = straight ahead, + = to the right). */
  bearing: number;
  altitude: number;
  climb: number;
  speed: number;
  fuel: number;
  safety: number;
  grazes: number;
  crashes: number;
  /** Seconds left to land before a solar flare dose (null = no flare warning now). */
  flareLeft: number | null;
  flareHit: boolean;
  /** The nearest rock in the way: metres to it and which side it is on (null = clear). */
  rock: { distance: number; side: 1 | -1 } | null;
  toast: { id: number; text: string; tone: 'good' | 'bad' | 'info' } | null;
}

const initialHud = (): HopHud => ({
  phase: 'pad',
  distance: 0,
  bearing: 0,
  altitude: 0,
  climb: 0,
  speed: 0,
  fuel: 100,
  safety: SAFETY.start,
  grazes: 0,
  crashes: 0,
  flareLeft: null,
  flareHit: false,
  rock: null,
  toast: null,
});

export const useHopHud = create<HopHud>()(() => initialHud());
let toastId = 0;
const toast = (text: string, tone: 'good' | 'bad' | 'info') => useHopHud.setState({ toast: { id: ++toastId, text, tone } });

// ---- Scene ----

export interface HopSceneProps {
  world: WorldId;
  from: Outpost;
  to: Outpost;
  parts: Parts;
  /** A solar flare warning comes during this hop (decided from NASA DONKI's risk). */
  flare: boolean;
  reduced: boolean;
  onLanded: (result: FlightResult) => void;
}

export function HopScene(props: HopSceneProps) {
  const [lowPower] = useState(isLowPowerDevice);
  useFlightKeyboard(true);
  useEffect(() => {
    useHopHud.setState(initialHud());
    return () => stopEngine();
  }, []);
  return (
    <SceneBoundary>
      <Canvas
        dpr={DPR}
        shadows={lowPower ? false : 'percentage'}
        camera={{ fov: 60, near: 0.3, far: 6000, position: [0, 10, 30] }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        onCreated={watchContextLoss}
        aria-hidden
      >
        {/* Reflections live here, outside HopWorld, so the headless play-tests (no GPU) still run. */}
        <SpaceReflections />
        <HopWorld {...props} lowPower={lowPower} />
        <FpsWatch />
      </Canvas>
    </SceneBoundary>
  );
}

/** Every pad the hopper can stand on (the pads are 0.3 m tall). */
function padsOf(world: WorldId): readonly (readonly [number, number])[] {
  return [...PADS, ...fieldSites(world).map((s) => s.pad)];
}

export function groundFor(world: WorldId): Ground {
  const pads = padsOf(world);
  return (x, z) => {
    const h = heightAt(world, x, z);
    for (const p of pads) {
      if (Math.abs(x - p[0]) < PAD_RADIUS && Math.abs(z - p[1]) < PAD_RADIUS && Math.hypot(x - p[0], z - p[1]) < PAD_RADIUS) return h + PAD_TOP;
    }
    return h;
  };
}

/** The base's buildings and the field-site structures, as solid columns to fly around (not drawn as rocks). */
function buildings(world: WorldId): Spire[] {
  const list: Spire[] = [
    { x: 0, z: 0, r: HUB_RADIUS + 1.5, top: 12 },
    { x: ROCKET_PAD[0], z: ROCKET_PAD[1], r: 3, top: 16 },
    { x: ANTENNA[0], z: ANTENNA[1], r: 2, top: 16 },
  ];
  for (const m of RING_MODULES) {
    const [x, z] = ringPosition(m.angle, RING);
    list.push({ x, z, r: m.radius + 0.6, top: m.id === 'greenhouse' ? 8 : 6 });
  }
  for (const s of fieldSites(world)) {
    if (s.id === 'olympus') continue;
    list.push({ x: s.center[0], z: s.center[1], r: SITE_STRUCTURE_RADIUS, top: heightAt(world, s.center[0], s.center[1]) + (s.id === 'relay' ? 19 : 12) });
  }
  return list;
}

export function HopWorld(p: HopSceneProps & { lowPower: boolean }) {
  const { world, from, to, reduced } = p;
  const mars = world === 'mars';
  const ground = useMemo(() => groundFor(world), [world]);
  const rocketThrust = useRef(0);
  const rocketRef = useRef<Group | null>(null);
  const spires = useMemo(() => {
    const route = { from: { x: from.pad[0], z: from.pad[1] }, to: { x: to.pad[0], z: to.pad[1] } };
    const clear = [{ x: 0, z: 0, r: 75 }, ...fieldSites(world).map((s) => ({ x: s.center[0], z: s.center[1], r: 30 }))];
    // Same rocks every time for the same hop (seeded from the two sites).
    const seed = Math.round(Math.abs(from.pad[0] * 31 + from.pad[1] * 17 + to.pad[0] * 7 + to.pad[1] * 3)) + 11;
    return routeSpires(route, ground, seed, clear);
  }, [world, from, to, ground]);
  const solids = useMemo(() => [...spires, ...buildings(world)], [spires, world]);
  /** The rock the hopper is heading for right now (it glows amber), or -1. */
  const warned = useRef(-1);
  return (
    <>
      <color attach="background" args={[mars ? '#1a0f0e' : '#020308']} />
      {mars && <fog attach="fog" args={['#b98066', 180, 1000]} />}
      <SunRig world={world} shadows={!p.lowPower} />
      <Sky earth={!mars} stars={mars ? 900 : 3200} />
      {mars && <MarsSky />}
      <Terrain world={world} />
      <Boulders world={world} count={p.lowPower ? 120 : 260} />
      <BaseModel world={world} parts={p.parts} rocketThrust={rocketThrust} rocketRef={rocketRef} reduced={reduced} />
      <Outposts world={world} reduced={reduced} />
      <Spires spires={spires} world={world} warned={warned} />
      <group position={[to.pad[0], ground(to.pad[0], to.pad[1]), to.pad[1]]} scale={0.9}>
        <Beacon reduced={reduced} />
      </group>
      <Flight {...p} ground={ground} solids={solids} spireCount={spires.length} warned={warned} />
    </>
  );
}

/** Tall rock pillars: the noisy rock shape stretched upward, sunk a little into the ground. */
function Spires({ spires, world, warned }: { spires: readonly Spire[]; world: WorldId; warned: MutableRefObject<number> }) {
  const geometry = useMemo(() => makeRockGeometry(11), []);
  const color = world === 'mars' ? '#b0705a' : '#a8a6a0';
  const mesh = useRef<InstancedMesh | null>(null);
  const shown = useRef(-1);
  const tint = useMemo(() => ({ plain: new Color('#ffffff'), warn: new Color('#ffb547'), mix: new Color() }), []);
  // The rock in the hopper's path glows amber, pulsing, so it is easy to see in time.
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m || spires.length === 0) return;
    const i = warned.current < spires.length ? warned.current : -1;
    if (shown.current >= 0 && shown.current !== i) m.setColorAt(shown.current, tint.plain);
    if (i >= 0) m.setColorAt(i, tint.mix.copy(tint.plain).lerp(tint.warn, 0.55 + 0.45 * Math.sin(clock.elapsedTime * 9)));
    shown.current = i;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      key={spires.length}
      args={[geometry, undefined, Math.max(1, spires.length)]}
      castShadow
      receiveShadow
      ref={(instanced: InstancedMesh | null) => {
        mesh.current = instanced;
        if (!instanced) return;
        const m = instanced;
        const dummy = new Object3D();
        spires.forEach((s, i) => {
          const base = heightAt(world, s.x, s.z);
          const height = s.top - base;
          dummy.position.set(s.x, base + height * 0.45, s.z);
          dummy.rotation.set(0, (i * 1.7) % 6.28, 0);
          dummy.scale.set(s.r * 1.1, height * 0.55, s.r * 1.1);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          m.setColorAt(i, tint.plain);
        });
        m.count = spires.length;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        m.computeBoundingSphere();
      }}
    >
      <meshStandardMaterial color={color} vertexColors roughness={0.95} flatShading />
    </instancedMesh>
  );
}

const LANDED_SECONDS = 2.2;
const CRASH_SECONDS = 1.8;

function Flight({
  world,
  from,
  to,
  flare,
  reduced,
  onLanded,
  ground,
  solids,
  spireCount,
  warned,
}: HopSceneProps & { ground: Ground; solids: readonly Spire[]; spireCount: number; warned: MutableRefObject<number> }) {
  const camera = useThree((s) => s.camera);
  const gravity = GRAVITY[world];
  const start = useMemo(() => hopperAt(from.pad[0], from.pad[1], ground, { x: to.pad[0], z: to.pad[1] }), [from, to, ground]);
  const state = useRef<HopperState>(start);
  const tally = useRef<HopTally>(newTally());
  const run = useRef({
    phase: 'pad' as HopPhase,
    t: 0,
    phaseT: 0,
    hud: 0,
    flareAt: null as number | null,
    flareDone: false,
    shake: 0,
    lifted: false,
    done: false,
    crashes: 0,
    beep: 0,
    crumb: 0,
    lastHit: -10,
    rock: null as { index: number; distance: number; side: 1 | -1 } | null,
  });
  /** Safe spots the hopper flew through (every half second): after a crash it restarts a little way back. */
  const trail = useRef<HopperState[]>([]);
  const ahead = useRef<number[]>(solids.map(() => 0));
  const model = useRef<Group>(null);
  const thrust = useRef(0);
  const fx = useRef<FxBus>({ dust: 0, burst: null });
  const sparks: SparkTrigger = useRef(null);
  const cam = useMemo(() => ({ pos: new Vector3(), look: new Vector3(), want: new Vector3(), first: true }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const r = run.current;
    r.t += dt;
    r.phaseT += dt;
    let h = state.current;
    const crash = () => {
      r.phase = 'crashed';
      r.phaseT = 0;
      r.crashes += 1;
      r.shake = 1;
      fx.current.burst = { x: h.x, y: h.y, z: h.z, t: 0, size: 2.2 };
      sparks.current = { x: h.x, y: h.y + 1.5, z: h.z };
      sfx.hit();
      sfx.powerDown();
      toast('Impact · restarting a little way back', 'bad');
    };

    const controls = r.phase === 'pad' || r.phase === 'flying' ? readInput() : { thrust: 0, turn: 0, lift: 0, pitch: 0 };
    // The arrow keys also work: ↑/↓ climb and sink (as in the big flights' tilt keys).
    let lift = Math.max(-1, Math.min(1, controls.lift + controls.pitch));
    // W A S D is enough (friend, 15 Nov: "too hard to control"): with no climb/sink key held, W lifts off
    // the pad, the hopper climbs to cruise height by itself, and over the beacon pad, once slowed down,
    // it sets itself down. Space / Shift still climb and sink for players who want them.
    if (lift === 0 && (r.phase === 'pad' || r.phase === 'flying')) {
      const agl = h.y - ground(h.x, h.z);
      const toPad = Math.hypot(h.x - to.pad[0], h.z - to.pad[1]);
      if (r.phase === 'pad') {
        if (controls.thrust > 0) lift = 1;
      } else if (toPad < HOP.padRadius * 0.8 && hopSpeed(h) < 6) lift = -1;
      else if (agl < CRUISE_AGL) lift = 1;
    }
    if (r.phase === 'pad' || r.phase === 'flying') {
      const step = stepHop(h, { thrust: controls.thrust, turn: controls.turn, lift }, dt, gravity, ground);
      h = step.hopper;
      if (r.phase === 'pad' && !h.grounded) {
        r.phase = 'flying';
        r.phaseT = 0;
        r.lifted = true;
        sfx.radio();
        toast('Lift-off. Follow the beacon.', 'info');
      }
      // Rock spires and buildings.
      const contact = hitSpire(h, solids);
      if (contact) {
        r.lastHit = r.t;
        h = contact.hopper;
        if (contact.kind === 'crash') crash();
        else {
          tally.current = tallyGraze(tally.current);
          r.shake = 0.5;
          sparks.current = { x: h.x, y: h.y + 1.5, z: h.z };
          sfx.hit();
          toast(`Graze · Safety ${SAFETY.graze}`, 'bad');
        }
      }
      // Passing spires cleanly.
      for (let i = 0; i < spireCount; i++) {
        const { ahead: now, lateral } = aheadOf(h, solids[i]);
        if (r.phase === 'flying' && didPass(ahead.current[i], now, lateral)) tally.current = tallyPass(tally.current);
        ahead.current[i] = now;
      }
      // Touchdown.
      if (step.touchdown !== null && r.phase === 'flying') {
        const kind = landingKind(step.touchdown);
        fx.current.burst = { x: h.x, y: h.y, z: h.z, t: 0, size: Math.min(1.6, 0.6 + step.touchdown * 0.2) };
        if (kind === 'crash') crash();
        else {
          if (kind === 'hard') {
            tally.current = tallyGraze(tally.current);
            r.shake = 0.6;
            sfx.hit();
            toast('Hard landing · come down slower', 'bad');
          } else sfx.land();
          if (Math.hypot(h.x - to.pad[0], h.z - to.pad[1]) > HOP.padRadius) toast('Not the pad. Lift off and find the beacon.', 'info');
        }
      }
      if (r.phase === 'flying' && onPad(h, { x: to.pad[0], z: to.pad[1] })) {
        r.phase = 'landed';
        r.phaseT = 0;
        sfx.dock();
        toast(`Touchdown · ${to.name}`, 'good');
      }
      // NASA DONKI flare: a warning, then a deadline to land.
      if (flare && r.lifted && r.flareAt === null && r.phase === 'flying' && r.phaseT > HOP_FLARE.at) {
        r.flareAt = r.t;
        sfx.alarm();
      }
      // Breadcrumbs: a safe spot every half second, well clear of the last scrape.
      r.crumb += dt;
      if (r.phase === 'flying' && r.crumb > 0.5 && r.t - r.lastHit > 2) {
        r.crumb = 0;
        trail.current.push(h);
        if (trail.current.length > 12) trail.current.shift();
      }
      // Rock-ahead warning (a beep that speeds up as it gets close) and the amber glow on that rock.
      r.rock = r.phase === 'flying' ? rockAhead(h, solids) : null;
      warned.current = r.rock ? r.rock.index : -1;
      r.beep -= dt;
      if (r.rock && r.rock.distance < 40 && r.beep <= 0) {
        sfx.tick();
        r.beep = 0.15 + r.rock.distance / 80;
      }
      state.current = h;
    } else if (r.phase === 'crashed' && r.phaseT > CRASH_SECONDS) {
      // Restart hovering about 2 seconds back along the way (or on the start pad), stopped, facing
      // the beacon. The Safety score and grazes so far stay.
      const back = trail.current.length >= 4 ? trail.current[trail.current.length - 4] : null;
      trail.current = back ? trail.current.slice(0, -3) : [];
      h = back
        ? {
            ...back,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: false,
            hold: Math.max(8, back.y - ground(back.x, back.z)),
            yaw: Math.atan2(to.pad[0] - back.x, -(to.pad[1] - back.z)),
          }
        : start;
      state.current = h;
      ahead.current = solids.map(() => 0);
      r.phase = back ? 'flying' : 'pad';
      r.phaseT = 0;
      cam.first = true;
    } else if (r.phase === 'landed' && r.phaseT > LANDED_SECONDS && !r.done) {
      r.done = true;
      stopEngine();
      const t = tally.current;
      onLanded({ hits: t.grazes, astronauts: 0, flares: t.flares, autopilot: false, safety: t.safety });
    }

    // Flare deadline.
    let flareLeft: number | null = null;
    if (r.flareAt !== null && !r.flareDone) {
      flareLeft = Math.max(0, HOP_FLARE.deadline - (r.t - r.flareAt));
      if (r.phase === 'landed') r.flareDone = true;
      else if (flareLeft <= 0) {
        r.flareDone = true;
        tally.current = { ...tally.current, flares: 1 };
        toast('Flare dose: the crew took radiation', 'bad');
      }
    }

    // Engine look and sound: holding the hopper up (more on Mars) plus lift and forward thrust.
    const agl = heightAboveGround(h, ground);
    const holding = r.phase === 'flying' ? 0.35 + (gravity / 9.5) * 0.6 : 0;
    const wanted = r.phase === 'flying' || (r.phase === 'pad' && lift > 0) ? holding + Math.max(0, lift) * 0.6 - Math.max(0, -lift) * 0.25 + Math.abs(controls.thrust) * 0.2 : 0;
    thrust.current += (Math.max(0, wanted) - thrust.current) * Math.min(1, dt * 8);
    setEngine(r.phase === 'flying' ? Math.min(1, thrust.current) : 0);
    fx.current.dust = r.phase === 'flying' && agl < 14 ? thrust.current * (1 - agl / 14) : 0;

    // The model: position, heading, and a lean into the motion.
    const g = model.current;
    if (g) {
      g.visible = r.phase !== 'crashed';
      g.position.set(h.x, h.y, h.z);
      const fwdSpeed = h.vx * Math.sin(h.yaw) - h.vz * Math.cos(h.yaw);
      const side = h.vx * Math.cos(h.yaw) + h.vz * Math.sin(h.yaw);
      g.rotation.set(0, -h.yaw, 0);
      if (!reduced) {
        g.rotateX(-Math.max(-0.35, Math.min(0.35, fwdSpeed * 0.012 + controls.thrust * 0.12)));
        g.rotateZ(-Math.max(-0.3, Math.min(0.3, side * 0.02 + controls.turn * 0.1)));
      }
    }
    Object.assign(walkLive, { world, x: h.x, y: h.y, z: h.z });

    // Chase camera: behind and above the hopper, looking a little ahead; it rises near the pad.
    const toPad = Math.hypot(h.x - to.pad[0], h.z - to.pad[1]);
    const near = Math.max(0, 1 - toPad / 60);
    const back = 15 + hopSpeed(h) * 0.15;
    const up = 6 + near * 8;
    cam.want.set(h.x - Math.sin(h.yaw) * back, h.y + up, h.z + Math.cos(h.yaw) * back);
    const floor = ground(cam.want.x, cam.want.z) + 2;
    if (cam.want.y < floor) cam.want.y = floor;
    if (cam.first || reduced) {
      cam.pos.copy(cam.want);
      cam.first = false;
    } else cam.pos.lerp(cam.want, 1 - Math.exp(-3.5 * dt));
    camera.position.copy(cam.pos);
    if (!reduced && r.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * r.shake * 1.2;
      camera.position.y += (Math.random() - 0.5) * r.shake * 1.2;
      r.shake = Math.max(0, r.shake - dt * 1.6);
    }
    hopLookWant.set(h.x + Math.sin(h.yaw) * 10, h.y + 2 - near * 3, h.z - Math.cos(h.yaw) * 10);
    // The look point glides too, so turning does not jerk the view.
    if (reduced || cam.look.lengthSq() === 0) cam.look.copy(hopLookWant);
    else cam.look.lerp(hopLookWant, 1 - Math.exp(-10 * dt));
    camera.lookAt(cam.look);

    // HUD at about 10 Hz.
    r.hud += dt;
    if (r.hud > 0.1) {
      r.hud = 0;
      const dx = to.pad[0] - h.x;
      const dz = to.pad[1] - h.z;
      let bearing = Math.atan2(dx, -dz) - h.yaw;
      while (bearing > Math.PI) bearing -= Math.PI * 2;
      while (bearing < -Math.PI) bearing += Math.PI * 2;
      useHopHud.setState({
        phase: r.phase,
        distance: Math.hypot(dx, dz),
        bearing,
        altitude: Math.max(0, agl),
        climb: h.vy,
        speed: hopSpeed(h),
        fuel: h.fuel,
        safety: tally.current.safety,
        grazes: tally.current.grazes,
        crashes: r.crashes,
        flareLeft,
        flareHit: tally.current.flares > 0,
        rock: r.rock ? { distance: r.rock.distance, side: r.rock.side } : null,
      });
    }
  });

  return (
    <>
      <group ref={model}>
        <Hopper thrust={thrust} reduced={reduced} />
      </group>
      {!reduced && <EngineDust hopper={state} fx={fx} world={world} ground={ground} />}
      {!reduced && <SparkBurst trigger={sparks} gravity={GRAVITY[world]} />}
      {!reduced && <SpeedDust hopper={state} />}
    </>
  );
}

// ---- VFX ----

interface FxBus {
  /** 0–1: how much dust the engine blows off the ground right now. */
  dust: number;
  /** A ring of dust thrown out by a touchdown or a crash. */
  burst: { x: number; y: number; z: number; t: number; size: number } | null;
}

const DUST = 320;

/** Dust blown sideways off the ground under the engine (and thrown out in a ring on touchdown). */
function EngineDust({ hopper, fx, world, ground }: { hopper: MutableRefObject<HopperState>; fx: MutableRefObject<FxBus>; world: WorldId; ground: Ground }) {
  const data = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(DUST * 3);
    const age = new Float32Array(DUST).fill(-1);
    const seed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) seed[i] = Math.random();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('age', new BufferAttribute(age, 1));
    g.setAttribute('seed', new BufferAttribute(seed, 1));
    return { g, pos, age, vel: new Float32Array(DUST * 3), next: 0, carry: 0 };
  }, []);
  useEffect(() => () => data.g.dispose(), [data]);
  const uniforms = useMemo(() => ({ uTint: { value: new Color(world === 'mars' ? '#c08a6c' : '#b4b2ad') } }), [world]);
  const gravity = GRAVITY[world];
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const d = data;
    const h = hopper.current;
    const emit = (x: number, y: number, z: number, sp: number, up: number) => {
      const i = d.next++ % DUST;
      const a = Math.random() * Math.PI * 2;
      const s = sp * (0.5 + Math.random());
      d.pos.set([x + Math.cos(a) * 1.2, y + 0.3, z + Math.sin(a) * 1.2], i * 3);
      d.vel.set([Math.cos(a) * s, up * (0.3 + Math.random()), Math.sin(a) * s], i * 3);
      d.age[i] = 0;
    };
    const f = fx.current;
    if (f.dust > 0.02) {
      d.carry += dt * 90 * f.dust;
      const gy = ground(h.x, h.z);
      while (d.carry >= 1) {
        d.carry -= 1;
        emit(h.x, gy, h.z, 6 + f.dust * 8, 1.5);
      }
    }
    if (f.burst) {
      for (let k = 0; k < 70 * f.burst.size; k++) emit(f.burst.x, f.burst.y, f.burst.z, 9 * f.burst.size, 2.5);
      f.burst = null;
    }
    for (let i = 0; i < DUST; i++) {
      if (d.age[i] < 0) continue;
      d.age[i] += dt;
      if (d.age[i] > 3.5) {
        d.age[i] = -1;
        continue;
      }
      // No air on the Moon: dust flies on a clean arc and falls back under real gravity; Mars air slows it.
      const drag = world === 'mars' ? Math.exp(-dt * 1.4) : 1;
      d.vel[i * 3] *= drag;
      d.vel[i * 3 + 2] *= drag;
      d.vel[i * 3 + 1] -= gravity * dt;
      d.pos[i * 3] += d.vel[i * 3] * dt;
      d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
      d.pos[i * 3 + 1] = Math.max(d.pos[i * 3 + 1] + d.vel[i * 3 + 1] * dt, ground(d.pos[i * 3], d.pos[i * 3 + 2]) + 0.1);
    }
    d.g.attributes.position.needsUpdate = true;
    d.g.attributes.age.needsUpdate = true;
  });
  return (
    <points geometry={data.g} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          attribute float age; attribute float seed; varying float vAge; varying float vSeed;
          void main() {
            vAge = age; vSeed = seed;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float size = age < 0.0 ? 0.0 : (0.8 + age * 1.6) * (0.6 + seed * 0.8);
            gl_PointSize = size * 380.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uTint; varying float vAge; varying float vSeed;
          void main() {
            if (vAge < 0.0) discard;
            float r = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, r) * (1.0 - smoothstep(1.5, 3.5, vAge)) * 0.55;
            gl_FragColor = vec4(uTint * (0.75 + vSeed * 0.35), a);
          }`}
      />
    </points>
  );
}

const MOTES = 200;

/** Fine dust hanging around the hopper, so speed shows even over smooth ground. */
function SpeedDust({ hopper }: { hopper: MutableRefObject<HopperState> }) {
  const data = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) pos.set([(Math.random() - 0.5) * 80, Math.random() * 40, (Math.random() - 0.5) * 80], i * 3);
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return { g, pos };
  }, []);
  useEffect(() => () => data.g.dispose(), [data]);
  useFrame(() => {
    const h = hopper.current;
    const p = data.pos;
    const box: [number, number, number][] = [
      [0, h.x, 40],
      [1, h.y + 10, 20],
      [2, h.z, 40],
    ];
    // Keep the motes in a box around the hopper (wrapping round), so it flies through them.
    for (let i = 0; i < MOTES; i++) {
      for (const [k, c, half] of box) {
        const j = i * 3 + k;
        if (p[j] < c - half) p[j] += half * 2;
        else if (p[j] > c + half) p[j] -= half * 2;
      }
    }
    data.g.attributes.position.needsUpdate = true;
  });
  return (
    <points geometry={data.g} frustumCulled={false}>
      <pointsMaterial color="#d8d4cc" size={0.12} transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}
