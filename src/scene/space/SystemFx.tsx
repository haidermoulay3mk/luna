// Built with help from Claude (Anthropic).
// Motion and light for the Solar System view (Boss: "improve the VFX across the entire solar
// system"): a churning corona round the Sun, soft atmosphere rims on the planets, a slowly turning
// asteroid belt between Mars and Jupiter, glowing trails behind each planet on its orbit, a comet
// that sweeps past with its tail pointing away from the Sun, and a pulsing ring on the selected
// body. All drawn in code with shaders and instancing; no bloom, no post-processing, no images.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DoubleSide, Object3D, Vector3, type Group, type InstancedMesh, type Mesh } from 'three';
import { makeRockGeometry } from './Craft';
import { NOISE_GLSL } from './Sky';

/** A churning shell of light round the Sun: brighter at the edge, with slow flares moving through it. */
export function SunCorona({ size, reduced }: { size: number; reduced: boolean }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
  });
  return (
    <mesh scale={size * 1.45}>
      <sphereGeometry args={[1, 64, 32]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
        uniforms={uniforms}
        vertexShader={/* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vP;
          void main() { vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
        fragmentShader={/* glsl */ `uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
          ${NOISE_GLSL}
          void main() {
            float rim = 1.0 - abs(dot(vN, vV));
            float flare = fbm(normalize(vP) * 3.0 + vec3(0.0, uTime * 0.12, uTime * 0.05));
            float a = pow(rim, 2.2) * (0.35 + flare * 0.9);
            gl_FragColor = vec4(vec3(1.0, 0.62, 0.25) * a, a);
          }`}
      />
    </mesh>
  );
}

