# Luna (formerly OUTPOST: 10 Seconds to Decide)

### A Junior Astronaut Mission Trainer · NASA Space Apps 2026 · Team Sol One · Sakhir, Bahrain

> **Boss, read Part 0 only.** Everything after it is the build spec for Claude Code.
> Put this file and `CLAUDE.md` in an empty folder, open Claude Code there, and follow the prompts in Part 0.

---

## PART 0 · How to use this tomorrow (for Boss)

### Before you start (Friday night)

1. Send this README to the team (they read Parts 5, 17 and 18).
2. Get a free NASA API key at <https://api.nasa.gov> (it arrives by email instantly).
3. Check `node -v` shows v18+, Claude Code is logged in, and you have a free GitHub account (for putting the game online on Sunday).
4. Make a folder called `outpost`, put `README.md` and `CLAUDE.md` inside. Never upload or paste them into Claude Code; it reads them from the folder.
5. Charge laptop. Pack charger, extension lead, 2 USB drives.

### The 7 prompts (copy-paste into Claude Code, one at a time)

Wait until each phase works in the browser before sending the next prompt.

| # | When                   | Paste this into Claude Code                                                                                                                                               | Done when                                                         |
| - | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1 | Sat 11:00              | `Read README.md fully. Do Phase 1: project setup, design system, game engine with fake data. Show me how to run it.`                                                      | You can click through one event card in the browser               |
| 2 | Sat 12:00              | `Do Phase 2: the 3D Moonbase scene and the dashboard layout from Part 6 and 7.`                                                                                           | You see the 3D base with gauges around it                         |
| 3 | Sat 14:00              | `Do Phase 3: load missions.json and events.json and make Tier 1 story mode playable start to finish. Here is the content from the team: [paste Member 3's mission sheet]` | You can play 6 missions and reach an ending                       |
| 4 | Sat 16:00              | `Do Phase 4: Live Space Weather with DONKI, the fallback chain, and the offline snapshot script. My API key is in .env.`                                                  | The badge shows a real risk level, and still works with Wi-Fi off |
| 5 | Sat evening / Sun 9:00 | `Do Phase 5: juice and polish from Part 8. Then sound. Respect reduced motion.`                                                                                           | The game feels satisfying                                         |
| 6 | Sun 10:30              | `Do Phase 6: run the full testing checklist in Part 13 and fix everything that fails.`                                                                                    | Every box is ticked                                               |
| 7 | Sun 12:00              | `Do Phase 7: build the single-file offline version into /dist-usb and deploy the online version. Tell me both links/paths.`                                               | `index.html` opens from the USB with Wi-Fi off                    |

**If something breaks:** paste the exact error and say `Fix this without changing anything else.`
**If it starts to look generic:** say `This looks like generic AI design. Re-read Part 7 (Art Direction) and redo this screen.`

### The 5 rules that keep us safe

1. **The game ideas come from the team.** Claude Code builds them. (NASA rule: AI must not invent the solution idea.)
2. **No AI-generated images, video or voice.** Every visual is built from code (3D shapes, SVG, CSS). This avoids the "AI-generated" watermark rule completely.
3. **No made-up NASA numbers.** Every real fact has a `source` link and is checked by Member 4.
4. **Never call stored data "live".** The game labels old data as "Archived NASA data from \[date]".
5. **The USB version must work offline.** Test it on a different laptop with Wi-Fi off before 13:30 Sunday.

---

## PART 1 · Product vision

**One line:** Kids aged 7–12 command Moonbase Horizon, a small outpost near the Moon's south pole, and learn that in space every watt, litre of water and wall of shielding is a trade-off.

**What it is:** a living simulation in a story campaign. It is not a quiz and not a slideshow. Each decision changes the base, which you see happen in a 3D diorama.

**What it feels like:** a premium, toy-like mission-control game. Tactile, fast, satisfying. Easy to understand in 30 seconds and still interesting to a 12-year-old.

**Success test:** a 7-year-old plays it with no instructions, and afterwards can tell you one real thing about life on the Moon (for example "solar panels stop working when dust covers them").

**What it is not:** a real astronaut safety tool. The game says clearly: *"This is an educational simulation. It does not give safety advice for real astronauts."*

---

## PART 2 · Changes from the professor's plan (and why)

| Professor's plan                                   | What we build                                                                                                       | Why                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Dust Storm Warning" on the Moon                   | **"Dust on the Panels"**: dust kicked up by a rover trip or a lander                                                | The Moon has no air, so it has no dust storms (those happen on Mars). Lunar dust sticks to surfaces when it's disturbed. Judges score scientific validity.                                 |
| Communication "delay" as a big Moon mechanic       | **Blackouts**: Earth drops below the horizon, or a storm disrupts the link                                          | The Moon is only about 1.3 light-seconds from Earth, so delay barely matters. At the south pole, Earth can sit low on or below the horizon, which causes real blackouts.                   |
| "Lunar night: solar power drops dramatically"      | **"Long Shadow"**: sunlight is low and some areas get long periods of darkness                                      | Near the south pole the Sun stays low on the horizon. Some high ridges get light most of the time, and craters stay dark. Keep the batteries vs priorities lesson, but word it accurately. |
| 6 visible resource bars + 6 hidden                 | **3 big gauges** (Power, Life Support, Crew); tap a gauge to open its parts                                         | NASA's challenge text says 2–3 core resources work better for kids than 5–6. Tapping a gauge still shows all 6 (O₂, water, food, health, morale) for older kids.                           |
| 12–16 missions required                            | **Engine supports 16; build in tiers: 6 → 12 → 16**                                                                 | About 9 hours of building time. A finished 6-mission story beats an unfinished 16. More missions are just more JSON.                                                                       |
| 10-second timer for urgent events                  | Explorer: **no timer**, Mission: **10 s**, Commander: **7 s**                                                       | Young readers need time to read. The timer stays the signature feature for older players.                                                                                                  |
| React + Vite, deploy to Vercel                     | Same, **plus a single-file offline build**                                                                          | The local submission is a USB flash drive. Normal Vite builds don't run from `file://`.                                                                                                    |
| API key in an env variable "never in the frontend" | Key in `.env`, read at build time, **never committed to git**                                                       | With no backend, any key the browser uses ends up in the built JS. NASA keys are free and rate-limited, so that's acceptable; just don't commit `.env`.                                    |
| No 3D engine                                       | **One lightweight 3D diorama** (react-three-fiber, built only from simple shapes), with a **Lite mode** 2D fallback | Boss asked for 3D buildings and motion. A low-poly scene built from primitives needs no model files and stays fast. Lite mode protects school laptops.                                     |
| "2-minute demo script"                             | **3-minute pitch script**                                                                                           | The Sakhir rules give 3 minutes plus 2 minutes of judge questions.                                                                                                                         |

