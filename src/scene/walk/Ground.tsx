// Built with help from Claude (Anthropic).
// The ground mesh (heights from terrain.ts), scattered boulders, and the Mars sky.
// Moon: grey regolith with darker old lava plains, crater walls and a crisp black sky.
// Mars: rust and ochre ground, a dusty salmon horizon fading to a dark sky with faint stars.
import { useEffect, useMemo } from 'react';
import { BackSide, Color, Float32BufferAttribute, Object3D, PlaneGeometry, type InstancedMesh, type Matrix4 } from 'three';
import type { WorldId } from '../../engine/campaign';
import { makeRockGeometry } from '../space/Craft';
import { baseColliders, distance2D } from './layout';
import { BASE_FLAT, TERRAIN, fbm, heightAt } from './terrain';
import { getGrainTexture } from './textures';

const PALETTE: Record<WorldId, { low: Color; high: Color; dark: Color; rock: string }> = {
  moon: { low: new Color('#5d5c5a'), high: new Color('#a3a29e'), dark: new Color('#3f3e3d'), rock: '#7d7b77' },
  mars: { low: new Color('#7a3a22'), high: new Color('#c37a4e'), dark: new Color('#4f2416'), rock: '#6e3a26' },
};

/**
 * The terrain mesh, built once per world and kept for the whole visit: building it does heavy maths
 * for about 90,000 points, which froze the screen for about a second every time a 3D view opened.
 * Slopes come from the height grid itself (no extra height samples).
 */
const terrainCache = new Map<WorldId, PlaneGeometry>();

export function buildTerrain(world: WorldId): PlaneGeometry {
  const cached = terrainCache.get(world);
  if (cached) return cached;
  const t = TERRAIN[world];
  const g = new PlaneGeometry(t.size, t.size, t.segments, t.segments);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, t.centerZ);
  const pos = g.attributes.position;
  const n = t.segments + 1;
  const step = t.size / t.segments;
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    heights[i] = heightAt(world, pos.getX(i), pos.getZ(i));
    pos.setY(i, heights[i]);
  }
  const colors = new Float32Array(pos.count * 3);
  const p = PALETTE[world];
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const row = Math.floor(i / n);
    const col = i % n;
    const hx = heights[row * n + Math.min(n - 1, col + 1)] - heights[row * n + Math.max(0, col - 1)];
    const hz = heights[Math.min(n - 1, row + 1) * n + col] - heights[Math.max(0, row - 1) * n + col];
    const slope = Math.min(1, Math.hypot(hx, hz) / (2 * step));
    // Albedo: big soft patches (darker plains), finer mottling, darker steep walls.
    const patches = 0.5 + fbm(x * 0.006, z * 0.006, 41) * 1.4;
    const mottle = fbm(x * 0.05, z * 0.05, 43, 3) * 0.5;
    c.copy(p.low).lerp(p.high, Math.min(1, Math.max(0, patches + mottle)));
    c.lerp(p.dark, Math.min(0.45, slope * 0.6));
    // The pad around the base is packed flat and a little lighter (bulldozed regolith).
    if (Math.hypot(x, z) < BASE_FLAT) c.lerp(p.high, 0.12);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  terrainCache.set(world, g);
  return g;
}

export function Terrain({ world }: { world: WorldId }) {
  const geometry = useMemo(() => buildTerrain(world), [world]);
  const grain = useMemo(() => {
    const t = getGrainTexture().clone();
    const size = TERRAIN[world].size;
    t.repeat.set(size / 9, size / 9);
    t.needsUpdate = true;
    return t;
  }, [world]);
  useEffect(() => () => grain.dispose(), [grain]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors map={grain} bumpMap={grain} bumpScale={1.4} roughness={1} metalness={0} />
    </mesh>
  );
}

/** Boulders and pebbles scattered over the land (never inside the base's buildings). */
export function Boulders({ world, count = 320 }: { world: WorldId; count?: number }) {
  const shapes = useMemo(() => [makeRockGeometry(5), makeRockGeometry(8), makeRockGeometry(13), makeRockGeometry(21)], []);
  const matrices = useMemo(() => {
    const colliders = baseColliders();
    const t = TERRAIN[world];
    let a = world === 'moon' ? 77 : 99;
    const rand = () => (a = (a * 16807) % 2147483647) / 2147483647;
    const dummy = new Object3D();
    const out: Matrix4[][] = [[], [], [], []];
    let placed = 0;
    for (let i = 0; placed < count && i < count * 6; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 14 + Math.pow(rand(), 0.7) * (t.limit - 10);
      const x = Math.cos(angle) * r;
      const z = t.centerZ + Math.sin(angle) * r;
      // Keep the base and its walkways clear.
      if (colliders.some((c) => c.kind === 'circle' && distance2D(c.c, [x, z]) < c.r + 4)) continue;
      if (Math.hypot(x, z) < BASE_FLAT && rand() < 0.75) continue;
      const big = rand() < 0.08;
      const s = big ? 1.4 + rand() * 2.6 : 0.15 + rand() * rand() * 0.9;
      // Half buried, turned about the vertical with a small tilt, and only gently squashed
      // (a strong stretch after a random tilt made the rocks look like pulled dough).
      dummy.position.set(x, heightAt(world, x, z) - s * 0.3, z);
      dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5);
      const flat = 0.72 + rand() * 0.2;
      dummy.scale.set(s * (0.9 + rand() * 0.2), s * flat, s * (0.9 + rand() * 0.2));
      dummy.updateMatrix();
      out[i % 4].push(dummy.matrix.clone());
      placed++;
    }
    return out;
  }, [world, count]);
  return (
    <>
      {matrices.map((list, k) => (
        <instancedMesh
          key={`${world}-${k}-${list.length}`}
          args={[shapes[k], undefined, list.length]}
          castShadow
          receiveShadow
          ref={(mesh: InstancedMesh | null) => {
            if (!mesh) return;
            list.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
          }}
        >
          <meshStandardMaterial color={PALETTE[world].rock} vertexColors roughness={1} metalness={0} />
        </instancedMesh>
      ))}
    </>
  );
}

/** Mars sky: dusty salmon near the horizon, dark above, so faint stars show through. */
export function MarsSky() {
  return (
    <mesh renderOrder={-9} frustumCulled={false}>
      <sphereGeometry args={[3000, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        transparent
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 horizon = vec3(0.78, 0.52, 0.40);
            vec3 mid = vec3(0.36, 0.24, 0.26);
            vec3 top = vec3(0.05, 0.04, 0.07);
            vec3 col = h < 0.12 ? mix(horizon, mid, smoothstep(0.0, 0.12, h)) : mix(mid, top, smoothstep(0.12, 0.6, h));
            float a = mix(1.0, 0.55, smoothstep(0.25, 0.8, h));
            gl_FragColor = vec4(col, a);
          }`}
      />
    </mesh>
  );
}
