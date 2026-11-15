// Built with help from Claude (Anthropic).
// One Planet for Earth, the Moon and Mars (LUNA_BUILD A2.4): NASA's real public-domain map,
// meshStandardMaterial with roughness 1, lit by one "Sun" light with very little ambient, so
// there is a bright day side and a dark night side. Earth and Mars get a thin atmosphere rim
// (a second sphere 3% bigger, back faces, additive, a short fresnel shader). The Moon has none.
// Turns at 0.02 rad/s (still with reduced motion). No bloom, no post-processing.
import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, Color, RepeatWrapping, SRGBColorSpace, TextureLoader, type Group } from 'three';
import earthUrl from '../../assets/earth-1k.jpg';
import marsUrl from '../../assets/mars-color-2k.jpg';
import moonUrl from '../../assets/moon-color-2k.jpg';

export type Body = 'earth' | 'moon' | 'mars';

const MAP: Record<Body, string> = { earth: earthUrl, moon: moonUrl, mars: marsUrl };
/** Atmosphere rim colours: blue-white for Earth, pale salmon for Mars. */
export const RIM: Partial<Record<Body, string>> = { earth: '#9cc8ff', mars: '#f2b8a0' };
/** A2.4: rotation speed in radians per second. */
export const PLANET_SPIN = 0.02;

/** The thin glowing edge of an atmosphere, brightest where you look across it. */
export function AtmosphereRim({ radius, color, strength = 1 }: { radius: number; color: string; strength?: number }) {
  const uniforms = useMemo(() => ({ uColor: { value: new Color(color) }, uStrength: { value: strength } }), [color, strength]);
  return (
    <mesh scale={1.03}>
      <sphereGeometry args={[radius, 48, 24]} />
      <shaderMaterial
        side={BackSide}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vNormal; varying vec3 vView;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor; uniform float uStrength;
          varying vec3 vNormal; varying vec3 vView;
          void main() {
            float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
            gl_FragColor = vec4(uColor * rim * 1.4 * uStrength, rim * uStrength);
          }`}
      />
    </mesh>
  );
}

export function Planet({
  body,
  radius = 1,
  segments = 64,
  spin = true,
  reduced = false,
}: {
  body: Body;
  radius?: number;
  /** 64 for a hero planet, 32 elsewhere. */
  segments?: number;
  spin?: boolean;
  reduced?: boolean;
}) {
  const map = useLoader(TextureLoader, MAP[body]);
  useMemo(() => {
    map.colorSpace = SRGBColorSpace;
    map.wrapS = RepeatWrapping;
    map.anisotropy = 4;
  }, [map]);
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (spin && !reduced && group.current) group.current.rotation.y += PLANET_SPIN * Math.min(dt, 0.1);
  });
  const rim = RIM[body];
  return (
    <group>
      <group ref={group}>
        {/* three's sphere UVs start at -x; turning by -90° puts longitude 0° on +z. */}
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <sphereGeometry args={[radius, segments, segments / 2]} />
          <meshStandardMaterial map={map} bumpMap={body === 'earth' ? undefined : map} bumpScale={body === 'moon' ? 1.2 : 0.6} roughness={1} metalness={0} />
        </mesh>
      </group>
      {rim && <AtmosphereRim radius={radius} color={rim} />}
    </group>
  );
}
