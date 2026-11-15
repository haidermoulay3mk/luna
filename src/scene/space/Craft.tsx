// Built with help from Claude (Anthropic).
// Spacecraft and markers built only from code (SPEC Part 7: no outside 3D models):
// the rocket, the Gateway-style station, the rock field and the landing beacon.
import { useFrame } from '@react-three/fiber';
import { forwardRef, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Color,
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  SphereGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Object3D,
  SRGBColorSpace,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
  type Sprite,
} from 'three';

/** A2.4: white body, metalness 0.3, roughness 0.5. */
const HULL = { color: '#e8eaee', metalness: 0.3, roughness: 0.5 } as const;
const ORANGE = '#e2642a';
const DARK = '#1b1d22';

// ---- Rocket (nose along +z) ----

let hullTexture: CanvasTexture | null = null;
/** White hull with faint panel seams, rivet rows, roll-pattern squares and the name LUNA, drawn once on a canvas. */
function getHullTexture(): CanvasTexture {
  if (hullTexture) return hullTexture;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#eef0f3';
    ctx.fillRect(0, 0, size, size);
    // Soft shading variation, like separate metal panels.
    for (let x = 0; x < size; x += 64) {
      ctx.fillStyle = `rgba(120,130,150,${0.03 + ((x / 64) % 3) * 0.015})`;
      ctx.fillRect(x, 0, 64, size);
    }
    ctx.strokeStyle = 'rgba(70,78,92,0.35)';
    ctx.lineWidth = 2;
    for (let y = 64; y < size; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    for (let x = 0; x < size; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(70,78,92,0.4)';
    for (let y = 70; y < size; y += 96) for (let x = 6; x < size; x += 14) ctx.fillRect(x, y, 2, 2);
    // Black roll-pattern squares, as on real rockets, so cameras can see it turn.
    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 400, 128, 64);
    ctx.fillRect(256, 400, 128, 64);
    // The name, running up the side.
    ctx.save();
    ctx.translate(200, 330);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('LUNA', 0, 0);
    ctx.restore();
  }
  hullTexture = new CanvasTexture(canvas);
  hullTexture.colorSpace = SRGBColorSpace;
  return hullTexture;
}

const LEG_ANGLES = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4);

