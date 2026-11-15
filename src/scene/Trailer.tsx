// Built with help from Claude (Anthropic).
// The loading trailer (Boss, 15 Nov): a short 3D cut-scene while the game loads. Lift-off from the
// Moon (engine flame, dust, camera shake) → cruise through debris (small hits: sparks and a jolt) →
// dodging asteroids → the burn down onto Mars and touchdown. Built from the game's own rocket,
// rocks, sparks and NASA planet maps. Not a video file: rendered live, nothing to download.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Box3, NormalBlending, Vector3, type Group, type Material, type Mesh } from 'three';
import { SpaceReflections } from './flight/FlightScene';
import { makeRockGeometry, Rocket } from './space/Craft';
import { SparkBurst, type SparkTrigger } from './space/Fx';
import { Planet } from './space/Planet';
import { Sky } from './space/Sky';
import { DPR, watchContextLoss } from './space/webgl';

/** When each shot starts (seconds) and the whole length. */
export const SHOTS = { launch: 0, cruise: 4, dodge: 8.5, mars: 12, touchdown: 15.6, end: 17 } as const;
export const TRAILER_SECONDS = SHOTS.end;
export const SHOT_CAPTION = (t: number) =>
  t < SHOTS.cruise ? 'Lift-off from the Moon' : t < SHOTS.dodge ? 'Through the debris' : t < SHOTS.mars ? 'Dodging asteroids' : 'Landing on Mars';

const PLANET_R = 60;
const ROCKS = 28;
/** Times when a piece of debris strikes the hull. */
const HITS = [5.4, 6.9, 9.6, 10.8];
/** How long a strike takes to fly in (seconds). */
const STRIKE = 0.7;

