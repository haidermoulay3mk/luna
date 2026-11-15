# STATE: Luna (formerly OUTPOST)

Last updated: 2026-11-15 (Sun) 20:40. Read "## Session 3d" first (online party join fix), then "## Session 3c" (lag, camera, F2 demo jump, scrollbars), then "## Session 3b".

## Claude Code: start here
The repo now lives in the "Luna Hackathon" folder (git, branch `main`; tag `handoff-start` = the state the handoff arrived in;
the handoff zip contents are in `_handoff/`, ignored by git). Do these in order:
1. `npm install` (adds `peerjs`, dev `@react-three/test-renderer`), `npm test` (163 pass, includes headless 3D play-tests), `npm run build`, `npm run build:usb`, one at a time (low RAM PC).
2. Read "## Session 2 (15 Nov)", "## Skipped", "## Check with your eyes", "## Decisions for Boss to review".
3. Rules still apply: LUNA_BUILD A0 protocol, CLAUDE.md. The spec file is now `SPEC.md` (was README.md; README.md is the public GitHub page).
4. NASA key: only in `.env` as `NASA_API_KEY=`, read only by `scripts/snapshot.mjs`. Never `VITE_`, never in browser code.

## Session 3c (15 Nov, 09:20) Â· fixes from Boss's WhatsApp, done on another PC
- **Mission screen lag and jerking**: `.glass` no longer blurs the live 3D behind it (backdrop blur re-blurred the moving scene
  every frame). Now a dark see-through frame (`bg-space-900/90`).
- **Astronaut, hopper and rocket cameras**: follow at any frame rate (`1 - exp(-kÂ·dt)`), and the point the camera looks at now
  glides too instead of snapping, so turning and steering no longer jerk the view (Player.tsx, HopScene.tsx, FlightScene.tsx).
- **Demo jump popping up while moving**: it was Shift + D, and Shift (run) + D (right) is a movement combo. Now **F2**.
- **Scrollbars**: hidden until the mouse is over a box that scrolls, then a thin grey bar (end of index.css).
- **Astronaut walk animation**: the walk cycle was switched off when Windows has "Animation effects" off (reduced motion), so the
  astronaut slid in a stiff pose. The limbs now always animate with movement (Astronaut.tsx); only the idle breathing stays off.
- **Player moving by itself**: the camera swung round behind the astronaut automatically, and W A S D follow the camera, so the
  walk drifted. Auto-swing removed (drag or Q / R turns the camera). A mouse drag ending outside the window no longer sticks;
  held keys clear when the tab is hidden (Player.tsx).
- **Moon hopper is W A S D only**: W lifts off the pad, the hopper climbs to 20 m above the land by itself (CRUISE_AGL in
  HopScene.tsx), and over the beacon pad, once slower than 6 m/s, it sets itself down. Space / Shift still work. New test: a pilot
  using only W A S D lands two Moon hops (hopScene.test.tsx).
- **Loading trailer** (src/scene/Trailer.tsx + LoadingTrailer in LoadingScreen.tsx, 17 s, Skip / Enter): a live 3D cut-scene before Start: lift-off from the Moon (flame, soft dust, shake), cruise through debris (3 spark hits with a jolt), dodging asteroids, burn down onto Mars and touchdown (dust, shake). Different camera per shot; captions; "Loading" + "Made with real NASA data" + progress bar. No WebGL: the 2D version below for 4 s. SparkBurst got an optional soft (round puff) look.
- **Trailer fixes**: the rocket stands on its legs (lifted by its own solid height, measured once) on the Moon and on Mars; Mars sits straight ahead of the asteroid run; planets turned equator-up (no pinched pole, no white Mars ice cap under the pad).
- **More model detail** (code only): rocket (hull stringers, interstage ring, hatch frame, RCS blocks, docking probe, antenna, booster bands), space station (joint rings, truss bracing, radiators, docking port, dish), astronaut (helmet lamps, life-support hoses, backpack antenna), hopper (propellant tanks, RCS blocks, hatch ring, ladder).
- **Replay finished missions**: purple "↻ Replay" button next to each done mission on the map (Home.tsx); replays keep the best stars and never move the story back.
- **Fits any computer**: the three-column mission deck only from 1280 × 720 (useIsDesktop), narrower rails, and the whole UI scales down (root font 15/14/13 px) on smaller or shorter screens, so panels do not overlap or cover the 3D.
- **Decision feedback**: after a choice, a green glowing light + "Good call · objective on track" and a verified sound when the objective is still met (scoreMission), else an amber light + a warning tone. Hover sound on choices. New sfx: verified, warning, hover.
- **Trailer, round 2**: 28 asteroids scattered at random around the route (random size, speed, tumble; re-scattered when they pass), four pieces of debris that fly in from random directions and strike random spots on the hull (sparks + a big jolt), engine rumble shake the whole burn plus small camera roll.
- **Shinier, less plastic models**: the code-made SpaceReflections (from FlightScene) now also light the trailer, the walk world and the hopper, so metal, gold foil and visors reflect. Astronaut suit has a quilted fabric texture with seams (getSuitTexture) and a gold visor.
- **Moon and Mars ground**: sharper 512 px regolith tile (blotches, small craters with lit rims, pebbles with shadows), tiled every 9 m, stronger bump. Rocks: 4 different shapes, half buried, natural proportions, own vertex colours (they looked like stretched dough).
- **2D loading fallback** (LoadingScreen.tsx): "Loading" and "Made with real NASA data" over a rocket flying to Mars, drawn in CSS/SVG over NASA's Viking Mars map (no video file). Mission card scrollbar hidden (`no-scrollbar`). Map footer no longer says "Built with help from Claude" (the credits screen and Settings still acknowledge AI, NASA rule).
- **Space sky** (Sky.tsx): black space with a dim, soft Milky Way band (dark dust lane, warmer towards the core) and some orange stars. Code only. A brighter nebula was tried first and was too much.
- Verified: `npm test` 168 passing, `npm run build`, `npm run build:usb`, only DEMO_KEY in the builds. NOT seen on screen
  except the F2 demo jump and the astronaut mid-stride.

