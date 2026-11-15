# LUNA_BUILD.md · Luna: one file, one paste, whole build

### Team Sol One · hand-in Sunday 15 Nov, 13:30 · feature freeze 12:00

> **Boss: read Part 0 only (5 minutes).** Parts A and B are for Claude Code.
> This file replaces `SUNDAY_PLAN.md`. Keep it in the project folder next to `SPEC.md`, `CLAUDE.md` and `TEAM_MISSIONS.md`. Do not paste it into the chat; Claude Code reads it from the folder.

---

## PART 0 · For Boss

### The end goal (say this out loud when you get lost)

**"Get your crew from Earth to the summit of Olympus Mons and switch on Olympus Station."**

`Earth → (flight) → Moon base: 4 chapters, load the rocket → (flight, dodge real asteroids) → Mars: 2 chapters, drive up Olympus Mons → summit: Olympus Station lights up`

Why Olympus Mons, if a judge asks: in 1971 NASA's Mariner 9 arrived during a planet-wide dust storm, and the tops of the giant volcanoes were among the few things it could see above the dust. Our reasoning: a station up there sits above most of the dust, so its solar panels keep working. (It is the team's game goal. Do not say NASA plans a base there.)

### How the one paste works

One prompt runs 9 phases in a row. After each phase Claude Code tests the game, saves a checkpoint and writes what it did in `STATE.md`. If it stops for any reason (usage limit, laptop sleeps, an error), nothing is lost: you type the **Continue** line and it picks up at the next phase.

The phases are in order of what judges see first. If time or usage runs out, you still hand in a working game, just with fewer extras.

| Phase | What you get |
| --- | --- |
| 0 | It runs. No blank screens. `Shift + D` demo jump |
| 1 | New "Flight Deck" look on every screen (fonts, panels, colours) |
| 2 | 6 chapters, 5 stars each, Mars Cargo, goal strip, Olympus ending |
| 3 | Flights: real NASA asteroids, crash restarts the flight, landing animation |
| 4 | Ripple view (10+ systems light up) and the reward screen |
| 5 | New screen layouts: big planet title screen, mission-control play screen |
| 6 | Crew Mode: 3 players, one screen |
| 7 | Extras: more planets, NASA photos, Mars Trek map, RadLab, OSDR, APOD |
| 8 | Ship: tests, USB file, credits |

### Tonight (about 45 minutes, then sleep)

1. **Close every other app** (the PC had under 1 GB of free RAM). In the VS Code terminal type `npm run dev`, open the link, play Moon mission 1 and one flight. Write down everything that looks wrong. If the 3D scene is blank or the PC crawls, turn on **Lite mode** in Settings and write that down too. Then stop the dev server (`Ctrl + C`).
2. **Back up.** Zip the whole project folder as `Luna_backup_Saturday.zip` and copy it to a USB drive.
3. **API key.** Make a copy of `.env.example`, name the copy `.env`, and replace `your_key_here` with your NASA key. Never paste the key into a chat.
4. **Paste the Build prompt** below. When Claude Code asks permission to run `npm` or `git`, choose the "yes, don't ask again" option, or it will sit waiting all night.
5. Laptop plugged in, lid open, sleep turned off. Check once before bed that it is working and not waiting on a question.

**Build prompt (the only one you need)**
```
Read LUNA_BUILD.md fully, then CLAUDE.md, STATE.md and TEAM_MISSIONS.md. I approve every rule change in LUNA_BUILD.md.
Run Phase 0 to Phase 8 in order, following the run protocol in Part A0. Do not stop to ask me anything.
What I saw when I played it: [type what looked wrong, or "it ran fine"]
```

**Continue (if it stopped part-way)**
```
Continue LUNA_BUILD.md from the next unfinished phase in STATE.md. Same run protocol.
```

**Freeze (Sunday 12:00, whatever is happening)**
```
Feature freeze. Finish the file you are editing, then do Phase 8 (Ship) from LUNA_BUILD.md. Tell me the file to copy to the USB.
```

