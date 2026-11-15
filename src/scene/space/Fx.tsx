// Built with help from Claude (Anthropic).
// Small effects shared by the scenes: a burst of hot sparks when a craft scrapes something, and
// regolith dust kicked up by the astronaut's boots.
// Set `trigger.current` to a point and the burst plays there once. Drawn as additive points.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from 'three';
import { getGlowTexture } from './Craft';

export type SparkTrigger = MutableRefObject<{ x: number; y: number; z: number } | null>;

export function SparkBurst({
  trigger,
  count = 60,
  speed = 10,
  color = '#ffc27a',
  size = 0.35,
  gravity = 3,
  soft = false,
}: {
  trigger: SparkTrigger;
  count?: number;
  speed?: number;
  color?: string;
  size?: number;
  /** Pull on the sparks (m/s², down the y axis); 0 in deep space. */
  gravity?: number;
  /** Round, soft puffs instead of square points (dust and smoke). */
  soft?: boolean;
}) {
  const puff = useMemo(() => (soft ? getGlowTexture() : null), [soft]);
  const data = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return { g, pos, vel: new Float32Array(count * 3), life: 0 };
  }, [count]);
  useEffect(() => () => data.g.dispose(), [data]);
  const material = useRef<{ opacity: number } | null>(null);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const d = data;
    const at = trigger.current;
    if (at) {
      for (let i = 0; i < count; i++) {
        d.pos.set([at.x, at.y, at.z], i * 3);
        // Random directions on a sphere, varied speeds.
        const u = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const sp = speed * (0.4 + Math.random() * 0.9);
        d.vel.set([r * Math.cos(a) * sp, u * sp, r * Math.sin(a) * sp], i * 3);
      }
      d.life = 1;
      trigger.current = null;
    }
    if (d.life <= 0) return;
    d.life -= dt * 1.4;
    for (let i = 0; i < count * 3; i++) d.pos[i] += d.vel[i] * dt;
    if (gravity) for (let i = 0; i < count; i++) d.vel[i * 3 + 1] -= gravity * dt;
    d.g.attributes.position.needsUpdate = true;
    if (material.current) material.current.opacity = Math.max(0, d.life);
  });
  return (
    <points geometry={data.g} frustumCulled={false}>
      <pointsMaterial
        ref={(m) => {
          material.current = m;
        }}
        color={color}
        size={size}
        map={puff}
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

const DUST_MAX = 160;

/**
 * Regolith kicked up by boots: small puffs at the feet while walking, a ring when landing a jump.
 * No air on the Moon, so each grain flies on a clean arc and falls back under real gravity; Mars air
 * slows it. `source()` gives the feet position, speed (walk = 1) and whether the astronaut is in the air.
 */
export function BootDust({ source, gravity, color, mars }: {
  source: () => { x: number; y: number; z: number; speed: number; air: boolean };
  gravity: number;
  color: string;
  mars: boolean;
}) {
  const data = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(DUST_MAX * 3);
    const age = new Float32Array(DUST_MAX).fill(-1);
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('age', new BufferAttribute(age, 1));
    return { g, pos, age, vel: new Float32Array(DUST_MAX * 3), floor: new Float32Array(DUST_MAX), next: 0, step: 0, wasAir: false };
  }, []);
  useEffect(() => () => data.g.dispose(), [data]);
  const uniforms = useMemo(() => ({ uColor: { value: new Color(color) } }), [color]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const d = data;
    const s = source();
    const emit = (n: number, spread: number, up: number) => {
      for (let k = 0; k < n; k++) {
        const i = d.next++ % DUST_MAX;
        const a = Math.random() * Math.PI * 2;
        const sp = spread * (0.3 + Math.random());
        d.pos.set([s.x + Math.cos(a) * 0.2, s.y + 0.05, s.z + Math.sin(a) * 0.2], i * 3);
        d.vel.set([Math.cos(a) * sp, up * (0.4 + Math.random()), Math.sin(a) * sp], i * 3);
        d.floor[i] = s.y;
        d.age[i] = 0;
      }
    };
    if (!s.air && s.speed > 0.3) {
      d.step += dt * (1.6 + s.speed * 1.4);
      if (d.step >= 1) {
        d.step = 0;
        emit(4 + Math.round(s.speed * 2), 0.6 + s.speed * 0.4, 0.9);
      }
    }
    if (d.wasAir && !s.air) emit(18, 1.6, 1.2);
    d.wasAir = s.air;
    for (let i = 0; i < DUST_MAX; i++) {
      if (d.age[i] < 0) continue;
      d.age[i] += dt;
      if (d.age[i] > 1.6) {
        d.age[i] = -1;
        continue;
      }
      const drag = mars ? Math.exp(-dt * 2) : 1;
      d.vel[i * 3] *= drag;
      d.vel[i * 3 + 2] *= drag;
      d.vel[i * 3 + 1] -= gravity * dt;
      d.pos[i * 3] += d.vel[i * 3] * dt;
      d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
      d.pos[i * 3 + 1] = Math.max(d.floor[i], d.pos[i * 3 + 1] + d.vel[i * 3 + 1] * dt);
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
          attribute float age; varying float vAge;
          void main() {
            vAge = age;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = age < 0.0 ? 0.0 : (0.12 + age * 0.25) * 600.0 / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor; varying float vAge;
          void main() {
            if (vAge < 0.0) discard;
            float r = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.05, r) * (1.0 - smoothstep(0.6, 1.6, vAge)) * 0.6;
            gl_FragColor = vec4(uColor, a);
          }`}
      />
    </points>
  );
}
