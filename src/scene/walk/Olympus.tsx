// Built with help from Claude (Anthropic).
// The climb up Olympus Mons (LUNA_BUILD B1 chapter 6): a camp at the foot, one halfway and one on
// the caldera rim, each with a tent, a crate and a marker light; the summit where the crew plants
// the mission flag; and Olympus Station, whose modules light up one by one for the ending (B2).
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Mesh, type MeshStandardMaterial } from 'three';
import type { OlympusEnding } from '../../engine/scoring';
import { CAMP_SPOTS, SUMMIT_FLAG, type Vec2 } from './layout';
import { OLYMPUS_CENTER, heightAt } from './terrain';

const ground = (p: Vec2) => heightAt('mars', p[0], p[1]);

function Camp({ at, lit }: { at: Vec2; lit: boolean }) {
  return (
    <group position={[at[0], ground(at), at[1]]}>
      {/* Pressurised tent: a half tube on the slope */}
      <mesh position={[3, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1.4, 1.4, 4, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#e8e6df" roughness={0.8} side={DoubleSide} />
      </mesh>
      <mesh position={[-2.2, 0.4, 1.2]} castShadow>
        <boxGeometry args={[0.9, 0.8, 0.9]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.7} />
      </mesh>
      {/* Marker pole; its light is on once the camp's mission is done */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 4, 6]} />
        <meshStandardMaterial color="#d8d8d4" />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#FFB547" emissive="#FFB547" emissiveIntensity={lit ? 2.5 : 0.2} />
      </mesh>
    </group>
  );
}

export function Camps({ reached }: { reached: number }) {
  return (
    <>
      {Object.values(CAMP_SPOTS).map((at, i) => (
        <Camp key={i} at={at} lit={i < reached} />
      ))}
    </>
  );
}

/** The Luna mission flag: amber field, a white crescent and a dark stripe (no national flag, no logos). */
export function MissionFlag({ raised }: { raised: number }) {
  const cloth = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });
  const h = Math.min(1, Math.max(0, raised));
  return (
    <group position={[SUMMIT_FLAG[0], ground(SUMMIT_FLAG) - (1 - h) * 3.2, SUMMIT_FLAG[1]]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 3.2, 8]} />
        <meshStandardMaterial color="#e6e6e2" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.18, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.3, 6]} />
        <meshStandardMaterial color="#e6e6e2" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={cloth} position={[0, 2.75, 0.64]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <planeGeometry args={[1.25, 0.82]} />
        <meshStandardMaterial color="#FFB547" roughness={0.8} side={DoubleSide} />
      </mesh>
      <mesh position={[0.012, 2.78, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.24, 24]} />
        <meshStandardMaterial color="#f4f1ea" side={DoubleSide} />
      </mesh>
      <mesh position={[0.016, 2.8, 0.43]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.22, 24]} />
        <meshStandardMaterial color="#FFB547" side={DoubleSide} />
      </mesh>
      <mesh position={[0.012, 2.42, 0.64]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.25, 0.12]} />
        <meshStandardMaterial color="#1b1d22" side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** How many station modules light up for each ending tier (B2: full base / some dark / one relay light). */
export const LIT_BY_TIER: Record<OlympusEnding, number> = { station: 5, outpost: 3, beacon: 1 };

type PartKind = 'relay' | 'habitat' | 'panels' | 'greenhouse' | 'antenna';
/** Station modules around the summit flag, on the rim (offsets: along the rim, outward). */
const STATION_PARTS: { kind: PartKind; along: number; out: number }[] = [
  { kind: 'relay', along: 0, out: 5 },
  { kind: 'habitat', along: -10, out: 7 },
  { kind: 'panels', along: 10, out: 7 },
  { kind: 'greenhouse', along: -6, out: 15 },
  { kind: 'antenna', along: 7, out: 15 },
];

/** `progress` 0–1: the lights come on one by one, up to `lit` of them. */
export function OlympusStation({ lit, progress }: { lit: number; progress: number }) {
  const dx = SUMMIT_FLAG[0] - OLYMPUS_CENTER[0];
  const dz = SUMMIT_FLAG[1] - OLYMPUS_CENTER[1];
  const d = Math.hypot(dx, dz);
  const ux = dx / d;
  const uz = dz / d;
  return (
    <group>
      {STATION_PARTS.map((part, i) => {
        const at: Vec2 = [SUMMIT_FLAG[0] + ux * part.out - uz * part.along, SUMMIT_FLAG[1] + uz * part.out + ux * part.along];
        return <StationPart key={part.kind} kind={part.kind} at={at} on={i < lit && progress * lit > i} />;
      })}
    </group>
  );
}

function StationPart({ kind, at, on }: { kind: PartKind; at: Vec2; on: boolean }) {
  const light = useRef<MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    if (!light.current) return;
    const target = on ? 2.6 : 0.05;
    light.current.emissiveIntensity += (target - light.current.emissiveIntensity) * Math.min(1, dt * 3);
  });
  const lampY = kind === 'relay' ? 6.2 : kind === 'habitat' ? 3.5 : kind === 'antenna' ? 5.2 : 2.9;
  return (
    <group position={[at[0], ground(at), at[1]]}>
      {kind === 'relay' && (
        <mesh position={[0, 3, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.3, 6, 8]} />
          <meshStandardMaterial color="#d8d8d4" />
        </mesh>
      )}
      {kind === 'habitat' && (
        <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3, 3.2, 3.2, 20]} />
          <meshStandardMaterial color="#e6e5e0" roughness={0.7} />
        </mesh>
      )}
      {kind === 'panels' && (
        <mesh position={[0, 1.4, 0]} rotation={[-0.6, 0, 0]} castShadow>
          <boxGeometry args={[6, 0.1, 2.4]} />
          <meshStandardMaterial color="#1c2f5c" metalness={0.5} roughness={0.3} />
        </mesh>
      )}
      {kind === 'greenhouse' && (
        <mesh castShadow>
          <sphereGeometry args={[2.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#9fb6c4" metalness={0.8} roughness={0.1} transparent opacity={0.45} flatShading />
        </mesh>
      )}
      {kind === 'antenna' && (
        <mesh position={[0, 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.2, 5, 6]} />
          <meshStandardMaterial color="#d8d8d4" />
        </mesh>
      )}
      <mesh position={[0, lampY, 0]}>
        <sphereGeometry args={[kind === 'relay' ? 0.3 : 0.22, 12, 8]} />
        <meshStandardMaterial ref={light} color="#ffe3b0" emissive="#FFB547" emissiveIntensity={0.05} />
      </mesh>
    </group>
  );
}