/** `thrust` is read every frame (0–1), so the flame grows without re-rendering React. */
export const Rocket = forwardRef<Group, { thrust: MutableRefObject<number>; reduced?: boolean }>(function Rocket(
  { thrust, reduced = false },
  ref,
) {
  const flame = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const rcs = useRef<InstancedMesh>(null);
  const hull = useMemo(getHullTexture, []);
  const glowTexture = useMemo(getGlowTexture, []);
  const nozzleGlow = useRef<Sprite>(null);
  const flameUniforms = useMemo(() => ({ uPower: { value: 0 }, uTime: { value: 0 } }), []);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    LEG_ANGLES.forEach((a, i) => {
      // Landing legs folded against the lower body, angled out like a real lander.
      dummy.position.set(Math.cos(a) * 0.42, -1.05, Math.sin(a) * 0.42);
      dummy.rotation.set(0, -a, 0);
      dummy.rotateZ(0.32);
      dummy.updateMatrix();
      legs.current?.setMatrixAt(i, dummy.matrix);
      // Small side-thruster blocks near the top.
      dummy.position.set(Math.cos(a) * 0.33, 0.95, Math.sin(a) * 0.33);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      rcs.current?.setMatrixAt(i, dummy.matrix);
    });
    if (legs.current) legs.current.instanceMatrix.needsUpdate = true;
    if (rcs.current) rcs.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const power = thrust.current;
    flameUniforms.uPower.value = power;
    flameUniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    const flicker = reduced ? 1 : 0.9 + Math.sin(clock.elapsedTime * 47) * 0.06 + Math.sin(clock.elapsedTime * 23) * 0.05;
    const width = 1 + Math.max(0, power - 1) * 0.6;
    flame.current?.scale.set(width, 0.12 + power * 2.6 * flicker, width);
    if (nozzleGlow.current) {
      const s = (0.6 + power * 1.6) * flicker;
      nozzleGlow.current.scale.set(s, s, 1);
      nozzleGlow.current.material.opacity = Math.min(1, power * 0.9);
    }
    const material = glow.current?.material as MeshStandardMaterial | undefined;
    if (material) material.emissiveIntensity = 0.3 + power * 2.5;
  });
  return (
    <group ref={ref}>
      {/* Parts are modelled along +y, then turned so the nose points along +z. */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.32, 2, 40]} />
          <meshStandardMaterial map={hull} metalness={HULL.metalness} roughness={HULL.roughness} />
        </mesh>
        {/* Gold insulation foil around the crew section */}
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.307, 0.307, 0.26, 40]} />
          <meshStandardMaterial color="#c9952f" metalness={1} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.309, 0.309, 0.06, 40]} />
          <meshStandardMaterial color={ORANGE} metalness={0.3} roughness={0.45} />
        </mesh>
        {/* A2.4: dark nose cone */}
        <mesh position={[0, 1.37, 0]}>
          <coneGeometry args={[0.3, 0.75, 40]} />
          <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Two round windows on the crew section */}
        {[0.95, 1.15].map((y) => (
          <mesh key={y} position={[0, y, 0.285]}>
            <circleGeometry args={[0.07, 20]} />
            <meshStandardMaterial color="#0b1a33" metalness={0.95} roughness={0.05} emissive="#1d3c75" emissiveIntensity={0.5} />
          </mesh>
        ))}
        {/* Detail (Boss, 15 Nov: "more detailed"): hull stringers, a dark interstage ring, a hatch frame,
            RCS thruster blocks, and a docking probe with an antenna on the nose. */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={`rib${i}`} rotation={[0, (i * Math.PI) / 3 + 0.26, 0]} position={[0, -0.25, 0]}>
            <boxGeometry args={[0.018, 1.3, 0.632]} />
            <meshStandardMaterial color="#cfd2d8" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.318, 0.318, 0.08, 40]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.05, 0.29]}>
          <torusGeometry args={[0.13, 0.012, 8, 24]} />
          <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={`rcs${i}`} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]} position={[0, 0.8, 0]}>
            <boxGeometry args={[0.09, 0.09, 0.68]} />
            <meshStandardMaterial color="#3a3f48" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 1.83, 0]}>
          <cylinderGeometry args={[0.025, 0.04, 0.22, 12]} />
          <meshStandardMaterial color="#b8bcc6" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0.08, 1.9, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 6]} />
          <meshStandardMaterial color="#d9dbe0" metalness={0.8} roughness={0.3} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.45, -0.4, 0]}>
            <mesh>
              <cylinderGeometry args={[0.14, 0.15, 1.3, 24]} />
              <meshStandardMaterial map={hull} metalness={HULL.metalness} roughness={HULL.roughness} />
            </mesh>
            <mesh position={[0, 0.82, 0]}>
              <coneGeometry args={[0.14, 0.34, 24]} />
              <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.5} />
            </mesh>
            {[0.35, -0.35].map((y) => (
              <mesh key={y} position={[0, y, 0]}>
                <cylinderGeometry args={[0.155, 0.155, 0.04, 24]} />
                <meshStandardMaterial color={y > 0 ? ORANGE : '#2a2d33'} metalness={0.4} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3 + Math.PI / 2, 0]} position={[0, -0.85, 0]}>
            <boxGeometry args={[0.025, 0.42, 0.72]} />
            <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
        <instancedMesh ref={legs} args={[undefined, undefined, 4]}>
          <cylinderGeometry args={[0.025, 0.035, 0.75, 8]} />
          <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.35} />
        </instancedMesh>
        <instancedMesh ref={rcs} args={[undefined, undefined, 4]}>
          <boxGeometry args={[0.07, 0.1, 0.07]} />
          <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.4} />
        </instancedMesh>
        <mesh position={[0, -1.15, 0]}>
          <cylinderGeometry args={[0.16, 0.28, 0.34, 32, 1, true]} />
          <meshStandardMaterial color="#3a3d44" metalness={0.9} roughness={0.3} side={DoubleSide} />
        </mesh>
        {/* Heat glow inside the nozzle, brighter with thrust */}
        <mesh ref={glow} position={[0, -1.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 24]} />
          <meshStandardMaterial color="#331100" emissive="#ff7a2a" emissiveIntensity={0.3} side={DoubleSide} />
        </mesh>
        {/* Flame (Boss's launch reference): a white-hot core, a yellow then orange plume that widens
            and flickers downstream, and a soft glow at the nozzle. Stretches with thrust. */}
        <group ref={flame} position={[0, -1.3, 0]}>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.2, 0.42, 1, 32, 12, true]} />
            <FlameMaterial uniforms={flameUniforms} layer="outer" />
          </mesh>
          <mesh position={[0, -0.36, 0]} scale={[1, 0.72, 1]}>
            <cylinderGeometry args={[0.15, 0.2, 1, 24, 8, true]} />
            <FlameMaterial uniforms={flameUniforms} layer="core" />
          </mesh>
        </group>
        <sprite ref={nozzleGlow} position={[0, -1.45, 0]} scale={[1.2, 1.2, 1]}>
          <spriteMaterial map={glowTexture} color="#ffd9a0" transparent depthWrite={false} blending={AdditiveBlending} opacity={0} />
        </sprite>
      </group>
    </group>
  );
});

