// Built with help from Claude (Anthropic).
// Habitat: a dome on a ring wall, with windows that glow brighter when Power is high.
import { COLORS, Instances, ModuleSpot, clamp01, type Placement } from '../kit';

const WINDOWS: Placement[] = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2 + Math.PI / 6; // keeps the front (+z) clear for the airlock
  return { position: [Math.sin(angle) * 1.46, 0.27, Math.cos(angle) * 1.46], rotation: [0, angle, 0] };
});

export function Habitat({ light }: { light: number }) {
  return (
    <ModuleSpot id="habitat">
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.45, 1.5, 0.5, 20]} />
        <meshStandardMaterial color={COLORS.trim} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <sphereGeometry args={[1.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.hull} roughness={0.55} />
      </mesh>
      <Instances placements={WINDOWS} castShadow={false}>
        <boxGeometry args={[0.32, 0.16, 0.05]} />
        <meshStandardMaterial color={COLORS.ink} emissive={COLORS.sun} emissiveIntensity={0.3 + 1.7 * clamp01(light)} toneMapped={false} />
      </Instances>
      {/* Airlock tunnel */}
      <mesh position={[0, 0.32, 1.75]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.8, 12]} />
        <meshStandardMaterial color={COLORS.hull} roughness={0.6} />
      </mesh>
    </ModuleSpot>
  );
}
