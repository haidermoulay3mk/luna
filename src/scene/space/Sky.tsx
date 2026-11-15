// Built with help from Claude (Anthropic).
// Deep space around the Moon, drawn only with code: stars, the Milky Way band, the Sun
// and the Earth. The whole sky follows the camera, so it always looks infinitely far away.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Vector3, type Group } from 'three';

/** Direction the sunlight comes from (shared by the lights, Earth's day side and comet tails). */
export const SUN_DIRECTION = new Vector3(0.75, 0.32, 0.58).normalize();
/** Direction of the Earth in the sky. */
export const EARTH_DIRECTION = new Vector3(-0.62, 0.18, 0.76).normalize();

const SKY_RADIUS = 4000;

/** Value noise + fbm, shared by the sky shaders. */
export const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

// The Milky Way's plane, tilted across the sky.
const GALAXY_NORMAL = new Vector3(0.35, 0.86, -0.37).normalize();

export function Sky({ earth = true, sun = true, stars = 3200 }: { earth?: boolean; sun?: boolean; stars?: number }) {
  const group = useRef<Group>(null);
  useFrame(({ camera }) => group.current?.position.copy(camera.position));
  return (
    <group ref={group}>
      <MilkyWay />
      <Stars count={stars} />
      {sun && <Sun />}
      {earth && <Earth />}
    </group>
  );
}

