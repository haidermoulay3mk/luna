// Built with help from Claude (Anthropic).
// Third-person rocket flight (LUNA_BUILD B5). Flight 1 (Earth → Moon) and Flight 2 (Moon → Mars)
// start out in deep space and end at the landing site: dodge satellites and debris, or real
// near-Earth asteroids from NASA NeoWs (name, size and speed from the data; positions set by the
// game). Safety starts at 50: +5 for each obstacle passed cleanly, −15 for a graze; a crash
// restarts this flight (the chapter is kept). The rules are the tested functions in
// src/engine/flight.ts; this file draws them: chase camera, exhaust, space dust, obstacles,
// the station to dock at, the landing beacon and the touchdown (skippable, a fade with reduced motion).
import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  BufferGeometry,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type PerspectiveCamera,
} from 'three';
import { WORLD_RADIUS_KM, placesOn, type Place } from '../../data/content';
import type { WorldId } from '../../engine/campaign';
import {
  FLIGHT,
  FLIGHT_EFFECTS,
  MOON_RADIUS,
  SAFETY,
  altitudeKm,
  asteroidRadius,
  asteroidSpeed,
  canArrive,
  changeSafety,
  contactKind,
  cross,
  deepSpaceStart,
  didPass,
  distance,
  dot,
  flightPhase,
  normalize,
  scale,
  shipAt,
  speedMs,
  stepShip,
  sub,
  type Asteroid,
  type FlightKind,
  type FlightResult,
  type Ship,
  type Vec3,
} from '../../engine/flight';
import { PROBLEM_TIMING, nextProblem, type FlightProblem, type ProblemId } from '../../engine/flightProblems';
import { EMPTY_HUD, showToast, useFlightHud, type ObstacleLabel } from '../../store/flightHud';
import { usePrefersReducedMotion } from '../../ui/hooks';
import { MeshCounter, SceneBoundary } from '../MoonbaseScene';
import { placePosition } from '../MoonMap';
import { Beacon, Rocket, Station, getFoilTexture, makeRockGeometry, makeSatelliteGeometry } from '../space/Craft';
import { SparkBurst, type SparkTrigger } from '../space/Fx';
import { getCellTexture } from '../walk/textures';
import { SpaceLights, World } from '../space/Moon';
import { SUN_DIRECTION, Sky } from '../space/Sky';
import { DPR, FpsWatch, isLowPowerDevice, watchContextLoss } from '../space/webgl';
import { setEngine, sfx, stopEngine } from '../../ui/sound';
import { readInput } from './input';

export interface FlightSceneProps {
  world: WorldId;
  from: Place;
  to: Place;
  /** Called once, when the rocket has landed. */
  onArrive: (result: FlightResult) => void;
  /** How likely a solar flare warning is (from the NASA space weather risk level). */
  flareWeight?: number;
  /** Flight 1 or Flight 2: starts out in deep space. Missing means a short hop from `from`. */
  kind?: FlightKind;
  /** Flight 2's rocks: real near-Earth asteroids from the NeoWs snapshot. */
  asteroids?: readonly Asteroid[];
}