## Session 3b (15 Nov) Â· the glitch fix, 3D only, MIT licence
Boss played it: "keeps glitching ... can't move ... skips to the mission, turns black screen, and then goes back"; the
"The 3D view could not start ... RESTART 3D" bar kept showing; "I want the entire thing to stay in 3D. Don't give any options".
- **Root cause found**: `hasWebGL()` opened a new WebGL context on every call (every screen mount + every mission start) and never
  closed it. Browsers allow about 16 contexts and then kill the oldest, often the game's live 3D view: black screen -> rebuild ->
  after a few, the 2D fallback -> the walk/hop was skipped straight to the mission card -> "Restart 3D" -> back to 3D. Fixed: checked
  once, test context released (`webgl.test.ts` regression test).
- **3D only, no bar, no button**: the Lite/2D fallback and its notice are gone. A dropped context waits 2.5 s for the browser to
  restore it, else the view rebuilds (back-off 0.4 s doubling to 6 s; scenes remount on `useGfx.epoch`). Walks and flights are never
  skipped. Only a device with no WebGL at all gets the 2D base (never blank).
- **Stutter**: the terrain (about 90,000 points) was rebuilt on every 3D screen (about 1.3 s freeze); now built once per world with
  slopes from the height grid. Low-memory devices (navigator.deviceMemory 4 GB or less): 1024 shadow map, pixel ratio up to 1.25.
- UI motion: panels power on (staggered), corner brackets lock amber on hover, choices slide in with an amber edge, keys 1-4 press
  their buttons visibly; lighter, shorter screen wipe. VFX: boot dust when walking and on landing a jump (real gravity arcs).
- MIT `LICENSE` (Team Sol One, 2026), README Licence section, package.json `license`.
- Check with your eyes: walk for a minute, hop to a site, fly Flight 1: no black flashes, no bar, the astronaut and hopper respond.
  If a black flash still happens, open DevTools (F12) > Console and send the line that starts with "Luna:".

## Session 3 (15 Nov) Â· hop flights, VFX, fewer clicks
Boss's asks: "the flying simulator all across the missions, going from mission to mission, to find a location and avoid any obstacles";
button-press animation, more motion graphics and VFX, fewer buttons; "the entire game should be in 3D" (a 3D on/off option still showed);
better VFX across the Solar System, asteroids, satellites; "make sure the rocket is working".
- **Hop flights** (`src/engine/hop.ts` pure + tested; `src/scene/hop/HopScene.tsx`; `src/ui/screens/Hop.tsx`; screen `hop`):
  missions now happen at outposts (`src/scene/walk/sites.ts`): the base, plus 4 Moon field sites 480-620 m out (Rim solar array for solar
  cards 7 and 5, Ice crater drill site for 3 The Water Search, Rover breakdown site for 6, Relay mast for 9) and the Foot of Olympus Mons on
  Mars (camps). Chosen by each mission's first card focus (`outpostOfMission` in objective.ts), no new cards. When the next mission is at
  another outpost, `playMission` opens the hop: hold Space to lift off, W/S, A/D, Space/Shift; the hover assist holds height above the land
  (terrain radar looks 1.6 s ahead); tall rock spires along the route (many above the 55 m ceiling), base buildings and site structures
  are solid; a "Rock ahead" warning (beep, amber glow on that rock, which way to turn); grazes cost Safety like the big flights; a crash
  restarts 2 s back; land softly on the beacon pad (11 m zone). Result -> `finishHop` -> same FlightResult as flights (hits -> Power repairs,
  flare -> radiation). Real data in play: world gravity (hovering on Mars burns 2.3x the fuel, climbs slower; dust falls back under real g)
  and DONKI risk (chance of a flare warning: land within 30 s or the crew takes a dose). Story hops: 8 on the Moon, 1 on Mars.
- **Field sites in the walk world**: terrain flattened at each site (`heightAt`), Moon map now 1560 m (limit 700); each site has a pad and a
  building (`src/scene/walk/Outposts.tsx`: solar wings, drill rig, broken rover, lattice relay mast) + colliders; the parked hopper stands on
  the pad you arrived on. Retry / difficulty change restart in place (no second hop).
- **Headless play-tests (new)**: `@react-three/test-renderer` (free, MIT, dev only) runs the real 3D scenes frame by frame with no GPU.
  `hopScene.test.tsx` flies all 9 story hops with a simple pilot using only player controls: all land (482-995 m, 0-8 grazes, at most 1
  crash, 23-79% fuel left). `flightScene.test.tsx` flies Flight 1 and Flight 2: the rocket flies, plays the landing and lands (0 hits / 2
  restarts). `systemFx.test.tsx` runs the Solar System effects. This checks logic and that nothing crashes, NOT how it looks.
- **3D only**: a lost WebGL context or a scene crash now rebuilds the 3D by itself (`restart3D` in webgl.ts, scenes remount on `useGfx.epoch`);
  only after 4 failures in a minute does the 2D drawing appear, with "Restart 3D". That banner was the "option to remove 3D" Boss saw:
  his PC drops the 3D when memory runs out.
- **Motion and VFX**: every button press squashes and springs back with an amber ring + sparks at the pointer and a click (`MotionFx.tsx`,
  index.css); every screen change sweeps an amber scan line; amber buttons get a light sweep on hover. Solar System (`space/SystemFx.tsx`):
  churning corona + sunspots/granules, atmosphere rims on 7 planets, a 260-rock asteroid belt between Mars and Jupiter, glowing orbit trails
  behind each planet, a comet with a tail pointing away from the Sun, a pulsing ring on the selected planet. Flights: spark bursts on
  grazes/crashes (`space/Fx.tsx`), blinking red/green wing-tip lights on satellites, pulsing amber rings on NASA-hazardous asteroids.
  Hop: engine dust blown off the ground, touchdown dust ring, sparks, camera shake, speed motes, nav lights, glowing engine bell.