/** A thin glowing rim of air round a planet, bright on the side that faces the Sun (at the scene's centre). */
export function Atmosphere({ size, color, strength = 1 }: { size: number; color: string; strength?: number }) {
  const uniforms = useMemo(() => {
    const c = new Color(color);
    return { uColor: { value: new Vector3(c.r, c.g, c.b) }, uStrength: { value: strength } };
  }, [color, strength]);
  return (
    <mesh scale={size * 1.12}>
      <sphereGeometry args={[1, 48, 24]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
        uniforms={uniforms}
        vertexShader={/* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vOut; varying vec3 vSun;
          void main() {
            vN = normalize(normalMatrix * normal);
            vec4 w = modelMatrix * vec4(position, 1.0);
            vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            vOut = normalize(w.xyz - c);
            vSun = normalize(-c);
            vec4 mv = viewMatrix * w;
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vV; varying vec3 vOut; varying vec3 vSun;
          void main() {
            float rim = pow(1.0 - abs(dot(vN, vV)), 3.0);
            float day = 0.2 + 0.8 * smoothstep(-0.3, 0.5, dot(vOut, vSun));
            float a = rim * day * 0.9 * uStrength;
            gl_FragColor = vec4(uColor * a, a);
          }`}
      />
    </mesh>
  );
}

/** Rocks between two orbits, each on its own slow orbit and tumble (one instanced mesh). */
export function AsteroidBelt({ inner, outer, count, reduced }: { inner: number; outer: number; count: number; reduced: boolean }) {
  const geometry = useMemo(() => makeRockGeometry(21), []);
  const mesh = useRef<InstancedMesh>(null);
  const rocks = useMemo(() => {
    let a = 1234;
    const rand = () => (a = (a * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: count }, () => {
      const r = inner + (outer - inner) * (0.5 + (rand() - 0.5) * (rand() + 0.4));
      return {
        r,
        angle: rand() * Math.PI * 2,
        // Inner rocks go round faster (as orbits do).
        speed: 0.05 * Math.pow(inner / r, 1.5) * (0.8 + rand() * 0.4),
        y: (rand() - 0.5) * 1.6,
        size: 0.08 + Math.pow(rand(), 3) * 0.32,
        spin: rand() * 2,
        tilt: new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      };
    });
  }, [inner, outer, count]);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = reduced ? 0 : clock.elapsedTime;
    rocks.forEach((k, i) => {
      const a = k.angle + t * k.speed;
      dummy.position.set(Math.cos(a) * k.r, k.y, -Math.sin(a) * k.r);
      dummy.setRotationFromAxisAngle(k.tilt, k.spin + t * 0.4);
      dummy.scale.setScalar(k.size);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial color="#9a8f84" vertexColors roughness={0.95} flatShading />
    </instancedMesh>
  );
}

/**
 * Each orbit as a faint circle with a bright trail fading out behind its planet, so the eye sees
 * every planet moving. `angles()` gives each orbit's planet angle (radians) every frame.
 */
export function OrbitTrails({ radii, angles }: { radii: readonly number[]; angles: () => readonly number[] }) {
  const SEG = 200;
  const geometry = useMemo(() => {
    const pos: number[] = [];
    const ang: number[] = [];
    const idx: number[] = [];
    radii.forEach((r, k) => {
      for (let i = 0; i < SEG; i++) {
        for (const j of [i, i + 1]) {
          const a = (j / SEG) * Math.PI * 2;
          pos.push(Math.cos(a) * r, 0, -Math.sin(a) * r);
          ang.push(a);
          idx.push(k);
        }
      }
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('angle', new BufferAttribute(new Float32Array(ang), 1));
    g.setAttribute('orbit', new BufferAttribute(new Float32Array(idx), 1));
    return g;
  }, [radii]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uHeads: { value: new Array(8).fill(0) as number[] } }), []);
  useFrame(() => {
    const a = angles();
    for (let i = 0; i < 8; i++) uniforms.uHeads.value[i] = a[i] ?? 0;
  });
  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `attribute float angle; attribute float orbit; uniform float uHeads[8]; varying float vTrail;
          void main() {
            float head = uHeads[int(orbit + 0.5)];
            // How far behind the planet this point is along its path (0 = at the planet).
            float behind = mod(head - angle + 6.2831853, 6.2831853);
            vTrail = exp(-behind * 2.2);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={/* glsl */ `varying float vTrail;
          void main() {
            vec3 faint = vec3(0.55, 0.64, 0.8) * 0.2;
            vec3 glow = vec3(0.49, 0.94, 1.0) * vTrail * 0.85;
            gl_FragColor = vec4(faint + glow, 1.0);
          }`}
      />
    </lineSegments>
  );
}

const TAIL = 140;

/**
 * A comet on a long, tilted ellipse round the Sun. Near the Sun it speeds up and its tail grows,
 * always pointing away from the Sun.
 */
export function SystemComet({ reduced }: { reduced: boolean }) {
  const head = useRef<Mesh>(null);
  const tail = useRef<Group>(null);
  const data = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(TAIL * 3);
    const t = new Float32Array(TAIL);
    for (let i = 0; i < TAIL; i++) t[i] = i / (TAIL - 1);
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('along', new BufferAttribute(t, 1));
    let a = 99;
    const rand = () => (a = (a * 16807) % 2147483647) / 2147483647 - 0.5;
    return { g, pos, jitter: Array.from({ length: TAIL }, () => [rand(), rand(), rand()]) };
  }, []);
  useEffect(() => () => data.g.dispose(), [data]);
  const v = useMemo(() => ({ p: new Vector3(), away: new Vector3(), x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0) }), []);
  useFrame(({ clock }) => {
    // Fast near the Sun, slow far out (Kepler's equation, a few steps), one loop every 70 s.
    const M = ((reduced ? 10 : clock.elapsedTime) / 70) * Math.PI * 2;
    const e = 0.82;
    let E = M;
    for (let k = 0; k < 5; k++) E = M + e * Math.sin(E);
    const a = 95;
    const b = a * Math.sqrt(1 - e * e);
    const { p, away } = v;
    p.set(a * (Math.cos(E) - e), 0, b * Math.sin(E)).applyAxisAngle(v.x, 0.35).applyAxisAngle(v.y, 2.2);
    head.current?.position.copy(p);
    const r = p.length();
    const length = Math.min(30, 900 / Math.max(r, 12));
    away.copy(p).normalize();
    for (let i = 0; i < TAIL; i++) {
      const t = i / (TAIL - 1);
      const spread = t * length * 0.12;
      const j = data.jitter[i];
      data.pos.set([p.x + away.x * t * length + j[0] * spread, p.y + away.y * t * length + j[1] * spread, p.z + away.z * t * length + j[2] * spread], i * 3);
    }
    data.g.attributes.position.needsUpdate = true;
    if (tail.current) tail.current.visible = r < 80;
  });
  return (
    <>
      <mesh ref={head}>
        <sphereGeometry args={[0.35, 12, 8]} />
        <meshBasicMaterial color="#e8f6ff" />
      </mesh>
      <group ref={tail}>
        <points geometry={data.g} frustumCulled={false}>
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            vertexShader={/* glsl */ `attribute float along; varying float vA;
              void main() { vA = along; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (1.0 - along * 0.6) * 260.0 / -mv.z; gl_Position = projectionMatrix * mv; }`}
            fragmentShader={/* glsl */ `varying float vA;
              void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r) * (1.0 - vA) * 0.5; gl_FragColor = vec4(vec3(0.7, 0.88, 1.0) * a, a); }`}
          />
        </points>
      </group>
    </>
  );
}

/** A pulsing ring that faces the camera round the selected planet. */
export function SelectionRing({ target, size, reduced }: { target: () => Vector3 | undefined; size: () => number; reduced: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock, camera }) => {
    const m = ref.current;
    if (!m) return;
    const p = target();
    m.visible = Boolean(p);
    if (!p) return;
    m.position.copy(p);
    m.quaternion.copy(camera.quaternion);
    m.scale.setScalar(size() * (1.6 + (reduced ? 0 : 0.15 * Math.sin(clock.elapsedTime * 3))));
  });
  return (
    <mesh ref={ref} visible={false}>
      <ringGeometry args={[1, 1.06, 64]} />
      <meshBasicMaterial color="#FFB547" transparent opacity={0.85} side={DoubleSide} depthWrite={false} />
    </mesh>
  );
}