**Rescue lines**
- Something broke: paste the exact error, then `Fix this without changing anything else.`
- A phase made things worse: `Undo the last phase and restore the commit before it.`
- A screen looks generic: `This looks like generic AI design. Re-read Part A2 of LUNA_BUILD.md and redo this screen.`
- Everything is broken: `Restore the tag before-luna-build.` (that is tonight's version)

### Sunday timetable

Assumes the centre opens at 09:00. If it opens later, shift everything, but **12:00 freeze does not move**.

| Time | You | Done when |
| --- | --- | --- |
| 09:00 | Run the game. Play chapter 1 and one flight. Open `STATE.md` and read "Decisions for Boss" and "Check with your eyes" | You know which phase it reached |
| 09:15 | If it did not reach Phase 8: paste **Continue** | It is building again |
| 09:15 – 11:00 | Tester plays, you paste fixes one at a time: `Fix: [what is wrong]. Change nothing else.` | Broken things fixed, no new ideas |
| 11:00 | Whatever phase is running: `Finish this phase, commit, and stop.` | |
| 11:15 | Pitch rehearsal with the team (10 min) | |
| 11:50 | Take 3 screenshots for the slides and the project page | |
| **12:00** | **FREEZE.** Paste **Freeze** | Tests pass, USB file built |
| 12:30 | Teammate opens the USB file on a **different laptop with Wi-Fi off** and plays one chapter | It works |
| 13:00 | Hand the USB to the volunteer | 30 minutes of buffer left |

**The one rule for tomorrow:** a smaller game that works beats a bigger one that crashes. After 11:00, fix only what is broken.

### Jobs for teammates (so Boss only builds)

| Who | Job | By |
| --- | --- | --- |
| Fact checker | Apply the four wording fixes in Part B10. Read every card that says DRAFT and change anything you disagree with: the design must be yours | Sun 10:30 |
| Mars researcher | Open <https://trek.nasa.gov/mars/>, find Olympus Mons, use the elevation tool, write down three heights along the west side (foot, halfway, crater rim) and send them to Boss | Sun 10:00 |
| Slides | 5 slides: 1 title and the one-line goal · 2 the problem · 3 screenshots (backup if the live demo fails) · 4 "real NASA data and what it changes in the game" (copy the table in B8) · 5 team, credits, Use of AI | Sun 11:30 |
| Tester | Play every new build the moment Boss says "done". Report only things that are broken, not ideas | all morning |
| Submission | Project page text, online link (ask Claude Code: `Deploy the online build and walk me through any login`), USB test on a second laptop | Sun 12:45 |

### What to say in the pitch (3 lines that win points)

1. "Every decision touches more than ten systems, and you can see them light up." (show the Ripple view)
2. "These asteroids are real. NASA tracked them this week. The solar storm risk is real too, from NASA's DONKI database." (show a flight)
3. "Three players, three jobs, one base. And it runs from a USB stick with no internet."

Keep **Demo jump** ready: `Shift + D` opens any chapter or flight instantly, so a crash or a slow laptop never stops the pitch.

### Hand-in checklist

- [ ] USB file opens by double-click on another laptop, Wi-Fi off
- [ ] The game never says "live" when it is offline
- [ ] Credits screen lists every NASA source and says code was written with Claude (Anthropic)
- [ ] No photos, video or audio of real people anywhere
- [ ] "Use of AI" text updated: AI wrote the code, helped organise the plan and check links; the team wrote the missions and chose the design
- [ ] 3 screenshots + slides PDF on the USB
- [ ] Online link pasted into the project page

---

## PART A · For Claude Code: how to run this build

### A0 · Run protocol (overrides "build one phase, then stop" in CLAUDE.md and SPEC)

1. **Read** this file, `CLAUDE.md`, `STATE.md`, `TEAM_MISSIONS.md`. Do **not** re-read all of `SPEC.md` (57 KB). Open only the part you need: Part 4 (systems), Part 5 (card template), Part 8 (motion), Part 11 (schemas). SPEC Part 7 (art direction) is replaced by Part A2 below.
2. **Before any change:** `git tag before-luna-build`.
3. **Run Phase 0 to Phase 8 in order without stopping.** After each phase:
   - `npm test`, then `npm run build`, then `npm run build:usb`. Fix what fails.
   - Commit: `Luna build: Phase N - title`.
   - Append to `STATE.md` under `## Luna build log`: phase done, how to see it (one line), every number you chose yourself, new `TODO_VERIFY` items.
   - Reply in 5 lines or fewer, then start the next phase.
4. **Never stop to ask Boss.** If something needs a decision, take the simplest option and record it in `STATE.md` under `## Decisions for Boss to review`.
5. **Two strikes.** If an item still fails after two fix attempts, revert that item's files, write it under `## Skipped` in `STATE.md` with the reason, and move on. The game must run at every commit.
6. **Build on top.** Keep the engine, the save format, solo play and the 69 passing tests working. Do not rewrite or rename existing files unless the phase needs it. New dependencies allowed: only the two fonts in A2.2.
7. **You cannot see the browser.** The headless browser crashes on WebGL on this PC. Do not try screenshots or Playwright. Rely on type checks and tests. At the end, write `## Check with your eyes` in `STATE.md`: 8 items or fewer that Boss must look at.
8. **Low RAM.** Never run the dev server and a build at the same time. No watch modes.
9. **Save tokens.** Do not print whole files in replies. Read only the files a phase touches.
10. **If Boss types "Feature freeze":** finish the current file, skip to Phase 8.
11. **How to read Part B in this run:**
    - "the sheet Boss pastes" = `TEAM_MISSIONS.md` in this folder (the team's 16 Moon missions with NASA links).
    - "Show Boss ... before building it" = decide yourself, record it under Decisions.
    - "Step 1 / 2 / 3 / 4 / 5 / 6 / 7" in Part B = Phase 0 / 2 / 3 / 4 / 6 / 7 / 8 here.
    - Clock times in Part B (for example "by 11:15") do not apply to you.
12. **NASA API key.** Boss's key is in `.env`, possibly as `VITE_NASA_API_KEY`. In Phase 0 rename it to `NASA_API_KEY` in `.env`, `.env.example` and `scripts/snapshot.mjs`, and use it **only** in the Node snapshot script. Browser code must not read it (anything `VITE_` ends up inside the built file). Live DONKI in the browser uses the keyless CCMC host, then `DEMO_KEY`, then the snapshot. In Phase 8, search `dist/` and `dist-usb/` for the key and fail the phase if it is there.

### A1 · The phases

Every phase ends with the three commands in A0.3 and a commit.

**Phase 0 · Safety net.** Fix what Boss reported in the prompt. If WebGL fails to start or the context is lost, switch to Lite mode automatically: never a blank screen. Fix the DONKI host (B8) and rerun `npm run snapshot` (if the network fails, keep the old snapshot and note it). API key rule (A0.12). Add Demo jump (`Shift + D`: chapter and flight select, everything unlocked). Apply the B0 rule changes to `CLAUDE.md`.
*Done when:* tests pass, both builds work, no code path can leave a blank screen.

**Phase 1 · Flight Deck foundation.** A2.1 to A2.3: new tokens, the two fonts, the `deck/` components, and restyle the shared classes in `src/styles/index.css` plus Gauge, ChoiceButton, TimerRing, StatusPanel, SpaceWeatherChip, EventCard, Dialog. No layout changes yet: every existing screen should simply look new.
*Done when:* no screen still uses the old 18 px rounded toy panels, and tests pass.

**Phase 2 · Chapters and the end goal.** B0 tone, B1, B2, B4, B10. Regroup the data into 6 chapters, add the 6 new Moon cards from `TEAM_MISSIONS.md`, 5-star scoring, Mars Cargo, the goal track (use the `Timeline` component), camp heights as data (placeholders marked `TODO_VERIFY`), the three-tier Olympus ending.
*Done when:* a full playthrough in the UI test reaches an ending, and tests cover the star rules and the cargo rules.

**Phase 3 · Flights.** B5, the NeoWs row of B8, the Bennu and station models from B9. If a model download fails twice, build rocks in code (icosahedron with displaced vertices, 3 variants) and note it.
*Done when:* both flights are playable, a crash restarts the flight only, the landing animation plays, and it works offline from the snapshot.

**Phase 4 · Ripple and rewards.** B3 and B7.
*Done when:* tests cover every knock-on rule, the Ripple view shows after a choice, the chapter-complete screen plays through.

**Phase 5 · Screens.** A2.4 (planet rendering) and A2.5 (layouts), in this order: Welcome → Play → Home → System → Flight HUD → Ending. Commit after each screen.
*Done when:* each screen passes the A2.6 checklist.

**Phase 6 · Crew Mode.** B6. Build "Officer on duty" first (rotating decider), commit, then add voting keys. Solo play must stay exactly as it is.
*Done when:* a test shows three key sets voting on one card and the majority choice applied.

**Phase 7 · Extras (in this order, stop at the first that fails twice).** Star background and remaining planet textures → planet info cards with NASA photos → Mars Trek tiles for the chapter 6 map → RadLab → OSDR → APOD postcard. Keep the USB file under 15 MB: if it grows past that, drop assets in reverse order.

**Phase 8 · Ship.** Full test run, fix only failures. `npm run build` and `npm run build:usb`. Key check (A0.12). Refresh `../TeamSolOne_Luna/`. Update `CREDITS.md`, `sources.json`, the credits screen and the AI acknowledgement. List everything still `TODO_VERIFY` so the team can remove or reword it. Tell Boss the exact file to copy to the USB.

### A2 · UI overhaul: the "Flight Deck" look

Boss gave nine reference images. What they share: a near-black screen, **one huge real planet lit from the side** as the hero, big confident white type set off-centre, thin leader lines pointing from the planet to labels, and around it a mission-control dashboard of slim panels with small uppercase labels and large numbers. One accent colour. Nothing cute.

#### A2.1 · Rule change (update CLAUDE.md rule 9 and add a note at the top of SPEC Part 7)

SPEC Part 7's "premium toy diorama" is replaced by **Flight Deck: a real mission-control display built around real NASA imagery.** The base modules and BOLT stay as they are; the frame around them changes.

Still banned: purple-blue gradients, emoji as icons, AI-generated images, walls of text.
Also banned now: logos or names of real companies (some references show them: do not copy), glow on everything, bloom or post-processing, decorative fake numbers. **Every number on screen is a real game value or a real NASA value.**

#### A2.2 · Tokens (change in `tailwind.config.ts`, nowhere else)

| Token | Value | Use |
| --- | --- | --- |
| `space-950` | `#05070D` | page background, solid |
| `space-900` | `#0A0E18` | panels |
| `space-800` | `#121826` | raised rows, hover |
| `line` / `line-strong` | white 12% / white 28% | borders, leader lines, brackets |
| text | white 92% / 68% / 55% | primary / secondary / labels. Nothing fainter |
| `sun` `#FFB547` | **the one accent** | primary button, "you are here", selected, destination pin |
| `life`, `crew`, and `sun` for Power | unchanged | only on their own gauge and its numbers |
| `signal` `#7C9CFF` | focus ring only | no longer a button colour |
| `ok` / `warn` / `bad` | unchanged | always with a shape: circle / triangle / octagon |
| radius | panel 10 px, button 8 px | was 18 px |

Fonts, bundled with `@fontsource` (latin subset only):
- **Michroma** (`@fontsource/michroma`): game title and chapter names only. Uppercase, never under 20 px.
- **Space Grotesk** (installed): headings and card titles.
- **Nunito Sans** (installed): body, 18 px minimum.
- **JetBrains Mono** (`@fontsource/jetbrains-mono`, weights 500 and 700): **every number, timer, label and data tag**, with tabular figures.
- If either install fails: Space Grotesk 700 uppercase with 0.12em tracking, and `ui-monospace`.

#### A2.3 · Components (build once in `src/ui/components/deck/`, use everywhere)

1. **`Frame`**: the instrument panel. Panel colour at 80%, 1 px `line` border, four corner brackets (SVG, 10 px L-shaped strokes in `line-strong`). Header row: index number in mono accent ("01"), label in mono 11 px uppercase with 0.18em tracking, optional right slot. No blur by default. A `glass` prop adds blur: **at most 2 glass frames on screen** (blur is slow on this PC). Lite mode: no blur at all.
2. **`Readout`**: a big mono number, small unit, label above, delta chip beside it. The number counts to its new value in 300 ms.
3. **`GaugeTile`**: a Readout, a 4 px bar with a tick every 10 and a notch at the critical line (30), a sparkline of the last 8 values (SVG polyline), and the state shape.
4. **`Callout`**: a dot on the object, a 1 px elbow line, and a text block (title in Space Grotesk, one mono sub-line). Lines draw in over 250 ms, staggered 60 ms. Used for planets, mission sites and station modules.
5. **`Timeline`**: dots joined by a line. Done = check shape, current = accent, next = hollow. Used three times: goal track (5 stops), chapter missions (3), flight phases (Launch · Cruise · Approach · Landing).
6. **`PrimaryButton`**: amber fill, dark text, mono uppercase label, arrow. At least 56 px tall. Secondary = outline only.
7. **`DataTag`**: a small mono chip that says honestly where a number comes from: `NASA DONKI · LIVE` or `NASA DONKI · SAVED 14 NOV`.

Screen entry: frames fade and rise 8 px over 200 ms, staggered 40 ms; brackets draw; numbers count. Reduced motion: instant.

#### A2.4 · Planets and rocket: realistic without melting the PC

- One `Planet` component for Earth, Moon and Mars: the 2k NASA map, `meshStandardMaterial` with roughness 1, **one directional "Sun" light and ambient at 0.06 or less**, so there is a bright day side and a dark night side. This single change does most of the "realistic" work.
- Atmosphere rim for Earth (blue-white) and Mars (pale salmon): a second sphere at 1.03×, `BackSide`, additive, with a short fresnel shader. None on the Moon.
- Rotation 0.02 rad/s. 64 segments for a hero planet, 32 elsewhere.
- Background: drei `Stars` (about 3000, faded). Lite mode: the existing CSS stars.
- Rocket (`Craft.tsx`): keep it built from shapes. White body (metalness 0.3, roughness 0.5), dark nose and fins, engine bell, flickering emissive exhaust, drei `Trail` in flight.
- No bloom, no shadows, DPR 1.5 or less, as before.

#### A2.5 · Screens

- **Welcome.** Full-bleed scene. The Moon is the hero: right side, about 60% of the height, cropped by the screen edge, lit from the left. Left column, aligned to the bottom: DataTag `TEAM SOL ONE · NASA SPACE APPS 2026`, the title **LUNA** in Michroma (clamp 64 to 128 px), the one-line goal, PrimaryButton "Begin mission", secondary "Crew mode". Bottom strip: the goal Timeline and the space-weather DataTag. Settings and mute top right. Not centred.
- **System.** Orbits as 1 px rings. Callouts on Earth, Moon and Mars, with the accent pin on the next destination. Other planets get dim callouts; clicking one opens its card in a Frame on the right (B9).
- **Home (world map).** Globe centre-left. Chapter name in Michroma top left. Mission sites as Callouts, listed down the right side: number, name, stars earned. Cargo rocket in a Frame bottom left.
- **Play.** At 1024 px and wider, a three-column grid `280px | 1fr | 300px`:
  - Left rail: three GaugeTiles (Power, Life Support, Crew), then a "Systems" Frame showing the other nine tracked factors in a 3 × 3 grid (name, mono value, tiny bar). This is where the Ripple view lights up.
  - Centre: the 3D base. The event card is a glass Frame docked bottom centre, 640 px wide at most, choices in one row with key hints `[1] [2] [3]`.
  - Right rail: Objective, TimerRing, Sol counter, space weather, Mars Cargo.
  - Top: the goal Timeline as a 40 px strip. Bottom left: the mission Timeline (1 · 2 · 3).
  - Under 1024 px: keep the current mobile layout, restyle only.
- **Flight.** Keep the view clear. Top left: Readouts for speed and distance to target. Top right: Safety ring. Bottom centre: flight Timeline. Mission Control problems in a glass Frame bottom left. The honest asteroid label (B5) as a DataTag bottom right.
- **Chapter complete and Ending.** As B7 and B2: patch in the centre, stars in a row, and on the ending Callouts name each station module as its lights come on.

#### A2.6 · Checklist for every screen

One hero object · one accent colour · every number in mono · 2 glass frames or fewer · not a centred stack (dialogs excepted) · body text 18 px, labels 11 px uppercase mono or larger · state never shown by colour alone · works with reduced motion · works in Lite mode.

#### A2.7 · Where to look things up

| Need | Link |
| --- | --- |
| Fonts that work offline | <https://fontsource.org> |
| drei helpers (`Stars`, `Trail`, `Html`, `useTexture`) | <https://drei.docs.pmnd.rs> |
| The look to aim for in the solar system view | <https://eyes.nasa.gov/apps/solar-system/> |
| NASA photos (no key needed) | <https://images.nasa.gov> |
| Models, textures and data endpoints | tables B8 and B9 below |

---

## PART B · Game spec

Every number marked DRAFT is a suggestion for the team to change. Every real-world fact without a source id stays `TODO_VERIFY`.

### B0 · Rule changes approved by Boss (update CLAUDE.md and SPEC Part 10)

- **Rule 1:** same-screen multiplayer is allowed (still no backend, no accounts). NASA public-domain 3D models are allowed if each file is under 1 MB.
- **Rule 2:** allowed imagery now includes the assets in B9. Every asset goes in `sources.json` and `CREDITS.md` with its licence. Still no AI-generated images, video or audio. Still no images of people.
- **Rule 5:** game content = the team's sheets + this file. Do not write new mission cards. Leave the six `draft: true` Moon cards out of the chapters.
- **Performance:** textures at most 2048 × 1024 JPG, at most 8 new textures. If WebGL fails to start or the context is lost, switch to Lite mode automatically. Never show a blank screen.
- **Tone, ages 10 to 14:** not childish, not technical. Sentences of 15 words or fewer. A real term is fine once with a plain gloss, for example "regolith (Moon soil)". Crew speak like professionals with personality. No exclamation-mark spam.

### B1 · Story arc: 6 chapters × 3 missions

One line on the title screen and in the HUD: **Reach the summit of Olympus Mons and switch on Olympus Station.**

| Ch | World | Chapter | Missions (team's cards) | What it teaches |
| --- | --- | --- | --- | --- |
| — | Flight 1 | Earth → Moon | dodge satellites and debris, about 40 s | |
| 1 | Moon | **First Light** | M1 First Light · M2 Breathing Room · M7 The Shadow Problem | Power and air |
| 2 | Moon | **Living Off the Land** | M3 The Water Search · M4 The Green Room · M15 Crew Fitness | Water, food, health |
| 3 | Moon | **Keep It Running** | M5 Dust on the Panels · M6 Rover Trouble · M12 Spacesuit Check | Maintenance |
| 4 | Moon | **The Storm** | M8 Radiation Shelter · M9 Lost Signal · M14 Blackout (10 s timer) | Radiation, deciding under pressure |
| — | Flight 2 | Moon → Mars | dodge real asteroids, about 60 s | |
| 5 | Mars | **Red Landing** | Mars cards 101–107, grouped into 3 missions by theme | Starting again with what you brought |
| 6 | Mars | **The Climb** | Mars cards 108–114, grouped into 3 camps: Foot Camp · Halfway Camp · Crater Rim | The final push, then the ending |

- One mission = one team card on the Moon, 2 to 3 cards on Mars. Show Boss the Mars grouping before building it.
- Moon cards M3, M6, M7, M9, M12, M15 are new to the game: add them from the sheet Boss pastes, using the unit conversion already in STATE.md (1 unit = 5 points, Time = 1 sol).
- Not used this weekend: M10, M11, M13, M16. Keep them in the data, switched off.
- **Goal track**, always visible as a thin strip: `Earth · Moon · Deep space · Mars · Olympus summit`, with the current position marked and the Mars Cargo meter beside it.

### B2 · Scoring: stars, cargo, ending (all numbers DRAFT)

**5 stars per chapter (30 total):**
1. Chapter finished
2. No gauge ever went critical (below 30)
3. All 3 mission objectives met
4. At least 2 bonus objectives met
5. Clean record: no rescue used in this chapter. Chapters 1 and 5 also need a Clean flight on the way in

**Mars Cargo (the rocket filling up):** after each Moon mission, +1 crate for each of the 3 gauges at 60 or above (max 36 over 12 missions). Show crates being loaded into the rocket on the Moon map. Chapter 4 always ends with launch, whatever the cargo is: never block progress. Cargo sets the starting gauges on Mars: 28+ → 85, 20–27 → 75, under 20 → 65.

**Ending: "First Light on Olympus"** (bookend with mission 1). The station's lights come on one by one at the summit, then a slow camera orbit.

| Total stars | Ending | What you see |
| --- | --- | --- |
| 24–30 | **Olympus Station** | Full base lit: habitat, panels, greenhouse, antenna |
| 15–23 | **Olympus Outpost** | Small base, some modules dark. "Try for more stars?" |
| 0–14 | **Olympus Beacon** | One relay light on the summit; crew returns to base camp. Big Try Again button and one tip |

Then a recap: stars, patches earned, crew status, and "Real NASA data that shaped your mission" (B8). Never a harsh fail screen.

### B3 · Ripple: every decision touches 10+ systems

The 12 tracked factors: solar, battery, oxygen, water, food, health, morale, radiation dose, spare parts, BOLT, sols (time), Mars Cargo.

**Knock-on rules**, checked after every choice and every sol (DRAFT, team to approve; pure TypeScript in `src/engine/`, with tests):

| When | Then (per sol) | Reason shown to the player |
| --- | --- | --- |
| Solar < 30 | Battery −5 | Panels are not refilling the batteries |
| Battery < 30 | Oxygen −3, Water −2 | Air and water machines need power |
| Water < 30 | Food −4 | Plants need water |
| Food < 30 | Health −3, Morale −3 | A hungry crew gets weak and unhappy |
| Oxygen < 30 | Health −5 | |
| Radiation dose > 60 | Health −3 | |
| Morale < 30 | Shown risks are 10% more likely | Tired crews make mistakes |
| Spare parts = 0 | No rescue available | Nothing left to fix it with |

**Ripple view** (after each choice, about 2 s, skippable): a small map of the 12 factors as nodes joined by lines. Direct effects flash first, knock-ons travel along the lines with a 0.3 s stagger, each node shows its +/− chip. End with one line that counts them: "That decision touched 11 systems." Reduced motion: show the final state with no travel. Lite mode: a plain list.

### B4 · Timers

- Mission mode: every card 20 s; storm cards (M8, M14, Mars storm cards) 10 s. Explorer mode: no timer. Timer end = the card's default choice, with the existing explanation.

### B5 · Flights

Keep the existing controls and Mission Control problems. Add:
- **Destination pin** on the target, an edge-of-screen arrow when it is off screen, and distance remaining.
- **Obstacles.** Flight 1: satellites and debris. Flight 2: asteroids from the NeoWs snapshot (B8): each rock carries its real name, its size scales with real diameter, its speed with real velocity; potentially hazardous ones get a warning marker (shape, not only colour).
- **Honest label** in the flight HUD: "Real near-Earth asteroids NASA tracked this week. Sizes and speeds are real. Positions are set by the game."
- **Crash** = short impact effect, then restart this flight from its start. Chapter progress is kept.
- **Safety 0–100:** starts at 50. Every obstacle passed cleanly +5, a graze −15, a crash restarts the flight. 80+ at landing = "Clean flight" (counts for star 5).
- **Landing animation**, 3 to 4 s, skippable: camera drops behind the rocket, engine flare, legs compress, dust ring, "TOUCHDOWN · [place name]" stamp with sound. Reduced motion: fade.
- "Time compressed" tag on the flight HUD. Real trip times: `TODO_VERIFY`.
- **Demo jump:** `Shift + D` opens a chapter and flight select with everything unlocked, for the pitch.

### B6 · Crew Mode (1 to 3 players, one screen)

- Start screen: Solo or Crew. Crew picks 2 or 3 roles: **Power Engineer** (Power gauge), **Life Support Officer** (Life Support gauge), **Flight Doctor** (Crew gauge).
- Voting keys for choices A/B/C/D: Player 1 `A S D F` · Player 2 `J K L ;` · Player 3 `← ↓ → ↑`. A small role badge lights up when that player has voted; the vote stays hidden until all have voted or the timer ends.
- Majority wins. A three-way split is decided by the officer whose gauge the card mainly affects. Nobody voted = default choice.
- Chapter end: one line per role about their own gauge ("Power ended at 64. Steady hands.").
- Fallback if voting is not finished by 11:15: "Officer on duty" rotates each card and that player decides alone. Solo play must keep working exactly as now.

### B7 · Fulfilment: the chapter-complete screen

In order, each with its own sound (Web Audio): stars stamp in one by one out of 5 → the chapter's **mission patch** (SVG, drawn in code, one per chapter, 6 to collect) spins in → crates fly into the rocket and the Mars Cargo meter rises → the goal track advances one step → rank update → one "Why?" science card unlocked. One button: Next chapter. Patches and cards live in the Mission Log.

### B8 · NASA data and what each one changes in the game

All new data is fetched by `npm run snapshot` into JSON files with a `fetchedAt` date and shown as "NASA data saved on [date]". Only DONKI is fetched live in the browser, as now.

| Source | Request | What it changes in the game | Priority |
| --- | --- | --- | --- |
| **DONKI** | Existing endpoints. **Fix:** on 30 Sep 2026 DONKI moved from `kauai.ccmc.gsfc.nasa.gov` to `ccmc.gsfc.nasa.gov`; paths after `/DONKI/` are unchanged. Update the fallback chain, retest FLR | Flare frequency in flights, storm severity in chapters 4 and 6. New: M8's briefing names the most recent real event and date from the data | Step 1 |
| **NeoWs** (NASA Open APIs) | `https://api.nasa.gov/neo/rest/v1/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&api_key=KEY` (7 days max). Use `name`, `estimated_diameter.meters`, `close_approach_data[0].relative_velocity.kilometers_per_second`, `is_potentially_hazardous_asteroid` | The asteroids in Flight 2: names, sizes, speeds, hazard markers | Step 3 |
| **Mars Trek** | Tiles: `https://trek.nasa.gov/tiles/Mars/EQ/Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{zoom}/{row}/{col}.jpg`. Layer list: <https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars> (look for the MOLA colour elevation layer) | The chapter 6 map is real Olympus Mons terrain. The three camp heights (from the teammate) raise the radiation tick as the crew climbs: higher camp = less air overhead. Height → tick formula is a DRAFT game rule | Step 2 (heights), Step 6 (tiles) |
| **RadLab** | Base `https://visualization.osdr.nasa.gov/radlab/api/`. Field `absorbed_dose_rate` in μGy/hour, `format=json`. Adapted from the docs example, test it: `?spacecraft=ISS&instrument=DosTel&timestamp>=2022-04-01T23:00&timestamp<2022-04-02T01:05&absorbed_dose_rate&format=json` | Average and peak of the real readings set the quiet-day and peak radiation ticks. M8's Why? card shows the real figure, labelled "measured on the ISS" | Step 6 |
| **OSDR** | `https://osdr.nasa.gov/osdr/data/search?term=bone` → `hits.total`, and per hit `_source["Study Title"]`, `_source["Accession"]` | M15 Crew Fitness: the science card shows how many NASA studies exist and names two, with links. Weakest fit of the five: it informs rather than changes play, so build it last and say so honestly | Step 6 |
| **APOD** | `https://api.nasa.gov/planetary/apod?api_key=KEY` | Reward postcard on the final ending only. Use it only if `media_type` is `image` **and there is no `copyright` field** (many APOD photos belong to photographers) | Step 6, last |
| **Mars Rover Photos** | — | **Do not use: NASA has archived this API.** | — |

### B9 · Assets and where they come from

| Asset | Source | Licence / credit | Notes |
| --- | --- | --- | --- |
| Moon, Mars, Earth, Jupiter maps | already in `src/assets/` | NASA, public domain | done |
| Asteroid model (Bennu) | <https://science.nasa.gov/resource/bennu-3d-model> | NASA | glTF under 1 MB. Reuse it for all rocks at different scales and rotations. Do **not** use the SVS Bennu models (60 MB and up) |
| Space station model | <https://nasa3d.arc.nasa.gov/detail/iss-6628> or <https://github.com/nasa/NASA-3D-Resources> | NASA, free to use | GLB about 0.3 MB. Flight 1 obstacle |
| Other planets, Sun, Saturn's ring | <https://www.solarsystemscope.com/textures/> | CC BY 4.0, credit "Solar System Scope" | Use the 2k files. Based on NASA data but not a NASA product: say so on the credits screen |
| Star background | <https://svs.gsfc.nasa.gov/4851> (Deep Star Maps 2020, 4k JPG) | NASA SVS | SVS timed out on this PC before. If it does again, use drei `<Stars>` |
| Photos for planet cards and science cards (asteroids, comets, satellites) | `https://images-api.nasa.gov/search?q=...&media_type=image` (no key) | NASA media guidelines: <https://www.nasa.gov/multimedia/guidelines/index.html> | No people in any photo. Check each image's credit line; skip anything not credited to NASA |
| Visual effects | drei, already installed: `Stars`, `Sparkles`, `Trail`, `Float`, `Html`, `useTexture` | — | No post-processing or bloom: the PC is short of memory |

Look to aim for: NASA's "Eyes on the Solar System" for the system view; real mission patches for the badges; SPEC Part 7 for everything else.

Planet cards: clicking any world without a base shows 2 sourced facts, one NASA photo, and the line "No crew has been here yet. Its secrets are still locked."

### B10 · Fact wording fixes (all 16 NASA links on the team sheet were opened on 14 Nov 2026 and are live)

Put the 16 URLs into `sources.json`. Twelve pages support their fact as written. Four need a wording change so the card matches its page:

| Card | Problem | Suggested wording (fact checker to confirm) |
| --- | --- | --- |
| M1 First Light | The page describes solar arrays plus radioisotope and fission power for the long lunar night. It does not mention batteries | "NASA's Moon base plans use solar arrays, plus other power sources for the long lunar night." |
| M5 Dust on the Panels | The dust shield was shown cleaning glass and radiator surfaces on the Moon; solar panels are named as a future use | "NASA tested a dust shield on the Moon that pushed dust off glass and radiator surfaces. Solar panels could use it next." |
| M12 Spacesuit Check | The page covers the cooling garment and the radio. It does not mention oxygen | Drop "oxygen" from this card, or add a second NASA page that covers it |
| M13 Small Impacts (not used) | The page says meteoroids strike the surface and that habitats and suits must withstand the environment | Soften "NASA studies these impacts to understand the risks" if the card is ever used |

Minor: M6's page talks about rough terrain; "dusty" is only implied.

Still `TODO_VERIFY`: Olympus Mons height (NASA pages give different figures depending on what it is measured from: use one page and its number), Olympus Mons coordinates, trip times, everything already listed in STATE.md.

Source for the Olympus story: NASA's article "50 Years Ago: Mariner 9 Enters Mars Orbit" (nasa.gov). Fact checker: find the page, add its URL to `sources.json`, and match the card wording to it.

