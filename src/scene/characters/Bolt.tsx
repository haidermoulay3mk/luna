// Built with help from Claude (Anthropic).
// BOLT (SPEC Part 3): box body, one big round eye, antenna, treads. Yellow and white.
import { COLORS, Instances, ModuleSpot, type Placement } from '../kit';

const TREADS: Placement[] = [{ position: [-0.17, 0.09, 0] }, { position: [0.17, 0.09, 0] }];

export function Bolt() {
  return (
    <ModuleSpot id="bolt" rotationY={0.25} scale={1.35}>
      <Instances placements={TREADS}>
        <boxGeometry args={[0.12, 0.18, 0.42]} />
        <meshStandardMaterial color={COLORS.trim} roughness={0.8} />
      </Instances>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 0.36, 0.36]} />
        <meshStandardMaterial color={COLORS.bolt} roughness={0.5} />
      </mesh>
      {/* Eye: white disc with a dark pupil */}
      <mesh position={[0, 0.39, 0.185]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 20]} />
        <meshStandardMaterial color={COLORS.white} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.39, 0.21]}>
        <sphereGeometry args={[0.055, 12, 8]} />
        <meshStandardMaterial color={COLORS.ink} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
        <meshStandardMaterial color={COLORS.trim} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color={COLORS.bolt} emissive={COLORS.bolt} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </ModuleSpot>
  );
}
