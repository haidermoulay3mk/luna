// Built with help from Claude (Anthropic).
// Glass greenhouse with small leaf shapes that are bigger when Food is high.
import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { COLORS, Instances, ModuleSpot, clamp01, type Placement } from '../kit';

const LEAF_SPOTS = [-0.6, -0.2, 0.2, 0.6].flatMap((x) => [-0.17, 0.17].map((z) => [x, z] as const));

export function Greenhouse({ growth }: { growth: number }) {
  const leaves = useMemo<Placement[]>(() => {
    const s = 0.35 + 0.65 * clamp01(growth);
    return LEAF_SPOTS.map(([x, z], i) => ({ position: [x, 0.28 + 0.14 * s, z], rotation: [0, i * 0.7, 0], scale: [s, s, s] }));
  }, [growth]);
  return (
    <ModuleSpot id="greenhouse">
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.16, 1.2]} />
        <meshStandardMaterial color={COLORS.trim} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.12, 0.75]} />
        <meshStandardMaterial color={COLORS.soil} roughness={1} />
      </mesh>
      <Instances placements={leaves} castShadow={false}>
        <coneGeometry args={[0.12, 0.28, 5]} />
        <meshStandardMaterial color={COLORS.leaf} roughness={0.7} />
      </Instances>
      {/* Half-cylinder glass roof along the x axis */}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.58, 0.58, 1.8, 14, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color={COLORS.glass}
          transparent
          opacity={0.28}
          roughness={0.1}
          metalness={0.1}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </ModuleSpot>
  );
}
