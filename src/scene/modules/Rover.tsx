// Built with help from Claude (Anthropic).
// Six-wheel rover with an orange cabin.
import { COLORS, Instances, ModuleSpot, type Placement } from '../kit';

const WHEELS: Placement[] = [-0.4, 0, 0.4].flatMap((x) =>
  [-0.36, 0.36].map((z) => ({ position: [x, 0.17, z] as [number, number, number], rotation: [Math.PI / 2, 0, 0] as [number, number, number] })),
);

export function Rover() {
  return (
    <ModuleSpot id="rover" rotationY={0.35}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.26, 0.62]} />
        <meshStandardMaterial color={COLORS.hull} roughness={0.55} />
      </mesh>
      <mesh position={[0.22, 0.66, 0]} castShadow>
        <boxGeometry args={[0.46, 0.28, 0.52]} />
        <meshStandardMaterial color={COLORS.rex} roughness={0.5} />
      </mesh>
      <Instances placements={WHEELS}>
        <cylinderGeometry args={[0.17, 0.17, 0.12, 12]} />
        <meshStandardMaterial color={COLORS.ink} roughness={0.9} />
      </Instances>
    </ModuleSpot>
  );
}
