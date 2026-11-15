// Built with help from Claude (Anthropic).
// The walkable 3D world: the base on the surface of the Moon or Mars, the player's astronaut in
// third person, crew mates, the objective beacon, Olympus Mons on Mars, and two cut-scenes: the
// rocket launch (flame and rolling smoke, Boss's reference photo) and the flag at the summit.
// Performance: DPR ≤ 1.5, one Sun light with one shadow map that follows the astronaut (desktop only).
import { Html } from '@react-three/drei';
import { SpaceReflections } from '../flight/FlightScene';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { BufferAttribute, BufferGeometry, Color, Vector3, type DirectionalLight, type Group } from 'three';
import type { WorldId } from '../../engine/campaign';
import type { OlympusEnding } from '../../engine/scoring';
import type { Parts } from '../../engine/types';
import { walkLive, type Interactable } from '../../store/walk';
import { SceneBoundary } from '../MoonbaseScene';
import { Beacon } from '../space/Craft';
import { BootDust } from '../space/Fx';
import { SUN_DIRECTION, Sky } from '../space/Sky';
import { DPR, FpsWatch, isLowMemoryDevice, isLowPowerDevice, watchContextLoss } from '../space/webgl';
import { BaseModel, ROCKET_BASE_Y } from './BaseModel';
import { GRAVITY, ROCKET_PAD, SPAWN, type Vec2 } from './layout';
import { Camps, LIT_BY_TIER, MissionFlag, OlympusStation } from './Olympus';
import { Player } from './Player';
import { Boulders, MarsSky, Terrain } from './Ground';
import { Outposts } from './Outposts';
import { heightAt } from './terrain';

export interface Objective {
  x: number;
  z: number;
  /** "Greenhouse dome" */
  label: string;
}

export interface WalkSceneProps {
  world: WorldId;
  parts: Parts;
  frozen: boolean;
  interactables: readonly Interactable[];
  onInteract: (id: string) => void;
  objective: Objective | null;
  reduced: boolean;
  band?: string;
  /** Camps whose missions are done (their lights are on), Mars only. */
  campsReached?: number;
  /** The launch cut-scene: the rocket lifts off, then `onLaunched` fires. */
  launching?: boolean;
  onLaunched?: () => void;
  /** The summit: how far the flag is raised (0–1), and the ending's station lights. */
  flag?: number;
  station?: { tier: OlympusEnding; progress: number } | null;
  /** Other crew members (online party), drawn inside the canvas. */
  crew?: ReactNode;
  /** Where the hopper is parked (the pad of the outpost the crew is at). */
  parkedAt?: readonly [number, number] | null;
}

