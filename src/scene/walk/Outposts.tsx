// Built with help from Claude (Anthropic).
// The hopper (the small lander that flies the crew between mission sites) and the field sites it
// lands at: a rim solar array, an ice-crater drill rig, a broken-down rover and a relay mast.
// All built from simple shapes in code (CLAUDE.md rule 2). The hopper's feet are at y = 0 and it
// faces −z; its flame follows `thrust` (0–1.5) every frame without re-rendering React.
import { useFrame } from '@react-three/fiber';
import { forwardRef, useMemo, useRef, type MutableRefObject } from 'react';
import { AdditiveBlending, DoubleSide, type Group, type Mesh, type MeshStandardMaterial, type Sprite } from 'three';
import type { WorldId } from '../../engine/campaign';
import { FlameMaterial, getFoilTexture, getGlowTexture } from '../space/Craft';
import { SITE_STRUCTURE_RADIUS } from './layout';
import { fieldSites, type Outpost } from './sites';
import { heightAt } from './terrain';
import { getCellTexture, getPanelTexture } from './textures';

/** Landing pads stand this high, with this radius (the same as the base pads). */
export const PAD_TOP = 0.3;
export const PAD_RADIUS = 7;

const LEGS = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4);

export const Hopper = forwardRef<Group, { thrust: MutableRefObject<number>; reduced?: boolean; lights?: boolean }>(function Hopper(
  { thrust, reduced = false, lights = true },
  ref,
) {
  const flame = useRef<Group>(null);
  const glow = useRef<Sprite>(null);
  const bell = useRef<Mesh>(null);
  const nav = useRef<Mesh[]>([]);
  const foil = useMemo(getFoilTexture, []);
  const skin = useMemo(getPanelTexture, []);
  const glowTexture = useMemo(getGlowTexture, []);
  const uniforms = useMemo(() => ({ uPower: { value: 0 }, uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    const power = Math.max(0, thrust.current);
    const t = clock.elapsedTime;
    uniforms.uPower.value = power;
    uniforms.uTime.value = reduced ? 0 : t;
    const flicker = reduced ? 1 : 0.88 + Math.sin(t * 51) * 0.07 + Math.sin(t * 19) * 0.05;
    flame.current?.scale.set(1 + power * 0.35, 0.05 + power * 3.2 * flicker, 1 + power * 0.35);
    if (glow.current) {
      const s = (1.2 + power * 3) * flicker;
      glow.current.scale.set(s, s, 1);
      glow.current.material.opacity = Math.min(1, power);
    }
    const m = bell.current?.material as MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 0.2 + power * 2.2;
    // Navigation lights blink in turn.
    nav.current.forEach((mesh, i) => {
      const mat = mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = lights && (reduced || Math.sin(t * 3 + i * Math.PI) > 0.4) ? 3 : 0.2;
    });
  });
  return (
    <group ref={ref}>
      {/* Descent stage: an eight-sided box wrapped in gold foil */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[1.55, 1.55, 1.05, 8]} />
        <meshStandardMaterial color="#d9a441" map={foil} metalness={1} roughness={0.32} />
      </mesh>
      <mesh position={[0, 2.12, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.1, 8]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Crew cabin with a forward window */}
      {/* Detail (Boss, 15 Nov): round propellant tanks under the deck, RCS thruster blocks on the
          cabin, a hatch ring on top, and a ladder down one leg. */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <group key={`tank${i}`}>
            <mesh position={[Math.cos(a) * 0.85, 0.85, Math.sin(a) * 0.85]}>
              <sphereGeometry args={[0.42, 16, 10]} />
              <meshStandardMaterial color="#c9cdd6" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[Math.cos(a + Math.PI / 4) * 1.12, 3.0, Math.sin(a + Math.PI / 4) * 1.12]} rotation={[0, -(a + Math.PI / 4), 0]}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color="#3a3f48" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 4.02, 0]}>
        <torusGeometry args={[0.38, 0.06, 8, 24]} />
        <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0.35, 0.65, 0.95, 1.25].map((y) => (
        <mesh key={`rung${y}`} position={[1.62, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
          <meshStandardMaterial color="#b8bcc6" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.85, 0]} castShadow>
        <cylinderGeometry args={[1.05, 1.2, 1.35, 16]} />
        <meshStandardMaterial map={skin} color="#eef0f3" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.52, 0]}>
        <sphereGeometry args={[1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={skin} color="#e8eaee" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.0, -1.12]} rotation={[0.12, Math.PI, 0]}>
        <planeGeometry args={[1.1, 0.5]} />
        <meshStandardMaterial color="#0b1a33" metalness={0.95} roughness={0.05} emissive="#2a5aa8" emissiveIntensity={0.6} side={DoubleSide} />
      </mesh>
      {/* Antenna dish on top */}
      <mesh position={[0.45, 4.5, 0.2]} rotation={[0.5, 0, 0.3]}>
        <sphereGeometry args={[0.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        <meshStandardMaterial color="#d8dade" metalness={0.5} roughness={0.4} side={DoubleSide} />
      </mesh>
      {/* Four legs and foot pads */}
      {LEGS.map((a) => (
        <group key={a}>
          <mesh position={[Math.cos(a) * 1.75, 0.75, Math.sin(a) * 1.75]} rotation={[Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]}>
            <cylinderGeometry args={[0.07, 0.09, 1.9, 8]} />
            <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[Math.cos(a) * 2.15, 0.06, Math.sin(a) * 2.15]}>
            <cylinderGeometry args={[0.32, 0.38, 0.12, 12]} />
            <meshStandardMaterial color="#c9952f" metalness={0.9} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* Navigation lights: red on the left, green on the right; they blink in turn */}
      {[-1, 1].map((side, i) => (
        <mesh
          key={side}
          ref={(m) => {
            if (m) nav.current[i] = m;
          }}
          position={[side * 1.58, 1.9, 0]}
        >
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshStandardMaterial color={side < 0 ? '#ff4d4d' : '#4dff88'} emissive={side < 0 ? '#ff2a2a' : '#2aff6a'} emissiveIntensity={1} />
        </mesh>
      ))}
      {/* Engine bell, glowing inside with thrust, and the flame pointing down */}
      <mesh ref={bell} position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.32, 0.6, 0.6, 20, 1, true]} />
        <meshStandardMaterial color="#3a3d44" metalness={0.9} roughness={0.3} emissive="#ff7a2a" emissiveIntensity={0.2} side={DoubleSide} />
      </mesh>
      <group ref={flame} position={[0, 0.55, 0]}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.45, 0.95, 1, 28, 10, true]} />
          <FlameMaterial uniforms={uniforms} layer="outer" />
        </mesh>
        <mesh position={[0, -0.36, 0]} scale={[1, 0.72, 1]}>
          <cylinderGeometry args={[0.3, 0.42, 1, 20, 8, true]} />
          <FlameMaterial uniforms={uniforms} layer="core" />
        </mesh>
      </group>
      <sprite ref={glow} position={[0, 0.35, 0]}>
        <spriteMaterial map={glowTexture} color="#ffd9a0" transparent depthWrite={false} blending={AdditiveBlending} opacity={0} />
      </sprite>
    </group>
  );
});

