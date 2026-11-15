// Built with help from Claude (Anthropic).
// `npm run snapshot`: saves real NASA data into src/data/*.json so the offline (USB) game can
// use it and say honestly when it was saved ("Archived NASA data from [date]").
// Run it while online, before building the USB version.
//
// The team's NASA key: NASA_API_KEY in .env (or in the environment). It is used ONLY here, in
// Node. Browser code never reads it, so it never ends up inside the built game files.
// Without a key, NASA's shared DEMO_KEY is used (about 10 calls an hour).
//
// Each data set is fetched on its own; if one fails, its old file is kept and the others still save.
import { readFileSync, writeFileSync } from 'node:fs';

function readKey() {
  if (process.env.NASA_API_KEY) return process.env.NASA_API_KEY.trim();
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.startsWith('NASA_API_KEY='));
    const key = line?.split('=')[1]?.trim();
    return key && key !== 'your_key_here' ? key : 'DEMO_KEY';
  } catch {
    return 'DEMO_KEY';
  }
}

const key = readKey();
const now = new Date();
const day = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
const dataFile = (name) => new URL(`../src/data/${name}`, import.meta.url);
const save = (name, data) => writeFileSync(dataFile(name), JSON.stringify(data, null, 2) + '\n');
/** Never print the key: replace it in anything we log. */
const hide = (text) => String(text).split(key).join('***');

async function getJson(url, timeout = 20000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- DONKI space weather (LUNA_BUILD B8) ----
// DONKI moved from kauai.ccmc.gsfc.nasa.gov to ccmc.gsfc.nasa.gov on 30 Sep 2026.
// Try CCMC's keyless service first, then the api.nasa.gov gateway with our key.
const DONKI_HOSTS = [
  { name: 'ccmc.gsfc.nasa.gov', url: (type, from, to) => `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/${type}?startDate=${from}&endDate=${to}` },
  { name: 'api.nasa.gov', url: (type, from, to) => `https://api.nasa.gov/DONKI/${type}?startDate=${from}&endDate=${to}&api_key=${key}` },
];

async function donkiList(type) {
  for (const host of DONKI_HOSTS) {
    try {
      const data = await getJson(host.url(type, day(daysAgo(30)), day(now)));
      if (Array.isArray(data)) return { data, host: host.name };
      throw new Error('not a list');
    } catch (error) {
      console.warn(`DONKI ${type} via ${host.name} failed: ${hide(error.message)}`);
    }
  }
  return { data: null, host: null };
}

async function snapshotDonki() {
  const [flr, sep, cme] = await Promise.all([donkiList('FLR'), donkiList('SEP'), donkiList('CME')]);
  const missing = [];
  if (!flr.data) missing.push('flares');
  if (!sep.data) missing.push('sep');
  if (!cme.data) missing.push('cme');
  if (missing.length === 3) {
    console.error('DONKI: nothing could be loaded. The old space weather snapshot was kept.');
    return false;
  }
  const hosts = [...new Set([flr.host, sep.host, cme.host].filter(Boolean))].join(' and ');
  const snapshot = {
    fetchedAt: now.toISOString(),
    source: `NASA DONKI (Space Weather Database of Notifications, Knowledge, Information), via ${hosts}`,
    flares: (flr.data ?? []).map((f) => ({ time: f.peakTime ?? f.beginTime, classType: f.classType ?? '' })),
    sep: (sep.data ?? []).map((s) => ({ time: s.eventTime })),
    cme: (cme.data ?? []).map((c) => ({ time: c.startTime })),
    missing,
  };
  save('spaceweather.snapshot.json', snapshot);
  console.log(
    `DONKI: saved ${snapshot.flares.length} flares, ${snapshot.sep.length} SEP events, ${snapshot.cme.length} CMEs.` +
      (missing.length ? ` Missing from NASA: ${missing.join(', ')}.` : ''),
  );
  return true;
}

// ---- NeoWs near-Earth asteroids (LUNA_BUILD B8): the rocks in Flight 2 ----
// 7 days at most per request. Keeps name, size, speed and the "potentially hazardous" flag.
async function snapshotNeoWs() {
  const start = day(daysAgo(6));
  const end = day(now);
  try {
    const data = await getJson(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${key}`);
    const byDate = data?.near_earth_objects;
    if (!byDate || typeof byDate !== 'object') throw new Error('no near_earth_objects');
    const asteroids = [];
    for (const [date, list] of Object.entries(byDate)) {
      for (const neo of list) {
        const size = neo.estimated_diameter?.meters;
        const approach = neo.close_approach_data?.[0];
        const speed = Number(approach?.relative_velocity?.kilometers_per_second);
        if (!size || !Number.isFinite(speed)) continue;
        asteroids.push({
          name: String(neo.name).replace(/^\((.*)\)$/, '$1'),
          diameterM: Math.round((size.estimated_diameter_min + size.estimated_diameter_max) / 2),
          speedKmS: Math.round(speed * 100) / 100,
          hazardous: Boolean(neo.is_potentially_hazardous_asteroid),
          approachDate: approach?.close_approach_date ?? date,
        });
      }
    }
    if (asteroids.length === 0) throw new Error('empty list');
    asteroids.sort((a, b) => a.approachDate.localeCompare(b.approachDate) || a.name.localeCompare(b.name));
    save('neows.snapshot.json', {
      fetchedAt: now.toISOString(),
      source: 'NASA NeoWs (Near Earth Object Web Service), via api.nasa.gov',
      startDate: start,
      endDate: end,
      asteroids,
    });
    console.log(`NeoWs: saved ${asteroids.length} asteroids (${asteroids.filter((a) => a.hazardous).length} potentially hazardous), ${start} to ${end}.`);
    return true;
  } catch (error) {
    console.warn(`NeoWs failed: ${hide(error.message)}. The old asteroid snapshot was kept.`);
    return false;
  }
}

const results = { donki: await snapshotDonki(), neows: await snapshotNeoWs() };
const failed = Object.entries(results).filter(([, ok]) => !ok).map(([name]) => name);
console.log(failed.length ? `Done. Kept the old files for: ${failed.join(', ')}.` : 'Done. Every data set was saved.');
