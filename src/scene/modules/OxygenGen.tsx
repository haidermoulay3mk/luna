// Built with help from Claude (Anthropic).
// Oxygen generator: a machine box with two tanks beside it.
import { COLORS, Instances, ModuleSpot, type Placement } from '../kit';

const TANKS: Placement[] = [{ position: [-0.58, 0.38, 0] }, { position: [0.58, 0.38, 0] }];

export function OxygenGen() {
  return (
    <ModuleSpot id="oxygen">
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.56, 0.56]} />
        <meshStandardMaterial color={COLORS.hull} roughness={0.55} />
      </mesh>
      <Instances placements={TANKS}>
        <cylinderGeometry args={[0.16, 0.16, 0.76, 12]} />
        <meshStandardMaterial color={COLORS.oxygenTank} roughness={0.4} metalness={0.2} />
      </Instances>
    </ModuleSpot>
  );
}