let flameGlow: CanvasTexture | null = null;
/** A soft round glow (white centre, warm edge), drawn once. Stands in for bloom, which the PC can't afford. */
export function getGlowTexture(): CanvasTexture {
  if (flameGlow) return flameGlow;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,245,1)');
    g.addColorStop(0.18, 'rgba(255,224,150,0.85)');
    g.addColorStop(0.45, 'rgba(255,140,50,0.3)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  flameGlow = new CanvasTexture(canvas);
  flameGlow.colorSpace = SRGBColorSpace;
  return flameGlow;
}

/**
 * The plume. In the cylinder, y = +0.5 is the nozzle end and -0.5 the far end. The vertex shader
 * widens and wobbles the plume downstream; the fragment shader runs white → yellow → orange along
 * it, soft at the edges (facing ratio), with streaks of noise moving away from the nozzle.
 */
export function FlameMaterial({ uniforms, layer }: { uniforms: Record<string, { value: number }>; layer: 'core' | 'outer' }) {
  const core = layer === 'core';
  return (
    <shaderMaterial
      transparent
      depthWrite={false}
      blending={AdditiveBlending}
      side={DoubleSide}
      uniforms={uniforms}
      vertexShader={/* glsl */ `
        uniform float uTime;
        varying float vT;
        varying float vFacing;
        varying vec2 vAround;
        void main() {
          vT = 0.5 - position.y;
          vec3 p = position;
          float wobble = sin(uTime * 31.0 + vT * 9.0) * 0.04 + sin(uTime * 17.0 + vT * 5.0 + p.x * 7.0) * 0.03;
          p.xz *= 1.0 + vT * ${core ? '0.25' : '0.9'} + wobble * vT;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vFacing = abs(dot(n, normalize(-mv.xyz)));
          vAround = vec2(atan(position.z, position.x), vT);
          gl_Position = projectionMatrix * mv;
        }`}
      fragmentShader={/* glsl */ `
        uniform float uPower;
        uniform float uTime;
        varying float vT;
        varying float vFacing;
        varying vec2 vAround;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          float t = clamp(vT, 0.0, 1.0);
          float streak = noise(vec2(vAround.x * 3.0, t * 7.0 - uTime * 9.0)) * 0.6 + noise(vec2(vAround.x * 7.0, t * 15.0 - uTime * 14.0)) * 0.4;
          ${
            core
              ? `vec3 col = mix(vec3(1.0, 1.0, 0.96), vec3(1.0, 0.86, 0.5), smoothstep(0.1, 0.9, t));
          float a = pow(vFacing, 1.2) * pow(1.0 - t, 1.3) * (0.55 + 0.45 * streak);`
              : `vec3 col = mix(vec3(1.0, 0.9, 0.62), vec3(1.0, 0.52, 0.16), smoothstep(0.0, 0.45, t));
          col = mix(col, vec3(0.85, 0.26, 0.06), smoothstep(0.5, 1.0, t));
          float a = pow(vFacing, 2.0) * pow(1.0 - t, 1.1) * (0.35 + 0.65 * streak) * 0.85;`
          }
          a *= clamp(0.15 + uPower * 0.85, 0.0, 1.4);
          gl_FragColor = vec4(col * a, a);
        }`}
    />
  );
}