function Stars({ count }: { count: number }) {
  const geometry = useMemo(() => {
    // Fixed seed so the sky is the same every time.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    // Blue-white stars with warm orange ones scattered through (as in the nebula photo).
    const tint = [new Color('#9bb0ff'), new Color('#cad7ff'), new Color('#ffffff'), new Color('#fff4e8'), new Color('#ffd2a1'), new Color('#ff9a4a')];
    const v = new Vector3();
    for (let i = 0; i < count; i++) {
      v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
      // A third of the stars crowd towards the Milky Way band.
      if (i % 3 === 0) v.addScaledVector(GALAXY_NORMAL, -v.dot(GALAXY_NORMAL) * (0.75 + rand() * 0.2)).normalize();
      positions.push(v.x * SKY_RADIUS * 0.95, v.y * SKY_RADIUS * 0.95, v.z * SKY_RADIUS * 0.95);
      const c = tint[Math.floor(rand() * tint.length)];
      colors.push(c.r, c.g, c.b);
      const bright = rand();
      sizes.push(bright > 0.985 ? 3.4 : bright > 0.9 ? 2.2 : 1.2 + rand() * 0.6);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        vertexColors
        vertexShader={/* glsl */ `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            gl_PointSize = size * 1.6;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          varying vec3 vColor;
          void main() {
            float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(vColor, a * a);
          }`}
      />
    </points>
  );
}

function MilkyWay() {
  const uniforms = useMemo(() => ({ uNormal: { value: GALAXY_NORMAL } }), []);
  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={/* glsl */ `
          uniform vec3 uNormal;
          varying vec3 vDir;
          ${NOISE_GLSL}
          // The Milky Way as seen from space (Boss, 15 Nov): almost black sky, one dim, soft band of
          // starlight with a dark dust lane down its middle and a slightly warmer glow towards the core.
          void main() {
            float h = dot(vDir, uNormal);
            float band = exp(-h * h * 16.0);
            float clouds = fbm(vDir * 5.0);
            float fine = fbm(vDir * 14.0);
            float dust = smoothstep(0.45, 0.75, fbm(vDir * 9.0 + 3.1)) * exp(-h * h * 180.0);
            float core = exp(-pow(distance(vDir, normalize(vec3(0.6, -0.3, -0.74))), 2.0) * 3.0);
            float glow = band * (0.3 + clouds * 0.8) * (0.6 + fine * 0.5) * (0.5 + core * 1.2) * (1.0 - dust * 0.9);
            vec3 col = mix(vec3(0.5, 0.55, 0.68), vec3(0.85, 0.78, 0.66), core) * glow * 0.2;
            col += vec3(0.002, 0.003, 0.006); // deep space: black with the faintest hint of blue
            gl_FragColor = vec4(col, 1.0);
          }`}
      />
    </mesh>
  );
}

let sunTexture: CanvasTexture | null = null;
/** A small white disc with a wide soft glow, drawn once on a canvas. */
export function getSunTexture(): CanvasTexture {
  if (sunTexture) return sunTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.06, 'rgba(255,253,245,1)');
    g.addColorStop(0.1, 'rgba(255,236,200,0.55)');
    g.addColorStop(0.3, 'rgba(255,200,140,0.12)');
    g.addColorStop(1, 'rgba(255,180,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  sunTexture = new CanvasTexture(canvas);
  return sunTexture;
}

function Sun() {
  const pos = useMemo(() => SUN_DIRECTION.clone().multiplyScalar(SKY_RADIUS * 0.9), []);
  const map = useMemo(getSunTexture, []);
  return (
    <sprite position={pos} scale={[520, 520, 1]} renderOrder={-5}>
      <spriteMaterial depthWrite={false} blending={AdditiveBlending} map={map} color="#fff3dc" transparent />
    </sprite>
  );
}

/**
 * The Earth, drawn by a shader: oceans, continents, ice caps and clouds from noise (not a
 * real map), lit from the Sun's direction, with a thin blue atmosphere at the edge.
 */
function Earth() {
  const pos = useMemo(() => EARTH_DIRECTION.clone().multiplyScalar(SKY_RADIUS * 0.8), []);
  const uniforms = useMemo(() => ({ uSun: { value: SUN_DIRECTION } }), []);
  // About 4° across: twice its real size seen from the Moon (about 2°), so kids can spot it.
  const radius = SKY_RADIUS * 0.8 * Math.tan((2 * Math.PI) / 180);
  return (
    <group position={pos} rotation={[0.41, 0.6, 0]}>
      <mesh renderOrder={-4}>
        <sphereGeometry args={[radius, 64, 32]} />
        <shaderMaterial
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={/* glsl */ `
            varying vec3 vNormalW; varying vec3 vLocal; varying vec3 vView;
            void main() {
              vLocal = normalize(position);
              vNormalW = normalize(mat3(modelMatrix) * normal);
              vec4 world = modelMatrix * vec4(position, 1.0);
              vView = normalize(cameraPosition - world.xyz);
              gl_Position = projectionMatrix * viewMatrix * world;
            }`}
          fragmentShader={/* glsl */ `
            uniform vec3 uSun;
            varying vec3 vNormalW; varying vec3 vLocal; varying vec3 vView;
            ${NOISE_GLSL}
            void main() {
              float land = smoothstep(0.52, 0.56, fbm(vLocal * 2.2));
              float lat = abs(vLocal.y);
              vec3 ocean = mix(vec3(0.02, 0.09, 0.25), vec3(0.04, 0.2, 0.42), fbm(vLocal * 5.0));
              vec3 ground = mix(vec3(0.19, 0.32, 0.12), vec3(0.55, 0.45, 0.28), smoothstep(0.3, 0.7, fbm(vLocal * 6.0 + 2.0)));
              vec3 col = mix(ocean, ground, land);
              col = mix(col, vec3(0.92), smoothstep(0.78, 0.86, lat + fbm(vLocal * 8.0) * 0.08));
              float cloud = smoothstep(0.5, 0.75, fbm(vLocal * 4.0 + vec3(5.0, 1.0, 2.0)));
              col = mix(col, vec3(1.0), cloud * 0.85);
              float light = max(dot(vNormalW, uSun), 0.0);
              float rim = pow(1.0 - max(dot(vNormalW, vView), 0.0), 3.0);
              vec3 lit = col * (0.02 + light * 1.15) + vec3(0.3, 0.55, 1.0) * rim * (0.15 + light);
              gl_FragColor = vec4(lit, 1.0);
            }`}
        />
      </mesh>
      <mesh renderOrder={-3}>
        <sphereGeometry args={[radius * 1.06, 48, 24]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={BackSide}
          uniforms={uniforms}
          vertexShader={/* glsl */ `
            varying vec3 vNormalW; varying vec3 vView;
            void main() {
              vNormalW = normalize(mat3(modelMatrix) * normal);
              vec4 world = modelMatrix * vec4(position, 1.0);
              vView = normalize(cameraPosition - world.xyz);
              gl_Position = projectionMatrix * viewMatrix * world;
            }`}
          fragmentShader={/* glsl */ `
            uniform vec3 uSun;
            varying vec3 vNormalW; varying vec3 vView;
            void main() {
              float edge = pow(1.0 - abs(dot(vNormalW, vView)), 2.0);
              float day = smoothstep(-0.4, 0.5, dot(vNormalW, uSun));
              gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * edge * day, edge * day);
            }`}
        />
      </mesh>
    </group>
  );
}
