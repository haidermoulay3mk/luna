// Built with help from Claude (Anthropic).
// The player's astronaut and the third-person camera.
// Keys: W A S D (or the arrow keys) walk, Shift runs, Space jumps (real Moon or Mars gravity),
// drag with the mouse (or Q / R) to turn the camera, the wheel zooms, E uses what you stand next to.
// Movement is relative to the camera, like most third-person games. Frozen while a mission card is open.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3, type Group } from 'three';
import type { WorldId } from '../../engine/campaign';
import { touchInput, useWalk, walkLive, type Interactable } from '../../store/walk';
import { Astronaut, type Pose } from './Astronaut';
import { MOVE, bodyAt, stepBody, type Body, type Vec2 } from './layout';
import { heightAt } from './terrain';

/** Keys held down right now (by `KeyboardEvent.code`). */
function useHeldKeys() {
  const held = useRef(new Set<string>());
  useEffect(() => {
    const keys = held.current;
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest('input, textarea, select') !== null;
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      keys.add(e.code);
      // Space would scroll or press a focused button; arrows would scroll.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !document.querySelector('dialog[open]')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const clear = () => keys.clear();
    const hidden = () => {
      if (document.visibilityState !== 'visible') keys.clear();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', hidden);
      keys.clear();
    };
  }, []);
  return held;
}

