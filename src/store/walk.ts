// Built with help from Claude (Anthropic).
// State of the walkable world that the HUD and the network need.
// `walkLive` changes every frame, so it is a plain object (no React re-renders); the zustand
// store holds only what the HUD shows: which object the astronaut is next to.
import { create } from 'zustand';
import type { WorldId } from '../engine/campaign';

/** The astronaut right now (written by the Player every frame, read by the HUD and the party sync). */
export const walkLive = { world: 'moon' as WorldId, x: 0, y: 0, z: 15, yaw: Math.PI, speed: 0, air: false, camYaw: 0 };

/** On-screen buttons for touch screens write here; the Player reads it like the keyboard. */
export const touchInput = { x: 0, z: 0, run: false, jump: false };

/** Something the astronaut can use: a mission site, the rocket, the summit flag. */
export interface Interactable {
  id: string;
  x: number;
  z: number;
  radius: number;
  /** "Start the mission", "Board the rocket", "Plant the flag" */
  label: string;
}

interface WalkStore {
  /** The interactable the astronaut is standing at (null when none). */
  near: Interactable | null;
  /** Where the astronaut was on each world when the scene closed, so it reopens in the same place. */
  saved: Partial<Record<WorldId, { x: number; z: number; yaw: number }>>;
  setNear: (near: Interactable | null) => void;
  save: (world: WorldId, x: number, z: number, yaw: number) => void;
}

export const useWalk = create<WalkStore>()((set) => ({
  near: null,
  saved: {},
  setNear: (near) => set({ near }),
  save: (world, x, z, yaw) => set((s) => ({ saved: { ...s.saved, [world]: { x, z, yaw } } })),
}));
