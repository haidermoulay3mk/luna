// Built with help from Claude (Anthropic).
// Player settings kept on this device: sound on/off, volume, and Lite mode (no 3D, for slow
// computers; it turns on by itself when the frame rate stays under 30 or the 3D fails).
import { create } from 'zustand';

/** Why Lite mode switched on by itself: the 3D was too slow, or it failed to start / crashed. */
export type LiteReason = 'slow' | 'failed';

interface Settings {
  muted: boolean;
  volume: number;
  lite: boolean;
  /** True when Lite mode was switched on automatically. */
  autoLite: boolean;
  liteReason: LiteReason | null;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setLite: (lite: boolean, auto?: boolean, reason?: LiteReason) => void;
}

const KEY = 'luna.settings.v1';

function load(): Pick<Settings, 'muted' | 'volume' | 'lite'> {
  // SPEC Part 9: sound starts off until the player turns it on.
  const fallback = { muted: true, volume: 0.6, lite: false };
  try {
    const raw = window.localStorage.getItem(KEY);
    // Luna is a 3D game: an old saved "Lite" choice is ignored, so every visit starts in 3D.
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Settings>), lite: false } : fallback;
  } catch {
    return fallback;
  }
}

function save(s: Pick<Settings, 'muted' | 'volume' | 'lite'>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ muted: s.muted, volume: s.volume, lite: s.lite }));
  } catch {
    // Storage blocked: settings last until the page closes.
  }
}

export const useSettings = create<Settings>()((set, get) => ({
  ...load(),
  autoLite: false,
  liteReason: null,
  setMuted: (muted) => {
    set({ muted });
    save(get());
  },
  setVolume: (volume) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
    save(get());
  },
  setLite: (lite, auto = false, reason = 'slow') => {
    set({ lite, autoLite: lite && auto, liteReason: lite && auto ? reason : null });
    // A crash is not saved as the player's choice: next visit tries 3D again.
    if (!(lite && auto && reason === 'failed')) save(get());
  },
}));
