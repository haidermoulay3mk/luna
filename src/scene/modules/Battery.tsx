// Built with help from Claude (Anthropic).
// Battery stacks with glowing level strips that follow Battery reserve.
import { useMemo } from 'react';
import { COLORS, Instances, ModuleSpot, clamp01, type Placement } from '../kit';

const XS = [-0.5, 0, 0.5];
const STACKS: Placement[] = XS.map((x) => ({ position: [x, 0.45, 0] }));

export function Battery({ level }: { level: number }) {
  const strips = useMemo<Placement[]>(() => {
    const fill = Math.max(0.04, clamp01(level));
    return XS.map((x) => ({ position: [x, 0.07 + 0.38 * fill, 0.215], scale: [1, fill, 1] }));
  }, [level]);
  return (
    <ModuleSpot id="battery">
      <Instances placements={STACKS}>
        <boxGeometry args={[0.42, 0.9, 0.42]} />
        <meshStandardMaterial color={COLORS.trim} roughness={0.6} metalness={0.3} />
      </Instances>
      <Instances placements={strips} castShadow={false}>
        <boxGeometry args={[0.12, 0.76, 0.02]} />
        <meshStandardMaterial color={COLORS.sun} emissive={COLORS.sun} emissiveIntensity={1.4} toneMapped={false} />
      </Instances>
    </ModuleSpot>
  );
}