// ---- Station (Gateway-style, built from cylinders, a node and solar wings) ----

let solarTexture: CanvasTexture | null = null;
/** Solar cells drawn once on a canvas: dark blue cells with thin silver lines. */
function getSolarTexture(): CanvasTexture {
  if (solarTexture) return solarTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0d1d3d';
    ctx.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 16) {
      for (let y = 0; y < 64; y += 16) {
        const shade = 30 + ((x * 7 + y * 13) % 18);
        ctx.fillStyle = `rgb(${shade * 0.4}, ${shade * 0.75}, ${Math.min(255, shade * 2.2)})`;
        ctx.fillRect(x + 1, y + 1, 14, 14);
      }
    }
    ctx.fillStyle = 'rgba(200,210,230,0.5)';
    ctx.fillRect(0, 31, 256, 2);
  }
  solarTexture = new CanvasTexture(canvas);
  solarTexture.colorSpace = SRGBColorSpace;
  return solarTexture;
}

export const Station = forwardRef<Group, { reduced?: boolean }>(function Station({ reduced = false }, ref) {
  const solar = useMemo(getSolarTexture, []);
  const lights = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (lights.current && !reduced) lights.current.visible = Math.sin(clock.elapsedTime * 3) > 0.2;
  });
  return (
    <group ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.25, 1.25, 7, 28]} />
        <meshStandardMaterial color="#d9dbe0" metalness={0.35} roughness={0.45} />
      </mesh>
      {/* Detail (Boss, 15 Nov): dark joint rings between module segments, truss cross-bracing,
          radiator panels, a docking port and a dish antenna. */}
      {[-2.6, -0.9, 0.9, 2.6].map((x) => (
        <mesh key={`ring${x}`} rotation={[0, 0, Math.PI / 2]} position={[x, 0, 0]}>
          <cylinderGeometry args={[1.29, 1.29, 0.14, 28]} />
          <meshStandardMaterial color="#3a3f48" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {[-4.2, -5.4, -6.6, -7.8].map((x) => (
        <mesh key={`brace${x}`} position={[x, 0, 0]} rotation={[0.785, 0, 0]}>
          <boxGeometry args={[0.08, 0.08, 0.95]} />
          <meshStandardMaterial color="#8a8f99" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`rad${side}`} position={[-1.5, side * 2.6, 0]}>
          <boxGeometry args={[2.6, 1.6, 0.04]} />
          <meshStandardMaterial color="#eef0f3" metalness={0.15} roughness={0.7} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-3.9, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.5, 20]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.7} roughness={0.3} />
      </mesh>
      <group position={[1.2, 1.6, 0.9]} rotation={[-0.6, 0, 0.3]}>
        <mesh>
          <sphereGeometry args={[0.55, 20, 10, 0, Math.PI * 2, 0, 0.9]} />
          <meshStandardMaterial color="#f2f3f5" metalness={0.3} roughness={0.5} side={2} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
          <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[5.5, 0, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 4, 24]} />
        <meshStandardMaterial color="#c8b48a" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 28, 16]} />
        <meshStandardMaterial color="#e4e6ea" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Docking port, facing down (towards the Moon): the rocket docks here. */}
      <mesh position={[0, -1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.65, 0.12, 12, 32]} />
        <meshStandardMaterial color="#9fe8ff" emissive="#46c6ff" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[-6, 0, 0]}>
        <boxGeometry args={[5, 0.3, 0.3]} />
        <meshStandardMaterial color="#8a8f99" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-8, 0, side * 3.4]}>
          <boxGeometry args={[11, 0.06, 4.6]} />
          <meshStandardMaterial map={solar} metalness={0.6} roughness={0.25} emissive="#0a1a3a" emissiveIntensity={0.3} />
        </mesh>
      ))}
      <mesh position={[3, 1.9, 0]}>
        <boxGeometry args={[3.2, 0.05, 1.6]} />
        <meshStandardMaterial color="#f2f3f5" metalness={0.2} roughness={0.6} />
      </mesh>
      <group ref={lights}>
        <mesh position={[7.6, 0, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color="#ff4d4d" />
        </mesh>
        <mesh position={[-13.6, 0, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color="#5dff7a" />
        </mesh>
      </group>
    </group>
  );
});

// ---- Rocks ----

/** Repeatable 3D value noise in [0, 1] (for rock shapes). */
function noise3(x: number, y: number, z: number, seed: number): number {
  const h = (i: number, j: number, k: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 19.3) * 43758.5453;
    return s - Math.floor(s);
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const fx = f(x - ix);
  const fy = f(y - iy);
  const fz = f(z - iz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = lerp(h(ix, iy, iz), h(ix + 1, iy, iz), fx);
  const x10 = lerp(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), fx);
  const x01 = lerp(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), fx);
  const x11 = lerp(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), fx);
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