---

## PART 3 · Story outline (16 missions, built in tiers)

**Premise:** Moonbase Horizon has just opened near the lunar south pole to test technology for future Moon and Mars missions. Earth's message: *"A major solar storm may be approaching. Survive, keep the research going, and get ready for the supply lander."* Contact with Earth is not always possible, so the commander must decide using what the base knows.

**Crew:**

| Name               | Role                   | Personality                      | Signature colour | Silhouette (built from shapes)               |
| ------------------ | ---------------------- | -------------------------------- | ---------------- | -------------------------------------------- |
| Commander (player) | Leads the base         | —                                | —                | Seen as a visor reflection only              |
| Dr. Nova           | Life-support scientist | Calm, precise, loves a good fact | Teal             | Tall capsule, round helmet, clipboard        |
| Rex                | Engineer and repairs   | Loud, optimistic, over-confident | Orange           | Wide capsule, tool belt, big gloves          |
| Luna               | Botanist, food         | Gentle, curious, talks to plants | Leaf green       | Small capsule, sprout on helmet              |
| BOLT               | Maintenance robot      | Literal, loyal, dry one-liners   | Yellow + white   | Box body, one big round eye, antenna, treads |

**Tier legend:** 🟢 Tier 1 = must be playable by Sat 17:45 · 🟡 Tier 2 = Sunday morning if time · ⚪ Tier 3 = after the hackathon

