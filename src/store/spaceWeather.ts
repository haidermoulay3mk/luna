// Built with help from Claude (Anthropic).
// Live Space Weather from NASA DONKI, with the SPEC 4.5 fallback chain (6 s timeout each):
//   1. CCMC's own DONKI web service, no key needed (moved from kauai.ccmc.gsfc.nasa.gov to
//      ccmc.gsfc.nasa.gov on 30 Sep 2026; may be blocked by CORS or the network, then skipped)
//   2. api.nasa.gov/DONKI with NASA's shared DEMO_KEY
//   3. the last good live result saved in this browser ("Saved NASA data from …")
//   4. the snapshot built into the game ("Archived NASA data from … (offline mode)")
// Stored data is never called live. The team's own NASA key is used only by `npm run snapshot`
// (Node): anything the browser reads ends up inside the built file, so the key never goes there.
import { create } from 'zustand';
import snapshotJson from '../data/spaceweather.snapshot.json';
import { riskSummary, type RiskSummary } from '../engine/spaceWeather';
import type { SpaceWeatherSnapshot } from '../engine/types';

export type WeatherStatus = 'loading' | 'live' | 'saved' | 'archived';

interface SpaceWeatherStore {
  status: WeatherStatus;
  snapshot: SpaceWeatherSnapshot;
  summary: RiskSummary;
  load: () => Promise<void>;
}

const ARCHIVE = snapshotJson as SpaceWeatherSnapshot;
const CACHE_KEY = 'luna.spaceweather.v1';
const TIMEOUT_MS = 6000;
export const DONKI_PAGE = 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';
/** DONKI's keyless web service on its new host (LUNA_BUILD B8). */
export const CCMC_DONKI = 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get';

const summarise = (snapshot: SpaceWeatherSnapshot, live: boolean) =>
  riskSummary(snapshot, live ? Date.now() : Date.parse(snapshot.fetchedAt));

async function getList(url: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

type Row = Record<string, string | undefined>;

/** Fetches flares, particle events and CMEs for the last 30 days from one DONKI server. */
async function fetchFrom(base: (type: string, from: string, to: string) => string): Promise<SpaceWeatherSnapshot | null> {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const [flr, sep, cme] = await Promise.all(['FLR', 'SEP', 'CME'].map((t) => getList(base(t, from, to))));
  if (!flr && !sep && !cme) return null;
  const missing: ('flares' | 'sep' | 'cme')[] = [];
  if (!flr) missing.push('flares');
  if (!sep) missing.push('sep');
  if (!cme) missing.push('cme');
  return {
    fetchedAt: now.toISOString(),
    source: 'NASA DONKI',
    flares: ((flr ?? []) as Row[]).map((f) => ({ time: f.peakTime ?? f.beginTime ?? '', classType: f.classType ?? '' })),
    sep: ((sep ?? []) as Row[]).map((s) => ({ time: s.eventTime ?? '' })),
    cme: ((cme ?? []) as Row[]).map((c) => ({ time: c.startTime ?? '' })),
    missing,
  };
}

function readCache(): SpaceWeatherSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SpaceWeatherSnapshot) : null;
  } catch {
    return null;
  }
}

function writeCache(snapshot: SpaceWeatherSnapshot) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage blocked: the game keeps going without the cache.
  }
}

export const useSpaceWeather = create<SpaceWeatherStore>()((set, get) => ({
  status: 'archived',
  snapshot: ARCHIVE,
  summary: summarise(ARCHIVE, false),

  load: async () => {
    if (get().status === 'loading' || get().status === 'live') return;
    // Tests never touch the network: they use the archived snapshot.
    if (import.meta.env.MODE === 'test') return;
    set({ status: 'loading' });
    const live =
      (await fetchFrom((t, from, to) => `${CCMC_DONKI}/${t}?startDate=${from}&endDate=${to}`)) ??
      (await fetchFrom((t, from, to) => `https://api.nasa.gov/DONKI/${t}?startDate=${from}&endDate=${to}&api_key=DEMO_KEY`));
    if (live) {
      writeCache(live);
      set({ status: 'live', snapshot: live, summary: summarise(live, true) });
      return;
    }
    const cached = readCache();
    if (cached) set({ status: 'saved', snapshot: cached, summary: summarise(cached, false) });
    else set({ status: 'archived', snapshot: ARCHIVE, summary: summarise(ARCHIVE, false) });
  },
}));

/** The honest label for where the numbers come from. */
export function weatherLabel(status: WeatherStatus, snapshot: SpaceWeatherSnapshot): string {
  const when = new Date(snapshot.fetchedAt);
  const date = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (status === 'live') return `Live NASA data · updated ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (status === 'saved') return `Saved NASA data from ${date}`;
  if (status === 'loading') return 'Checking NASA…';
  return `Archived NASA data from ${date} (offline mode)`;
}