/**
 * A rock or asteroid with real depth: an icosphere pushed out by several scales of noise (big lumps,
 * ridges, grit), with a few impact craters pressed in, flat-shaded facets and darker crevices
 * (vertex colours; use `vertexColors` on the material). Computed once per seed.
 */
export function makeRockGeometry(seed = 1): IcosahedronGeometry {
  const geometry = new IcosahedronGeometry(1, 4);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new Vector3();
  let a = seed * 9301 + 49297;
  const rand = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const craters = Array.from({ length: 4 }, () => ({
    dir: new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(),
    size: 0.25 + rand() * 0.35,
    depth: 0.06 + rand() * 0.08,
  }));
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const big = (noise3(v.x * 1.6, v.y * 1.6, v.z * 1.6, seed) - 0.5) * 0.55;
    const ridge = (0.5 - Math.abs(noise3(v.x * 3.5, v.y * 3.5, v.z * 3.5, seed + 7) - 0.5)) * 0.22;
    const grit = (noise3(v.x * 9, v.y * 9, v.z * 9, seed + 13) - 0.5) * 0.07;
    let r = 1 + big + ridge + grit;
    let dent = 0;
    for (const c of craters) {
      const d = v.angleTo(c.dir) / c.size;
      if (d < 1) dent += c.depth * (1 - d * d);
      else if (d < 1.35) r += c.depth * 0.35 * (1 - (d - 1) / 0.35);
    }
    r -= dent;
    v.multiplyScalar(r);
    pos.setXYZ(i, v.x, v.y, v.z);
    // Crevices and crater floors are darker; high ridges catch a little more light.
    const shade = Math.min(1, Math.max(0.45, 0.78 + (r - 1) * 0.9 - dent * 1.6 + (noise3(v.x * 5, v.y * 5, v.z * 5, seed + 3) - 0.5) * 0.25));
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * 0.97;
    colors[i * 3 + 2] = shade * 0.93;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export const RockField = forwardRef<InstancedMesh, { count: number }>(function RockField({ count }, ref) {
  const geometry = useMemo(() => makeRockGeometry(3), []);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial color="#77706a" roughness={0.95} metalness={0.05} vertexColors flatShading />
    </instancedMesh>
  );
});

