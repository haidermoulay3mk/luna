// Built with help from Claude (Anthropic).
// The 3D Moonbase diorama (SPEC Part 7), built only from simple shapes.
// Performance rules from Part 8: pixel ratio capped at 1.5, no shadows on phones and
// small screens, one directional + one ambient light, under 60 meshes.
import { Canvas, useThree } from '@react-three/fiber';
import { Component, useEffect, useState, type ReactNode } from 'react';
import type { Mesh } from 'three';
import { gaugesOf } from '../engine/reducer';
import type { ModuleId, Parts } from '../engine/types';
import { usePrefersReducedMotion } from '../ui/hooks';
import { CameraRig, OVERVIEW_CAMERA } from './CameraRig';
import { Bolt } from './characters/Bolt';
import { COLORS, MESH_BUDGET } from './kit';
import { Lights } from './Lights';
import { Antenna } from './modules/Antenna';
import { Battery } from './modules/Battery';
import { Greenhouse } from './modules/Greenhouse';
import { Habitat } from './modules/Habitat';
import { OxygenGen } from './modules/OxygenGen';
import { Recycler } from './modules/Recycler';
import { Rover } from './modules/Rover';
import { Shelter } from './modules/Shelter';
import { SolarArray } from './modules/SolarArray';
import { Sky } from './space/Sky';
import { FpsWatch, restart3D, useCan3D, useGfx, watchContextLoss } from './space/webgl';
import { FocusRing, Island } from './World';

declare global {
  interface Window {
    /** Dev builds only: how many meshes the scene has (checked against MESH_BUDGET). */
    __lunaMeshes?: number;
  }
}

/** Phones, tablets and small windows get no shadows and no antialiasing. */
function isLowPowerDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

export function MoonbaseScene({ focus, parts, overlay }: { focus: ModuleId | null; parts: Parts; overlay: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [lowPower] = useState(isLowPowerDevice);
  const webgl = useCan3D();
  if (!webgl) return <LiteBase focus={focus} parts={parts} />;

  const gauges = gaugesOf(parts);
  return (
    <SceneBoundary>
      <Canvas
        dpr={[1, 1.5]}
        shadows={lowPower ? false : 'percentage'}
        camera={{ position: OVERVIEW_CAMERA, fov: 35, near: 0.5, far: 9000 }}
        gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
        onCreated={watchContextLoss}
        aria-hidden
      >
        <color attach="background" args={[COLORS.space]} />
        <Lights shadows={!lowPower} />
        <Sky stars={2400} />
        <CameraRig focus={focus} reduced={reduced} overlay={overlay}>
          <Island />
          <Habitat light={gauges.power / 100} />
          <SolarArray output={parts.solar / 100} />
          <Battery level={parts.battery / 100} />
          <Greenhouse growth={parts.food / 100} />
          <Recycler level={parts.water / 100} />
          <OxygenGen />
          <Shelter />
          <Antenna spin={!reduced} />
          <Rover />
          <Bolt />
          <FocusRing focus={focus} />
        </CameraRig>
        <FpsWatch />
        {import.meta.env.DEV && <MeshCounter />}
      </Canvas>
    </SceneBoundary>
  );
}

/** Dev only: counts meshes once the scene is built and warns if we pass the budget. */
export function MeshCounter() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const id = window.setTimeout(() => {
      let count = 0;
      scene.traverse((object) => {
        if ((object as Mesh).isMesh) count++;
      });
      window.__lunaMeshes = count;
      if (count >= MESH_BUDGET) console.warn(`Luna scene has ${count} meshes; the budget is under ${MESH_BUDGET}.`);
    }, 500);
    return () => window.clearTimeout(id);
  });
  return null;
}

/** Shown if the device has no WebGL. Phase 5 replaces this with the Lite 2D base. */
export function SceneFallback({ text = "This device can't show the 3D view. The game still works." }: { text?: string }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center text-white/70">
      <p>{text}</p>
    </div>
  );
}

/**
 * Catches a crash inside a 3D view and rebuilds the 3D (webgl.ts restart3D, with a back-off).
 * Luna is 3D only: there is no switch to 2D, and nothing in the game is skipped meanwhile.
 */
export function SceneBoundary({ children }: { children: ReactNode }) {
  const epoch = useGfx((s) => s.epoch);
  return <Boundary key={epoch}>{children}</Boundary>;
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Luna 3D view error', error);
    restart3D(error instanceof Error ? error.message : String(error));
  }

  render() {
    return this.state.failed ? <SceneFallback text="Restarting the 3D view…" /> : this.props.children;
  }
}

