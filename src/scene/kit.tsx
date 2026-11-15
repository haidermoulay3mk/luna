// Built with help from Claude (Anthropic).
// Shared pieces for the 3D Moonbase: colours, where each module sits on the island,
// and a helper for repeated parts. One InstancedMesh counts as one mesh, which keeps
// the scene under the SPEC Part 8 budget of 60 meshes.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import type { ModuleId } from '../engine/types';

/** Scene colours, from the SPEC Part 7 palette plus a few neutrals for materials. */
export const COLORS = {
  space: '#070A12',
  regolith: '#9A9AA3',
  regolithDark: '#6F6F79',
  crater: '#85858F',
  hull: '#ECEAE4',
  trim: '#394155',
  cell: '#1E3768',
  cellGlow: '#4C7BE0',
  glass: '#BDE8F2',
  soil: '#5B4636',
  leaf: '#8BD450',
  oxygenTank: '#BFE6F0',
  sun: '#FFB547',
  sunLight: '#FFC98A',
  life: '#3DD6D0',
  signal: '#7C9CFF',
  bolt: '#FFD84D',
  rex: '#FF8A3D',
  white: '#F4F4F0',
  ink: '#151A28',
} as const;

/** The island top is a disc of this radius at y = 0. */
export const ISLAND_RADIUS = 5.6;

/** Island-space [x, z] of each module. +z faces the camera before the island turns. */
export const MODULE_POSITION: Record<ModuleId, readonly [number, number]> = {
  habitat: [0, 0],
  solar: [-3.4, -1.4],
  battery: [-2.0, 2.6],
  greenhouse: [3.0, 1.4],
  recycler: [1.3, -2.6],
  oxygen: [-1.1, -2.9],
  shelter: [3.4, -1.8],
  antenna: [-3.8, 1.5],
  rover: [1.5, 3.7],
  bolt: [-0.5, 2.7],
};

/** Rough footprint of each module, for the focus ring and how close the camera comes. */
export const MODULE_RADIUS: Record<ModuleId, number> = {
  habitat: 1.9,
  solar: 2.0,
  battery: 0.95,
  greenhouse: 1.15,
  recycler: 0.7,
  oxygen: 0.9,
  shelter: 1.4,
  antenna: 0.8,
  rover: 0.85,
  bolt: 0.55,
};

/** SPEC Part 8: fewer than 60 meshes. */
export const MESH_BUDGET = 60;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Places a module on the island, with its front (+z) facing outward from the centre.
 * The camera brings a module to the front when it focuses on it, so the module then faces the camera.
 * `rotationY` is a small extra turn for looks.
 */
export function ModuleSpot({
  id,
  rotationY = 0,
  scale = 1,
  children,
}: {
  id: ModuleId;
  rotationY?: number;
  scale?: number;
  children: ReactNode;
}) {
  const [x, z] = MODULE_POSITION[id];
  const outward = x === 0 && z === 0 ? 0 : Math.atan2(x, z);
  return (
    <group name={id} position={[x, 0, z]} rotation={[0, outward + rotationY, 0]} scale={scale}>
      {children}
    </group>
  );
}

export interface Placement {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/** Draws the same geometry at several placements as one mesh. Pass a memoised array. */
export function Instances({
  placements,
  children,
  castShadow = true,
  receiveShadow = true,
}: {
  placements: readonly Placement[];
  children: ReactNode;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    placements.forEach((p, i) => {
      dummy.position.set(...p.position);
      dummy.rotation.set(...(p.rotation ?? [0, 0, 0]));
      dummy.scale.set(...(p.scale ?? [1, 1, 1]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);
  return (
    <instancedMesh
      key={placements.length}
      ref={ref}
      args={[undefined, undefined, placements.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {children}
    </instancedMesh>
  );
}
