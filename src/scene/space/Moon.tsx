// Built with help from Claude (Anthropic).
// The Moon and Mars as globes, wrapped in NASA's real public-domain colour maps:
// the Moon from LRO (CGI Moon Kit, sources.json "nasa-cgi-moon-kit") and Mars from the
// Viking MDIM 2.1 colour mosaic ("nasa-usgs-mars-viking"). Real craters, volcanoes and
// canyons sit in their real places, so the map's pins line up with the real surface.
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';
import marsColorUrl from '../../assets/mars-color-2k.jpg';
import moonColorUrl from '../../assets/moon-color-2k.jpg';
import type { WorldId } from '../../engine/campaign';
import { MOON_RADIUS } from '../../engine/flight';
import { AtmosphereRim, RIM } from './Planet';
import { SUN_DIRECTION } from './Sky';

const MAPS: Record<WorldId, string> = { moon: moonColorUrl, mars: marsColorUrl };
/** Mars has much smoother large-scale relief in this map, so its bump is gentler. */
const BUMP: Record<WorldId, number> = { moon: 1.6, mars: 0.8 };

export function Moon({ segments = 160 }: { segments?: number }) {
  return <World world="moon" segments={segments} />;
}

export function World({ world, segments = 160 }: { world: WorldId; segments?: number }) {
  const map = useLoader(TextureLoader, MAPS[world]);
  useMemo(() => {
    map.colorSpace = SRGBColorSpace;
    map.wrapS = RepeatWrapping;
    map.anisotropy = 8;
  }, [map]);
  return (
    // three's sphere UVs start at -x; turning it by -90° puts the map's longitude 0° on +z, matching latLonToVec().
    <group>
      <mesh rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[MOON_RADIUS, segments, segments / 2]} />
        <meshStandardMaterial map={map} bumpMap={map} bumpScale={BUMP[world]} roughness={1} metalness={0} />
      </mesh>
      {/* A2.4: a pale salmon atmosphere rim on Mars; the Moon has no air, so none. */}
      {RIM[world] && <AtmosphereRim radius={MOON_RADIUS} color={RIM[world]!} strength={0.8} />}
    </group>
  );
}

/**
 * LUNA_BUILD A2.4: one directional "Sun" light (hard, no air to soften it) and ambient at 0.06 or
 * less, so every world has a bright day side and a dark night side.
 */
export function SpaceLights({ sunIntensity = 2.8 }: { sunIntensity?: number }) {
  const sun = useMemo(() => SUN_DIRECTION.clone().multiplyScalar(1000), []);
  return (
    <>
      <directionalLight position={sun} intensity={sunIntensity} color="#fff6ea" />
      <ambientLight intensity={0.05} color="#9fb3ff" />
    </>
  );
}
