// Built with help from Claude (Anthropic).
// SPEC Part 7/8: one directional light (the low, warm Sun) and one ambient light (cool blue fill).
import { COLORS } from './kit';

export function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight color={COLORS.signal} intensity={0.6} />
      <directionalLight
        color={COLORS.sunLight}
        intensity={2.8}
        // Low on the horizon, so shadows are long.
        position={[9, 3.4, 5]}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
      />
    </>
  );
}