/** A round landing pad with a ring and a centre line. */
export function LandingPad({ world, at }: { world: WorldId; at: readonly [number, number] }) {
  const y = heightAt(world, at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]}>
      <mesh position={[0, PAD_TOP / 2, 0]} receiveShadow>
        <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS + 0.3, PAD_TOP, 40]} />
        <meshStandardMaterial color="#8f8f8c" roughness={0.85} />
      </mesh>
      <mesh position={[0, PAD_TOP + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.8, 5.5, 40]} />
        <meshStandardMaterial color="#FFB547" emissive="#FFB547" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, PAD_TOP + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 6]} />
        <meshStandardMaterial color="#f2f2ee" />
      </mesh>
    </group>
  );
}

/** Every field site of a world, each with its pad, plus the parked hopper (unless it is flying). */
export function Outposts({ world, parkedAt, reduced }: { world: WorldId; parkedAt?: readonly [number, number] | null; reduced: boolean }) {
  const idle = useRef(0);
  const sites = useMemo(() => fieldSites(world), [world]);
  return (
    <>
      {sites.map((site) => (
        <group key={site.id}>
          <LandingPad world={world} at={site.pad} />
          <SiteBuilding site={site} world={world} reduced={reduced} />
        </group>
      ))}
      {parkedAt && (
        <group position={[parkedAt[0], heightAt(world, parkedAt[0], parkedAt[1]) + PAD_TOP, parkedAt[1]]} rotation={[0, 0.6, 0]}>
          <Hopper thrust={idle} reduced={reduced} />
        </group>
      )}
    </>
  );
}

function SiteBuilding({ site, world, reduced }: { site: Outpost; world: WorldId; reduced: boolean }) {
  if (site.id === 'olympus') return null;
  const [cx, cz] = site.center;
  const y = heightAt(world, cx, cz);
  return (
    <group position={[cx, y, cz]}>
      {site.id === 'ridge' && <SolarArray reduced={reduced} />}
      {site.id === 'ice' && <DrillRig reduced={reduced} />}
      {site.id === 'rover' && <BrokenRover />}
      {site.id === 'relay' && <RelayMast reduced={reduced} />}
    </group>
  );
}

