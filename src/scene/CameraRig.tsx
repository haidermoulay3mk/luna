// Built with help from Claude (Anthropic).
// Turns the island and moves the camera. With no focus, the island turns slowly
// (SPEC Part 7). When an event names a module, the island turns that module to the
// front and the camera glides in (~0.8 s, SPEC Part 8). Reduced motion: no turning, no gliding.
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import { Vector3, type Group } from 'three';
import type { ModuleId } from '../engine/types';
import { MODULE_POSITION, MODULE_RADIUS } from './kit';

export const OVERVIEW_CAMERA: [number, number, number] = [0, 8.5, 18];
const IDLE_SPEED = 0.05; // radians per second
const EASE = 5; // higher = faster; 5 settles in about 0.8 s
const MODULE_Y = 0.6; // roughly the middle height of a module

/** Wraps an angle difference into −π…π so the island takes the short way round. */
const shortest = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export function CameraRig({
  focus,
  reduced,
  overlay,
  children,
}: {
  focus: ModuleId | null;
  reduced: boolean;
  /** The event card covers the lower part of the view (desktop), so frame things higher. */
  overlay: boolean;
  children: ReactNode;
}) {
  const island = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const look = useRef(new Vector3(0, -1, 0));
  const idleAngle = useRef(0);
  const wasFocused = useRef(false);
  const goalPosition = useMemo(() => new Vector3(), []);
  const goalLook = useMemo(() => new Vector3(), []);

  useFrame((_, rawDelta) => {
    const group = island.current;
    if (!group) return;
    const delta = Math.min(rawDelta, 0.1);
    let angle: number;

    if (focus) {
      const [x, z] = MODULE_POSITION[focus];
      const radius = Math.hypot(x, z);
      // Far enough that the whole module fits in the clear part of the view.
      const distance = overlay ? 4 + MODULE_RADIUS[focus] * 5 : 3 + MODULE_RADIUS[focus] * 4;
      // Turning the island by this angle brings the module to (0, 0, radius), facing the camera.
      angle = Math.atan2(-x, z);
      // Camera 30° above the module. With the card covering the bottom of the view, aim
      // below the module so it sits in the clear top part of the screen.
      goalPosition.set(0, MODULE_Y + distance * 0.5, radius + distance * 0.866);
      goalLook.set(0, MODULE_Y - (overlay ? distance * 0.25 : 0), radius);
      wasFocused.current = true;
    } else {
      if (wasFocused.current) {
        idleAngle.current = group.rotation.y;
        wasFocused.current = false;
      }
      if (!reduced) idleAngle.current += delta * IDLE_SPEED;
      angle = idleAngle.current;
      goalLook.set(0, overlay ? -2 : -0.8, 0);
      goalPosition.set(...OVERVIEW_CAMERA);
    }

    const t = reduced ? 1 : 1 - Math.exp(-EASE * delta);
    group.rotation.y += shortest(angle - group.rotation.y) * t;
    camera.position.lerp(goalPosition, t);
    look.current.lerp(goalLook, t);
    camera.lookAt(look.current);
  });

  return <group ref={island}>{children}</group>;
}
