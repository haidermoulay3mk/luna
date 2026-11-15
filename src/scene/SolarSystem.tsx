// Built with help from Claude (Anthropic).
// The Solar System: the Sun and the eight planets moving on their orbits by themselves.
// Orbit speeds keep the real ratios between planets (orbitYears in planets.json), but sizes
// and distances are NOT to scale (real distances would make every planet invisible); the
// screen says so. Earth, the Moon, Mars and Jupiter wear NASA's real public-domain maps;
// the other planets are drawn in code.
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Texture,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import earthUrl from '../assets/earth-1k.jpg';
import jupiterUrl from '../assets/jupiter-1k.jpg';
import marsUrl from '../assets/mars-color-2k.jpg';
import moonUrl from '../assets/moon-color-2k.jpg';
import planetsJson from '../data/planets.json';
import { usePrefersReducedMotion } from '../ui/hooks';
import { MeshCounter, SceneBoundary, SceneFallback } from './MoonbaseScene';
import { NOISE_GLSL, Sky, getSunTexture } from './space/Sky';
import { DPR, FpsWatch, isLowPowerDevice, useCan3D, watchContextLoss } from './space/webgl';
import { AsteroidBelt, Atmosphere, OrbitTrails, SelectionRing, SunCorona, SystemComet } from './space/SystemFx';

export interface Planet {
  id: string;
  name: string;
  orbitYears: number;
  kind: 'rocky' | 'gas' | 'ice' | 'moon';
  visited: 'home' | 'humans' | 'robots';
  world?: 'moon' | 'mars';
  facts: string[];
  whyNot: string;
  sourceId: string;
}
export const PLANETS = planetsJson as Planet[];

/** Display layout (not to scale): orbit radius and globe size in scene units. */
const LAYOUT: Record<string, { orbit: number; size: number; start: number }> = {
  mercury: { orbit: 15, size: 0.9, start: 0.6 },
  venus: { orbit: 21, size: 1.5, start: 2.4 },
  earth: { orbit: 29, size: 1.6, start: 4.0 },
  mars: { orbit: 38, size: 1.2, start: 5.1 },
  jupiter: { orbit: 55, size: 4.2, start: 1.2 },
  saturn: { orbit: 73, size: 3.6, start: 3.3 },
  uranus: { orbit: 89, size: 2.4, start: 5.9 },
  neptune: { orbit: 103, size: 2.3, start: 0.2 },
};
const MOON_ORBIT = 3.4;
const SUN_SIZE = 7;
/** Seconds for Earth to go once around the Sun on screen. Every other planet keeps the real ratio. */
const EARTH_LOOP_SECONDS = 90;

export type PlanetStatus = 'missions' | 'locked' | 'noCrew' | 'home';

/** Commands for the zoom buttons. */
export const systemControls = { zoom: (_f: number) => {}, reset: () => {} };

/** Where each body is right now (updated every frame), so the camera can follow it. */
const positions = new Map<string, Vector3>();

export function SolarSystem(props: { selected: string | null; onSelect: (id: string) => void; status: (p: Planet) => PlanetStatus }) {
  const webgl = useCan3D();
  const [lowPower] = useState(isLowPowerDevice);
  if (!webgl) return <SceneFallback text="This device can't show the 3D Solar System. Use the list instead." />;
  return (
    <SceneBoundary>
      <Canvas
        dpr={DPR}
        camera={{ position: [0, 70, 125], fov: 45, near: 0.5, far: 9000 }}
        gl={{ antialias: !lowPower }}
        onCreated={watchContextLoss}
        aria-hidden
      >
        <color attach="background" args={['#020308']} />
        <Sky earth={false} sun={false} />
        <ambientLight intensity={0.06} />
        {/* Sunlight from the middle, the same strength at every distance so far planets stay visible. */}
        <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} color="#fff4e2" />
        <Sun />
        <Suspense fallback={null}>
          <Planets {...props} />
        </Suspense>
        <FpsWatch />
        {import.meta.env.DEV && <MeshCounter />}
      </Canvas>
    </SceneBoundary>
  );
}

/** Air glow colours for the planets that have an atmosphere (the Moon and Mercury have almost none). */
const AIR: Record<string, { color: string; strength: number }> = {
  venus: { color: '#ffe2a0', strength: 0.9 },
  earth: { color: '#6fb3ff', strength: 1.2 },
  mars: { color: '#ff9a6a', strength: 0.55 },
  jupiter: { color: '#e8c89a', strength: 0.5 },
  saturn: { color: '#f0dcae', strength: 0.5 },
  uranus: { color: '#a8f0f5', strength: 0.7 },
  neptune: { color: '#6f8fff', strength: 0.7 },
};

