# HANDOFF: LUNA_BUILD run (Phases 0–4 done, Phase 5 part done)

Built with help from Claude (Anthropic). Written 2026-11-14 for the project owner and their Claude Code.

This file says what changed, how to bring it into your copy, and what is left. It sits next to `STATE.md`
(see "## Luna build log", "## Skipped", "## Check with your eyes", "## Decisions for Boss to review").

---

## 1. What is in the zip

| File | What it is | Use it when |
|---|---|---|
| `luna-build.bundle` | A git bundle of branch `claude/luna-build-setup-phases-6e92a8`, full history | Your project is a git repo (best option) |
| `patches/*.patch` | One `git format-patch` file per commit since `b692594` | You want to apply commit by commit, or read the diffs |
| `luna-source.zip` | Every tracked file at the final commit (no `node_modules`, no `.git`) | You have no git, or the other two fail |
| `HANDOFF.md` | This file | Always |

The work started from commit **`b692594`** ("Phase 6: testing checklist…"), the last commit you sent. Commits, oldest first:

1. `25266dc` Phase 0 - safety net (auto Lite mode, no blank screens, DONKI host fix, key rule, Shift+D demo jump)
2. `8fe8c04` Phase 1 - Flight Deck foundation (tokens, fonts, deck components, restyled shared UI)
3. `ba0fd6a` Phase 2 - six chapters, 5-star scoring, Mars Cargo, goal track, Olympus ending, team missions M3/M6/M7/M9/M12/M15
4. `f0506c9` Phase 3 - flights (deep-space Flight 1 and 2, NeoWs asteroids, Safety, crash restarts, touchdown animation)
5. `faf67a5` Phase 4 - Ripple knock-ons and view, chapter-complete screen, mission patches, mission log
6. `4005c28` Phase 5 - Planet component (A2.4) and Welcome hero screen
7. `3401185` Phase 5 - Play screen desktop layout (A2.5 deck grid, shared card timer)
8. (last) Handoff: STATE.md Phase 5 log, Skipped list, this file

Verified at the last commit: `npm test` **122 passing**, `npm run build` OK, `npm run build:usb` OK
(`dist-usb/index.html`, 3.27 MB). Only `DEMO_KEY` appears in `dist/` and `dist-usb/`.

**Nobody has seen it in a browser.** The PC it was built on crashes on WebGL in headless browsers and is low on memory.

---

## 2. How to bring it in (pick one)

Close `npm run dev` first. Commit or back up anything you changed since `b692594`.

### A. Git bundle (best)
In your project folder:

```bash
git fetch path/to/luna-build.bundle claude/luna-build-setup-phases-6e92a8:luna-build
```

```bash
git merge --ff-only luna-build
```

- If git says untracked files would be overwritten (usually `LUNA_BUILD.md`, `TEAM_MISSIONS.md`), move those two files out of the folder and run the merge again. The branch has the same files.
- If it is not a fast-forward (you committed after `b692594`), run `git merge luna-build` and fix any conflicts.

### B. Patches
```bash
git am path/to/patches/*.patch
```
If one fails: `git am --abort`, then use A or C.

### C. No git
Unzip `luna-source.zip` over your project folder (it replaces files, it does not delete any). Then commit if you use git.

### After any option
```bash
npm install
```
This adds the two new font packages, `@fontsource/michroma` and `@fontsource/jetbrains-mono`. Then:

```bash
npm test
```

```bash
npm run dev
```

---

## 3. Paste this to your Claude

> Read HANDOFF.md, then LUNA_BUILD.md, CLAUDE.md and STATE.md ("## Luna build log", "## Skipped",
> "## Decisions for Boss to review"). LUNA_BUILD Phases 0–4 are done, Phase 5 is part done.
> 1. Run `npm test`, `npm run build` and `npm run build:usb` (122 tests passed at the handoff).
> 2. Finish Phase 5 from LUNA_BUILD A2.5: Home (map), System, Ending layouts. Commit after each.
> 3. Then Phase 6 Crew Mode, Phase 7 Extras, Phase 8 Ship, following the Part A0 run protocol.
> Keep both builds working. Never put the NASA key in browser code.

---

## 4. What changed, phase by phase (file map)

### Phase 0 · Safety net
- `src/scene/space/webgl.ts`: `fallBackToLite()`, `watchContextLoss` (every `<Canvas onCreated>` uses it), `FpsWatch` → Lite "slow".
- `src/store/settings.ts`: `liteReason: 'slow' | 'failed' | null`; a "failed" Lite is not saved (next visit tries 3D again).
- `src/scene/MoonbaseScene.tsx` `SceneBoundary` falls back to Lite on a 3D crash. `src/App.tsx` `AppBoundary`: "This screen hit a problem".
  `useShownScreen()` guards: no progress → welcome; `ending` without an ending → home; `chapter` without `chapterShown` → home.
