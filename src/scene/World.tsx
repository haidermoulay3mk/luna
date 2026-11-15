// Built with help from Claude (Anthropic).
// The floating chunk of lunar ground, the Earth low on the horizon, the stars,
// and the ring that marks the module the camera is looking at (SPEC Part 7).
import { useEffect, useMemo } from 'react';
import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  Float32BufferAttribute,
  SRGBColorSpace,
} from 'three';
import { seeded } from '../engine/random';
import type { ModuleId } from '../engine/types';
import { COLORS, ISLAND_RADIUS, Instances, MODULE_POSITION, MODULE_RADIUS, type Placement } from './kit';

// ---- Island ----

const UNDERSIDE = { radius: 5.3, height: 4.2 };

/** Repeatable 0–1 noise from a position, so vertices that share a spot move together. */
function hash(x: number, y: number, z: number, salt: number): number {
  const s = Math.sin(Math.round(x * 1000) * 12.9898 + Math.round(y * 1000) * 78.233 + Math.round(z * 1000) * 37.719 + salt * 4.581) * 43758.5453;
  return s - Math.floor(s);
}

/** Makes the rock under the island lumpy. The top rim stays round so it meets the ground disc. */
function makeUnderside(): ConeGeometry {
  const geometry = new ConeGeometry(UNDERSIDE.radius, UNDERSIDE.height, 12, 3);
  const rimY = -UNDERSIDE.height / 2 + 0.01;
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y <= rimY) continue;
    pos.setXYZ(i, x + (hash(x, y, z, 1) - 0.5) * 0.9, y + (hash(x, y, z, 2) - 0.5) * 0.5, z + (hash(x, y, z, 3) - 0.5) * 0.9);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const CRATERS: Placement[] = [
  { position: [-2.2, 0.01, 0.3], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] },
  { position: [4.5, 0.01, 0.3], rotation: [Math.PI / 2, 0, 0], scale: [0.7, 0.7, 1] },
  { position: [-0.6, 0.01, 4.4], rotation: [Math.PI / 2, 0, 0], scale: [0.8, 0.8, 1] },
  { position: [2.6, 0.01, -4.2], rotation: [Math.PI / 2, 0, 0], scale: [1.1, 1.1, 1] },
];

const ROCK_ANGLES = [0.3, 0.9, 1.5, 2.3, 2.9, 3.6, 4.2, 4.9, 5.6];
const ROCKS: Placement[] = ROCK_ANGLES.map((angle, i) => {
  const r = 5.0 + (i % 3) * 0.15;
  const s = 0.7 + (i % 4) * 0.25;
  return { position: [Math.sin(angle) * r, 0.08, Math.cos(angle) * r], rotation: [i, i * 2, 0], scale: [s, s * 0.8, s] };
});

export function Island() {
  const underside = useMemo(makeUnderside, []);
  useEffect(() => () => underside.dispose(), [underside]);
  return (
    <group>
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS, UNDERSIDE.radius, 0.7, 12]} />
        <meshStandardMaterial color={COLORS.regolith} roughness={0.95} />
      </mesh>
      <mesh geometry={underside} position={[0, -0.7 - UNDERSIDE.height / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <meshStandardMaterial color={COLORS.regolithDark} roughness={1} flatShading />
      </mesh>
      <Instances placements={CRATERS} castShadow={false}>
        <torusGeometry args={[0.45, 0.07, 6, 16]} />
        <meshStandardMaterial color={COLORS.crater} roughness={1} />
      </Instances>
      <Instances placements={ROCKS}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={COLORS.regolithDark} roughness={1} flatShading />
      </Instances>
    </group>
  );
}

// ---- Earth (low on the horizon, as seen from near the south pole) ----

/** Placed so Earth peeks over the island's back edge in the overview: low on the horizon. */
export const EARTH_POSITION: [number, number, number] = [-8, -4.5, -22];
const EARTH_RADIUS = 3;

/** A simple Earth drawn in code: ocean, land blobs, cloud streaks and ice caps. */
function makeEarthTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  if (g) {
    const rng = seeded(7);
    g.fillStyle = '#1D4E89';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#4C8B4A';
    for (let i = 0; i < 14; i++) {
      const r = 8 + rng() * 16;
      g.beginPath();
      g.ellipse(rng() * 256, 24 + rng() * 80, r * 1.4, r, rng() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 18; i++) {
      g.beginPath();
      g.ellipse(rng() * 256, rng() * 128, 10 + rng() * 26, 2 + rng() * 4, (rng() - 0.5) * 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#F2F6FA';
    g.fillRect(0, 0, 256, 7);
    g.fillRect(0, 121, 256, 7);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function Earth() {
  const texture = useMemo(makeEarthTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={EARTH_POSITION}>
      <mesh rotation={[0.4, -0.6, 0.15]}>
        <sphereGeometry args={[EARTH_RADIUS, 32, 16]} />
        <meshStandardMaterial map={texture} roughness={0.85} emissive="#0A1A36" emissiveIntensity={0.6} />
      </mesh>
      {/* Thin glow of atmosphere */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.09, 32, 16]} />
        <meshBasicMaterial color="#7FB6FF" transparent opacity={0.14} side={BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---- Stars (points, not meshes) ----

export function Starfield() {
  const geometry = useMemo(() => {
    const rng = seeded(42);
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rng() * 2 - 1;
      const t = rng() * Math.PI * 2;
      const r = 70 + rng() * 30;
      const s = Math.sqrt(1 - u * u);
      positions.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#FFFFFF" size={1.6} sizeAttenuation={false} transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

// ---- Focus ring under the module the event is about ----

export function FocusRing({ focus }: { focus: ModuleId | null }) {
  if (!focus) return null;
  const [x, z] = MODULE_POSITION[focus];
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[MODULE_RADIUS[focus], 0.05, 6, 48]} />
      <meshBasicMaterial color={COLORS.signal} toneMapped={false} />
    </mesh>
  );
}
