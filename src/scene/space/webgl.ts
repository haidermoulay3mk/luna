// Built with help from Claude (Anthropic).
// Device checks shared by every 3D view (SPEC Part 8 performance rules), and the safety net.
// Boss (15 Nov): Luna is 3D only, with no option to turn it off. If the graphics card drops the 3D
// (low memory) or a scene crashes, the 3D view rebuilds itself; the game never switches to 2D and
// never skips a walk or a flight because of it. Only a device with no WebGL at all gets the 2D
// drawing, so the screen is never blank.
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import { useRef } from 'react';
import { create } from 'zustand';

let webglCache: boolean | null = null;

/**
 * Can this device draw WebGL? Checked once, and the test context is released straight away.
 * (Each check used to open a new WebGL context that was never closed; browsers allow only about 16,
 * then kill the oldest, which was often the game's own 3D view: the black-screen glitch.)
 */
export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    webglCache = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** Phones, tablets and small windows get no shadows and no antialiasing. */
export function isLowPowerDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

/** Little memory (navigator.deviceMemory is in GB, Chrome/Edge only): smaller shadow maps and fewer pixels. */
export function isLowMemoryDevice(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return memory !== undefined && memory <= 4;
}

/** SPEC Part 8: pixel ratio capped at 1.5 (1.25 on low-memory devices). */
export const DPR: [number, number] = [1, typeof navigator !== 'undefined' && isLowMemoryDevice() ? 1.25 : 1.5];

/** True on every device that has WebGL: Luna is a 3D game and there is no 2D switch. */
export function useCan3D(): boolean {
  return hasWebGL();
}

/**
 * When the 3D drops, every 3D view rebuilds itself. `epoch` is the key the scenes remount on.
 * Rebuilds back off (0.4 s, 0.8 s, 1.6 s … up to 6 s) so a repeating error cannot make the screen flicker.
 */
export const useGfx = create<{ epoch: number; restarts: number; last: number; lastError: string | null }>(() => ({
  epoch: 0,
  restarts: 0,
  last: 0,
  lastError: null,
}));
let pending: number | null = null;

/** Rebuilds the 3D views after a short wait. `reason` is kept for the console (to report a bug). */
export function restart3D(reason = 'restart'): void {
  if (pending !== null) return;
  const { restarts, last } = useGfx.getState();
  const now = Date.now();
  const count = now - last > 30_000 ? 0 : restarts;
  const wait = Math.min(6000, 400 * 2 ** count);
  console.warn(`Luna: rebuilding the 3D view in ${wait} ms (${reason})`);
  useGfx.setState({ lastError: reason });
  pending = window.setTimeout(() => {
    pending = null;
    const s = useGfx.getState();
    useGfx.setState({ epoch: s.epoch + 1, restarts: count + 1, last: Date.now() });
  }, wait);
}

/**
 * Pass to every <Canvas onCreated>. When the browser takes the WebGL context away (low memory,
 * driver reset), wait for it to come back; if it does not within 2.5 s, rebuild the 3D view.
 */
export function watchContextLoss({ gl }: Pick<RootState, 'gl'>): void {
  const canvas = gl.domElement;
  canvas.addEventListener('webglcontextlost', (event) => {
    // A view that closed (screen change) releases its own context on purpose: that is not a crash.
    // Restarting for it used to rebuild the next screen's 3D a moment later (the black flash and reset).
    if (!canvas.isConnected) return;
    event.preventDefault();
    const timer = window.setTimeout(() => {
      if (canvas.isConnected) restart3D('WebGL context lost');
    }, 2500);
    canvas.addEventListener('webglcontextrestored', () => window.clearTimeout(timer), { once: true });
  });
}

/**
 * If the 3D runs under 30 frames per second for 3 seconds, draw fewer pixels (pixel ratio 1, then
 * 0.75) instead of leaving 3D: Luna is a 3D game (Boss, 15 Nov). The first 4 seconds are ignored
 * (shaders and textures load then). Goes inside a <Canvas>.
 */
export function FpsWatch() {
  const setDpr = useThree((s) => s.setDpr);
  const state = useRef({ t: 0, slow: 0, step: 0 });
  useFrame((_, dt) => {
    const s = state.current;
    s.t += dt;
    if (s.t < 4 || s.step >= 2) return;
    s.slow = dt > 1 / 30 ? s.slow + dt : 0;
    if (s.slow >= 3) {
      s.step += 1;
      s.slow = 0;
      setDpr(s.step === 1 ? 1 : 0.75);
    }
  });
  return null;
}