- `src/store/spaceWeather.ts`: DONKI tries `https://ccmc.gsfc.nasa.gov/DONKI/WS/get` (no key), then api.nasa.gov with `DEMO_KEY`,
  then cache, then the saved snapshot. No `VITE_` key anywhere.
- `scripts/snapshot.mjs`: reads `NASA_API_KEY` from env or `.env` (Node only, masked in logs), DONKI + NeoWs, each fails on its own.
  `.env.example` added.
- `src/ui/components/DemoJump.tsx`: Shift+D (not while typing, off during flight) → jump to any chapter or flight as commander "Demo".
- `CLAUDE.md` rules updated (B0 rule changes, approved). `src/ui/safety.test.tsx`.

### Phase 1 · Flight Deck look
- `tailwind.config.ts`: tokens (space 950/900/800, line, ink, sun `#FFB547` accent, life, crew, signal for focus only, ok/warn/bad,
  crew colours, fonts title=Michroma, display=Space Grotesk, sans=Nunito Sans, mono=JetBrains Mono, radius panel 10px, btn 8px).
- `src/main.tsx` imports the two @fontsource fonts. `src/styles/index.css`: `.panel/.hud` with corner brackets, `.glass` (no blur in
  `html.lite`), `.hud-label`, `.hud-value`, `.btn-primary/.btn-secondary`, keyframes, reduced-motion block.
- New `src/ui/components/deck/`: `Frame`, `Readout` (+`DeltaTag`), `GaugeTile` (sparkline, tick bar), `Timeline` (`stopsFrom`),
  `Callout`, `PrimaryButton`, `DataTag` (`· LIVE` only when live, otherwise `· SAVED 14 NOV`), `index.ts`.
- Restyled: Gauge, ChoiceButton, TimerRing/TimerBar, StatusPanel, SpaceWeatherChip, EventCard, Dialog, DeltaChip. `src/ui/deck.test.ts`.

### Phase 2 · Chapters and the end goal
- `src/data/chapters.json`: 6 chapters. Moon: 1 First Light [1,2,7], 2 Living Off the Land [3,4,15], 3 Keep It Running [5,6,12],
  4 The Storm [8,9,14]. Mars: 5 Red Landing [101,102,104], 6 The Climb [105,108,114]. Flights into chapters 1 and 5.
- Data: team cards m3e1, m6e1, m7e1, m9e1, m12e1, m15e1 from `TEAM_MISSIONS.md` (plus m10/m11/m13/m16 stored with `off: true`).
  Conversion: 1 team unit = 5 points, Time = 1 sol, Crew point = crew −5, Supplies = spareParts. Every Moon mission has one team card.
  16 team source URLs added to `sources.json`. Places: one Moon base (Horizon), ASTER-9 moved west of Olympus Mons, three camps up the
  volcano (`kind: 'camp'`, `heightKm: null` = TODO_VERIFY).
- Engine: `src/engine/chapters.ts` (5 stars per chapter, cargo crates, `recordStory`, Olympus endings Station/Outpost/Beacon,
  `GOAL_STOPS`), `balance.ts` (STORM_SECONDS 10, CARGO, OLYMPUS_TIERS, CAMP_RADIATION, RESUPPLY), timers on every card on
  Mission/Commander, `campaign.ts` save `v: 2` (+ `src/store/save.ts` migration of old saves), `mergeTrack` copies the new fields.
- UI: chapter line on every briefing, GoalStrip + CargoMeter, Ending with Olympus tiers and a recap, Home chapter headings with n/5.
- Tests: `src/engine/chapters.test.ts`, updated `engine.test.ts`, `src/ui/flow.test.tsx` now plays all 18 missions to the ending.

### Phase 3 · Flights
- `src/engine/flight.ts`: Safety (start 50, pass +5, graze −15, crash above speed 7, clean ≥ 80), `deepSpaceStart`, flight phases,
  NeoWs asteroid size/speed mapping. `src/data/neows.snapshot.json` (42 real asteroids, 8–14 Nov 2026).
- `src/scene/flight/FlightScene.tsx`: Flight 1 = satellites + debris, Flight 2 = real NeoWs rocks (built in code, no model downloads),
  crash → restart, 2.2 s landing + touchdown stamp (skip with Enter).
- `src/ui/screens/Flight.tsx`: Readouts, Safety ring, flight Timeline, CommsPanel, asteroid labels, NeoWs note + DataTag.
  `src/store/flightHud.ts` new fields. `src/engine/flight.test.ts`.

