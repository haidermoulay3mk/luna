// Built with help from Claude (Anthropic).
// Solar array: angled panels on posts. The cells glow more when Solar input is high.
import { COLORS, Instances, ModuleSpot, clamp01, type Placement } from '../kit';

const XS = [-1.2, 0, 1.2];
const POSTS: Placement[] = XS.map((x) => ({ position: [x, 0.5, 0] }));
const PANELS: Placement[] = XS.map((x) => ({ position: [x, 1.05, 0], rotation: [0.85, 0, 0] }));

export function SolarArray({ output }: { output: number }) {
  return (
    <ModuleSpot id="solar">
      <Instances placements={POSTS}>
        <cylinderGeometry args={[0.06, 0.08, 1.0, 8]} />
        <meshStandardMaterial color={COLORS.trim} metalness={0.4} roughness={0.5} />
      </Instances>
      <Instances placements={PANELS}>
        <boxGeometry args={[1.1, 0.05, 0.75]} />
        <meshStandardMaterial
          color={COLORS.cell}
          emissive={COLORS.cellGlow}
          emissiveIntensity={0.1 + 0.5 * clamp01(output)}
          metalness={0.5}
          roughness={0.35}
        />
      </Instances>
    </ModuleSpot>
  );
}