- **Fewer clicks**: story lines advance by themselves like radio calls (bar shows the time; Space/Next is faster; "Skip story" is now a small
  link); the Why? science shows inside the result card (no pop-up to close; seeing it unlocks the Science Card; W still opens it large).
- Verified: `npm test` 163 passing; `npm run build`; `npm run build:usb` (3.5 MB); only DEMO_KEY in the builds.
- NOT verified on screen: everything visual (no working browser 3D on this PC). See "Check with your eyes" 9-13.
- Game numbers I chose (DRAFT): hopper 30 m/s max, 12 m/s2 forward, climb 12 m/s, sink 5 m/s (slows near the ground), ceiling 55 m, soft
  landing up to 3.2 m/s, crash from 7 m/s down or 14 m/s into a rock, story-line time 3.4 s or 62 ms per letter.

## Session 2 (15 Nov) Â· what Boss asked for and what was built
Boss's asks this session: a player-controlled 3D astronaut (third person, keys); the Moon base redesigned from his reference photo and
standing on the Moon (not floating); missions done by walking to objectives, with pop-up decisions changing the side gauges; board the
rocket to travel; view past missions but not replay them; Mars: climb Olympus Mons with WASD and plant a flag at the top; better rocket
flame (his launch photo), 3D satellites and asteroids; online multiplayer from several devices with a create-party lobby (only the
line-up idea from his reference, his astronaut style); no auto-land, a smooth landing cut-scene; no option to turn 3D off;
"the entire thing 3D"; launch on GitHub later.
- **Walkable world** (`src/scene/walk/`): `terrain.ts` (heights: craters, hills, Olympus Mons with caldera), `layout.ts` (base layout,
  colliders, movement, real gravity), `Ground.tsx` (terrain mesh + boulders + Mars sky), `BaseModel.tsx` (hub + dome, 6 ribbed tunnels,
  geodesic greenhouse, hex modules, regolith shelter, garage + rover, solar field, antenna, landing pads, rocket on its pad; gauges still
  light it), `Astronaut.tsx`, `Player.tsx` (third-person controller + camera), `Olympus.tsx` (camps, flag, Olympus Station),
  `WalkScene.tsx` (canvas, Sun with one shadow map following the astronaut, objective beacon, launch cut-scene + smoke), `objective.ts`.
- **Flow**: a mission now starts with step `walk` (objective panel + beacon + `E`), then briefing â†’ card â†’ Ripple â†’ Why? as before.
  `launchToMars` â†’ screen `board` (walk to the rocket, launch cut-scene) â†’ flight. Chapter 6 complete â†’ "Climb to the summit" â†’ screen
  `summit` (plant the flag, station lights by tier) â†’ ending, drawn over the lit summit in 3D. Arrival from a flight puts you by the pad.
- **Flight**: autopilot button removed (only kept as "Continue to the base" when a device has no WebGL at all); landing is a 6.5 s eased
  cut-scene with an orbiting camera; new flame shader + nozzle glow; satellites are merged 3D buses (foil, dish, boom, textured wings);
  asteroids are cratered multi-scale noise rock with dark crevices; earthshine fill light.
- **No 3D switch**: Settings no longer has Lite mode; slow frame rate lowers the pixel ratio instead; old saved "lite" is ignored.
  The automatic 2D fallback remains only for "WebGL cannot start / crashed" (otherwise the screen would be blank).
- **No replays**: `playMission` only starts the next story mission; the map shows finished missions as âœ“ + stars; no "Play again".
- **Crew mode online** (`src/net/`): `crew.ts` (roles, votes, tie-break, codes, tested), `party.ts` (PeerJS: create/join by 5-letter code,
  roster, host-run game snapshots, guests forward button presses, crew votes, positions 10/s), `CrewInScene.tsx` (friends' astronauts with
  name tags). Lobby `src/ui/screens/Party.tsx` (line-up in front of the base, name/role/READY tags, code, Ready/Start). Store gate:
  `setActionGate`/`ungated` in `gameStore.ts` (solo: no gate, nothing changes).
- Verified: `npm test` 140 passing (18 new: walk.test.ts, crew.test.ts), `npm run build`, `npm run build:usb` (3.5 MB). Key check: no
  `.env` on this PC; only `DEMO_KEY` in dist/ and dist-usb/.
- **NOT verified in a browser**: the headless browser crashed on the 3D page again (0.7 GB free RAM). Nothing new has been seen on screen.
  Online party is untested between two real devices.
- Numbers I chose (game numbers, DRAFT): walk 3.4 m/s, run 6.5 m/s, jump take-off 2.4 m/s; base ring 22 m; Olympus Mons in-game 250 m
  radius, 88 m tall (NOT to scale); landing cut-scene 6.5 s + 2.4 s; launch cut-scene 7 s; party positions 10/s, max 4 players.
- New TODO_VERIFY: Moon gravity 1.62 m/sÂ², Mars 3.71 m/sÂ² (used for jumps: add the NASA fact-sheet link to sources.json).

### How much of the NASA data is used (audit, 15 Nov)
- Drives gameplay: DONKI (flare frequency in flights; radiation/power stress on storm missions 8, 14, 108, 114; Mission 8 briefing names
  the latest event), NeoWs (42 real asteroids in Flight 2: name, size, speed, hazard marker), team NASA sources (every card's numbers and
  Why? card), real gravity (new: jump height and hang time; TODO_VERIFY source).
