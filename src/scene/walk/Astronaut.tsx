// Built with help from Claude (Anthropic).
// The player's astronaut, built only from shapes (CLAUDE.md rule 12: no likeness of real people).
// Styled after Boss's reference: a white surface suit, a dark mirrored visor, a life-support
// backpack, a chest control unit with blue and red hose connectors, hoses, knee pads and
// white boots. No agency logos. Each crew member wears a coloured arm stripe so friends can tell
// each other apart (real crews use stripes the same way).
// `pose` is read every frame (speed 0–2, in the air or not), so walking animates without React renders.
import { useFrame } from '@react-three/fiber';
import { getSuitTexture } from './textures';
import { forwardRef, useMemo, useRef, type MutableRefObject } from 'react';
import { CatmullRomCurve3, Vector3, type Group } from 'three';

export interface Pose {
  /** 0 standing, 1 walking, about 1.9 running. */
  speed: number;
  air: boolean;
  /** Planting the flag: arms raised (0–1). */
  reach?: number;
}

const SUIT = { color: '#ecebe6', roughness: 0.92, metalness: 0 } as const;
const SUIT_SHADE = '#d4d2cc';
const GLOVE = '#3c4150';
const DARK = '#22252c';

function Hose({ points }: { points: [number, number, number][] }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p))), [points]);
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 16, 0.028, 8, false]} />
      <meshStandardMaterial color="#f2f1ec" roughness={0.85} />
    </mesh>
  );
}

const HOSES: [number, number, number][][] = [-1, 1].map((side) => [
  [side * 0.08, 1.27, 0.22],
  [side * 0.2, 1.15, 0.24],
  [side * 0.31, 1.1, 0.12],
  [side * 0.27, 1.2, -0.13],
]);

const CONNECTORS: [number, number, string][] = [
  [-0.08, 1.28, '#2b3d9a'],
  [0.08, 1.28, '#2b3d9a'],
  [-0.08, 1.17, '#b52a2a'],
  [0.08, 1.17, '#b52a2a'],
];

