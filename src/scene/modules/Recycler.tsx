// Built with help from Claude (Anthropic).
// Water recycler: a tank with a cyan band that glows brighter when Water is high.
import { COLORS, ModuleSpot, clamp01 } from '../kit';

export function Recycler({ level }: { level: number }) {
  return (
    <ModuleSpot id="recycler">
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.9, 16]} />
        <meshStandardMaterial color={COLORS.hull} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.05, 6, 24]} />
        <meshStandardMaterial color={COLORS.life} emissive={COLORS.life} emissiveIntensity={0.3 + 1.2 * clamp01(level)} toneMapped={false} />
      </mesh>
    </ModuleSpot>
  );
}