- Decoration only: planet surface images (Moon LRO, Mars Viking, Earth, Jupiter) on the maps and flights.
- Not used yet (LUNA_BUILD Phase 7): Mars Trek tiles/heights (camp heights still `null`), RadLab, OSDR, APOD.
- Honest pitch line: "Three live or saved NASA datasets change what happens: space weather, real asteroids, and real gravity."
## Where we are
- **All 7 README phases are built.** Plus Boss's extras: Luna rename, Solar System home, Moon + Mars campaigns, rocket flight with
  Mission Control problems, compact HUD, 20 s timer, Why? pop-up.
- Verified: `npm test` (69 passing: engine, content checks for every Moon/Mars card, flight + problems, two-world stories,
  space weather rules, UI playthrough of the whole Moon story with flights and Why? pop-ups, reopen, Mars unlock),
  `npm run build`, `npm run build:usb` (single file, about 3 MB with the NASA maps inside).
- **NOT verified in a real browser.** The PC had 0.2â€“1 GB free RAM and the headless browser crashes on WebGL. The Solar System,
  maps, flight and HUD have never been seen on screen. **Boss must play it and report.** TESTING.md lists every "Needs a person" check.
- Submission package: `../TeamSolOne_Luna/` (1_PLAY_THE_GAME.html, 3_About_our_project.txt, 4_Source_code.zip). Not deployed online yet
  (no GitHub remote or login on this PC): Boss's steps are in the last reply.

## Game structure now
- Screens: welcome â†’ tutorial â†’ **system** (Solar System) â‡„ **home** (map of the current world) â†’ flight â†’ play â†’ ending; credits.
- Worlds: `moon` (README Tier 1 story, 6 missions Ã— 2 cards) and `mars` (the team's original Mars sheet, missions 101â€“114, 1 card each;
  opens after the Moon story). Per-world story/base/ending/location in `Progress.worlds` (Moon keeps the old top-level fields).
- Maps: NASA images in `src/assets/` (Moon LRO, Mars Viking, Earth Blue Marble, Jupiter Cassini); other planets drawn in code.
- Flight: Space/Shift rise/sink (fixed "can't move up"), â†‘/â†“ tilt, A/D turn, W/S engine. Mission Control problems every 10â€“15 s
  (`src/engine/flightProblems.ts`, DRAFT text): rocks, solar flare (land/dock in 25 s or Radiation +5), fuel leak, overheating,
  stuck thruster, status check; each names a real astronaut skill. Gateway docking only on the Moon (Mars has no station).
- Space weather (`src/store/spaceWeather.ts`): DONKI live â†’ CCMC â†’ saved â†’ archived snapshot (`npm run snapshot`).
  Risk drives flare frequency in flights and extra radiation/power stress on storm missions (8, 14, 108, 114).
  On 14 Nov NASA's FLR (flare) endpoint returned 404; snapshot has 88 CMEs, 0 SEP â†’ MODERATE.
- Sound: Web Audio only (`src/ui/sound.ts`), off by default, mute always visible. Lite mode: Settings or auto under 30 fps.
- "Educational simulation" disclaimer removed (Boss, 14 Nov).

## How the team's units became game numbers (DRAFT, team to check)
- 1 unit = 5 points. "Power" = the Power gauge, "Water" = Water, "Supplies" = Supplies, "Backup Power" = Battery reserve, "Time" = 1 more sol.
- M1 and M2 give only directions ("crew drops"), so I picked sizes (10â€“15). Cold â†’ Health, a message home â†’ Morale.
- Effects with no number, all mine: food +20 / +10 next sol (M4), panels +15 / +25 next sol (M5: "cleaner" vs "cleaned"),
  radiation âˆ’20 / âˆ’10 âˆ’10 / âˆ’10 (M8, every choice includes the shelter the crew moves into anyway), Life Support +15 (M14 A and B), Morale +15 (M14 C, M1 C).
- "Research stops" = Morale âˆ’10 (M14 A) / âˆ’5 (M8 C, shown on the card).
- Objectives / bonus: M1 Power>40 / >60 Â· M2 Life>50 / Power>50 Â· M4 Life>40 / Food>80 and Power>50 Â· M5 Power>40 / >50 Â· M8 Crew>50 / radiation dose<20 Â· M14 Life>30 / Crew>50.
- Speaker lines on the cards are from the first sheet (they fit the Moon). Event title for M14 stays "Final Emergency Decision" (title rule: 2â€“4 words).
- Days 1, 2, 7, 12, 15, 15 kept from the first sheet (the checked one has none).
- Only Mission 14 has the timer (checked sheet). README also marked 5 and 8 urgent: one field each to change.

## TODO_VERIFY
- **6 new Moon cards written by Claude** (`draft: true` in events.json: m1e2, m2e2, m4e2, m5e2, m8e2, m14e2). Team must check the text and numbers.
  Their Why? facts: m1e2, m4e2, m8e2, m14e2 come from README Part 18 notes (TODO_VERIFY); m2e2 and m5e2 reuse the team's sourced facts.
- `planets.json` facts (Apollo landings, Artemis, rovers, why no crew on other planets) and orbit periods: all TODO_VERIFY.
  Suggested source: NASA Planetary Fact Sheet + NASA Solar System pages.
- Mars radius 3389.5 km (used for flight altitude on Mars): TODO_VERIFY. Mars places' coordinates: TODO_VERIFY.
- Flight problem texts (`flightProblems.ts`): DRAFT, describe crew skills, no NASA numbers.
- `places.json`: every coordinate (Shackleton rim, Apollo 11/17 sites, Tycho, Copernicus) and the Gateway description.
- `nasa-gateway` source has no URL. `nasa-cgi-moon-kit` URL comes from the Commons file page.
- `sources.json`: **no URLs** for any team source (InSight Mission, Life-Support Systems, Growing Plants in Space, Lunar dust, Solar storms and shelters,
  Solar storms and electronics). The game shows "(link to be added)". The sheet cites "NASA" / "NASA Science+1", which looks copied from an AI chat's citation chip: need the real NASA page links.