/** Seeded random, so the trailer plays the same each time. */
function seeded(seed: number) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}
const rand = seeded(42);
/** A scattered position around the route: never right on the path, sometimes a near miss. */
function scatter() {
  const angle = rand() * Math.PI * 2;
  const r = 2.6 + Math.pow(rand(), 0.8) * 16;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function TrailerScene({ clock, reduced }: { clock: { current: number }; reduced: boolean }) {
  return (
    <Canvas dpr={DPR} camera={{ position: [8, 2, 14], fov: 50, near: 0.1, far: 9000 }} onCreated={watchContextLoss} aria-hidden>
      <color attach="background" args={['#020306']} />
      <Sky earth={false} sun={false} stars={2600} />
      <directionalLight position={[-10, 8, 6]} intensity={2.8} color="#fff1e0" />
      <ambientLight intensity={0.12} />
      <Suspense fallback={null}>
        <Shots clock={clock} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}

function Shots({ clock, reduced }: { clock: { current: number }; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const rocket = useRef<Group>(null);
  const moon = useRef<Group>(null);
  const mars = useRef<Group>(null);
  const rocks = useRef<Group>(null);
  const thrust = useRef(0.4);
  const dust: SparkTrigger = useRef(null);
  const sparks: SparkTrigger = useRef(null);
  const marsDust: SparkTrigger = useRef(null);
  const state = useRef({ shake: 0, hit: 0, dustAt: 0, landed: false });
  const look = useMemo(() => new Vector3(), []);
  const feet = useRef(0);
  useLayoutEffect(() => {
    if (!rocket.current) return;
    rocket.current.updateMatrixWorld(true);
    // Only the solid parts (not the see-through flame or its glow), so the legs touch the ground.
    const box = new Box3();
    rocket.current.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || !m.geometry) return;
      const mat = m.material as Material;
      if (mat.transparent || mat.blending !== NormalBlending) return;
      box.expandByObject(m);
    });
    feet.current = box.isEmpty() ? 0 : -box.min.y;
  }, []);
  const geometries = useMemo(() => [makeRockGeometry(3), makeRockGeometry(7), makeRockGeometry(11)], []);
  // Rocks spread along the route ahead (+y), each with its own size and side offset.
  // A scattered field: random spots around the route, random sizes, speeds and tumble.
  const field = useMemo(
    () =>
      Array.from({ length: ROCKS }, () => ({
        ...scatter(),
        y: 15 + rand() * ROCKS * 7,
        size: 0.3 + Math.pow(rand(), 2) * 2.6,
        spin: 0.2 + rand() * 1.2,
        speed: 0.75 + rand() * 0.6,
      })),
    [],
  );
  // Debris that actually flies in and strikes the hull: a direction and a spot on the rocket per hit.
  const strikes = useMemo(
    () => HITS.map(() => ({ angle: rand() * Math.PI * 2, height: 1 + rand() * 4, from: new Vector3(rand() - 0.5, 0.6 + rand(), rand() - 0.5).normalize() })),
    [],
  );
  const debris = useRef<Group>(null);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    clock.current += dt;
    const t = clock.current;
    const s = state.current;
    const r = rocket.current;
    if (!r) return;

    // ---- the rocket's path ----
    let y = 0;
    let x = 0;
    let bank = 0;
    if (t < SHOTS.cruise) {
      const up = Math.max(0, t - 1.1);
      y = up * up * 1.6;
      thrust.current = t < 1.1 ? 0.35 + t * 0.4 : 1;
      if (t > 0.9 && t < 2.6 && t - s.dustAt > 0.18) {
        s.dustAt = t;
        dust.current = { x: (Math.random() - 0.5) * 1.5, y: 0.2, z: (Math.random() - 0.5) * 1.5 };
      }
      s.shake = Math.max(s.shake, t > 0.9 && t < 3.5 ? 0.6 * (1 - (t - 0.9) / 2.6) : 0);
    } else if (t < SHOTS.mars) {
      // Deep space: the rocket stays near the origin and the rocks rush past; it weaves to dodge.
      thrust.current = 0.85;
      const k = t - SHOTS.cruise;
      x = Math.sin(k * (t > SHOTS.dodge ? 2.4 : 1.1)) * (t > SHOTS.dodge ? 2.2 : 0.8);
      bank = -Math.cos(k * (t > SHOTS.dodge ? 2.4 : 1.1)) * (t > SHOTS.dodge ? 0.45 : 0.15);
    } else {
      // Mars: a burn down onto the plain, slowing to a soft touchdown.
      const k = Math.min(1, (t - SHOTS.mars) / (SHOTS.touchdown - SHOTS.mars));
      y = 34 * (1 - smooth(k));
      thrust.current = k < 1 ? 0.55 + (1 - k) * 0.45 : Math.max(0, thrust.current - dt * 1.5);
      if (k >= 1 && !s.landed) {
        s.landed = true;
        marsDust.current = { x: 0, y: 0.3, z: 0 };
        s.shake = 0.9;
      }
    }
    // Lifted by its own height below the origin, so it stands on the Moon and lands on Mars (not inside).
    r.position.set(x, y + feet.current, 0);
    r.rotation.z = bank;

    // ---- worlds ----
    if (moon.current) {
      moon.current.visible = t < SHOTS.cruise;
      moon.current.position.y = -PLANET_R;
    }
    if (mars.current) {
      if (t < SHOTS.mars) {
        // Far ahead and growing during the cruise.
        const k = (t - SHOTS.cruise) / (SHOTS.mars - SHOTS.cruise);
        mars.current.visible = t >= SHOTS.cruise;
        mars.current.position.set(0, 320 - k * 120, -30);
        mars.current.scale.setScalar(0.35 + k * 0.45);
      } else {
        mars.current.visible = true;
        mars.current.position.set(0, -PLANET_R, 0);
        mars.current.scale.setScalar(1);
      }
    }

    // ---- rocks rush past in space ----
    const g = rocks.current;
    if (g) {
      g.visible = t >= SHOTS.cruise && t < SHOTS.mars;
      const speed = t > SHOTS.dodge ? 46 : 30;
      g.children.forEach((m, i) => {
        const f = field[i];
        f.y -= speed * f.speed * dt;
        if (f.y < -30) {
          // Back far ahead at a new random spot.
          Object.assign(f, scatter());
          f.y += ROCKS * 7 + rand() * 20;
        }
        // In the dodge shot the rocks sit closer to the path.
        const pull = t > SHOTS.dodge ? 0.55 : 1;
        m.position.set(f.x * pull, f.y, f.z * pull);
        m.rotation.x += f.spin * dt;
        m.rotation.y += f.spin * 0.7 * dt;
      });
    }

    // ---- small debris hits: sparks and a jolt ----
    const d = debris.current;
    HITS.forEach((h, i) => {
      const m = d?.children[i];
      const k = (t - (h - STRIKE)) / STRIKE;
      const st = strikes[i];
      // The contact spot on the hull (the hull is about 0.6 wide at this scale).
      const cx = x + Math.cos(st.angle) * 0.62;
      const cy = y + feet.current + st.height;
      const cz = Math.sin(st.angle) * 0.62;
      if (m) {
        m.visible = k >= 0 && k < 1;
        if (m.visible) {
          m.position.set(cx + st.from.x * 14 * (1 - k), cy + st.from.y * 14 * (1 - k), cz + st.from.z * 14 * (1 - k));
          m.rotation.x += dt * 9;
          m.rotation.y += dt * 7;
        }
      }
      if (s.hit < h && t >= h) {
        s.hit = h;
        sparks.current = { x: cx, y: cy, z: cz };
        s.shake = Math.max(s.shake, 0.8);
      }
    });

    // ---- cameras: a different view for each shot ----
    const want = new Vector3();
    if (t < SHOTS.cruise) {
      // Low on the Moon's surface, looking up as it rises.
      want.set(7, 1.2 + y * 0.25, 13);
      look.set(0, y + 2, 0);
    } else if (t < SHOTS.cruise + 2.2) {
      // Side tracking shot.
      want.set(x + 11, y + 2, 6);
      look.set(x, y + 2, 0);
    } else if (t < SHOTS.dodge) {
      // From ahead, the rocket coming at the camera through the debris.
      want.set(x - 3, y + 16, 7);
      look.set(x, y + 2, 0);
    } else if (t < SHOTS.mars) {
      // Behind and below the engine, rocks flashing past.
      want.set(x * 0.5 + 2.5, y - 7, 5.5);
      look.set(x, y + 6, 0);
    } else if (t < SHOTS.mars + 2) {
      // Wide shot over Mars as it comes down.
      want.set(16, y * 0.6 + 8, 20);
      look.set(0, y * 0.5, 0);
    } else {
      // Low on the Martian plain for the touchdown.
      want.set(8, 1.5, 11);
      look.set(0, y + 1.5, 0);
    }
    camera.position.copy(want);
    // Engine rumble while it burns, plus the bigger jolts (lift-off, hits, touchdown).
    const rumble = thrust.current > 0.3 ? 0.07 * thrust.current : 0;
    const shake = s.shake + rumble;
    if (!reduced && shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      camera.position.z += (Math.random() - 0.5) * shake * 0.5;
      s.shake = Math.max(0, s.shake - dt * 0.8);
    }
    camera.lookAt(look);
    if (!reduced && shake > 0) camera.rotation.z += (Math.random() - 0.5) * shake * 0.04;
  });

  return (
    <>
      <group ref={moon}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Planet body="moon" radius={PLANET_R} segments={128} spin={false} />
        </group>
      </group>
      <group ref={mars} visible={false}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Planet body="mars" radius={PLANET_R} segments={128} spin={false} />
        </group>
      </group>
      <group ref={rocket} scale={1.9}>
        {/* The model's nose points along +z: stand it up (nose along +y). */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Rocket thrust={thrust} reduced={reduced} />
        </group>
      </group>
      <group ref={rocks}>
        {field.map((f, i) => (
          <mesh key={i} geometry={geometries[i % 3]} scale={f.size}>
            <meshStandardMaterial vertexColors roughness={1} />
          </mesh>
        ))}
      </group>
      <group ref={debris}>
        {HITS.map((h) => (
          <mesh key={h} geometry={geometries[h > 9 ? 1 : 2]} scale={0.18} visible={false}>
            <meshStandardMaterial vertexColors roughness={1} />
          </mesh>
        ))}
      </group>
      <SpaceReflections />
      <SparkBurst trigger={dust} count={70} speed={5} color="#b9b4aa" size={1.6} gravity={1.6} soft />
      <SparkBurst trigger={sparks} count={70} speed={11} color="#ffc27a" size={0.4} gravity={0} />
      <SparkBurst trigger={marsDust} count={90} speed={7} color="#c97b4f" size={1.8} gravity={3.7} soft />
    </>
  );
}