function Sun() {
  const reduced = usePrefersReducedMotion();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const glow = useMemo(getSunTexture, []);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN_SIZE, 64, 32]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={/* glsl */ `varying vec3 vP; varying vec3 vN; varying vec3 vV;
            void main() { vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
          fragmentShader={/* glsl */ `uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
            ${NOISE_GLSL}
            void main() {
              float g = fbm(normalize(vP) * 6.0 + vec3(uTime * 0.05));
              // Granules boiling on the surface, and a few darker spots drifting round.
              float cells = fbm(normalize(vP) * 18.0 - vec3(uTime * 0.12));
              float spots = smoothstep(0.66, 0.74, fbm(normalize(vP) * 2.2 + vec3(uTime * 0.01, 0.0, 0.0)));
              vec3 col = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.93, 0.6), g * 0.7 + cells * 0.4);
              col *= 1.0 - spots * 0.55;
              float limb = pow(max(dot(vN, vV), 0.0), 0.45);
              gl_FragColor = vec4(col * (0.55 + 0.6 * limb), 1.0);
            }`}
        />
      </mesh>
      <SunCorona size={SUN_SIZE} reduced={reduced} />
      <sprite scale={[SUN_SIZE * 7, SUN_SIZE * 7, 1]}>
        <spriteMaterial map={glow} blending={AdditiveBlending} depthWrite={false} transparent color="#ffd9a0" />
      </sprite>
    </group>
  );
}

/** Code-drawn surfaces for planets without a NASA map in the game: bands for giants, speckles for rocky ones. */
function makeTexture(id: string): CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  let seed = id.length * 97;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bands: Record<string, string[]> = {
    saturn: ['#e3cf9f', '#cdb17a', '#e9dbb4', '#bfa06a', '#dcc58f'],
    uranus: ['#a9e0e6', '#9fd7de', '#b3e6ea'],
    neptune: ['#3d63d6', '#3557c4', '#4a72e2', '#2e4fb3'],
    venus: ['#e9d9a6', '#dcc68a', '#efe2b8', '#d4bb7c'],
    mercury: ['#8e8a86', '#7b7773', '#9a9690'],
  };
  if (ctx) {
    const palette = bands[id] ?? ['#888888'];
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = palette[Math.floor((Math.sin(y * 0.11 + id.length) * 0.5 + 0.5) * palette.length) % palette.length];
      ctx.fillRect(0, y, w, 4);
    }
    if (id === 'mercury' || id === 'venus') {
      // Craters on Mercury, soft cloud swirls on Venus.
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = id === 'mercury' ? `rgba(40,38,36,${0.15 + rand() * 0.2})` : `rgba(255,248,225,${0.08 + rand() * 0.1})`;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, 1 + rand() * (id === 'mercury' ? 6 : 22), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function Planets({ selected, onSelect, status }: { selected: string | null; onSelect: (id: string) => void; status: (p: Planet) => PlanetStatus }) {
  const reduced = usePrefersReducedMotion();
  const [earthMap, jupiterMap, marsMap, moonMap] = useLoader(TextureLoader, [earthUrl, jupiterUrl, marsUrl, moonUrl]);
  const maps = useMemo(() => {
    const m: Record<string, Texture> = { earth: earthMap, jupiter: jupiterMap, mars: marsMap, moon: moonMap };
    for (const t of Object.values(m)) t.colorSpace = SRGBColorSpace;
    for (const id of ['mercury', 'venus', 'saturn', 'uranus', 'neptune']) m[id] = makeTexture(id);
    return m;
  }, [earthMap, jupiterMap, marsMap, moonMap]);

  const groups = useRef<Record<string, Group | null>>({});
  const time = useRef(0);
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const follow = useRef<string | null>(null);
  /** Each orbit's planet angle (in LAYOUT order), for the glowing orbit trails. */
  const heads = useRef<number[]>(Object.keys(LAYOUT).map(() => 0));
  const radii = useMemo(() => Object.values(LAYOUT).map((l) => l.orbit), []);

  useEffect(() => {
    follow.current = selected;
  }, [selected]);
  useEffect(() => {
    systemControls.zoom = (f) => {
      const c = controls.current;
      if (!c) return;
      const offset = camera.position.clone().sub(c.target).multiplyScalar(f);
      camera.position.copy(c.target).add(offset);
    };
    systemControls.reset = () => {
      follow.current = null;
      controls.current?.target.set(0, 0, 0);
      camera.position.set(0, 70, 125);
    };
  });

  useFrame((_, dt) => {
    // The planets keep moving (slowly) even with reduced motion; only the camera stops gliding.
    time.current += Math.min(dt, 0.05) * (reduced ? 0.3 : 1);
    for (const p of PLANETS) {
      const g = groups.current[p.id];
      if (!g) continue;
      if (p.id === 'moon') {
        const earth = positions.get('earth');
        if (!earth) continue;
        const a = (time.current / EARTH_LOOP_SECONDS) * Math.PI * 2 * 13.37; // about 13 trips round Earth per year
        g.position.set(earth.x + Math.cos(a) * MOON_ORBIT, earth.y, earth.z + Math.sin(a) * MOON_ORBIT);
      } else {
        const l = LAYOUT[p.id];
        const a = l.start + (time.current / (EARTH_LOOP_SECONDS * p.orbitYears)) * Math.PI * 2;
        g.position.set(Math.cos(a) * l.orbit, 0, -Math.sin(a) * l.orbit);
        heads.current[Object.keys(LAYOUT).indexOf(p.id)] = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      }
      g.rotation.y += dt * 0.3;
      const pos = positions.get(p.id) ?? new Vector3();
      positions.set(p.id, pos.copy(g.position));
    }
    // Follow the selected body: the camera's target glides to it.
    const c = controls.current;
    if (c) {
      const target = follow.current ? positions.get(follow.current) : undefined;
      if (target) {
        const before = c.target.clone();
        c.target.lerp(target, reduced ? 1 : 1 - Math.exp(-4 * dt));
        camera.position.add(c.target.clone().sub(before));
        const size = follow.current === 'moon' ? 0.5 : LAYOUT[follow.current!]?.size ?? 2;
        const want = 8 + size * 5;
        const offset = camera.position.clone().sub(c.target);
        if (offset.length() > want * 1.05) camera.position.copy(c.target).add(offset.multiplyScalar(reduced ? want / offset.length() : 1 - dt * 1.5));
      }
      c.update();
    }
  });

  return (
    <>
      <OrbitControls ref={controls} enablePan={false} enableDamping minDistance={4} maxDistance={260} zoomSpeed={0.8} />
      <OrbitTrails radii={radii} angles={() => heads.current} />
      <AsteroidBelt inner={LAYOUT.mars.orbit + 5} outer={LAYOUT.jupiter.orbit - 6} count={260} reduced={reduced} />
      <SystemComet reduced={reduced} />
      <SelectionRing
        target={() => (follow.current ? positions.get(follow.current) : undefined)}
        size={() => (follow.current === 'moon' ? 0.45 : LAYOUT[follow.current ?? '']?.size ?? 1)}
        reduced={reduced}
      />
      <SaturnRings planetRef={() => groups.current.saturn ?? null} />
      {PLANETS.map((p) => {
        const size = p.id === 'moon' ? 0.45 : LAYOUT[p.id].size;
        const s = status(p);
        return (
          <group key={p.id} ref={(g) => (groups.current[p.id] = g)}>
            <mesh rotation={[p.id === 'uranus' ? 1.7 : 0.4, 0, 0]} onClick={() => onSelect(p.id)}>
              <sphereGeometry args={[size, 48, 24]} />
              <meshStandardMaterial map={maps[p.id]} roughness={p.kind === 'gas' || p.kind === 'ice' ? 0.7 : 1} metalness={0} />
            </mesh>
            {AIR[p.id] && <Atmosphere size={size} color={AIR[p.id].color} strength={AIR[p.id].strength} />}
            <Html center zIndexRange={[20, 0]} position={[0, size + 1.4, 0]}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`map-pin ${selected === p.id ? 'map-pin-selected' : ''} ${s === 'missions' ? 'map-pin-next' : ''}`}
                aria-label={`${p.name}. ${STATUS_TEXT[s]}.`}
              >
                <span aria-hidden className="map-pin-dot" style={{ background: STATUS_COLOR[s] }} />
                {p.name}
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export const STATUS_TEXT: Record<PlanetStatus, string> = {
  missions: 'Missions here',
  locked: 'Missions open later',
  noCrew: 'No crew can go yet',
  home: 'Home',
};
const STATUS_COLOR: Record<PlanetStatus, string> = { missions: '#7cf0ff', locked: '#8e96a8', noCrew: '#5c6475', home: '#4ade80' };

/** Saturn's rings: a flat ring with soft gaps, drawn by a shader. It follows Saturn every frame. */
function SaturnRings({ planetRef }: { planetRef: () => Group | null }) {
  const ref = useRef<Group>(null);
  const size = LAYOUT.saturn.size;
  const uniforms = useMemo(() => ({ uIn: { value: size * 1.3 }, uOut: { value: size * 2.3 } }), [size]);
  useFrame(() => {
    const p = planetRef();
    if (p && ref.current) ref.current.position.copy(p.position);
  });
  return (
    <group ref={ref} rotation={[Math.PI / 2 - 0.47, 0, 0]}>
      <mesh>
        <ringGeometry args={[size * 1.3, size * 2.3, 96, 1]} />
        <shaderMaterial
          transparent
          side={DoubleSide}
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={/* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentShader={/* glsl */ `uniform float uIn; uniform float uOut; varying vec2 vP;
            void main() {
              float t = (length(vP) - uIn) / (uOut - uIn);
              float bands = 0.55 + 0.45 * sin(t * 60.0) * sin(t * 13.0);
              float gap = smoothstep(0.58, 0.6, t) * (1.0 - smoothstep(0.62, 0.64, t));
              float a = (0.25 + 0.5 * bands) * (1.0 - gap) * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.95, 1.0, t));
              gl_FragColor = vec4(vec3(0.86, 0.78, 0.6) * a, a);
            }`}
        />
      </mesh>
    </group>
  );
}