- Mission 1 Why? is still the first sheet's Mars fact (InSight). The checked sheet says "Science to research: How solar panels and batteries work on Mars" and gives no fact.
- Mission 2 Why? is the first sheet's ISS fact (matches "How astronauts get oxygen and remove carbon dioxide").

## Open questions for the team
- Should a single part at 0 (e.g. Oxygen) also trigger a rescue? Now only a whole gauge at 0 does.
- Mission 5 B "cleaned if outside conditions are safe": could link to Live Space Weather in Phase 4.
- M5 C (wait) is weaker than A on purpose? It costs a sol and keeps the dust.

## Engine decisions (ours)
- Gauge = average of its parts; radiation is a dose. Rescue at 0 â†’ 30, costs 1 spare part + 10 BOLT; 2/1/0 per mission. Stars: objective / never critical / bonus.
- Endings: 0.6 Ã— average final gauge + 0.4 Ã— star share; â‰¥70 and all good â†’ Complete; â‰¥50 â†’ Bumpy; crew not critical â†’ Close Call; else Paused.

## Gotchas
- Windows file names ignore case: never have `Foo.tsx` next to `foo.ts` (that is why the terrain mesh file is `Ground.tsx`).
- The gstack browse daemon restarts between shell calls here: run multi-step checks with `browse chain`. The 3D pages crash it on this PC.
- NASA SVS and CCMC (kauai) time out from this PC; NASA images came via Wikimedia Commons. DEMO_KEY allows only ~10 DONKI calls an hour: use a free key in .env.
- Folder path contains `&`: npm scripts call `node node_modules/...` directly.
- React 18 â†’ @react-three/fiber 8 + drei 9 (OrbitControls, Html, Environment, Lightformer). "THREE.Clock deprecated" warning comes from fiber 8: harmless.
- gstack `browse` on this PC: daemon restarts between shell calls, and the page crashes on the 3D scene when RAM is low. Use the jsdom flow test for logic; check visuals by hand.
- A GateGuard hook asks for a facts statement before each first create/edit of a file.
- Master Fable kit is not at `Desktop\Claude\Projects\Master Fable\` (folder missing).

## Luna build log
(LUNA_BUILD.md run, started Sat 14 Nov 2026 evening. Safety tag before any change: `before-luna-build`.)

### Phase 0 Â· Safety net (done)
- See it: `npm run dev` â†’ http://localhost:5173, press **Shift + D** anywhere except during a flight. Settings â†’ Lite mode still works by hand.
- 3D failure (WebGL can't start, a 3D crash, or the graphics context is lost) now switches to Lite mode by itself and shows
  "The 3D view could not run here". A crash anywhere else shows "This screen hit a problem" with a way back. Screens that
  need a commander or an ending fall back to the name screen / the map instead of drawing nothing.
- DONKI: browser now tries `ccmc.gsfc.nasa.gov/DONKI/WS/get` (keyless) â†’ `api.nasa.gov` with DEMO_KEY â†’ saved â†’ snapshot.
  The browser no longer reads any key. `NASA_API_KEY` (in `.env`) is read only by `scripts/snapshot.mjs`.
- Snapshot rerun 14 Nov 2026: CCMC host timed out from this PC; api.nasa.gov gave 89 CMEs, 0 SEP; FLR still HTTP 404 â†’ "flares missing".
- Numbers I chose: none.
- New TODO_VERIFY: none.

### Phase 1 Â· Flight Deck foundation (done)
- See it: `npm run dev` â†’ http://localhost:5173. Every screen keeps its layout but now has the near-black Flight Deck look:
  slim panels with corner brackets, 10 px corners, mono uppercase labels, mono numbers, amber (sun) as the one accent.
- New: tokens in `tailwind.config.ts` (space 950/900/800, line, ink, radius 10/8), fonts Michroma + JetBrains Mono (@fontsource,
  latin only), and `src/ui/components/deck/`: Frame, Readout (counts in 300 ms), GaugeTile (ticks every 10, notch at 30, 8-value
  sparkline), Callout, Timeline, PrimaryButton, DataTag ("NASA DONKI Â· SAVED 14 NOV"; LIVE only when live).
- Restyled: shared classes in index.css, Gauge, ChoiceButton ([1] key hints), TimerRing/TimerBar, StatusPanel, SpaceWeatherChip
  (now shows a DataTag), EventCard (glass frame, no blur in Lite mode), Dialog. CLAUDE.md rule 9 and README Part 7 updated (A2.1).
- Numbers I chose: brackets sit 4 px outside the corners; the timer bar is white, then amber at half time, then red for the last 5 s.
- New TODO_VERIFY: none.

### Phase 2 Â· Chapters and the end goal (done)
- See it: `npm run dev` â†’ http://localhost:5173. Every mission card now says "Chapter 01 Â· First Light Â· 1 of 3". The goal strip
  (Earth Â· Moon Â· Deep space Â· Mars Â· Olympus summit + Mars Cargo) sits on the Solar System, map and mission screens.
  Shift + D â†’ pick any chapter. After the last Mars mission: "See your ending" â†’ Olympus Station / Outpost / Beacon.
- 6 chapters Ã— 3 missions (`src/data/chapters.json`, rules in `src/engine/chapters.ts`): 5 stars per chapter (30 total), Mars Cargo
  (+1 crate per gauge at 60+ after each Moon mission, max 36; sets Mars start gauges 85 / 75 / 65), the three-tier Olympus ending with a recap.
  Chapter 4 always ends with "Launch to Mars". Every card has a timer (20 s Mission, 15 s Commander, storm cards 10 s, Explorer none).
- Added the team's M3, M6, M7, M9, M12, M15 (in chapters) and M10, M11, M13, M16 (in the data, switched off). The 6 draft cards are out.
- B10: 16 NASA links in sources.json; M1, M5, M12 reworded; M13 softened. Mission 8's briefing names the latest real DONKI event and date.
- Flights now only happen when arriving from space (Gateway â†’ Moon base, Mars orbit â†’ Mars base). The rover drives up the camps.
- Numbers I chose (all DRAFT, team to check):
  - New missions' days: M7 day 3, M3 day 5, M15 day 9, M6 day 13, M12 day 14, M9 day 15 (M9 passes 0 sols, like M8).
  - New objectives / bonus: M7 Power>40 / Solar>60 Â· M3 Life>40 / Water>60 Â· M15 Crew>50 / Health>70 Â· M6 Power>40 / 2+ Supplies Â·
    M12 Crew>40 / Health>60 Â· M9 Crew>40 / Morale>60. (Off: M10 Power>40/Morale>60, M11 Crew>40/Morale>60, M13 Power>40/2+ Supplies, M16 Crew>40/Morale>70.)
  - Effects the sheet gives no number for: M3 Water +20 / +15 / +5 Â· M6 Morale +15 / +10 / +15 Â· M7 Solar +20 / +15, C = Power âˆ’10 next sol Â·
    M9 Morale +15 / +5 / +10 Â· M12 Health +15 / +10 / +10 Â· M15 Health +20 / +10, C Morale +10. "1 Crew point" = Crew âˆ’5.
  - When time runs out: the card's own default, else choice A (the team's M14 rule). Message: "Time ran out, so the crew followed the standard plan."
  - Camp radiation (DRAFT rule): +2 / +4 / +6 dose per sol at Foot / Halfway / Rim until the heights arrive, then 2 + 0.2 Ã— height in km.
  - Clean flight until Phase 3 adds Safety: flown by hand with no rock hit.
- New TODO_VERIFY: camp heights (Mars Trek, from the teammate â†’ `heightKm` in places.json); coordinates of ASTER-9 and the three camps
  (game places on the west flank, based on the Olympus Mons pin, itself TODO_VERIFY); Mariner 9 article URL (`nasa-mariner9-50-years`).

### Phase 3 Â· Flights (done)
- See it: `npm run dev` â†’ http://localhost:5173 â†’ Shift + D â†’ "Flight 1 Â· to the Moon" or "Flight 2 Â· to Mars".
- Both flights now start out in deep space and end at the base: Flight 1 dodges satellites and debris, Flight 2 dodges real
  near-Earth asteroids from NASA NeoWs (42 saved on 14 Nov: name, size and speed from the data, a warning triangle on the 5 potentially
  hazardous ones, labels next to the nearest rocks). Honest label bottom right: "Real near-Earth asteroids NASA tracked 8 NOV to 14 NOV.
  Sizes and speeds are real. Positions are set by the game." + DataTag "NASA NeoWs Â· saved 14 NOV".
- Safety ring (top right): starts at 50, +5 per obstacle passed cleanly, âˆ’15 per graze; a fast hit is a crash that restarts this flight
  only (chapter kept). 80+ at landing = Clean flight (star 5 of chapters 1 and 5). Destination pin in amber, edge arrow, distance remaining,
  flight timeline (Launch Â· Cruise Â· Approach Â· Landing), "Time compressed" tag, Mission Control in a glass frame.
- Touchdown (about 3.5 s, skippable with the Skip button or Enter): camera drops in behind, engine flare, legs settle, dust ring,
  "TOUCHDOWN Â· [place]" stamp with sound. Reduced motion: no camera move, the stamp fades in.
- `npm run snapshot` now also saves `src/data/neows.snapshot.json` (NeoWs feed, 7 days, NASA_API_KEY or DEMO_KEY).
- Numbers I chose (DRAFT): crash = touching faster than 7 units/s (slower is a graze); "passed" = goes behind you within 14 units sideways;
  rock size 0.8 + 0.9 Ã— log10(diameter / 10 m), 0.8â€“4.2 units; drift 0.18 units/s per km/s, 0.5â€“5.5; Flight 1 starts 150 up and
  360 to the side of the base, Flight 2 220 up and 620 to the side (about 40 s and 60 s of flying); fuel use lowered from 1.6 to 1.0 %/s
  at full thrust so the longer flights don't run dry; obstacles: Flight 1 = 9 satellites + 16 debris, Flight 2 = 27 rocks (fewer on phones).
- New TODO_VERIFY: real trip times Earth â†’ Moon and Moon â†’ Mars (the HUD only says "Time compressed").

### Phase 4 Â· Ripple and rewards (done)
- See it: `npm run dev` â†’ http://localhost:5173, play any mission card: after the choice the Ripple map shows for about 2 s
  (Enter or Skip to go on), then Why?. Finish a chapter's third mission â†’ "Chapter complete".
- Ripple (B3, `src/engine/ripple.ts`): 12 tracked factors; the six knock-on rules run once per sol after the daily use
  (Solar<30 â†’ Battery âˆ’5 Â· Battery<30 â†’ Oxygen âˆ’3, Water âˆ’2 Â· Water<30 â†’ Food âˆ’4 Â· Food<30 â†’ Health âˆ’3, Morale âˆ’3 Â· Oxygen<30 â†’
  Health âˆ’5 Â· Dose>60 â†’ Health âˆ’3), Morale<30 makes shown risks 10% more likely, Spare parts 0 = no rescue. The view compares the base
  before the choice with the end of the sols it leads to: direct effects flash first, knock-ons light up 0.3 s apart, each with a â–²/â–¼ chip,
  then "That decision touched N systems." Reduced motion: final state. Lite mode: a plain list.
- Chapter complete (B7): stars stamp in (out of 5) â†’ the chapter's mission patch spins in â†’ crates drop into the rocket and the cargo meter
  rises â†’ the chapter track moves one step â†’ rank (with "Promoted") â†’ the chapter's science card; each step has its own Web Audio sound;
  Skip; one button (Next chapter / Launch to Mars / See your ending). Six patches drawn in code. "Mission log" button (map and Solar System
  screens) shows the patches and every unlocked science card.
- Numbers I chose (DRAFT): Explorer has no knock-ons, Commander's are 1.5Ã— (README 4.4 "Cascades: off / some / more"); the Ripple view
  stays 2.4 s plus 0.15 s per knock-on; after a paused story mission the supply lander tops every part up to 45, spare parts to 1, BOLT to 50
  (so a carried-over base can never trap a player in "Try again").
- Balance check (simulated whole games): Mission difficulty â‰ˆ 1 pause per game, about 18 of 30 stars (Olympus Outpost); always A or
  always C also ends at Outpost; Explorer reaches Station; Commander â‰ˆ 2â€“4 pauses, Outpost or Beacon.
- New TODO_VERIFY: none (all Phase 4 numbers are game rules, not NASA facts).

### Phase 5 Â· Screen layouts (part done)
- Done: `src/scene/space/Planet.tsx` (A2.4: one Planet for Earth/Moon/Mars, roughness 1, one Sun light + ambient 0.05, thin atmosphere
  rim for Earth and Mars, 0.02 rad/s spin, still with reduced motion). Welcome is the hero screen (`src/scene/HeroScene.tsx`: the Moon
  cropped on the right, LUNA in Michroma, the goal line, "Begin mission", goal track and DONKI tag at the bottom; Lite = CSS circle).
- Done: Play screen (A2.5). Under 1024 px it is the old stacked layout. From 1024 px it is a 280 px | card | 300 px deck: left = the 3
  gauge tiles with sparklines and parts, a Systems frame that lights up the factors the Ripple touched, the mission track; right =
  objectives, the card timer ring (`src/store/cardTimer.ts` shares the card's countdown), Sol/Day/BOLT readouts, space weather, Mars cargo.
- Not done: Home (map) layout with Callouts, System layout with orbit rings and planet cards, Ending layout with patch and module
  Callouts. Those screens still work, in their Phase 1â€“4 look.
- Verified: `npm test` 122 passing, `npm run build`, `npm run build:usb` (dist-usb/index.html, 3.27 MB). Key check: only DEMO_KEY in dist/ and dist-usb/.

- Play-test fixes (first look in a browser): the title screen's 3D canvas pushed the name form off the screen (the canvas now sits
  behind in an absolute layer, and the column scrolls on short windows); the difficulty notes now say every card is timed.
- Seen but not fixed: the "3D was running slowly" Lite notice sits over the top bar on the Play screen; the left gauge column
  scrolls at 768 px height.
## Skipped
- **Phase 5 rest, Home and System layouts** (Callouts down the right, orbit-ring callouts): not done. Boss's walkable 3D world came first;
  these screens still work in their Phase 1â€“4 look. The Ending is now 3D (lit summit behind the recap) instead of the A2.5 layout.
- **Phase 6, same-screen key voting** (P1 `A S D F`, P2 `J K L ;`, P3 arrows): not done. Boss asked for online multiplayer from several
  devices, so Crew Mode is online (votes, roles, tie-break all built and tested). The vote rules in `src/net/crew.ts` can drive key voting later.
- **Phase 7 Extras** (Mars Trek tiles, RadLab, OSDR, APOD, more planet textures): not started. Each needs a new `npm run snapshot` fetch
  and a real NASA endpoint check from a PC with good internet.
- **Phase 8 Ship, part**: done: tests, both builds, key check, CREDITS.md (PeerJS, Michroma, JetBrains Mono), credits screen,
  package.json description (ages 10 to 14), public README.md for GitHub. Not done: `../TeamSolOne_Luna/` does not exist on this PC (refresh
  it on the PC that has it, or copy `dist-usb/index.html`); sources.json still lacks the gravity source; the full TODO_VERIFY list below.
- **Browser play-test**: tried once with the headless browser; the page crashed as soon as WebGL started (low RAM). Stopped per Boss's rule.
- **LICENSE**: MIT (Team Sol One, 2026), added 15 Nov at Boss's request. README has a Licence section.

## Check with your eyes
1. Start a mission: your astronaut stands outside the hub's airlock on grey ground that runs to the horizon (craters, boulders, hills,
   Earth low in the sky, long shadows). Nothing floats. W A S D walk, Shift run, Space jump (slow floaty Moon jump), drag to look.
2. The base vs Boss's photo: dark-dome hub, six ribbed tunnels, glass geodesic greenhouse, hex modules with round roof hatches,
   regolith mound, garage + rover, solar field, two round pads, rocket on the right pad. Is anything clipping, floating or too dark?
3. The amber beacon and the top "Objective" panel point the right way; at the site "E Start mission" appears; the card opens; the left
   gauges change after the choice.
4. The astronaut: white suit, dark gold visor facing FORWARD, backpack, chest connectors, hoses, arms and legs swing when walking.
5. Shift+D â†’ "Flight 1": satellites look 3D (gold body, dish, blue wings), the flame looks like the launch photo, no Autopilot button,
   the landing cut-scene is smooth (camera swings round, rocket turns upright, dust ring). Flight 2: asteroids look rocky and cratered.
6. Shift+D â†’ last Moon mission â†’ finish â†’ "Launch to Mars": walk to the rocket, E, launch with smoke.
7. Shift+D â†’ a chapter 6 mission: Olympus Mons slope, camps, then "Climb to the summit", plant the flag, station lights.
9. Finish Mission 2, press "Next mission": the hop screen opens on the base pad. Hold Space: the hopper lifts off with flame and dust.
   Fly to the Rim solar array: the arrow and "Turn left/right" point at the beacon; rock spires stand along the way, the one ahead glows
   amber with a beeping "Rock ahead"; touching one gives sparks + shake; landing on the pad shows TOUCHDOWN, then you walk to the panels.
10. The field sites: solar wings, drill rig with a frosty disc and a work light, the tilted rover with a wheel off, the red-lit relay mast.
11. Solar System screen: corona flickering round the Sun, sunspots, blue rim on Earth, the asteroid belt turning, cyan trails behind
    planets, a comet with a tail sweeping past, an amber ring round the selected planet. Too busy or just right?
12. Click any button: it squashes, an amber ring + sparks fly out, a soft click. Change screen: the amber line sweeps down.
13. Flight 2: amber rings round hazardous asteroids; Flight 1: satellites' red/green lights blink; sparks on a graze.
14. Crew mode on TWO devices with internet: Create a party on one, Join with the code on the other; line-up tags, Ready, Start; both
   astronauts visible to each other; both vote on a card (dots in the bottom bar); the majority choice is applied on both.

## Decisions for Boss to review
- Demo jump plays as a separate commander called "Demo", so a real save is never changed. After a demo, the game reopens as Demo:
  use "Switch commander" on the Solar System screen to go back to your own name.
- Demo jump is off during a flight, because Shift and D also steer the rocket. Use the flight's Autopilot button there.
- No `.env` file was found in the project folder, so the snapshot used NASA's DEMO_KEY. If you add `.env` with `NASA_API_KEY=â€¦`, run `npm run snapshot` again.
- A 3D crash turns on Lite mode for this visit only (next visit tries 3D again). "Too slow" Lite mode is remembered, as before.
- **Mars grouping (B1):** the data has only 6 Mars cards (101, 102, 104, 105, 108, 114), not 14, so each Mars mission is one card:
  Chapter 5 Red Landing = 101 First Light, 102 Breathing Room, 104 The Green Room. Chapter 6 The Climb = 105 Dust on the Panels (Foot Camp),
  108 Radiation Shelter (Halfway Camp, radiation rises with height), 114 Blackout (Crater Rim). Send more Mars cards to make 2â€“3 per mission.
- All 12 Moon missions happen at Moonbase Horizon (the Green Room and Solar Farm outposts are gone), so there are exactly two flights:
  into chapter 1 and into chapter 5. ASTER-9 moved to the plains west of Olympus Mons, so the climb starts nearby.
- New cards: the crew line is the team's "Problem" sentence, the result is the team's "Effect" sentence. Speakers: M3 Luna, M6/M7/M9 Rex, M12/M15 Dr. Nova.
- M12 choice B now says "the suit's supplies are restored" (B10: drop "oxygen" from this card).
- Olympus Outpost / Beacon "Try again" replays chapter 6 with a fresh base (gauges 70â€“85). "Play Mars again" restarts chapters 5â€“6.
- Older saves: the next Moon mission is found again by its id in the new order; old endings become the nearest Olympus ending.
- Tests changed because the spec changed the story (not removed): the old "1 â†’ 2 â†’ 4 â†’ 5 â†’ 8 â†’ 14 path", "two problems per mission",
  "four endings from the Moon story" and "urgent card only" tests now check the six chapters, one team card per mission, the Olympus
  ending and timers on every card. The UI playthrough now plays all 18 missions to the Olympus ending.
- **No 3D model downloads (B9 Bennu, ISS):** I built the rocks in code (3 lumpy variants) and the satellites from boxes instead of trying
  the downloads. Reasons: I can't see the browser to check a model's size and direction, glTF models need a loader that may fetch a
  decoder from the internet (that would break the USB file), and this PC is short of memory. The spec's own fallback, so nothing is lost.
- Skip key for the touchdown is Enter (Space is "rise" in flight).
- **Ripple count is honest**, not padded: a decision that passes a sol usually touches 9â€“12 systems; one with no sol passing (Missions 8
  and 9 pass none unless a choice costs Time) touches only 2â€“4. Pitch line suggestion: "Most decisions touch about ten systems, and you
  can watch them light up."
- **Mars Cargo is hard to fill** on Mission difficulty: a typical game loads about 10 crates (Mars starts at 65). 28+ (start at 85)
  needs every gauge kept at 60+. If that feels too harsh, lower the bands in `CARGO_START` (balance.ts).
- New "supply lander" rule after a paused story mission (see Phase 4 numbers) so nobody can get stuck.
- **(Session 3) Missions moved to field sites** (replaces the session-2 "one base" note): the solar, antenna, rover and water cards
  happen at four new game-made outposts reached by hopper; the rest stay at the base. Team: check the site names fit the stories
  (the cards themselves are unchanged). The outposts are game places, not real lunar sites; places.json still lists Horizon for all.
- **(Session 3) The hopper is a game vehicle** (no real NASA hopper is named or claimed). Its numbers are tuning, not facts.
- **(Session 3) Why? no longer pops up**: it shows in the result card (Boss: fewer buttons). SPEC 4.6 says it pops up; team to confirm.
- **(Session 3) Story lines auto-advance** (3.4 s minimum). Slow readers can still read: the bar shows time left. Team: too fast?
- **(Session 2) Astronaut has no NASA logo or flag** (CLAUDE.md bans real logos; NASA insignia rules). Role stripe colours identify players.
  The mission flag at the summit is a Luna flag (amber, crescent), not a national flag.
- **(Session 2) Online party uses PeerJS's free public server** to connect browsers (needs internet; some school networks block
  WebRTC). No account, no chat, only typed names shared. The host's game is the real one; guests vote and can press "Next"/start missions.
  Guests' devices keep a copy of the host's progress in local storage (harmless, but it shows the host's name under "Welcome back").
- **(Session 2) Mesh budget**: the walkable world uses more than the old 60-mesh rule (about 100 draw calls with the rocket and
  astronaut) and one 2048 shadow map on desktop. Phones get no shadows and fewer boulders. If a PC is slow, the pixel ratio drops.
- **(Session 2) Spec renamed** to `SPEC.md`; comments that said "README Part N" now say "SPEC Part N".