/** Camera orbit around the astronaut: drag to turn, wheel to zoom. */
function useOrbit(initialYaw: number) {
  const gl = useThree((s) => s.gl);
  const orbit = useRef({ yaw: initialYaw, pitch: 0.3, dist: 7.5, dragging: false, lastX: 0, lastY: 0, idle: 0 });
  useEffect(() => {
    const el = gl.domElement;
    const o = orbit.current;
    const down = (e: PointerEvent) => {
      o.dragging = true;
      o.lastX = e.clientX;
      o.lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!o.dragging) return;
      o.yaw -= (e.clientX - o.lastX) * 0.006;
      o.pitch = Math.min(1.25, Math.max(-0.05, o.pitch + (e.clientY - o.lastY) * 0.004));
      o.lastX = e.clientX;
      o.lastY = e.clientY;
      o.idle = 0;
    };
    const up = () => (o.dragging = false);
    // A drag that ends outside the window (or on alt-tab) must not keep turning the camera.
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      o.dist = Math.min(24, Math.max(3.5, o.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);
  return orbit;
}

/** Turns angle `a` towards `b` by fraction `t`, the short way round. */
export function angleLerp(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export interface PlayerProps {
  world: WorldId;
  /** True while a card is open or a cut-scene plays: no walking, no jumping. */
  frozen: boolean;
  spawn: Vec2;
  /** Which way the astronaut faces at the spawn (radians, 0 = towards +z). */
  spawnYaw?: number;
  interactables: readonly Interactable[];
  onInteract: (id: string) => void;
  band?: string;
  reduced: boolean;
  /** Raised arms (planting the flag), 0–1. */
  reach?: number;
  /** Hide the astronaut (after boarding the rocket). The camera keeps working. */
  hidden?: boolean;
  /** A cut-scene drives the camera instead (the launch). */
  cameraOff?: boolean;
}

export function Player({
  world,
  frozen,
  spawn,
  spawnYaw = Math.PI,
  interactables,
  onInteract,
  band,
  reduced,
  reach = 0,
  hidden = false,
  cameraOff = false,
}: PlayerProps) {
  const camera = useThree((s) => s.camera);
  const saved = useWalk.getState().saved[world];
  const body = useRef<Body>(bodyAt(world, saved ? [saved.x, saved.z] : spawn));
  const facing = useRef(saved?.yaw ?? spawnYaw);
  const group = useRef<Group>(null);
  const pose = useRef<Pose>({ speed: 0, air: false, reach: 0 });
  const held = useHeldKeys();
  const orbit = useOrbit(facing.current + Math.PI);
  const nearId = useRef<string | null>(null);
  const tmp = useRef({ target: new Vector3(), want: new Vector3(), look: new Vector3() });
  const first = useRef(true);

  // Interact with E (or Enter) when standing at something usable.
  const latest = useRef({ frozen, onInteract });
  latest.current = { frozen, onInteract };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || (e.code !== 'KeyE' && e.code !== 'Enter')) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, button')) return;
      const near = useWalk.getState().near;
      if (latest.current.frozen || !near) return;
      e.preventDefault();
      latest.current.onInteract(near.id);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // Remember where the astronaut stood, so the scene reopens there.
  useEffect(
    () => () => {
      const b = body.current;
      useWalk.getState().save(world, b.x, b.z, facing.current);
      useWalk.getState().setNear(null);
    },
    [world],
  );

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const keys = held.current;
    const o = orbit.current;
    if (keys.has('KeyQ')) o.yaw += dt * 1.8;
    if (keys.has('KeyR')) o.yaw -= dt * 1.8;

    let fwd = 0;
    let side = 0;
    if (!frozen) {
      fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - touchInput.z;
      side = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touchInput.x;
    }
    // Camera-relative: forward is where the camera looks.
    const fx = -Math.sin(o.yaw);
    const fz = -Math.cos(o.yaw);
    let dirX = fx * fwd - fz * side;
    let dirZ = fz * fwd + fx * side;
    const len = Math.hypot(dirX, dirZ);
    if (len > 1) {
      dirX /= len;
      dirZ /= len;
    }
    const run = !frozen && (keys.has('ShiftLeft') || keys.has('ShiftRight') || touchInput.run);
    const jump = !frozen && (keys.has('Space') || touchInput.jump);
    const b = stepBody(world, body.current, { dirX, dirZ, run, jump }, dt);
    body.current = b;

    const speed = Math.hypot(b.vx, b.vz);
    if (speed > 0.3) facing.current = angleLerp(facing.current, Math.atan2(b.vx, b.vz), Math.min(1, dt * 10));
    pose.current.speed = speed / MOVE.walk;
    pose.current.air = !b.grounded;
    pose.current.reach = reach;
    if (group.current) {
      group.current.position.set(b.x, b.y, b.z);
      group.current.rotation.y = facing.current;
    }
    Object.assign(walkLive, { world, x: b.x, y: b.y, z: b.z, yaw: facing.current, speed: pose.current.speed, air: !b.grounded, camYaw: o.yaw });

    // The nearest usable thing in reach.
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of interactables) {
      const d = Math.hypot(it.x - b.x, it.z - b.z);
      if (d < it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    const key = best ? `${best.id}|${best.label}` : null;
    if (key !== nearId.current) {
      nearId.current = key;
      useWalk.getState().setNear(best);
    }

    if (cameraOff) return;
    // Third-person camera: behind and above, never under the ground. It swings in behind the
    // astronaut by itself while walking forward without dragging.
    o.idle += dt;
    // No automatic camera swing: it turned the camera while walking, and since W A S D follow the
    // camera, the astronaut drifted off course by itself (friend's report, 15 Nov). Drag or Q / R turns it.
    const { target, want, look } = tmp.current;
    target.set(b.x, b.y + 1.55, b.z);
    const flat = Math.cos(o.pitch) * o.dist;
    want.set(target.x + Math.sin(o.yaw) * flat, target.y + Math.sin(o.pitch) * o.dist, target.z + Math.cos(o.yaw) * flat);
    const floor = heightAt(world, want.x, want.z) + 0.6;
    if (want.y < floor) want.y = floor;
    if (first.current || reduced) {
      camera.position.copy(want);
      look.copy(target);
      first.current = false;
    } else {
      // Smooth at any frame rate: the camera and the point it looks at both glide (no snapping).
      camera.position.lerp(want, 1 - Math.exp(-8 * dt));
      look.lerp(target, 1 - Math.exp(-14 * dt));
    }
    camera.lookAt(look);
  });

  return hidden ? null : <Astronaut ref={group} pose={pose} band={band} reduced={reduced} />;
}
