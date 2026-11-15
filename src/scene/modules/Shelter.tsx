// Built with help from Claude (Anthropic).
// Radiation shelter: dug into the ground, with a shielding mound of soil on top.
import { COLORS, ModuleSpot } from '../kit';

export function Shelter() {
  return (
    <ModuleSpot id="shelter">
      <mesh scale={[1, 0.55, 1]} castShadow receiveShadow>
        <sphereGeometry args={[1.25, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.regolithDark} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.27, 1.05]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.54, 0.4]} />
        <meshStandardMaterial color={COLORS.trim} roughness={0.6} />
      </mesh>
      {/* Door light. Phase 5 makes it light up during a solar storm. */}
      <mesh position={[0, 0.47, 1.26]}>
        <boxGeometry args={[0.34, 0.06, 0.02]} />
        <meshStandardMaterial color={COLORS.sun} emissive={COLORS.sun} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </ModuleSpot>
  );
}