export function WalkScene(props: WalkSceneProps) {
  const [lowPower] = useState(isLowPowerDevice);
  return (
    <SceneBoundary>
      <Canvas
        dpr={DPR}
        shadows={lowPower ? false : 'percentage'}
        camera={{ fov: 55, near: 0.1, far: 6000, position: [0, 4, 24] }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        onCreated={watchContextLoss}
        aria-hidden
      >
        <WalkWorld {...props} lowPower={lowPower} />
        <FpsWatch />
      </Canvas>
    </SceneBoundary>
  );
}

function WalkWorld(p: WalkSceneProps & { lowPower: boolean }) {
  const { world, reduced } = p;
  const thrust = useRef(0);
  const rocket = useRef<Group | null>(null);
  const mars = world === 'mars';
  const flag = p.flag ?? 0;
  return (
    <>
      <color attach="background" args={[mars ? '#1a0f0e' : '#020308']} />
      {mars && <fog attach="fog" args={['#b98066', 160, 900]} />}
      <SunRig world={world} shadows={!p.lowPower} />
      <Sky earth={!mars} stars={mars ? 900 : 3200} />
      {/* Soft reflections on metal, foil and visors (made in code, no image files). */}
      <SpaceReflections />
      {mars && <MarsSky />}
      <Terrain world={world} />
      <Boulders world={world} count={p.lowPower ? 140 : 320} />
      <BaseModel world={world} parts={p.parts} rocketThrust={thrust} rocketRef={rocket} reduced={reduced} />
      <Outposts world={world} parkedAt={p.parkedAt} reduced={reduced} />
      {mars && (
        <>
          <Camps reached={p.campsReached ?? 0} />
          {flag > 0 && <MissionFlag raised={flag} />}
          {p.station && <OlympusStation lit={LIT_BY_TIER[p.station.tier]} progress={p.station.progress} />}
        </>
      )}
      {p.objective && !p.launching && <ObjectiveMarker objective={p.objective} world={world} reduced={reduced} />}
      <Player
        world={world}
        frozen={p.frozen || Boolean(p.launching)}
        spawn={SPAWN}
        interactables={p.interactables}
        onInteract={p.onInteract}
        band={p.band}
        reduced={reduced}
        reach={flag > 0 && flag < 1 ? 1 : 0}
        hidden={Boolean(p.launching)}
        cameraOff={Boolean(p.launching)}
      />
      {!reduced && !p.launching && (
        <BootDust
          source={() => ({ x: walkLive.x, y: walkLive.y, z: walkLive.z, speed: walkLive.speed, air: walkLive.air })}
          gravity={GRAVITY[world]}
          color={mars ? '#c08a6c' : '#b9b6b0'}
          mars={mars}
        />
      )}
      {p.crew}
      {p.launching && <Launch rocket={rocket} thrust={thrust} reduced={reduced} onDone={p.onLaunched} world={world} />}
    </>
  );
}

/** The Sun: low and hard on the Moon (long black shadows), warmer on Mars. Its shadow box follows the astronaut. */
export function SunRig({ world, shadows }: { world: WorldId; shadows: boolean }) {
  const light = useRef<DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(walkLive.x, walkLive.y, walkLive.z);
    l.position.set(walkLive.x + SUN_DIRECTION.x * 120, walkLive.y + SUN_DIRECTION.y * 120, walkLive.z + SUN_DIRECTION.z * 120);
  });
  const mars = world === 'mars';
  return (
    <>
      <directionalLight
        ref={light}
        intensity={mars ? 2.4 : 3.1}
        color={mars ? '#ffd8b0' : '#fff6ea'}
        castShadow={shadows}
        shadow-mapSize={isLowMemoryDevice() ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
      {/* Moon: almost no fill (no air), just earthshine and light bounced off the ground. Mars: the dusty sky lights the shadows. */}
      <hemisphereLight args={mars ? ['#e0a184', '#4a2a1c', 0.55] : ['#8ea4d8', '#5a5856', 0.22]} />
      <ambientLight intensity={mars ? 0.12 : 0.04} />
    </>
  );
}