### Phase 4 · Ripple and rewards
- `src/engine/ripple.ts`: 12 factors, knock-on rules (Solar<30 → Battery −5, Battery<30 → Oxygen −3 & Water −2, Water<30 → Food −4,
  Food<30 → Health −3 & Morale −3, Oxygen<30 → Health −5, Dose>60 → Health −3), once per sol; Explorer 0×, Commander 1.5×;
  Morale<30 → risks +10%; spare parts 0 → no rescue. `src/engine/ripple.test.ts`.
- `src/ui/components/RippleView.tsx` (2.4 s map after each choice, Enter skips, Lite = list), `ChapterComplete.tsx` screen,
  `MissionPatch.tsx` (6 SVG patches), `MissionLog.tsx`, new Web Audio sounds in `src/ui/sound.ts`.
- `campaign.resupply`: after a paused story mission every part goes to 45, spare parts 1, BOLT 50 (no soft-lock).

### Phase 5 · Screen layouts (part)
- `src/scene/space/Planet.tsx` (shared Earth/Moon/Mars, atmosphere rim), `Moon.tsx` lights simplified, `Craft.tsx` hull.
- `src/scene/HeroScene.tsx` + `src/ui/screens/Welcome.tsx`: title screen with the Moon hero, "Begin mission", `crewSlot` prop for Phase 6.
- `src/ui/screens/Play.tsx`: below 1024 px the stacked layout; from 1024 px the 280 | card | 300 deck. `src/store/cardTimer.ts`
  shares the card countdown with the right-hand TimerRing. `StatusPanel.tsx` exports `PartsList`, `Objectives`.

---

## 5. What is left (from STATE.md "## Skipped")

1. **Phase 5 rest** (LUNA_BUILD A2.5): Home (globe centre-left, chapter name in Michroma top left, mission-site Callouts down the right
   with number, name, stars; Cargo rocket Frame bottom left), System (1 px orbit rings, Callouts on Earth/Moon/Mars, amber pin on the next
   destination, dim callouts for other planets opening a card Frame), Ending (patch in the centre, stars in a row, module Callouts lighting up).
2. **Phase 6 Crew Mode** (B6): Solo/Crew on Welcome (`crewSlot`), 2–3 roles, officer-on-duty rotation, vote keys P1 `A S D F`,
   P2 `J K L ;`, P3 arrows, majority wins, main-gauge officer breaks a three-way split, no votes = default choice, solo unchanged.
3. **Phase 7 Extras** in order: star background/textures → planet info cards with NASA photos → Mars Trek tiles → RadLab → OSDR → APOD.
   USB file must stay under 15 MB (now 3.27 MB).
4. **Phase 8 Ship**: refresh `../TeamSolOne_Luna/`; CREDITS.md + sources.json (NeoWs, DONKI CCMC host, Michroma and JetBrains Mono
   font credits, AI acknowledgement); credits screen; package.json description says ages 7-12 but B0 says **10 to 14**;
   key check of `dist/` and `dist-usb/`; full TODO_VERIFY list; tell Boss the USB file is `dist-usb/index.html`.

### TODO_VERIFY (open)
- Camp heights (`heightKm` in `places.json`, from Mars Trek) and coordinates of ASTER-9, the camps and Olympus Mons.
- Mariner 9 article URL (`nasa-mariner9-50-years` has an empty URL).
- Real trip times; Mars radius 3389.5; `planets.json` facts.
- Mars card sources: nasa-insight-mission, nasa-insight-solar-power, nasa-mars-solar-storm-2024, nasa-space-radiation.
  mars2e1 and mars4e1 reuse the ECLSS and plants pages: check the wording matches.
- All DRAFT numbers (objectives, bonuses, cargo bands) and everything older in STATE.md "## TODO_VERIFY".

---

## 6. Safety rules (keep)
- The NASA key lives only in `.env` as `NASA_API_KEY=` and is read only by `scripts/snapshot.mjs`. Never `VITE_`, never in browser code.
- Never commit `.env`; never paste the key into a chat. No `.env` existed on the build PC, so the snapshots used `DEMO_KEY`.
  Add your `.env` and run `npm run snapshot` to refresh `src/data/*.snapshot.json`.
- Low-memory PCs: don't run the dev server and a build at the same time. Headless WebGL crashes there, so check 3D by eye.

## 7. Check with your eyes after merging
See STATE.md "## Check with your eyes" (8 items): title screen Moon, the desktop deck on a mission, the Ripple map, Flight 1 and
Flight 2 via Shift+D, the chapter-complete screen, Lite mode, reduced motion.
