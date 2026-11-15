// Built with help from Claude (Anthropic).
// Saves progress in this browser only (localStorage), one save per commander name.
// Every read and write is wrapped so the game still works when storage is blocked
// (private windows, school laptops). Nothing is sent anywhere.
import { ORDERS } from '../data/content';
import { newProgress, type Progress } from '../engine/campaign';
import { isOlympusEnding, type EndingId } from '../engine/scoring';

const KEY = 'luna.save.v1';
/** The game was called OUTPOST before; a save under the old key is still read. */
const OLD_KEY = 'outpost.save.v1';

interface SaveFile {
  version: 1;
  last: string | null;
  commanders: Record<string, Progress>;
}

const emptySave = (): SaveFile => ({ version: 1, last: null, commanders: {} });

export const commanderKey = (name: string) => name.trim().toLowerCase();

function readSave(): SaveFile {
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(OLD_KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw) as Partial<SaveFile>;
    if (data.version !== 1 || typeof data.commanders !== 'object' || data.commanders === null) return emptySave();
    return { version: 1, last: data.last ?? null, commanders: data.commanders };
  } catch {
    return emptySave();
  }
}

function writeSave(save: SaveFile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage blocked or full: the game keeps going without saving.
  }
}

/** The Moon story before LUNA_BUILD's six chapters (save layout 1). */
const OLD_MOON_ORDER = [1, 2, 4, 5, 8, 14];
/** Old four endings → the Olympus ending they are closest to. */
const OLD_ENDING: Partial<Record<EndingId, EndingId>> = { complete: 'station', bumpy: 'outpost', closeCall: 'beacon', paused: 'beacon' };

/**
 * Moves a save from before the six chapters: the Moon story position is re-found by mission id
 * in the new order, the Moon no longer has its own ending, and an old Mars ending becomes the
 * nearest Olympus ending.
 */
export function migrate(stored: Progress): Progress {
  if (stored.v === 2) return stored;
  let next: Progress = { ...stored, v: 2 };
  const nextOld = OLD_MOON_ORDER[stored.storyIndex];
  const index = nextOld === undefined ? ORDERS.moon.length : ORDERS.moon.indexOf(nextOld);
  next = { ...next, storyIndex: index < 0 ? 0 : index, ending: null };
  const mars = stored.worlds?.mars;
  if (mars?.ending && !isOlympusEnding(mars.ending)) {
    next = { ...next, worlds: { ...stored.worlds, mars: { ...mars, ending: OLD_ENDING[mars.ending] ?? 'beacon' } } };
  }
  return next;
}

/** Fills in any fields an older save is missing. */
function withDefaults(stored: Progress): Progress {
  return migrate({ ...newProgress(stored.name, stored.difficulty ?? 'mission'), v: stored.v, ...stored });
}

export function findCommander(name: string): Progress | null {
  const stored = readSave().commanders[commanderKey(name)];
  return stored ? withDefaults(stored) : null;
}

export function lastCommander(): Progress | null {
  const save = readSave();
  return save.last ? findCommander(save.last) : null;
}

export function listCommanders(): string[] {
  return Object.values(readSave().commanders).map((p) => p.name);
}

export function saveProgress(progress: Progress): void {
  const save = readSave();
  save.commanders[commanderKey(progress.name)] = progress;
  save.last = progress.name;
  writeSave(save);
}