/** The rocket is drawn this much bigger than its model, so it reads clearly on screen. */
const ROCKET_SCALE = 1.9;
/** Behind and above the rocket, scaled with it. */
const CHASE = { back: 7.5 * ROCKET_SCALE, up: 2.2 * ROCKET_SCALE, ahead: 4 * ROCKET_SCALE } as const;
/** Seconds of the impact before the flight restarts (shorter with reduced motion). */
const CRASH_SECONDS = 1.5;
/** Touchdown cut-scene: a curved descent (the rocket turns upright and brakes), the camera orbiting in, then the dust and the stamp. About 9 s. */
const LANDING = { descent: 6.5, settle: 2.4 } as const;
/** At most this many hazardous asteroids get a warning ring at once. */
const HAZARD_RINGS = 12;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function FlightScene(props: FlightSceneProps) {
  const [lowPower] = useState(isLowPowerDevice);
  return (
    <SceneBoundary>
      <Canvas
        dpr={DPR}
        camera={{ fov: 58, near: 0.1, far: 9000, position: [0, 0, 400] }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        onCreated={watchContextLoss}
        aria-hidden
      >
        <color attach="background" args={['#020308']} />
        <SpaceLights />
        {/* Earthshine fill: dark sides of rocks and satellites stay readable as 3D shapes. */}
        <directionalLight position={[-600, -200, -500]} intensity={0.35} color="#7f9cdc" />
        <hemisphereLight args={["#9fb3ff", "#1a1410", 0.12]} />
        <SpaceReflections />
        <Sky earth={props.world === 'moon'} />
        <Suspense fallback={null}>
          <World world={props.world} segments={lowPower ? 128 : 220} />
        </Suspense>
        <FlightWorld {...props} lowPower={lowPower} />
        <FpsWatch />
        {import.meta.env.DEV && <MeshCounter />}
      </Canvas>
    </SceneBoundary>
  );
}

const v3 = (v: Vec3) => new Vector3(v[0], v[1], v[2]);
/** The point the flight camera looks at, smoothed (see the chase camera). */
const flightLook = new Vector3();
const tuple = (v: Vector3): Vec3 => [v.x, v.y, v.z];

/** Nose pointing along the ground towards the target, so the first W goes the right way. */
function aimAt(ship: Ship, target: Vec3): Ship {
  const radial = normalize(ship.pos);
  const d = sub(target, ship.pos);
  const along = sub(d, scale(radial, dot(d, radial)));
  if (Math.hypot(...along) < 1e-3) return ship;
  const forward = normalize(along);
  return { ...ship, forward, up: normalize(sub(radial, scale(forward, dot(radial, forward)))) };
}

type ObstacleType = 'rock' | 'satellite' | 'debris';

interface Obstacle {
  type: ObstacleType;
  /** Rock shape (3 variants) and its instance slot in that variant's mesh. */
  variant: number;
  slot: number;
  pos: Vector3;
  vel: Vector3;
  radius: number;
  axis: Vector3;
  spin: number;
  angle: number;
  stretch: Vector3;
  asteroid?: Asteroid;
  /** How far ahead of the ship it was last frame (for "passed cleanly"). */
  ahead: number;
  touched: boolean;
  counted: boolean;
}

/** Which obstacles each flight has, and how many (fewer on low-power devices). */
function obstacleTypes(kind: FlightKind | undefined, lowPower: boolean): ObstacleType[] {
  if (kind === 'earth-moon') {
    const sats = lowPower ? 6 : 9;
    const debris = lowPower ? 10 : 16;
    return [...Array<ObstacleType>(sats).fill('satellite'), ...Array<ObstacleType>(debris).fill('debris')];
  }
  return Array<ObstacleType>(lowPower ? 18 : 27).fill('rock');
}

export function FlightWorld({ world, from, to, onArrive, lowPower, flareWeight = 1, kind, asteroids = [] }: FlightSceneProps & { lowPower: boolean }) {
  /** Scene units → km on this world (the scene always draws the world 100 units across its radius). */
  const kmPerUnit = WORLD_RADIUS_KM[world] / MOON_RADIUS;
  const reduced = usePrefersReducedMotion();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;

  // Only the Moon has a station (Gateway). Mars has none in this game, so there is nothing to dock at.
  const station = useMemo(() => placesOn(world).find((p) => p.kind === 'station'), [world]);
  const stationPos = useMemo(() => (station ? placePosition(station) : new Vector3(0, 1e5, 0)), [station]);
  const stationUp = useMemo(() => stationPos.clone().normalize(), [stationPos]);
  const dockPoint = useMemo(() => stationPos.clone().addScaledVector(stationUp, -4.5), [stationPos, stationUp]);
  const site = useMemo(() => placePosition(to), [to]);
  const siteUp = useMemo(() => site.clone().normalize(), [site]);
  const landPoint = useMemo(() => site.clone().addScaledVector(siteUp, 3), [site, siteUp]);

  /** Where every try of this flight starts. */
  const startShip = useMemo<Ship>(() => {
    if (kind) return deepSpaceStart(tuple(landPoint), kind);
    const start =
      from.kind === 'station'
        ? shipAt(tuple(dockPoint), 100, -3)
        : from.kind === 'orbit'
          ? shipAt(tuple(placePosition(from)), 100, 0)
          : shipAt(tuple(placePosition(from)), 100, 6);
    return aimAt(start, tuple(landPoint));
    // A flight's start never changes while it is on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ship = useRef<Ship>(startShip);
  const freshRun = () => ({
    hits: 0,
    astronauts: 0,
    docked: false,
    leftStation: Boolean(kind) || from.kind !== 'station',
    invulnerable: kind ? 1.5 : 0,
    shake: 0,
    status: 'flying' as 'flying' | 'crashed' | 'landing' | 'landed',
    landT: 0,
    crashT: 0,
    landFrom: new Vector3(),
    landQuatFrom: new Quaternion(),
    landQuatTo: new Quaternion(),
    landMid: new Vector3(),
    camA: new Vector3(),
    camB: new Vector3(),
    hudTimer: 0,
    arrived: false,
    elapsed: 0,
    safety: SAFETY.start as number,
    // In-flight problems (messages from Mission Control)
    problem: null as FlightProblem | null,
    problemLeft: 0,
    nextProblemIn: PROBLEM_TIMING.first as number,
    used: [] as ProblemId[],
    flares: 0,
  });
  const run = useRef(freshRun());
  const crashes = useRef(0);
  const thrust = useRef(0);
  const rocket = useRef<Group>(null);
  const stationRef = useRef<Group>(null);
  const beacon = useRef<Group>(null);
  const dustRing = useRef<Mesh>(null);

  // ---- Obstacles ----
  const types = useMemo(() => obstacleTypes(kind, lowPower), [kind, lowPower]);
  const obstacles = useMemo<Obstacle[]>(() => {
    const perVariant = [0, 0, 0];
    let sat = 0;
    let deb = 0;
    return types.map((type, i) => {
      const variant = type === 'rock' ? i % 3 : 0;
      const slot = type === 'rock' ? perVariant[variant]++ : type === 'satellite' ? sat++ : deb++;
      return {
        type,
        variant,
        slot,
        pos: new Vector3(),
        vel: new Vector3(),
        radius: 1,
        axis: new Vector3(0, 1, 0),
        spin: 0,
        angle: 0,
        stretch: new Vector3(1, 1, 1),
        ahead: 0,
        touched: false,
        counted: false,
      };
    });
  }, [types]);
  const counts = useMemo(
    () => ({
      rock: [0, 1, 2].map((v) => obstacles.filter((o) => o.type === 'rock' && o.variant === v).length),
      satellite: obstacles.filter((o) => o.type === 'satellite').length,
      debris: obstacles.filter((o) => o.type === 'debris').length,
    }),
    [obstacles],
  );
  const rockGeometries = useMemo(() => [makeRockGeometry(3), makeRockGeometry(7), makeRockGeometry(11)], []);
  const satGeometry = useMemo(makeSatelliteGeometry, []);
  const foil = useMemo(getFoilTexture, []);
  const cells = useMemo(() => {
    const t = getCellTexture().clone();
    t.repeat.set(4, 1);
    t.needsUpdate = true;
    return t;
  }, []);
  const rockMeshes = useRef<(InstancedMesh | null)[]>([null, null, null]);
  const satBodies = useRef<InstancedMesh>(null);
  const satPanels = useRef<InstancedMesh>(null);
  const debrisMesh = useRef<InstancedMesh>(null);
  const nextAsteroid = useRef(0);
  /** Blinking navigation lights on the satellites' wing tips, and warning rings on NASA's hazardous asteroids. */
  const navLights = useRef<InstancedMesh>(null);
  const hazardRings = useRef<InstancedMesh>(null);
  const sparks: SparkTrigger = useRef(null);
  const navColors = useMemo(() => ({ red: new Color('#ff3b3b'), green: new Color('#3bff7a'), off: new Color('#101010') }), []);

  const spawn = (o: Obstacle, ahead: number) => {
    const s = ship.current;
    const forward = v3(s.forward);
    const center = v3(s.pos).addScaledVector(forward, ahead);
    for (let tries = 0; tries < 10; tries++) {
      // Inside a corridor around the flight path, so there is something to dodge.
      const side = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      side.addScaledVector(forward, -side.dot(forward)).normalize();
      o.pos.copy(center).addScaledVector(forward, (Math.random() - 0.5) * 40).addScaledVector(side, 3 + Math.random() * 30);
      const safe =
        o.pos.length() > MOON_RADIUS + 6 &&
        o.pos.distanceTo(v3(s.pos)) > 18 &&
        o.pos.distanceTo(landPoint) > 16 &&
        o.pos.distanceTo(dockPoint) > 14;
      if (safe) break;
    }
    if (o.pos.length() < MOON_RADIUS + 6) o.pos.setLength(MOON_RADIUS + 6 + Math.random() * 30);
    const dir = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    o.axis.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    o.angle = Math.random() * Math.PI * 2;
    o.touched = false;
    o.counted = false;
    o.ahead = o.pos.clone().sub(v3(s.pos)).dot(forward);
    if (o.type === 'rock') {
      // Flight 2: each rock is a real asteroid NASA tracked (sizes and speeds from the data).
      const asteroid = asteroids.length > 0 ? asteroids[nextAsteroid.current++ % asteroids.length] : undefined;
      o.asteroid = asteroid;
      o.radius = asteroid ? asteroidRadius(asteroid.diameterM) : 0.7 + Math.random() ** 2 * 2.6;
      o.vel.copy(dir).multiplyScalar(asteroid ? asteroidSpeed(asteroid.speedKmS) : 0.8 + Math.random() * 3);
      o.spin = (Math.random() - 0.5) * 1.6;
      o.stretch.set(0.8 + Math.random() * 0.5, 0.7 + Math.random() * 0.4, 0.9 + Math.random() * 0.6);
    } else if (o.type === 'satellite') {
      o.radius = 2.2;
      o.vel.copy(dir).multiplyScalar(0.3 + Math.random() * 0.9);
      o.spin = (Math.random() - 0.5) * 0.4;
      o.stretch.set(1, 1, 1);
    } else {
      o.radius = 0.5 + Math.random() * 0.5;
      o.vel.copy(dir).multiplyScalar(1 + Math.random() * 2.5);
      o.spin = (Math.random() - 0.5) * 3;
      o.stretch.set(0.6 + Math.random() * 0.8, 0.3 + Math.random() * 0.4, 0.8 + Math.random() * 0.8);
    }
  };

  const placeCamera = () => {
    const s = ship.current;
    camera.position.copy(v3(s.pos).addScaledVector(v3(s.forward), -CHASE.back).addScaledVector(v3(s.up), CHASE.up));
    camera.up.copy(v3(s.up));
    camera.lookAt(v3(s.pos));
  };

  /** A crash: back to the start of this flight with a fresh Safety. The chapter is not touched. */
  const restart = () => {
    ship.current = startShip;
    run.current = freshRun();
    run.current.invulnerable = 2;
    for (const o of obstacles) spawn(o, 30 + Math.random() * 40);
    placeCamera();
  };

  useEffect(() => {
    for (const o of obstacles) spawn(o, 30 + Math.random() * 40);
    // Station: docking port (model -y) faces the Moon. Beacon: +y away from the ground.
    stationRef.current?.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), stationUp);
    beacon.current?.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), siteUp);
    dustRing.current?.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), siteUp);
    useFlightHud.setState({ ...EMPTY_HUD });
    placeCamera();
    return () => stopEngine();
    // spawn and placeCamera only read refs; this runs once per flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tmp = useMemo(
    () => ({
      basis: new Matrix4(),
      q: new Quaternion(),
      dummy: new Object3D(),
      desired: new Vector3(),
      look: new Vector3(),
      x: new Vector3(),
      rel: new Vector3(),
      n: new Vector3(),
      side: new Vector3(),
    }),
    [],
  );

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const r = run.current;
    let s = ship.current;
    const skip = useFlightHud.getState().skipLanding;

    if (r.status === 'flying') {
      r.elapsed += dt;
      // ---- In-flight problems: a new message from Mission Control every 10–15 seconds ----
      if (r.problem) {
        r.problemLeft -= dt;
        if (r.problemLeft <= 0) {
          if (r.problem.flare) {
            r.flares += 1;
            showToast('Caught in the flare. Radiation dose +5 when you land.', 'bad');
          }
          r.problem = null;
          r.nextProblemIn = PROBLEM_TIMING.gapMin + Math.random() * (PROBLEM_TIMING.gapMax - PROBLEM_TIMING.gapMin);
        }
      } else {
        r.nextProblemIn -= dt;
        if (r.nextProblemIn <= 0) {
          const problem = nextProblem(Math.random, r.used, flareWeight);
          r.used.push(problem.id);
          r.problem = problem;
          r.problemLeft = problem.seconds;
          sfx.radio();
          // A swarm: move some obstacles into the path ahead.
          for (let i = 0; i < (problem.extraRocks ?? 0) && i < obstacles.length; i++) spawn(obstacles[i], 34);
        }
      }
      const mods = r.problem?.mods ?? {};

      const input = readInput();
      s = stepShip(s, input, dt, mods);
      thrust.current += (Math.max(0, Math.min(1, input.thrust)) - thrust.current) * Math.min(1, dt * 8);

      // ---- Obstacles drift and spin; far-away ones come back ahead of the ship ----
      const shipPos = v3(s.pos);
      const forward = v3(s.forward);
      r.invulnerable = Math.max(0, r.invulnerable - dt);
      for (const o of obstacles) {
        o.pos.addScaledVector(o.vel, dt);
        o.angle += o.spin * dt;
        if (o.pos.distanceTo(shipPos) > 95) {
          spawn(o, 55 + Math.random() * 30);
          continue;
        }
        tmp.rel.copy(o.pos).sub(shipPos);
        const ahead = tmp.rel.dot(forward);
        const lateral = tmp.side.copy(tmp.rel).addScaledVector(forward, -ahead).length();
        // Passed cleanly: +5 Safety.
        if (!o.touched && !o.counted && didPass(o.ahead, ahead, lateral)) {
          o.counted = true;
          r.safety = changeSafety(r.safety, 'pass');
        }
        o.ahead = ahead;
        // Touching it: a slow touch is a graze, a fast one a crash.
        if (r.status === 'flying' && r.invulnerable === 0 && tmp.rel.length() < o.radius * 0.9 + FLIGHT.shipRadius) {
          tmp.n.copy(tmp.rel).normalize();
          const closing = v3(s.vel).sub(o.vel).dot(tmp.n);
          if (contactKind(closing) === 'crash') {
            r.status = 'crashed';
            r.crashT = 0;
            r.shake = 1.4;
            crashes.current += 1;
            sparks.current = { x: s.pos[0], y: s.pos[1], z: s.pos[2] };
            s = { ...s, vel: scale(s.vel, -0.2) };
            sfx.hit();
            showToast('Impact. The flight restarts from the start. Your chapter is safe.', 'bad');
            break;
          }
          o.touched = true;
          r.hits += 1;
          sparks.current = { x: (s.pos[0] + o.pos.x) / 2, y: (s.pos[1] + o.pos.y) / 2, z: (s.pos[2] + o.pos.z) / 2 };
          r.invulnerable = 1.2;
          r.shake = 0.8;
          r.safety = changeSafety(r.safety, 'graze');
          // Bounce off.
          s = { ...s, vel: scale(normalize(sub(s.pos, tuple(o.pos))), 6) };
          sfx.hit();
          showToast(
            `Graze: Safety ${SAFETY.graze}.${r.hits <= FLIGHT_EFFECTS.maxHits ? ` Repairs on arrival: Power ${FLIGHT_EFFECTS.powerPerHit}.` : ''} Slow down near obstacles.`,
            'bad',
          );
        }
      }

      if (r.status === 'flying') {
        // Docking at the station: pick up astronauts and refill the tank.
        const toDock = distance(s.pos, tuple(dockPoint));
        if (toDock > 20) r.leftStation = true;
        if (station && !r.docked && r.leftStation && toDock < FLIGHT.arriveRadius) {
          r.docked = true;
          sfx.dock();
          r.astronauts += FLIGHT_EFFECTS.astronautsPerDock;
          s = { ...s, fuel: 100, vel: scale(s.vel, 0.3) };
          // The station is shielded: docking during a flare warning keeps the crew safe.
          if (r.problem?.flare) r.problem = null;
          showToast(
            `Docked at Gateway: ${FLIGHT_EFFECTS.astronautsPerDock} astronauts joined (Morale +${FLIGHT_EFFECTS.astronautsPerDock * FLIGHT_EFFECTS.moralePerAstronaut}). Tank refilled.`,
            'good',
          );
        }

        // Landing: inside the beacon's zone, the autopilot takes over for touchdown.
        if (canArrive(s, tuple(landPoint))) {
          r.status = 'landing';
          r.landT = reduced ? 1 : 0;
          r.landFrom.copy(v3(s.pos));
          if (rocket.current) r.landQuatFrom.copy(rocket.current.quaternion);
          const upT = tuple(siteUp);
          const flat = sub(s.forward, scale(upT, dot(s.forward, upT)));
          const roof = Math.hypot(...flat) > 1e-3 ? normalize(flat) : normalize(cross(upT, [1, 0, 0]));
          tmp.basis.makeBasis(v3(cross(roof, upT)), v3(roof), siteUp);
          r.landQuatTo.setFromRotationMatrix(tmp.basis);
          // The curve: over the site at about the current height, then straight down.
          const height = Math.max(22, r.landFrom.clone().sub(site).dot(siteUp));
          r.landMid.copy(site).addScaledVector(siteUp, height);
          r.camA.copy(v3(roof)).negate();
          r.camB.crossVectors(siteUp, r.camA).normalize();
          showToast(r.problem?.flare ? `Landing at ${to.name}: shielded from the flare in time.` : `Landing at ${to.name}…`, 'info');
          r.problem = null;
        }
      }
    } else if (r.status === 'crashed') {
      // The impact: a moment of shake, then this flight starts again.
      r.crashT += dt;
      s = { ...s, pos: tuple(v3(s.pos).addScaledVector(v3(s.vel), dt)) };
      thrust.current = 0;
      if (r.crashT >= (reduced ? 0.6 : CRASH_SECONDS)) {
        restart();
        s = ship.current;
      }
    } else if (r.status === 'landing') {
      // Engine flare on the way down, the camera dropping in behind.
      r.landT = Math.min(1, r.landT + dt / LANDING.descent);
      // Ease in and out along a curve: across to over the site, then a braking drop.
      const e = easeInOut(r.landT);
      const touchdown = site.clone().addScaledVector(siteUp, 1.4 * ROCKET_SCALE);
      const a = r.landFrom.clone().multiplyScalar((1 - e) * (1 - e));
      const b = r.landMid.clone().multiplyScalar(2 * (1 - e) * e);
      s = { ...s, pos: tuple(a.add(b).addScaledVector(touchdown, e * e)), vel: [0, 0, 0] };
      // Braking burn: the flame grows as the ground comes up, then cuts at touchdown.
      thrust.current = r.landT < 0.94 ? 0.55 + 0.75 * r.landT : (1 - r.landT) * 20;
      if (r.landT >= 1) {
        r.status = 'landed';
        sfx.land();
        r.landT = 0;
        thrust.current = 0;
      }
      if (skip && !r.arrived) {
        r.arrived = true;
        onArrive({ hits: r.hits, astronauts: r.astronauts, flares: r.flares, autopilot: false, safety: r.safety });
      }
    } else if (!r.arrived) {
      // Touchdown: the legs settle, a ring of dust spreads, then the mission begins.
      r.landT += dt;
      if (r.landT > LANDING.settle || skip) {
        r.arrived = true;
        onArrive({ hits: r.hits, astronauts: r.astronauts, flares: r.flares, autopilot: false, safety: r.safety });
      }
    }
    ship.current = s;
    setEngine(thrust.current);

    // ---- Draw the rocket ----
    const g = rocket.current;
    if (g) {
      g.position.set(...s.pos);
      if (r.status === 'flying' || r.status === 'crashed') {
        tmp.basis.makeBasis(v3(cross(s.up, s.forward)), v3(s.up), v3(s.forward));
        g.quaternion.setFromRotationMatrix(tmp.basis);
      } else {
        g.quaternion.slerpQuaternions(r.landQuatFrom, r.landQuatTo, r.status === 'landed' ? 1 : easeInOut(Math.min(1, r.landT * 1.8)));
      }
      // Legs compress for a moment at touchdown.
      const squash = r.status === 'landed' && !reduced ? 1 - 0.08 * Math.max(0, 1 - Math.abs(r.landT - 0.12) / 0.25) : 1;
      g.scale.set(ROCKET_SCALE, ROCKET_SCALE, ROCKET_SCALE * squash);
      // Blink while protected after a graze.
      g.visible = r.status === 'crashed' ? Math.floor(r.crashT * 12) % 2 === 0 : r.invulnerable === 0 || Math.floor(r.invulnerable * 10) % 2 === 0;
    }

    // ---- Dust ring at touchdown ----
    const ring = dustRing.current;
    if (ring) {
      const t = r.status === 'landed' && !reduced ? Math.min(1, r.landT / LANDING.settle) : 0;
      ring.visible = t > 0;
      ring.scale.setScalar(0.5 + t * 9);
      (ring.material as MeshBasicMaterial).opacity = 0.55 * (1 - t);
    }

    // ---- Obstacles ----
    obstacles.forEach((o) => {
      tmp.dummy.position.copy(o.pos);
      tmp.dummy.quaternion.setFromAxisAngle(o.axis, o.angle);
      if (o.type === 'rock') {
        tmp.dummy.scale.copy(o.stretch).multiplyScalar(o.radius);
        tmp.dummy.updateMatrix();
        rockMeshes.current[o.variant]?.setMatrixAt(o.slot, tmp.dummy.matrix);
      } else if (o.type === 'debris') {
        tmp.dummy.scale.copy(o.stretch).multiplyScalar(o.radius);
        tmp.dummy.updateMatrix();
        debrisMesh.current?.setMatrixAt(o.slot, tmp.dummy.matrix);
      } else {
        // A satellite: a gold-foil body with two solar wings.
        tmp.dummy.scale.set(1.3, 1, 1);
        tmp.dummy.updateMatrix();
        satBodies.current?.setMatrixAt(o.slot, tmp.dummy.matrix);
        for (const [k, sideSign] of [1, -1].entries()) {
          tmp.x.set(sideSign * 2.3, 0, 0).applyQuaternion(tmp.dummy.quaternion);
          tmp.dummy.position.copy(o.pos).add(tmp.x);
          tmp.dummy.scale.set(2.6, 0.06, 1.1);
          tmp.dummy.updateMatrix();
          satPanels.current?.setMatrixAt(o.slot * 2 + k, tmp.dummy.matrix);
        }
      }
    });
    // Wing-tip lights blink red and green in turn; hazardous asteroids get a pulsing amber ring
    // that faces the camera (NASA flags them as potentially hazardous; the HUD says so in words too).
    const time = r.elapsed;
    let hz = 0;
    obstacles.forEach((o) => {
      if (o.type === 'satellite' && navLights.current) {
        tmp.dummy.quaternion.setFromAxisAngle(o.axis, o.angle);
        for (const [k, sideSign] of [1, -1].entries()) {
          tmp.x.set(sideSign * 3.65, 0, 0).applyQuaternion(tmp.dummy.quaternion);
          tmp.dummy.position.copy(o.pos).add(tmp.x);
          tmp.dummy.scale.setScalar(0.16);
          tmp.dummy.updateMatrix();
          navLights.current.setMatrixAt(o.slot * 2 + k, tmp.dummy.matrix);
          const on = reduced || Math.sin(time * 5 + o.slot + k * Math.PI) > 0.3;
          navLights.current.setColorAt(o.slot * 2 + k, on ? (k ? navColors.green : navColors.red) : navColors.off);
        }
      }
      if (o.asteroid?.hazardous && hazardRings.current && hz < HAZARD_RINGS) {
        tmp.dummy.position.copy(o.pos);
        tmp.dummy.quaternion.copy(camera.quaternion);
        tmp.dummy.scale.setScalar(o.radius * (1.7 + (reduced ? 0 : 0.18 * Math.sin(time * 4 + o.slot))));
        tmp.dummy.updateMatrix();
        hazardRings.current.setMatrixAt(hz++, tmp.dummy.matrix);
      }
    });
    if (hazardRings.current) {
      hazardRings.current.count = hz;
      hazardRings.current.instanceMatrix.needsUpdate = true;
    }
    if (navLights.current?.instanceColor) navLights.current.instanceColor.needsUpdate = true;
    for (const mesh of [...rockMeshes.current, satBodies.current, satPanels.current, debrisMesh.current, navLights.current]) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }

    // ---- Chase camera ----
    const pos = v3(s.pos);
    if (r.status === 'flying' || r.status === 'crashed') {
      tmp.desired.copy(pos).addScaledVector(v3(s.forward), -CHASE.back).addScaledVector(v3(s.up), CHASE.up);
      tmp.look.copy(pos).addScaledVector(v3(s.forward), CHASE.ahead);
    } else {
      // Landing cut-scene: the camera swings from behind the rocket round to its side and comes in low.
      const c = r.status === 'landing' ? easeInOut(r.landT) : 1;
      const angle = c * 1.9;
      const dist = (34 - 16 * c) * (ROCKET_SCALE / 3);
      tmp.desired
        .copy(pos)
        .addScaledVector(r.camA, Math.cos(angle) * dist)
        .addScaledVector(r.camB, Math.sin(angle) * dist)
        .addScaledVector(siteUp, (14 - 10 * c) * (ROCKET_SCALE / 3));
      tmp.look.copy(pos).addScaledVector(siteUp, -2 * c);
    }
    const landingCam = r.status === 'landing' || r.status === 'landed';
    camera.position.lerp(tmp.desired, 1 - Math.exp(-(landingCam ? 2.2 : 5) * dt));
    if (camera.position.length() < MOON_RADIUS + 0.8) camera.position.setLength(MOON_RADIUS + 0.8);
    camera.up.lerp(r.status === 'flying' || r.status === 'crashed' ? v3(s.up) : siteUp, 1 - Math.exp(-4 * dt)).normalize();
    if (!reduced && r.shake > 0) {
      camera.position.add(tmp.x.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(r.shake * 0.9));
      r.shake = Math.max(0, r.shake - dt * 2.2);
    }
    // The look point glides, so steering the rocket does not jerk the view.
    // A new flight (or a restart far away) starts from the right point instead of swinging over.
    if (reduced || flightLook.lengthSq() === 0 || flightLook.distanceTo(tmp.look) > camera.position.distanceTo(tmp.look) * 2) flightLook.copy(tmp.look);
    else flightLook.lerp(tmp.look, 1 - Math.exp(-12 * dt));
    camera.lookAt(flightLook);
    const fov = reduced ? 58 : 56 + (Math.hypot(...s.vel) / FLIGHT.maxSpeed) * 12;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }

    // ---- HUD, about ten times a second ----
    r.hudTimer -= dt;
    if (r.hudTimer <= 0) {
      r.hudTimer = 0.1;
      const projected = site.clone().project(camera);
      const camForward = tmp.x.set(0, 0, -1).applyQuaternion(camera.quaternion).clone();
      const inFront = site.clone().sub(camera.position).dot(camForward) > 0;
      // Real NASA names next to the nearest asteroids on screen (Flight 2).
      const labels: ObstacleLabel[] = [];
      if (r.status === 'flying') {
        const near = obstacles
          .map((o, i) => ({ o, i, d: o.pos.distanceTo(camera.position) }))
          .filter(({ o, d }) => o.asteroid && d < 120 && o.pos.clone().sub(camera.position).dot(camForward) > 0)
          .sort((a, b) => a.d - b.d)
          .slice(0, 5);
        for (const { o, i } of near) {
          const p = o.pos.clone().project(camera);
          if (Math.abs(p.x) > 0.95 || Math.abs(p.y) > 0.9) continue;
          labels.push({ key: i, x: p.x, y: p.y, name: o.asteroid!.name, diameterM: o.asteroid!.diameterM, speedKmS: o.asteroid!.speedKmS, hazardous: o.asteroid!.hazardous });
        }
      }
      const targetDistance = distance(s.pos, tuple(site));
      useFlightHud.setState({
        altitudeKm: altitudeKm(s, WORLD_RADIUS_KM[world]),
        speedMs: speedMs(s, WORLD_RADIUS_KM[world]),
        fuel: s.fuel,
        thrust: thrust.current,
        targetKm: targetDistance * kmPerUnit,
        stationKm: station ? distance(s.pos, tuple(dockPoint)) * kmPerUnit : -1,
        hits: r.hits,
        flares: r.flares,
        problem: r.problem ? { ...r.problem, left: Math.max(0, r.problemLeft) } : null,
        astronauts: r.astronauts,
        docked: r.docked,
        status: r.status,
        safety: r.safety,
        phase: flightPhase(r.elapsed, targetDistance, r.status === 'landing' || r.status === 'landed'),
        crashes: crashes.current,
        labels,
        guide: {
          x: inFront ? projected.x : -projected.x,
          y: inFront ? projected.y : -projected.y,
          onScreen: inFront && Math.abs(projected.x) < 0.92 && Math.abs(projected.y) < 0.88,
        },
      });
    }
  });

  return (
    <>
      <group ref={rocket} scale={ROCKET_SCALE}>
        <Rocket thrust={thrust} reduced={reduced} />
      </group>
      {/* SPEC Part 13: no particles with reduced motion (the flame cone still shows thrust). */}
      {!reduced && <Exhaust ship={ship} thrust={thrust} count={lowPower ? 90 : 180} />}
      {!reduced && <SpaceDust ship={ship} count={lowPower ? 160 : 320} />}
      {[0, 1, 2].map((v) =>
        counts.rock[v] > 0 ? (
          <instancedMesh
            key={v}
            ref={(mesh) => {
              rockMeshes.current[v] = mesh;
            }}
            args={[rockGeometries[v], undefined, counts.rock[v]]}
            frustumCulled={false}
          >
            <meshStandardMaterial color={['#8a837c', '#7b766f', '#958c81'][v]} roughness={0.95} metalness={0.05} vertexColors flatShading />
          </instancedMesh>
        ) : null,
      )}
      {counts.satellite > 0 && (
        <>
          <instancedMesh ref={satBodies} args={[satGeometry, undefined, counts.satellite]} frustumCulled={false}>
            <meshStandardMaterial vertexColors map={foil} roughness={0.38} metalness={0.75} />
          </instancedMesh>
          <instancedMesh ref={satPanels} args={[undefined, undefined, counts.satellite * 2]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial map={cells} color="#ffffff" roughness={0.3} metalness={0.5} emissive="#0c1a3a" emissiveIntensity={0.4} />
          </instancedMesh>
        </>
      )}
      {counts.satellite > 0 && (
        <instancedMesh ref={navLights} args={[undefined, undefined, counts.satellite * 2]} frustumCulled={false}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
      {kind === 'moon-mars' && (
        <instancedMesh ref={hazardRings} args={[undefined, undefined, HAZARD_RINGS]} frustumCulled={false}>
          <ringGeometry args={[1, 1.07, 48]} />
          <meshBasicMaterial color="#FFB547" transparent opacity={0.7} side={DoubleSide} depthWrite={false} toneMapped={false} />
        </instancedMesh>
      )}
      <SparkBurst trigger={sparks} count={lowPower ? 40 : 70} speed={8} gravity={0} size={0.3} />
      {counts.debris > 0 && (
        <instancedMesh ref={debrisMesh} args={[undefined, undefined, counts.debris]} frustumCulled={false}>
          <tetrahedronGeometry args={[1]} />
          <meshStandardMaterial color="#8d929b" roughness={0.6} metalness={0.5} />
        </instancedMesh>
      )}
      {station && (
        <group ref={stationRef} position={stationPos}>
          <Station reduced={reduced} />
        </group>
      )}
      <group ref={beacon} position={site}>
        <Beacon reduced={reduced} color="#FFB547" />
      </group>
      <mesh ref={dustRing} position={site.clone().addScaledVector(siteUp, 0.4)} visible={false}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial color="#cfc6b8" transparent opacity={0} depthWrite={false} />
      </mesh>
      {!reduced && <Comet ship={ship} reduced={reduced} />}
    </>
  );
}

// ---- Engine exhaust: glowing particles that stay behind in space ----

/**
 * Soft reflections on metal (the rocket, the station), made in code: a warm panel where the Sun
 * is and a dim blue one where the Earth is. No image files.
 */
export function SpaceReflections() {
  const sun = SUN_DIRECTION.clone().multiplyScalar(10);
  return (
    <Environment resolution={64} frames={1} environmentIntensity={0.55}>
      <color attach="background" args={['#05070d']} />
      <Lightformer form="circle" intensity={6} color="#fff1dc" position={sun.toArray()} scale={3} />
      <Lightformer form="rect" intensity={0.6} color="#6f8fd6" position={[-6, 2, 6]} scale={[6, 3, 1]} />
      <Lightformer form="rect" intensity={0.25} color="#ffffff" position={[0, -8, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
    </Environment>
  );
}

function Exhaust({ ship, thrust, count }: { ship: { current: Ship }; thrust: { current: number }; count: number }) {
  const data = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new BufferAttribute(alphas, 1));
    return { geometry, positions, alphas, vel: new Float32Array(count * 3), life: new Float32Array(count), max: new Float32Array(count), next: 0, carry: 0 };
  }, [count]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = ship.current;
    const d = data;
    d.carry += thrust.current * count * 1.6 * dt;
    while (d.carry >= 1) {
      d.carry -= 1;
      const i = d.next;
      d.next = (d.next + 1) % count;
      for (let k = 0; k < 3; k++) {
        d.positions[i * 3 + k] = s.pos[k] - s.forward[k] * 1.8 * ROCKET_SCALE;
        d.vel[i * 3 + k] = s.vel[k] * 0.5 - s.forward[k] * (9 + Math.random() * 6) + (Math.random() - 0.5) * 1.6;
      }
      d.max[i] = d.life[i] = 0.35 + Math.random() * 0.4;
    }
    for (let i = 0; i < count; i++) {
      if (d.life[i] <= 0) {
        d.alphas[i] = 0;
        continue;
      }
      d.life[i] -= dt;
      for (let k = 0; k < 3; k++) d.positions[i * 3 + k] += d.vel[i * 3 + k] * dt;
      d.alphas[i] = Math.max(0, d.life[i] / d.max[i]);
    }
    d.geometry.attributes.position.needsUpdate = true;
    d.geometry.attributes.alpha.needsUpdate = true;
  });

  return (
    <points geometry={data.geometry} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexShader={/* glsl */ `
          attribute float alpha; varying float vA;
          void main() {
            vA = alpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (0.7 + (1.0 - alpha) * 2.4) * 260.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          varying float vA;
          void main() {
            float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vA * 0.55;
            vec3 col = mix(vec3(0.55, 0.25, 0.12), vec3(1.0, 0.82, 0.55), vA);
            gl_FragColor = vec4(col * a, a);
          }`}
      />
    </points>
  );
}