| #  | Tier | Chapter                  | Mission                                                                            | Teaches                                          | Urgent timer? |
| -- | ---- | ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------ | ------------- |
| 1  | 🟢   | 1 · Welcome to Horizon   | **First Light** (tutorial: reading gauges, a dim solar panel)                      | Power is limited                                 | No            |
| 2  | 🟢   | 1                        | **Breathing Room** (oxygen recycler needs power; meet Nova and BOLT)               | Life support uses power                          | No            |
| 3  | 🟡   | 1                        | **Water Under Pressure** (recycler fault: repair now or save spare parts)          | Water is precious, and machines need maintenance | No            |
| 4  | 🟢   | 2 · Growing a Home       | **The Green Room** (start the greenhouse: pick a crop and light level)             | Food takes time, water and energy                | No            |
| 5  | 🟢   | 2                        | **Dust on the Panels** (a rover trip coats the panels)                             | Dust, maintenance and power are connected        | Yes           |
| 6  | 🟡   | 2                        | **Long Shadow** (low sun, batteries draining: what stays on?)                      | Energy storage and priorities                    | No            |
| 7  | 🟡   | 3 · Trouble from the Sun | **Warning From Earth** (a short window to hear Earth before the link drops)        | Help may not come right away                     | No            |
| 8  | 🟢   | 3                        | **Radiation Shelter** (solar particle event, linked to **Live Space Weather**)     | Protection costs time and work                   | Yes           |
| 9  | 🟡   | 3                        | **The Long Silence** (blackout: decide alone)                                      | Planning and judging risk                        | Yes           |
| 10 | 🟡   | 4 · Something Breaks     | **The Recycling Problem** (water recycling weakens, and the greenhouse is thirsty) | Systems depend on each other                     | No            |
| 11 | ⚪    | 4                        | **Food or Fuel?** (greenhouse vs battery vs life support)                          | No choice is free                                | Yes           |
| 12 | 🟡   | 4                        | **BOLT Down** (BOLT damaged outside: repair, save parts, or send crew)             | Backup systems and crew safety                   | No            |
| 13 | ⚪    | 5 · The Storm            | **Storm Watch** (prepare: shielding, reserves, food, water)                        | Preparation matters                              | No            |
| 14 | 🟢   | 5                        | **Blackout** (the storm hits, everything needs attention: triage)                  | Deciding under pressure                          | Yes           |
| 15 | ⚪    | 5                        | **After the Storm** (recover, prepare for the lander)                              | Resilience                                       | No            |
| 16 | 🟡   | 5                        | **New Horizons** (spend what's left → ending)                                      | Good choices create options                      | No            |

**Tier 1 story path (6 missions, about 20 minutes):** 1 → 2 → 4 → 5 → 8 → 14 → ending. It has a full beginning, middle, storm climax and ending, so judges see a complete story.

**Endings** (based on a score from the final gauges and objectives, never harsh):

1. **Mission Complete:** strong systems, healthy crew, goals met. Best ending.
2. **Bumpy Landing:** the base survives with damage or low morale. "Try for 3 stars?"
3. **Close Call:** the crew is safe but the base needs big repairs. Focus on what was learned.
4. **Mission Paused:** the crew boards the supply lander to wait for support. Not scary. A big **Try Again** button, with a tip about what to do differently.

---

## PART 4 · Game systems

### 4.1 The core loop

```javascript
 Mission briefing (1 line + objective)
        ↓
 ┌→ Event card appears  ──(camera flies to the affected module)
 │      ↓
 │  Player picks 1 of 2–4 choices  (each shows cost / benefit / risk icons)
 │      ↓
 │  Consequence: 3D base reacts + gauges animate + 1-line result
 │      ↓
 │  "Why?" chip (optional, tap to open a 2–3 sentence explanation)
 └──── next event, or end of sol summary
        ↓
 Mission complete: stars (1–3) + Science Card unlocked
```

### 4.2 Resources

**Three big gauges (always visible):**

| Gauge           | Made of (tap to open)          | Icon               | Colour |
| --------------- | ------------------------------ | ------------------ | ------ |
| ⚡ Power         | Solar input, Battery reserve   | bolt               | Amber  |
| 🫁 Life Support | Oxygen, Water, Food            | lungs/drop/leaf    | Cyan   |
| ❤️ Crew         | Health, Morale, Radiation dose | heart/smile/shield | Rose   |

*(The emoji here are only labels for this doc. In the game, icons are custom SVG.)*

**Hidden trackers:** spare parts (0–5 icons), BOLT condition, mission progress, sol number, space-weather risk.

**Colour-blind safety:** each gauge also has its own **pattern and icon**, and states use **shape** (✓ circle, ! triangle, ✕ octagon) as well as colour. Thresholds: 60–100 good, 30–59 caution, 0–29 critical (pulses).

### 4.3 Balance rules (Claude Code must follow these)

- Every gauge starts at 70–85, never 100.
- Each sol, passive drain: Power −6, Life Support −4, Crew −2 (Explorer ×0.6, Commander ×1.3).
- **No free choice:** every choice has at least one cost. A test in `engine.test.ts` must fail if any choice has all-zero or all-positive effects.
- **No luck-only outcomes:** a random risk can only make a choice's known risk happen. It never adds a surprise penalty that wasn't shown.
- **Recoverable:** a single bad choice can never end the game. Reaching a 0 gauge triggers a rescue event once per mission ("BOLT reroutes emergency power"), at a cost.
- Effects are small numbers (±5 to ±25) so the bars move visibly but nothing is instant.
- Timer runs out → apply the event's `defaultChoice` (safe but costly) and explain why: *"No time to decide! Mission rules: when in doubt, protect the crew first."*

### 4.4 Difficulty modes

|               | Explorer                       | Mission (default) | Commander |
| ------------- | ------------------------------ | ----------------- | --------- |
| Urgent timer  | none                           | 10 s              | 7 s       |
| Drain         | ×0.6                           | ×1.0              | ×1.3      |
| Hints         | "Nova suggests…" on every card | on request        | none      |
| Rescue events | 2 per mission                  | 1                 | 0         |
| Cascades      | off                            | some              | more      |

### 4.5 Live Space Weather (NASA DONKI)

**Endpoints** (NASA API gateway, dates as `yyyy-MM-dd`; if no dates are given, the default is the last 30 days):

- Solar flares: `https://api.nasa.gov/DONKI/FLR?startDate=…&endDate=…&api_key=KEY` (each flare has a `classType` such as `M1.2` or `X1.0`)
- Solar energetic particles: `https://api.nasa.gov/DONKI/SEP?startDate=…&endDate=…&api_key=KEY`
- Coronal mass ejections: `https://api.nasa.gov/DONKI/CME?startDate=…&endDate=…&api_key=KEY`

**Fallback chain** (try each in order, with a 6-second timeout each):

1. `api.nasa.gov/DONKI/...` with our key
2. Same request to CCMC's own DONKI web service: `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=…&endDate=…` (and `/SEP`, `/CME`). DONKI moved here from `kauai.ccmc.gsfc.nasa.gov` on 30 Sep 2026. **Test that it works from the browser (CORS) on Saturday; if not, skip it.** (LUNA_BUILD: the browser now tries this keyless host first, then api.nasa.gov with `DEMO_KEY`.)
3. **Offline snapshot**: `src/data/spaceweather.snapshot.json`, created by `npm run snapshot` while online (real DONKI data plus a `fetchedAt` date).

**Turning data into a kid-friendly risk level** (last 7 days, UTC):

| Level       | Rule                                                      | What the game does                                               |
| ----------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| 🟢 LOW      | No M/X flares, no SEP                                     | Radiation events rare                                            |
| 🟡 MODERATE | Any M-class flare **or** any CME                          | Radiation and blackout events more likely; storm warnings appear |
| 🔴 HIGH     | Any X-class flare **or** any SEP event in the last 3 days | Mission 8 starts with a real shelter alarm; extra power stress   |

**What the player sees (always honest):**

- Live: *"🛰️ NASA space weather · updated \[time] · Risk: MODERATE. NASA detected \[2] solar flares this week. Your base should get ready for possible radiation."*
- Offline: *"📦 Archived NASA data from \[date] (offline mode)."*
- Always a small "Where does this come from?" link to the DONKI page.
- Never claim it's safety advice.

### 4.6 Progression and replay (the "one more go" loop)

- **Stars per mission (1–3):** finish (1), keep all gauges above 30 (2), meet the bonus objective (3).
- **Science Cards:** every "Why?" explanation the player opens unlocks a collectible card in the **Mission Log**, with a real NASA source on the back. The goal is to collect all of them.
- **Commander ranks:** Cadet → Specialist → Flight Lead → Commander, based on total stars.
- **Variation:** each event has 2–3 versions and random amounts within a small range, so replays differ while still teaching the same lesson.
- **Mission select:** replay any finished mission to get more stars.
- Progress saves in `localStorage` (wrapped in try/catch; the game still works without it).

---

## PART 5 · Event card template

### Fields

```javascript
TITLE           2–4 words
WHO SPEAKS      crew member + 1 line in their voice
CONTEXT         1–2 short sentences, at most 25 words
CHOICES         2–4, each: label (≤5 words) + cost/benefit/risk icons + numbers on hover/tap
DEFAULT         which choice happens if the timer runs out (urgent only)
RESULT          1 sentence per choice, written about what you'll SEE in the 3D scene
WHY?            2–3 sentences, plain words, + source link
SCENE CUE       which module the camera flies to, and which animation plays
```

### Fully worked example (Mission 5)

> **DUST ON THE PANELS** · ⏱ urgent (10 s)
> **Rex:** "Uh… Commander? The rover came back VERY dusty. So are the solar panels."
> \*Moon dust is sharp and sticky. The panels are making less power.\***A · Send BOLT to wipe them** → ⚡ +20 later · 🔋 −10 now · ⚠️ BOLT might scratch a wheel (30%)
> **B · Turn off greenhouse lights** → ⚡ saves 10 · 🌱 crops grow slower
> **C · Wait for the next sol** → nothing now · ⚡ −15 next sol (dust keeps blocking light)**Default if timer ends:** B (safest for the crew)
> **Result A:** *BOLT rolls out, wipes the panels and they glow brighter, but he's wobbling on one wheel.*
> **Why?** *Solar panels turn sunlight into electricity. Moon dust has sharp, jagged edges and clings to things, so even a thin layer blocks light. Astronauts on the Apollo missions said dust got on everything.* \[Source: NASA — to be checked by Member 4]
> **Scene cue:** camera → solar array · dust particles fall on the panels · glow drops to 60% · BOLT trundles out if A

---

## PART 6 · Screens and layout

### Desktop (≥ 1024 px)

```javascript
┌──────────────────────────────────────────────────────────────────────┐
│ ◉ LUNA      Ch.2 · M5 "Dust on the Panels"   Sol 14   🎯 Keep ⚡>40  ⚙ ?│
├──────────┬───────────────────────────────────────────────┬───────────┤
│ ⚡ POWER  │                                               │ 🛰 SPACE   │
│ ███████░ │          3D MOONBASE DIORAMA                  │ WEATHER   │
│          │   (habitat · panels · greenhouse · antenna ·  │ ● MODERATE│
│ 🫁 LIFE  │    shelter · battery · rover · BOLT)          │ live/arch.│
│ █████░░░ │                                               ├───────────┤
│          │      ┌───────── EVENT CARD ─────────┐         │ WHY?      │
│ ❤️ CREW   │      │ Rex: "Uh… Commander?"        │         │ (opens    │
│ ██████░░ │      │ [A] [B] [C]       ⏱ ◔ 7      │         │  here)    │
│          │      └──────────────────────────────┘         │           │
├──────────┴───────────────────────────────────────────────┴───────────┤
│ MISSION LOG ▸ Sol 13: Greenhouse planted · Sol 14: Dust alert …      │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile (375 px, portrait)

```javascript
┌───────────────────────┐
│ M5 · Sol 14   🛰● ⚙   │
│ ⚡▮▮▮▮▯  🫁▮▮▮▯▯  ❤️▮▮▮▮▯ │  ← 3 compact gauges, tap to expand
├───────────────────────┤
│                       │
│   3D DIORAMA (40%)    │
│                       │
├───────────────────────┤
│ EVENT CARD (bottom    │
│ sheet, swipe up)      │
│ [ A ]                 │
│ [ B ]                 │  ← big buttons, at least 56 px tall
│ [ C ]        ⏱ 7      │
└───────────────────────┘
```

### Screen flow

`Title → Difficulty → Intro cinematic (≤20 s, skippable) → Mission map → Briefing → Play loop → Mission complete → Mission map … → Ending → Credits + "Real NASA data used" screen`

---

## PART 7 · Art direction (how to not look like "AI slop")

> **Replaced on 14 Nov 2026 (LUNA_BUILD.md A2.1, approved by Boss):** the "premium toy diorama" frame is replaced by **Flight Deck: a real
> mission-control display built around real NASA imagery.** Near-black screen, one huge real planet lit from the side, big off-centre white
> type, thin leader lines, slim panels with small uppercase mono labels and large mono numbers, one accent colour (`sun`). Tokens and fonts
> (Michroma, Space Grotesk, Nunito Sans, JetBrains Mono) are in LUNA_BUILD A2.2; components in `src/ui/components/deck/`. The base modules
> and BOLT below stay as they are. Still banned: purple-blue gradients, emoji as icons, AI-generated images, walls of text. Also banned now:
> real company logos or names, glow on everything, bloom or post-processing, decorative fake numbers. Every number on screen is a real game
> value or a real NASA value. The text below is kept for the base diorama only.

**The look:** a premium toy diorama. Think of a beautifully made board-game piece under soft studio light, not a cartoon for toddlers and not a military sci-fi interface.

**Scene:** the Moonbase sits on a floating, slowly rotating chunk of lunar ground against deep space. The Earth hangs low on the horizon (true at the south pole). Low-poly, smooth shading, soft shadows, a warm amber key light (the low Sun) and cool blue fill light.

**Built only from code:** boxes, cylinders, spheres, capsules, toruses. Domes for habitats, angled panels on posts, a glass greenhouse with tiny leaf shapes that grow, an antenna dish that slowly turns, a shelter dug into the ground with a shielding mound on top, battery stacks with glowing level strips, a 6-wheel rover, and BOLT.

**Palette** (all tokens in `tailwind.config`):

| Token                 | Use                            | Hex                               |
| --------------------- | ------------------------------ | --------------------------------- |
| `space-950`           | background                     | `#070A12`                         |
| `space-900`           | panels                         | `#0E1322`                         |
| `regolith`            | Moon ground                    | `#9A9AA3`                         |
| `sun`                 | Power, key light               | `#FFB547`                         |
| `life`                | Life Support                   | `#3DD6D0`                         |
| `crew`                | Crew                           | `#FF6B8A`                         |
| `signal`              | buttons, focus                 | `#7C9CFF`                         |
| `ok` / `warn` / `bad` | states (always with shape too) | `#4ADE80` / `#FACC15` / `#F87171` |

**Type:** headings **Space Grotesk** (bold, tight), body **Nunito Sans** (friendly and very readable). Bundled with `@fontsource` so they work offline. Body text at least 18 px, buttons at least 20 px.

**UI surfaces:** dark panels with a 1 px light border and a subtle inner glow. Rounded 16–20 px. Use glass blur only on the event card, not everywhere.

**Banned (these make it look AI-made):**

- Purple-to-blue gradient backgrounds
- Emoji used as real icons (use custom SVG icons)
- Every screen with the same centred layout
- Generic stock "astronaut" art or any AI-generated image
- Glassmorphism on every element
- Walls of text; any card over 25 words of context

---

## PART 8 · Motion and "juice" (what makes it satisfying)

Use **Framer Motion** for UI and **react-three-fiber + drei** for the scene. Every effect has a `reducedMotion` version (fade instead of move, no shake, no particles).

| Moment                 | Effect                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Event appears          | Camera glides to the affected module (0.8 s ease); the module outline pulses; the card springs up from below                    |
| Hover / press a choice | Card tilts toward the cursor (max 6°); press = quick squash (scale 0.97) + click sound                                          |
| Choose                 | The chosen card flies to the module; the other cards fall away                                                                  |
| Gauge change           | The bar springs to its new value; a floating "+12" / "−8" chip rises and fades; the number counts up or down                    |
| Critical gauge         | Slow red pulse + a warning triangle (not just colour) + a soft alarm                                                            |
| Urgent timer           | A ring around the card drains; the last 3 seconds tick; the ring turns amber then red; a very gentle heartbeat sound            |
| Dust event             | Dust particles drift onto the panels; panel glow fades                                                                          |
| Solar storm            | Fast streaks (particles) pour in from the Sun's direction; the shelter lights up                                                |
| Greenhouse             | Leaves scale up over sols; lights warm up/down with power                                                                       |
| Night / low sun        | Directional light swings low, long shadows, the habitat's windows glow                                                          |
| Blackout               | Scene desaturates, the antenna's light blinks red, static sound                                                                 |
| BOLT                   | Idle bob, blinks, looks toward the camera when spoken to; happy spin when praised                                               |
| Mission complete       | Stars stamp in one by one (with sound); the Science Card flips over; a small burst of light around the base (not confetti spam) |
| Ending                 | Slow camera orbit around the base at sunrise; crew stand by the habitat                                                         |

**Performance rules:** cap device pixel ratio at 1.5; no shadows on mobile; fewer than 60 meshes; one directional + one ambient light. A **"Lite mode"** toggle (auto-on if fps < 30 for 3 s) swaps the 3D canvas for a layered 2D SVG version of the base.

---

## PART 9 · Sound

All sounds are **synthesised with the Web Audio API** (no audio files, no AI voices, works offline):
click · positive chime (major arpeggio) · power-down (falling sweep) · soft alarm (two-tone, quiet) · greenhouse hum · radio static · star stamp · timer tick.
Mute button always visible; sound starts **off** until the first click (browsers require this). Volume slider in settings.

---

## PART 10 · Technical architecture

**Stack:** React 18 + Vite + **TypeScript** · Tailwind CSS · Zustand (game store) · Framer Motion · three + @react-three/fiber + @react-three/drei · @fontsource/space-grotesk + @fontsource/nunito-sans · Vitest · `vite-plugin-singlefile` (USB build).

**Not used:** backend, database, accounts, online multiplayer, physics engine, paid APIs, AI-generated assets.

> **Rule changes approved by Boss (LUNA_BUILD.md B0, 14 Nov 2026):** same-screen multiplayer (Crew Mode) is allowed, still with no backend and no accounts. NASA public-domain 3D models are allowed if each file is under 1 MB. Allowed imagery includes the assets in LUNA_BUILD B9, each listed in `sources.json` and `CREDITS.md` with its licence. Textures at most 2048 × 1024 JPG, at most 8 new ones. If WebGL fails or its context is lost, the game switches to Lite mode by itself. The NASA key is `NASA_API_KEY` in `.env`, read only by `npm run snapshot`, never by the browser.

### Folder structure

```javascript
outpost/
├─ README.md · CLAUDE.md · .env (NASA_API_KEY=… — never commit; Node snapshot script only) · .env.example
├─ scripts/
│  └─ snapshot-donki.mjs        # npm run snapshot → saves real DONKI data with fetchedAt
├─ src/
│  ├─ main.tsx · App.tsx
│  ├─ engine/                   # pure TypeScript, no React — easy to test
│  │  ├─ types.ts               # all types from Part 11
│  │  ├─ reducer.ts             # applyChoice, advanceSol, checkEnd, rescue
│  │  ├─ balance.ts             # drain rates, difficulty multipliers, thresholds
│  │  ├─ scoring.ts             # stars, endings, ranks
│  │  └─ engine.test.ts         # "no free choice", recoverability, endings
│  ├─ store/gameStore.ts        # Zustand: state + actions + localStorage save
│  ├─ data/
│  │  ├─ missions.json · events.json · crew.json · sciencecards.json
│  │  ├─ spaceweather.snapshot.json
│  │  └─ sources.json           # every NASA source used, shown on the credits screen
│  ├─ spaceweather/
│  │  ├─ donki.ts               # fetch + fallback chain + timeout
│  │  └─ risk.ts                # data → LOW / MODERATE / HIGH
│  ├─ scene/                    # react-three-fiber
│  │  ├─ MoonbaseScene.tsx · CameraRig.tsx · Lights.tsx
│  │  ├─ modules/ Habitat · SolarArray · Battery · Greenhouse · Recycler · OxygenGen · Shelter · Antenna · Rover
│  │  ├─ characters/ Bolt · CrewMember
│  │  ├─ fx/ DustParticles · SolarStorm · Glow
│  │  └─ LiteScene2D.tsx        # SVG fallback
│  ├─ ui/
│  │  ├─ screens/ Title · Difficulty · Intro · MissionMap · Briefing · Play · MissionComplete · Ending · Credits · MissionLog
│  │  ├─ components/ Gauge · GaugeDetail · EventCard · ChoiceButton · TimerRing · WhyPanel · SpaceWeatherBadge · DeltaChip · Stars · ScienceCard
│  │  └─ icons/                 # custom SVG icons
│  ├─ audio/sfx.ts              # Web Audio synth
│  └─ styles/index.css
├─ vite.config.ts               # normal build (online)
└─ vite.usb.config.ts           # singlefile build → dist-usb/index.html
```

### Two builds

| Build  | Command             | Output                                               | For                          |
| ------ | ------------------- | ---------------------------------------------------- | ---------------------------- |
| Online | `npm run build`     | `dist/` → deploy to Vercel or GitHub Pages           | Global submission link       |
| USB    | `npm run build:usb` | `dist-usb/index.html` (one file, everything inlined) | Local submission flash drive |

### Keyboard support

`1`–`4` pick a choice · `Space` confirm · `W` open Why? · `M` mute · `Esc` pause · Tab order is logical, with visible focus rings.

---

## PART 11 · Data schemas

> We keep choices **inside** events (simpler than a separate `choices.json`).

```ts
// engine/types.ts
type GaugeId = 'power' | 'life' | 'crew';
type SubId = 'solar' | 'battery' | 'oxygen' | 'water' | 'food' | 'health' | 'morale' | 'radiation';
type ModuleId = 'habitat'|'solar'|'battery'|'greenhouse'|'recycler'|'oxygen'|'shelter'|'antenna'|'rover'|'bolt';

interface Effect { target: GaugeId | SubId | 'spareParts' | 'bolt' | 'progress'; delta: number; delaySols?: number }

interface Choice {
  id: string;                 // "m5e1a"
  label: string;              // ≤ 5 words
  cost: string; benefit: string; risk?: string;   // short text shown on the card
  effects: Effect[];          // must include at least one negative delta (tested)
  riskChance?: number;        // 0–1, only for the risk that is shown
  riskEffects?: Effect[];
  result: string;             // 1 sentence, describes what you SEE
  sceneCue: { module: ModuleId; anim: string };
  followUpEventId?: string;
}

interface GameEvent {
  id: string; missionId: number;
  title: string; speaker: 'nova'|'rex'|'luna'|'bolt'|'earth';
  line: string; context: string;               // ≤ 25 words
  urgent: boolean; defaultChoiceId?: string;    // required if urgent
  spaceWeatherLinked?: boolean;                 // reads LOW/MODERATE/HIGH
  choices: Choice[];                            // 2–4
  why: { text: string; sourceId: string };      // sourceId → sources.json
  variants?: Partial<GameEvent>[];              // for replay variety
}

interface Mission {
  id: number; chapter: 1|2|3|4|5; tier: 1|2|3;
  title: string; objective: string; bonusObjective: string;
  briefing: { speaker: string; line: string }[];
  eventIds: string[]; sols: number;
  successIf: { gauge: GaugeId; min: number }[];
  teaches: string; scienceCardId: string;
}

interface Source { id: string; title: string; org: 'NASA'|'CSA'; url: string; usedFor: string; checkedBy?: string }
interface SpaceWeatherSnapshot { fetchedAt: string; source: string; flares: {time:string; classType:string}[]; sep: {time:string}[]; cme: {time:string}[] }
```

---

## PART 12 · Build plan (matched to the Sakhir schedule)

| Phase                     | When                                     | Build                                                                                                                                                                                                                                                                                                                                                                                 | Who else                                                                              |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **1 · Engine**            | Sat 11:00–12:00                          | Vite + TS + Tailwind + fonts; `types.ts`, `reducer.ts`, `balance.ts`; one fake event playable with plain buttons; `engine.test.ts`                                                                                                                                                                                                                                                    | Member 3 writes Tier 1 mission content on paper; Member 2 starts on DONKI/RadLab/OSDR |
| **2 · Scene + dashboard** | 12:00–13:00                              | 3D diorama with all modules (static), CameraRig, 3 Gauges, EventCard, layout for desktop + mobile                                                                                                                                                                                                                                                                                     | Member 3 sets up phone and laptop testing                                             |
| —                         | 13:00                                    | **Lunch.** Checkpoint: one event plays on top of the 3D base                                                                                                                                                                                                                                                                                                                          |                                                                                       |
| **3 · Story mode**        | 14:00–16:00                              | Load JSON; Tier 1 missions (1, 2, 4, 5, 8, 14); Briefing, Complete, Ending screens; stars; save                                                                                                                                                                                                                                                                                       | Member 4 checks mission cards (12:30–13:45), then all NASA facts (by 16:00)           |
| **4 · NASA data**         | 16:00–17:00                              | `donki.ts` fallback chain, `risk.ts`, SpaceWeatherBadge, `npm run snapshot`, Credits + "Real NASA data used" screen                                                                                                                                                                                                                                                                   | Uses Member 4's checked sources list (Member 2 → Member 4 by 15:00)                   |
| —                         | 17:45                                    | **End of day 1. Must have:** a full Tier 1 playthrough to an ending, with real data                                                                                                                                                                                                                                                                                                   |                                                                                       |
| **5 · Juice + sound**     | Sat evening (optional) / Sun 09:00–10:30 | Everything in Part 8 + Part 9 + Lite mode + reduced motion                                                                                                                                                                                                                                                                                                                            | Member 4 rehearses; Boss sends 10 screenshots to Member 2 at 10:00                    |
| **6 · Test + fix**        | Sun 10:30–11:30                          | Part 13 checklist + Member 3's bug list; Tier 2 missions only if everything passes                                                                                                                                                                                                                                                                                                    | 11:15 full pitch rehearsal (all 4)                                                    |
| **7 · Ship**              | Sun 11:30–12:30                          | **12:00 feature freeze** · `build:usb` · deploy online · fill `../TeamSolOne_Luna` (1\_PLAY\_THE\_GAME.html, 4\_Source\_code.zip without node\_modules/.env, update 3\_About\_our\_project.txt) · label AI-written code (header comments, package.json description, CREDITS.md, credits screen) · References list of all libraries/fonts/data · 3 PNG screenshots + 1 GIF under 10 MB | Slides PDF already done by Member 2 (11:30)                                           |
| —                         | Sun 12:45                                | USB tested on another laptop with Wi-Fi off → hand to a volunteer **before 13:30**                                                                                                                                                                                                                                                                                                    | Member 3                                                                              |

### Build first vs cut

| Build first (Tier 1)                  | Only if time (Tier 2)                             | Cut for the hackathon (Tier 3)  |
| ------------------------------------- | ------------------------------------------------- | ------------------------------- |
| Engine + 3 gauges + event cards       | Missions 3, 6, 7, 9, 10, 12, 16                   | Missions 11, 13, 15             |
| 3D base, static + camera moves        | Event variants for replay                         | Full intro cinematic            |
| 6 Tier-1 missions + 4 endings         | Science Card collection screen                    | Commander ranks UI              |
| Live Space Weather + offline snapshot | BOLT/crew idle animations                         | Extra sounds                    |
| Why? panel + sources screen           | Lite 2D mode                                      | Settings beyond mute/difficulty |
| USB single-file build                 | All 3 difficulty modes (Mission + Explorer first) |                                 |

---

## PART 13 · Testing checklist

- A child (or a teammate pretending) starts playing **with no instructions** within 30 seconds
- Every mission shows its objective at all times
- `npm test` passes: no free choices, no instant game-over, all endings reachable
- Every urgent event has a default choice and explains it on timeout
- Every Why? text has a working source link, checked by Member 4
- No number in the game is invented: everything real is in `sources.json`
- Space weather: live works · with the key removed falls back · with Wi-Fi off shows "Archived NASA data from \[date]"
- Never says "live" when offline
- (Removed by Boss, 14 Nov: no "educational simulation" disclaimer on screen.)
- Works on 375 px phone, tablet, laptop; no sideways scrolling
- Buttons ≥ 56 px tall on mobile; text ≥ 18 px
- Keyboard only: can play a full mission
- `prefers-reduced-motion`: no shake, no particles, no flying camera
- Colour-blind check: states readable in greyscale (use shapes + icons)
- Runs at 30+ fps on the weakest team laptop (or Lite mode turns on)
- Sound off by default; mute works
- `dist-usb/index.html` opens by double-click from the USB, Wi-Fi off, on a laptop that has never run it
- Tier 1 full playthrough ≈ 20 minutes; whole game under 90 minutes
- All text in English; spelling checked

---

## PART 14 · NASA sources and how to cite them

Every source goes in `src/data/sources.json` and appears on the in-game **"Real NASA data used"** screen (NASA asks for this), on slide 5 and on the project page.

| Source                                                                             | Link                                                                                       | Used for                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| NASA Open APIs                                                                     | <https://api.nasa.gov/>                                                                    | API key + DONKI gateway                                |
| DONKI (Space Weather Database of Notifications, Knowledge, Information), NASA CCMC | <https://ccmc.gsfc.nasa.gov/tools/DONKI/>                                                  | Live Space Weather risk level                          |
| RadLab, OSDR Radiation Dosimetry Database                                          | <https://visualization.osdr.nasa.gov/radlab/gui/data-api/>                                 | Real ISS radiation dose facts (Why? cards)             |
| NASA Open Science Data Repository (OSDR)                                           | <https://osdr.nasa.gov/bio/repo/>                                                          | Real astronaut health findings (Crew Why? cards)       |
| Mars Trek                                                                          | <https://trek.nasa.gov/mars/>                                                              | Not needed for the Moon version (future Mars campaign) |
| CSA: Food production on the Moon and in remote areas                               | <https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/>                  | Greenhouse facts                                       |
| CSA: Space resources for STEM and youth organizations                              | <https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp> | Tone and level for ages 7–12                           |
| data.nasa.gov                                                                      | <https://data.nasa.gov/>                                                                   | Listed by the Sakhir organisers                        |

**Citation format** (credits screen and slides):
`[Dataset or page name]. NASA [team/center if known]. [URL]. Accessed 14 Nov 2026.`
Example: `DONKI Space Weather Database. NASA Community Coordinated Modeling Center. https://ccmc.gsfc.nasa.gov/tools/DONKI/. Accessed 14 Nov 2026.`

**Rule for Claude Code:** if a fact has no `sourceId`, leave the text as `"TODO_VERIFY"` and list it at the end of the phase. Never fill in a number from memory.

---

## PART 15 · Team roles for the build (4 people)

| Person       | Uses Claude? | With README                                                                                                         | Output feeds into                           |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Boss**     | Claude Code  | Runs Phases 1–7; makes the slide template Friday; live demo                                                         | The game + slide template                   |
| **Member 2** | Claude chat  | Finds real numbers and sources for Part 14; finishes the slides Sunday; writes the "Use of AI" text                 | `sources.json`, Why? facts, final slides    |
| **Member 3** | No           | Writes Tier 1 missions in Part 5 format; playtests every build; runs the Part 13 checklist; USB + global submission | `missions.json`, `events.json`, submissions |
| **Member 4** | No           | Checks every Why? text and number (marks ✓); makes text kid-friendly; presents the pitch (Part 17)                  | `checkedBy` field, the pitch                |

## PART 15b · Award strategy (from NASA's Judging & Awards Guide)

- Judged 1–5 on Impact, Creativity, Validity, Relevance, Presentation. **Relevance** rewards NASA data that is "a core component … rather than a superficial addition", so DONKI must change gameplay (event frequency/severity), Mission 8 can replay a real past DONKI event with its date, and Why? cards use real RadLab/OSDR/CSA numbers.
- Targets: local **Best Use of Data**, **Best Use of Technology**, **Local Impact**; global **Best Storytelling** (best fit), **Most Inspirational**, **Art & Technology**.
- Cite a **Bahrain Space Agency** resource if we can honestly use one (BSA is a 2026 Space Agency Partner), plus CSA.
- **No images, video or audio of anyone under 18** anywhere in the game, slides or project page.
- **AI-generated code and data must be acknowledged in descriptive text and metadata.** The project page accepts images (JPG/PNG/GIF up to 10 MB) but not videos or documents.

## PART 16 · Submission-ready project description (draft — edit in your own words)

**Title:** Luna: Junior Astronaut Mission Trainer

**Summary:** Luna is a free browser game where kids aged 7–12 command Moonbase Horizon, a small outpost near the Moon's south pole. Through short story missions, players balance power, life support and crew safety while dealing with Moon dust, low sunlight, blackouts and solar storms. Every choice has a visible cost, and every result is shown in a living 3D model of the base, with a short "Why?" explanation backed by a real NASA source. A Live Space Weather mode uses NASA's DONKI data to set the game's real-world solar risk level (Low, Moderate or High), with an honest offline mode that uses archived NASA data. The game works on phones and laptops with no download or account.

**NASA data used:** DONKI space weather (solar flares, solar energetic particles, CMEs) via NASA Open APIs; RadLab ISS radiation dosimetry; NASA OSDR astronaut health research; CSA food-production toolkit.

**Use of AI (SI) — be exact and honest:** *"The game concept, story, missions and rules were created by our team. We used Claude (Anthropic) to review our plan for scope and scientific accuracy, to help research NASA sources, to write and debug the code, and to help draft text, which our team then checked against the original NASA sources. No AI-generated images, video or audio are used; all visuals are drawn in code."*

---

## PART 17 · 3-minute pitch script (local judging, hard stop at 3:00)

| Time | Who         | Says / does                                                                                                                                                                            |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Member 4    | "Most space lessons for kids are posters and facts. But astronauts don't live on facts. They live on **decisions**."                                                                   |
| 0:15 | Member 4    | "Meet Luna. You command a base on the Moon, and you have **20 seconds to decide**."                                                                                                    |
| 0:25 | Boss (demo) | Starts Mission 5, *Dust on the Panels*. The camera flies to the panels and dust falls. Read the 3 choices aloud, pick A, show BOLT go out, the power bar rise and BOLT's wheel wobble. |
| 1:05 | Boss        | Tap **Why?**: "Moon dust is sharp and sticky… here's the NASA source."                                                                                                                 |
| 1:20 | Member 4    | "No choice is free. Save power today, lose food tomorrow. That's exactly how NASA mission planners think."                                                                             |
| 1:35 | Boss        | Open the **Live Space Weather** badge: "This is real NASA DONKI data from this week. Right now the Sun's risk level is \[X], and it changes how often solar storms hit your base."     |
| 2:00 | Member 4    | "Every fact in the game links to its NASA source, and it works offline, on any phone or school laptop, with no sign-up."                                                               |
| 2:20 | Member 4    | "Teachers in Bahrain could use it in class tomorrow: one mission is one lesson."                                                                                                       |
| 2:40 | Member 4    | "We're Team Sol One. A *sol* is one day on Mars, and this is our first one. Thank you."                                                                                                |
| 2:55 | —           | **Stop.** Member 4 answers science questions, Boss answers tech questions.                                                                                                             |

---

## PART 18 · Accuracy notes for writers (check with Member 4 before using)

- The Moon has **no air**: no wind, no dust storms, no weather.
- Earth–Moon light travel time is about **1.3 seconds** each way.
- Near the **south pole**, the Sun stays low; some ridges get light most of the time, and some craters never see sunlight.
- The Moon has **no global magnetic field and no thick atmosphere**, so solar particles reach the surface. Shelter and mass (like soil or water) help block radiation.
- Water on a base is recycled; it's used for drinking, for oxygen-making systems and for plants.
- Avoid exact radiation or health numbers unless Member 2 has the NASA source and Member 4 has checked it.