/** Two tall solar wings on masts, slowly tracking the Sun. */
function SolarArray({ reduced }: { reduced: boolean }) {
  const wings = useRef<Group>(null);
  const cells = useMemo(getCellTexture, []);
  useFrame(({ clock }) => {
    if (wings.current && !reduced) wings.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.4;
  });
  return (
    <group>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 5, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.25, 10, 10]} />
          <meshStandardMaterial color="#c8cbd0" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <group ref={wings} position={[0, 10.2, 0]}>
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[-0.35, 0, 0]} castShadow>
            <boxGeometry args={[4.6, 6.5, 0.12]} />
            <meshStandardMaterial map={cells} color="#9fb6e6" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.7, SITE_STRUCTURE_RADIUS - 1.5]} castShadow>
        <boxGeometry args={[2.4, 1.4, 1.4]} />
        <meshStandardMaterial color="#e8eaee" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** A three-legged drill tower over the ice, a tank and a work light. */
function DrillRig({ reduced }: { reduced: boolean }) {
  const drill = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (drill.current && !reduced) drill.current.rotation.y = clock.elapsedTime * 2;
  });
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.6, 4.4, Math.sin(a) * 1.6]} rotation={[Math.sin(a) * 0.36, 0, -Math.cos(a) * 0.36]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 9.2, 8]} />
            <meshStandardMaterial color="#e2642a" metalness={0.4} roughness={0.5} />
          </mesh>
        );
      })}
      <mesh ref={drill} position={[0, 4, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 8, 8]} />
        <meshStandardMaterial color="#9aa0aa" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 8.9, 0]}>
        <boxGeometry args={[1.1, 0.8, 1.1]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[3.2, 1.1, 1.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1, 1, 3, 16]} />
        <meshStandardMaterial color="#e8eaee" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 24]} />
        <meshStandardMaterial color="#cfe3ee" roughness={0.6} emissive="#3d6d86" emissiveIntensity={0.15} />
      </mesh>
      <pointLight position={[0, 7, 0]} intensity={30} distance={22} color="#dff1ff" />
    </group>
  );
}

/** The rover, nose down with a wheel off, and a crate of spare parts beside it. */
function BrokenRover() {
  const wheels = [
    [-1.6, 1.4],
    [1.6, 1.4],
    [-1.6, 0],
    [1.6, 0],
    [-1.6, -1.4],
  ];
  return (
    <group rotation={[0.08, 0.5, 0.06]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[2.8, 1.1, 4.2]} />
        <meshStandardMaterial color="#e8eaee" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.95, -0.9]}>
        <boxGeometry args={[2.2, 0.6, 1.6]} />
        <meshStandardMaterial color="#0b1a33" metalness={0.9} roughness={0.1} emissive="#1d3c75" emissiveIntensity={0.4} />
      </mesh>
      {wheels.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.55, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.45, 16]} />
          <meshStandardMaterial color="#3a3d44" roughness={0.8} />
        </mesh>
      ))}
      {/* The broken wheel, lying on the ground */}
      <mesh position={[3, 0.25, -2.2]} rotation={[0.2, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.45, 16]} />
        <meshStandardMaterial color="#3a3d44" roughness={0.8} />
      </mesh>
      <mesh position={[-3, 0.5, 2.4]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e2642a" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** A tall lattice mast with a dish and a blinking red light on top. */
function RelayMast({ reduced }: { reduced: boolean }) {
  const light = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = light.current?.material as MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = reduced || Math.sin(clock.elapsedTime * 2.4) > 0 ? 4 : 0.3;
  });
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.9, 9, Math.sin(a) * 0.9]} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 18, 6]} />
            <meshStandardMaterial color="#c8cbd0" metalness={0.7} roughness={0.4} />
          </mesh>
        );
      })}
      {[3, 7, 11, 15].map((h) => (
        <mesh key={h} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.95, 0.05, 4, 3]} />
          <meshStandardMaterial color="#c8cbd0" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 17.2, 0.6]} rotation={[-1, 0, 0]}>
        <sphereGeometry args={[1.8, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.8]} />
        <meshStandardMaterial color="#e8eaee" metalness={0.4} roughness={0.4} side={DoubleSide} />
      </mesh>
      <mesh ref={light} position={[0, 18.4, 0]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#ff4d4d" emissive="#ff2a2a" emissiveIntensity={3} />
      </mesh>
      <mesh position={[2.4, 0.6, 0]} castShadow>
        <boxGeometry args={[1.6, 1.2, 1.2]} />
        <meshStandardMaterial color="#e8eaee" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}