/** The amber beacon on the objective, with its name and distance above it. */
function ObjectiveMarker({ objective, world, reduced }: { objective: Objective; world: WorldId; reduced: boolean }) {
  const label = useRef<HTMLSpanElement>(null);
  const y = heightAt(world, objective.x, objective.z);
  useFrame(() => {
    if (!label.current) return;
    label.current.textContent = `${Math.round(Math.hypot(objective.x - walkLive.x, objective.z - walkLive.z))} m`;
  });
  return (
    <group position={[objective.x, y, objective.z]}>
      <group scale={0.45}>
        <Beacon reduced={reduced} />
      </group>
      <Html position={[0, 4.2, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap border border-sun/60 bg-space-950/80 px-2 py-1 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white">
          <span className="text-sun">{objective.label}</span> · <span ref={label}>–</span>
        </div>
      </Html>
    </group>
  );
}

// ---- Launch cut-scene ----

const LAUNCH_SECONDS = 7;

/** Ignition, smoke rolling out across the pad, lift-off, the camera tilting up to follow. Then `onDone`. */
function Launch({
  rocket,
  thrust,
  reduced,
  onDone,
  world,
}: {
  rocket: MutableRefObject<Group | null>;
  thrust: MutableRefObject<number>;
  reduced: boolean;
  onDone?: () => void;
  world: WorldId;
}) {
  const camera = useThree((s) => s.camera);
  const t = useRef(0);
  const done = useRef(false);
  const camPos = useMemo(() => new Vector3(ROCKET_PAD[0] - 30, 5, ROCKET_PAD[1] + 26), []);
  const look = useMemo(() => new Vector3(), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    t.current += dt;
    const time = t.current;
    if (reduced) {
      if (time > 0.6 && !done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    // 0–1.6 s ignition (flame builds, smoke spreads), then lift-off, faster and faster.
    thrust.current = Math.min(1.6, time * 1.1);
    const climb = time < 1.6 ? 0 : 0.9 * (time - 1.6) ** 2.2;
    const g = rocket.current;
    if (g) {
      g.position.y = ROCKET_BASE_Y + climb;
      g.position.x = ROCKET_PAD[0] + (time < 2.2 ? (Math.random() - 0.5) * 0.06 : 0);
    }
    camera.position.lerp(camPos, 0.08);
    look.set(ROCKET_PAD[0], ROCKET_BASE_Y + 2 + climb * 0.85, ROCKET_PAD[1]);
    camera.lookAt(look);
    if (time > LAUNCH_SECONDS && !done.current) {
      done.current = true;
      onDone?.();
    }
  });
  return reduced ? null : <LaunchSmoke origin={ROCKET_PAD} world={world} rocket={rocket} />;
}

const SMOKE_COUNT = 260;

/**
 * Smoke and lifted dust rolling out from the pad, lit orange from below by the flame near the
 * ground (the launch reference). Soft billowing puffs drawn as points; no image files.
 */
function LaunchSmoke({ origin, world, rocket }: { origin: Vec2; world: WorldId; rocket: MutableRefObject<Group | null> }) {
  const data = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(SMOKE_COUNT * 3);
    const age = new Float32Array(SMOKE_COUNT).fill(-1);
    const seed = new Float32Array(SMOKE_COUNT);
    for (let i = 0; i < SMOKE_COUNT; i++) seed[i] = Math.random();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('age', new BufferAttribute(age, 1));
    g.setAttribute('seed', new BufferAttribute(seed, 1));
    return { g, pos, age, vel: new Float32Array(SMOKE_COUNT * 3), next: 0, carry: 0 };
  }, []);
  useEffect(() => () => data.g.dispose(), [data]);
  const uniforms = useMemo(() => ({ uTint: { value: new Color(world === 'mars' ? '#b98a74' : '#a9a7a3') } }), [world]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const d = data;
    const lifted = (rocket.current?.position.y ?? ROCKET_BASE_Y) - ROCKET_BASE_Y;
    // New puffs while the flame still reaches the ground.
    if (lifted < 30) {
      d.carry += dt * 75;
      while (d.carry >= 1) {
        d.carry -= 1;
        const i = d.next++ % SMOKE_COUNT;
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 9;
        d.pos.set([origin[0] + Math.cos(a) * 1.5, 0.6 + Math.random(), origin[1] + Math.sin(a) * 1.5], i * 3);
        d.vel.set([Math.cos(a) * sp, 0.6 + Math.random() * 2.2, Math.sin(a) * sp], i * 3);
        d.age[i] = 0;
      }
    }
    for (let i = 0; i < SMOKE_COUNT; i++) {
      if (d.age[i] < 0) continue;
      d.age[i] += dt;
      if (d.age[i] > 6) {
        d.age[i] = -1;
        continue;
      }
      // Spreads fast, then slows as it billows.
      const drag = Math.exp(-dt * 0.9);
      d.vel[i * 3] *= drag;
      d.vel[i * 3 + 2] *= drag;
      d.vel[i * 3 + 1] *= Math.exp(-dt * 0.5);
      d.pos[i * 3] += d.vel[i * 3] * dt;
      d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
      d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
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
          attribute float age;
          attribute float seed;
          varying float vAge;
          varying float vSeed;
          varying float vHeight;
          void main() {
            vAge = age; vSeed = seed; vHeight = position.y;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float size = age < 0.0 ? 0.0 : (2.5 + age * 3.2) * (0.7 + seed * 0.6);
            gl_PointSize = size * 420.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uTint;
          varying float vAge;
          varying float vSeed;
          varying float vHeight;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          void main() {
            if (vAge < 0.0) discard;
            vec2 c = gl_PointCoord - 0.5;
            float billow = noise(c * 5.0 + vSeed * 17.0) * 0.35 + noise(c * 11.0 + vSeed * 5.0) * 0.15;
            float r = length(c) + billow * 0.25;
            float puff = smoothstep(0.5, 0.15, r);
            // Lit orange by the flame when young and low; grey dust as it cools and spreads.
            float fire = exp(-vAge * 1.6) * smoothstep(8.0, 0.0, vHeight);
            vec3 col = mix(uTint * (0.55 + billow), vec3(1.0, 0.55, 0.2), fire * 0.85);
            float a = puff * (1.0 - smoothstep(3.5, 6.0, vAge)) * 0.75;
            gl_FragColor = vec4(col, a);
          }`}
      />
    </points>
  );
}