// ---- Landing beacon: a ring on the ground and a soft column of light (+y is up from the ground) ----

/** The landing beacon in the accent colour (the destination pin, LUNA_BUILD A2.2). */
export function Beacon({ color = '#FFB547', reduced = false }: { color?: string; reduced?: boolean }) {
  const ring = useRef<Mesh>(null);
  const uniforms = useMemo(() => {
    const c = new Color(color);
    return { uColor: { value: new Vector3(c.r, c.g, c.b) }, uTime: { value: 0 } };
  }, [color]);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    if (ring.current && !reduced) {
      const s = 1 + ((clock.elapsedTime * 0.6) % 1) * 1.4;
      ring.current.scale.set(s, s, s);
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <torusGeometry args={[4, 0.18, 8, 48]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <torusGeometry args={[4, 0.08, 6, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 60, 24, 1, true]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          uniforms={uniforms}
          vertexShader={/* glsl */ `
            varying float vH; void main() { vH = (position.y + 30.0) / 60.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentShader={/* glsl */ `
            uniform vec3 uColor; uniform float uTime; varying float vH;
            void main() { float a = pow(1.0 - vH, 2.2) * (0.32 + 0.08 * sin(uTime * 3.0)); gl_FragColor = vec4(uColor * a, a); }`}
        />
      </mesh>
    </group>
  );
}

// ---- Satellites (Flight 1 obstacles): a real 3D bus, not a flat box ----

/** Gives every vertex of `geometry` one colour (so parts can be merged into one mesh). */
function paint(geometry: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

/**
 * A satellite bus built from parts and merged into one geometry (one draw call for all of them):
 * a gold-foil body with a dark radiator band, a dish antenna on a short boom, a thruster nozzle
 * and wing hinges. The solar wings are drawn separately (textured cells).
 */
export function makeSatelliteGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  parts.push(paint(new BoxGeometry(1, 0.9, 0.9, 2, 2, 2), '#d9a640'));
  parts.push(paint(new BoxGeometry(1.02, 0.18, 0.92).translate(0, 0.2, 0), '#2a2d33'));
  parts.push(paint(new CylinderGeometry(0.035, 0.035, 0.7, 8).rotateX(Math.PI / 2).translate(0, 0, 0.75), '#9aa0aa'));
  parts.push(paint(new SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.32).rotateX(-Math.PI / 2).translate(0, 0, 1.25), '#f2f1ec'));
  parts.push(paint(new CylinderGeometry(0.1, 0.18, 0.25, 12).rotateX(-Math.PI / 2).translate(0, 0, -0.57), '#3a3d44'));
  for (const side of [-1, 1]) parts.push(paint(new CylinderGeometry(0.05, 0.05, 0.5, 8).rotateZ(Math.PI / 2).translate(side * 0.7, 0, 0), '#9aa0aa'));
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  parts.forEach((p) => p.dispose());
  return merged ?? new BoxGeometry(1, 1, 1);
}

let foilTexture: CanvasTexture | null = null;
/** Crinkled insulation foil: light and dark creases, so the body catches the light unevenly. */
export function getFoilTexture(): CanvasTexture {
  if (foilTexture) return foilTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, 0, 256, 256);
    let a = 17;
    const rand = () => (a = (a * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) {
      const v = 150 + Math.floor(rand() * 105);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      const x = rand() * 256;
      const y = rand() * 256;
      ctx.moveTo(x, y);
      for (let k = 0; k < 3; k++) ctx.lineTo(x + (rand() - 0.5) * 60, y + (rand() - 0.5) * 60);
      ctx.closePath();
      ctx.fill();
    }
  }
  foilTexture = new CanvasTexture(canvas);
  foilTexture.colorSpace = SRGBColorSpace;
  return foilTexture;
}