// ---- Space dust: tiny specks around the ship that make speed visible ----

function SpaceDust({ ship, count }: { ship: { current: Ship }; count: number }) {
  const size = 60;
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const s = ship.current.pos;
    for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) positions[i * 3 + k] = s[k] + (Math.random() - 0.5) * size;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return { geometry, positions };
    // Built once per flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
  useFrame(() => {
    const s = ship.current.pos;
    const p = data.positions;
    for (let i = 0; i < p.length; i++) {
      const offset = p[i] - s[i % 3];
      if (offset > size / 2) p[i] -= size;
      else if (offset < -size / 2) p[i] += size;
    }
    data.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points geometry={data.geometry} frustumCulled={false}>
      <pointsMaterial color="#c9d3e6" size={0.09} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

// ---- A comet passing far away. Its tail points away from the Sun. ----

function Comet({ ship, reduced }: { ship: { current: Ship }; reduced: boolean }) {
  const group = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const state = useRef({ t: -6, placed: false, start: new Vector3(), dir: new Vector3() });
  useEffect(() => {
    tail.current?.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), SUN_DIRECTION.clone().negate());
  }, []);
  useFrame((_, dt) => {
    const c = state.current;
    const g = group.current;
    if (!g) return;
    c.t += Math.min(dt, 0.05);
    if (c.t > 40) {
      c.t = -14; // a pause between comets
      c.placed = false;
    }
    if (c.t < 0) {
      g.visible = false;
      return;
    }
    if (!c.placed) {
      // Pick a path far from the ship, crossing its view.
      const s = ship.current;
      const side = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      c.start.copy(v3(s.pos)).addScaledVector(v3(s.forward), 260).addScaledVector(side, 160);
      c.dir.copy(side).negate();
      c.placed = true;
    }
    g.visible = true;
    g.position.copy(c.start).addScaledVector(c.dir, c.t * (reduced ? 4 : 9));
  });
  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[1.4, 12, 8]} />
        <meshBasicMaterial color="#e8f6ff" />
      </mesh>
      <group ref={tail}>
        {/* Cone flipped so its point sits at the comet's head and it widens away from it. */}
        <mesh position={[0, 22, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[5, 44, 20, 1, true]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            vertexShader={/* glsl */ `varying float vT; void main() { vT = position.y / 44.0 + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
            fragmentShader={/* glsl */ `varying float vT; void main() { float a = pow(vT, 2.0) * 0.35; gl_FragColor = vec4(vec3(0.6, 0.85, 1.0) * a, a); }`}
          />
        </mesh>
      </group>
    </group>
  );
}