export const Astronaut = forwardRef<Group, { pose: MutableRefObject<Pose>; band?: string; reduced?: boolean }>(function Astronaut(
  { pose, band = '#FFB547', reduced = false },
  ref,
) {
  const body = useRef<Group>(null);
  // Quilted suit fabric (Boss, 15 Nov: the suit looked like plain plastic).
  const suit = useMemo(() => {
    const t = getSuitTexture().clone();
    t.repeat.set(2, 2);
    t.needsUpdate = true;
    return t;
  }, []);
  const arms = [useRef<Group>(null), useRef<Group>(null)];
  const fores = [useRef<Group>(null), useRef<Group>(null)];
  const legs = [useRef<Group>(null), useRef<Group>(null)];
  const shins = [useRef<Group>(null), useRef<Group>(null)];
  const phase = useRef(0);

  useFrame(({ clock }, dt) => {
    const p = pose.current;
    const moving = Math.min(2, p.speed);
    if (moving > 0.05) phase.current += dt * (3.4 + moving * 2.4);
    const s = Math.sin(phase.current);
    // The walk cycle always plays (also with reduced motion): it is the character answering the
    // player's keys, not decoration. Without it the astronaut slid along in a stiff pose.
    const swing = Math.min(1, moving) * (moving > 1.2 ? 0.85 : 0.6);
    const air = p.air;
    const reach = p.reach ?? 0;
    [0, 1].forEach((i) => {
      const sign = i === 0 ? 1 : -1;
      // Legs swing from the hip and bend at the knee on the back stroke. In the air: knees tucked.
      const leg = legs[i].current;
      const shin = shins[i].current;
      if (leg) leg.rotation.x = air ? (i === 0 ? -0.55 : -0.25) : sign * s * swing;
      if (shin) shin.rotation.x = air ? (i === 0 ? 0.8 : 0.5) : Math.max(0, -sign * s) * swing * 1.3;
      // Arms swing opposite to the legs; the stiff suit holds them a little out to the side.
      const arm = arms[i].current;
      if (arm) {
        arm.rotation.x = -sign * s * swing * 0.8 - reach * 2.6 - (air ? 0.4 : 0);
        arm.rotation.z = i === 0 ? 0.22 : -0.22;
      }
      const fore = fores[i].current;
      if (fore) fore.rotation.x = -0.35 - swing * 0.2 + reach * 0.3;
    });
    // The body bobs with each step and breathes a little when standing.
    if (body.current) {
      const bob =
        moving > 0.05
          ? Math.abs(Math.cos(phase.current)) * 0.05 * Math.min(1, moving)
          : reduced
            ? 0
            : Math.sin(clock.elapsedTime * 1.6) * 0.008;
      body.current.position.y = bob;
      body.current.rotation.x = Math.min(1.5, moving) * 0.08;
    }
  });

  return (
    <group ref={ref}>
      <group ref={body}>
        {/* Torso: a soft, wide suit body */}
        <mesh position={[0, 1.25, 0]} scale={[1.18, 1, 0.82]} castShadow>
          <capsuleGeometry args={[0.24, 0.32, 6, 16]} />
          <meshStandardMaterial {...SUIT} map={suit} bumpMap={suit} bumpScale={1.5} />
        </mesh>
        <mesh position={[0, 0.97, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 0.82, 1]}>
          <torusGeometry args={[0.23, 0.035, 8, 24]} />
          <meshStandardMaterial color={SUIT_SHADE} roughness={0.9} />
        </mesh>
        {/* Helmet shell, the dark gold visor, and the neck ring */}
        <mesh position={[0, 1.7, 0.02]} castShadow>
          <sphereGeometry args={[0.215, 24, 18]} />
          <meshStandardMaterial color="#f4f3ef" roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.7, 0.035]} rotation={[0.15, 0, 0]}>
          <sphereGeometry args={[0.222, 24, 18, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.24, Math.PI * 0.42]} />
          <meshStandardMaterial color="#d9a441" metalness={1} roughness={0.06} emissive="#4a2c08" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, 1.52, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.03, 8, 24]} />
          <meshStandardMaterial color="#c9c9cd" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Life-support backpack */}
        <mesh position={[0, 1.33, -0.27]} castShadow>
          <boxGeometry args={[0.46, 0.6, 0.24]} />
          <meshStandardMaterial color="#e3e1db" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.66, -0.24]}>
          <boxGeometry args={[0.3, 0.1, 0.16]} />
          <meshStandardMaterial color={SUIT_SHADE} roughness={0.8} />
        </mesh>
        {/* Chest control unit and its hose connectors */}
        {/* Detail (Boss, 15 Nov): helmet lamps, life-support hoses from the pack to the chest unit,
            and a short antenna on the backpack. */}
        {[-1, 1].map((side) => (
          <group key={`lamp${side}`} position={[side * 0.2, 1.78, 0.04]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.07, 12]} />
              <meshStandardMaterial color="#c9c9cd" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, 0.036]}>
              <circleGeometry args={[0.026, 12]} />
              <meshStandardMaterial color="#fff6dd" emissive="#ffe9b0" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`hose${side}`} position={[side * 0.2, 1.38, -0.02]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.2, 0.018, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#8d939c" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0.16, 1.82, -0.3]}>
          <cylinderGeometry args={[0.008, 0.008, 0.36, 6]} />
          <meshStandardMaterial color="#b8bcc6" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.4, 0.22]}>
          <boxGeometry args={[0.22, 0.13, 0.08]} />
          <meshStandardMaterial color="#dcdad4" roughness={0.6} />
        </mesh>
        <mesh position={[0.03, 1.41, 0.265]}>
          <boxGeometry args={[0.07, 0.05, 0.01]} />
          <meshStandardMaterial color={DARK} roughness={0.4} />
        </mesh>
        {CONNECTORS.map(([x, y, color]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.245]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
          </mesh>
        ))}
        {HOSES.map((points, i) => (
          <Hose key={i} points={points} />
        ))}
        {/* Arms: shoulder → elbow → glove */}
        {[0, 1].map((i) => (
          <group key={i} ref={arms[i]} position={[(i === 0 ? -1 : 1) * 0.33, 1.47, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.2, 4, 12]} />
              <meshStandardMaterial {...SUIT} map={suit} bumpMap={suit} bumpScale={1.5} />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <cylinderGeometry args={[0.093, 0.093, 0.07, 16]} />
              <meshStandardMaterial color={band} roughness={0.6} />
            </mesh>
            <group ref={fores[i]} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.13, 0]} castShadow>
                <capsuleGeometry args={[0.078, 0.18, 4, 12]} />
                <meshStandardMaterial {...SUIT} map={suit} bumpMap={suit} bumpScale={1.5} />
              </mesh>
              <mesh position={[0, -0.32, 0.01]} scale={[1, 1.15, 0.8]}>
                <sphereGeometry args={[0.075, 12, 10]} />
                <meshStandardMaterial color={GLOVE} roughness={0.7} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
      {/* Legs: hip → knee → boot (outside the bobbing body so the boots stay on the ground) */}
      {[0, 1].map((i) => (
        <group key={i} ref={legs[i]} position={[(i === 0 ? -1 : 1) * 0.13, 0.95, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.11, 0.24, 4, 12]} />
            <meshStandardMaterial {...SUIT} map={suit} bumpMap={suit} bumpScale={1.5} />
          </mesh>
          <mesh position={[(i === 0 ? -1 : 1) * 0.1, -0.2, 0.03]}>
            <boxGeometry args={[0.05, 0.16, 0.13]} />
            <meshStandardMaterial color={SUIT_SHADE} roughness={0.9} />
          </mesh>
          <group ref={shins[i]} position={[0, -0.43, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.22, 4, 12]} />
              <meshStandardMaterial {...SUIT} map={suit} bumpMap={suit} bumpScale={1.5} />
            </mesh>
            <mesh position={[0, -0.02, 0.08]}>
              <boxGeometry args={[0.13, 0.12, 0.05]} />
              <meshStandardMaterial color={SUIT_SHADE} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.44, 0.04]} castShadow>
              <boxGeometry args={[0.17, 0.12, 0.3]} />
              <meshStandardMaterial color="#dddbd5" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.5, 0.04]}>
              <boxGeometry args={[0.18, 0.03, 0.31]} />
              <meshStandardMaterial color={DARK} roughness={0.9} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
});
