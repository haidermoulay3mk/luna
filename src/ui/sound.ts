// Built with help from Claude (Anthropic).
// Every sound in the game, synthesised with the Web Audio API (SPEC Part 9): no audio files,
// no AI voices, works offline. Sound is off until the player turns it on (which is also the
// click browsers require before any audio can play). Without Web Audio (or muted) every call
// does nothing.
import { useSettings } from '../store/settings';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  const { muted, volume } = useSettings.getState();
  if (muted || typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (master) master.gain.value = volume * 0.5;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One note with a soft attack and release. */
function tone(freq: number, at = 0, dur = 0.15, type: OscillatorType = 'sine', gain = 0.18, slideTo?: number) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(a: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  noiseBuffer = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/** A burst of filtered noise (radio static, thuds, dust). */
function noise(dur = 0.3, gain = 0.12, freq = 1200, at = 0, type: BiquadFilterType = 'bandpass') {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = getNoise(a);
  const filter = a.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  /** A correct decision: a bright two-step confirm. */
  verified: () => {
    tone(660, 0, 0.09, 'sine', 0.13);
    tone(990, 0.09, 0.22, 'sine', 0.13);
    tone(1320, 0.16, 0.18, 'triangle', 0.05);
  },
  /** A risky decision: a short low warning. */
  warning: () => tone(220, 0, 0.28, 'square', 0.06, 150),
  /** Pointer over a choice. */
  hover: () => tone(1250, 0, 0.025, 'sine', 0.035),
  click: () => tone(880, 0, 0.05, 'triangle', 0.1),
  /** A short major arpeggio: something went well. */
  chime: () => [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.07, 0.25, 'sine', 0.14)),
  /** A falling sweep: something dropped. */
  powerDown: () => tone(440, 0, 0.45, 'sawtooth', 0.06, 110),
  /** Two quiet tones: a gauge is critical. */
  alarm: () => {
    tone(660, 0, 0.18, 'square', 0.05);
    tone(520, 0.22, 0.18, 'square', 0.05);
  },
  tick: () => tone(1500, 0, 0.03, 'square', 0.05),
  /** A star stamped on the mission-complete card. */
  stamp: (i = 0) => {
    noise(0.12, 0.2, 400, i * 0.25, 'lowpass');
    tone(392 * (1 + i * 0.26), i * 0.25, 0.2, 'triangle', 0.1);
  },
  /** Radio crackle when Mission Control calls. */
  radio: () => {
    noise(0.18, 0.06, 2400);
    tone(1200, 0.05, 0.06, 'square', 0.04);
  },
  hit: () => {
    noise(0.35, 0.3, 180, 0, 'lowpass');
    tone(90, 0, 0.3, 'sine', 0.2, 50);
  },
  dock: () => [392, 523.25, 783.99].forEach((f, i) => tone(f, i * 0.1, 0.3, 'sine', 0.12)),
  land: () => noise(0.6, 0.18, 300, 0, 'lowpass'),
  /** Ripple view: one soft blip per system the decision touched, rising. */
  ripple: (i = 0) => tone(330 * 2 ** (Math.min(i, 12) / 12), i * 0.06, 0.08, 'sine', 0.06),
  // ---- Chapter complete (LUNA_BUILD B7): each step has its own sound ----
  /** The mission patch spins in: a whoosh and a bright fifth. */
  patch: () => {
    noise(0.4, 0.08, 1800, 0, 'highpass');
    tone(523.25, 0.15, 0.4, 'triangle', 0.1);
    tone(783.99, 0.22, 0.45, 'triangle', 0.08);
  },
  /** A crate lands in the rocket's hold. */
  crate: (i = 0) => {
    noise(0.08, 0.16, 220, i * 0.09, 'lowpass');
    tone(150, i * 0.09, 0.08, 'sine', 0.08);
  },
  /** The goal track moves on one step. */
  step: () => tone(440, 0, 0.3, 'sine', 0.1, 660),
  /** Rank up: a rising four-note fanfare. */
  rank: () => [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.3, 'square', 0.05)),
  /** A science card turns over. */
  card: () => {
    noise(0.1, 0.08, 3000, 0, 'highpass');
    tone(659.25, 0.08, 0.3, 'sine', 0.1);
  },
};

// ---- Rocket engine: a low rumble whose loudness follows the throttle ----

let engine: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

export function setEngine(thrust: number) {
  const a = audio();
  if (!a || !master) {
    stopEngine();
    return;
  }
  if (!engine) {
    const src = a.createBufferSource();
    src.buffer = getNoise(a);
    src.loop = true;
    const filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    const gain = a.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(master);
    src.start();
    engine = { src, gain };
  }
  engine.gain.gain.setTargetAtTime(0.02 + thrust * 0.22, a.currentTime, 0.08);
}

export function stopEngine() {
  if (!engine) return;
  try {
    engine.src.stop();
  } catch {
    // Already stopped.
  }
  engine = null;
}
