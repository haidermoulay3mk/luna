// Built with help from Claude (Anthropic).
// Live flight numbers for the HUD. The 3D scene writes here about ten times a second
// (not every frame), so React only redraws the HUD, never the 3D scene.
import { create } from 'zustand';
import { SAFETY, type FlightPhase } from '../engine/flight';
import type { FlightProblem } from '../engine/flightProblems';

/** 'crashed': the impact moment before the flight restarts from its start. */
export type FlightStatus = 'flying' | 'crashed' | 'landing' | 'landed';

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

/** A label next to an obstacle on screen: real NASA data for asteroids (Flight 2). */
export interface ObstacleLabel {
  key: number;
  /** Screen position, −1 to 1 (like the guide). */
  x: number;
  y: number;
  name: string;
  diameterM?: number;
  speedKmS?: number;
  hazardous?: boolean;
}

export interface FlightHud {
  altitudeKm: number;
  speedMs: number;
  fuel: number;
  thrust: number;
  /** Distance to the landing site and to the station, in km. */
  targetKm: number;
  stationKm: number;
  hits: number;
  astronauts: number;
  docked: boolean;
  status: FlightStatus;
  /** Where the landing site is on screen: x, y from −1 to 1, and whether it is in front of the camera. */
  guide: { x: number; y: number; onScreen: boolean };
  toast: Toast | null;
  /** The problem on screen right now (a message from Mission Control), with seconds left. */
  problem: (FlightProblem & { left: number }) | null;
  /** Solar flares the crew got caught in. */
  flares: number;
  /** LUNA_BUILD B5: Safety 0–100 (starts at 50). */
  safety: number;
  /** Launch · Cruise · Approach · Landing. */
  phase: FlightPhase;
  /** How many times this flight was restarted after a crash. */
  crashes: number;
  labels: ObstacleLabel[];
  /** The player asked to skip the landing animation (the 3D scene reads this). */
  skipLanding: boolean;
}

export const EMPTY_HUD: FlightHud = {
  altitudeKm: 0,
  speedMs: 0,
  fuel: 100,
  thrust: 0,
  targetKm: 0,
  stationKm: 0,
  hits: 0,
  astronauts: 0,
  docked: false,
  status: 'flying',
  guide: { x: 0, y: 0, onScreen: true },
  toast: null,
  problem: null,
  flares: 0,
  safety: SAFETY.start,
  phase: 'launch',
  crashes: 0,
  labels: [],
  skipLanding: false,
};

export const useFlightHud = create<FlightHud>()(() => ({ ...EMPTY_HUD }));

let toastId = 0;
export function showToast(text: string, tone: Toast['tone']) {
  useFlightHud.setState({ toast: { id: ++toastId, text, tone } });
}