/** Where each module sits in the 2D drawing (Lite mode), so the focus ring can circle it. */
const LITE_SPOT: Partial<Record<ModuleId, [number, number, number]>> = {
  habitat: [400, 268, 70],
  solar: [180, 262, 70],
  battery: [290, 290, 34],
  greenhouse: [540, 280, 50],
  recycler: [640, 296, 32],
  oxygen: [470, 300, 30],
  shelter: [700, 270, 46],
  antenna: [610, 200, 40],
  rover: [110, 318, 34],
  bolt: [350, 318, 26],
};

/**
 * Lite mode (SPEC Part 8): the base as a flat drawing for slow computers or no WebGL.
 * Lights, battery level and plants still follow the real gauges, and the focus ring
 * circles the module the current problem is about.
 */
export function LiteBase({ focus, parts }: { focus: ModuleId | null; parts: Parts }) {
  const g = gaugesOf(parts);
  const spot = focus ? LITE_SPOT[focus] : undefined;
  const leaves = Math.max(2, Math.round((parts.food / 100) * 7));
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Drawing of the base (Lite mode)">
      <defs>
        <radialGradient id="lite-earth" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#7fb2ff" />
          <stop offset="100%" stopColor="#1d3c75" />
        </radialGradient>
      </defs>
      <rect width="800" height="400" fill="#04060c" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 197) % 800} cy={(i * 89) % 210} r={i % 7 === 0 ? 1.6 : 0.9} fill="#fff" opacity={0.5} />
      ))}
      <circle cx="120" cy="90" r="34" fill="url(#lite-earth)" />
      <ellipse cx="400" cy="420" rx="520" ry="150" fill="#8d8d96" />
      <ellipse cx="300" cy="350" rx="40" ry="8" fill="#76767f" />
      <ellipse cx="620" cy="370" rx="60" ry="10" fill="#76767f" />
      {/* Solar panels: brighter with more solar input */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${120 + i * 45} 230)`}>
          <rect x="18" y="20" width="4" height="40" fill="#555b66" />
          <polygon points="0,0 40,-10 44,18 4,28" fill="#1e3768" stroke="#c7d2e6" strokeWidth="1" opacity={0.45 + (parts.solar / 100) * 0.55} />
        </g>
      ))}
      {/* Battery with its charge level */}
      <rect x="272" y="258" width="36" height="60" rx="4" fill="#394155" />
      <rect x="276" y={314 - (parts.battery / 100) * 52} width="28" height={(parts.battery / 100) * 52} rx="2" fill="#FFB547" />
      {/* Habitat dome with lit windows */}
      <path d="M330 320 A70 70 0 0 1 470 320 Z" fill="#ECEAE4" />
      {[360, 395, 430].map((x) => (
        <rect key={x} x={x} y="290" width="16" height="10" rx="3" fill="#ffd27a" opacity={0.25 + (g.power / 100) * 0.75} />
      ))}
      <rect x="455" y="292" width="30" height="26" rx="5" fill="#ECEAE4" />
      {/* Greenhouse with plants that grow with food */}
      <rect x="500" y="262" width="80" height="56" rx="10" fill="#bfe8ff" opacity={0.35} stroke="#dff3ff" />
      {Array.from({ length: leaves }, (_, i) => (
        <ellipse key={i} cx={510 + i * 10} cy={308} rx="4" ry={6 + (parts.food / 100) * 6} fill="#8BD450" />
      ))}
      <rect x="620" y="280" width="36" height="36" rx="6" fill="#d6dbe3" />
      {/* Antenna */}
      <line x1="610" y1="262" x2="610" y2="210" stroke="#9aa0aa" strokeWidth="4" />
      <path d="M585 205 Q610 230 635 205 Z" fill="#ECEAE4" />
      {/* Shelter mound */}
      <path d="M660 320 Q700 240 745 320 Z" fill="#7d7d86" />
      <rect x="690" y="294" width="20" height="26" rx="3" fill="#2a2d33" />
      {/* Rover and BOLT */}
      <rect x="90" y="304" width="44" height="16" rx="4" fill="#d9dbe0" />
      <circle cx="98" cy="322" r="6" fill="#2a2d33" />
      <circle cx="126" cy="322" r="6" fill="#2a2d33" />
      <rect x="340" y="304" width="20" height="18" rx="4" fill="#FFD84D" />
      <circle cx="350" cy="312" r="4" fill="#1b1d22" />
      {spot && <circle cx={spot[0]} cy={spot[1]} r={spot[2]} fill="none" stroke="#7cf0ff" strokeWidth="3" strokeDasharray="8 6" />}
    </svg>
  );
}
