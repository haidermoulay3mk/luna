// Built with help from Claude (Anthropic).
// Antenna: a mast with a dish that slowly turns (SPEC Part 7). Still when motion is reduced.
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Group } from 'three';
import { COLORS, ModuleSpot } from '../kit';

const DISH_RADIUS = 0.62;

export function Antenna({ spin }: { spin: boolean }) {
  const dish = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spin && dish.current) dish.current.rotation.y += Math.min(delta, 0.1) * 0.3;
  });
  return (
    <ModuleSpot id="antenna">
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 2.2, 8]} />
        <meshStandardMaterial color={COLORS.trim} metalness={0.4} roughness={0.5} />
      </mesh>
      <group ref={dish} position={[0, 2.2, 0]}>
        <group rotation={[0.6, 0, 0]}>
          {/* A sphere cap flipped upside down makes a bowl that opens upward. */}
          <mesh position={[0, DISH_RADIUS, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <sphereGeometry args={[DISH_RADIUS, 16, 6, 0, Math.PI * 2, 0, 0.95]} />
            <meshStandardMaterial color={COLORS.hull} roughness={0.5} side={DoubleSide} />
          </mesh>
          {/* Signal light. Phase 5 blinks it red during a blackout. */}
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color={COLORS.signal} emissive={COLORS.signal} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </ModuleSpot>
  );
}
