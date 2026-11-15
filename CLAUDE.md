# CLAUDE.md — rules for building Luna (formerly OUTPOST)

Read `SPEC.md` fully before doing anything. It is the spec. Build only the phase you are asked for, then stop and say how to run it.

## Who you're working with
Boss is a student who does not write code by hand. Explain how to run things in one or two plain sentences. Never ask him to edit code himself; do it for him.

> **LUNA_BUILD.md run (approved by Boss, 14 Nov 2026):** when Boss asks for the LUNA_BUILD phases, its Part A0 run protocol
> replaces "build only the phase you are asked for, then stop": run the phases in order, log each one in `STATE.md`, never stop to ask.

## Hard rules
1. **Stack:** React + Vite + TypeScript + Tailwind + Zustand + Framer Motion + @react-three/fiber + drei. No backend, no database, no accounts, no paid APIs.
   Same-screen multiplayer is allowed (still no backend, no accounts). NASA public-domain 3D models are allowed if each file is under 1 MB (LUNA_BUILD B0).
2. **No AI-generated images, video or audio.** All visuals are code (3D primitives, SVG, CSS), with these approved exceptions: real NASA public-domain imagery (planet surface maps in `src/assets/`: the LRO Moon map from NASA SVS's CGI Moon Kit, the Viking Mars mosaic, Blue Marble Earth and Cassini's Jupiter map; Boss, 2026-11-14) and the assets listed in LUNA_BUILD B9. Every asset goes in `sources.json` and `CREDITS.md` with its licence. Still no images of people. All sounds are Web Audio synthesis.
3. **Never invent NASA facts or numbers.** Real facts must reference an id in `src/data/sources.json`. If there is no source yet, write `TODO_VERIFY` and list it at the end of your reply.
4. **Never label stored data as live.** Offline space weather says "Archived NASA data from [fetchedAt]".
5. **Game content comes from the team.** Game content = the team's sheets (`TEAM_MISSIONS.md`, the Mars sheet) + `LUNA_BUILD.md`. Don't write new mission cards or mechanics. Leave the six `draft: true` Moon cards out of the chapters. You may write UI microcopy and suggest wording.
6. **Two builds must always work:** `npm run build` (online) and `npm run build:usb` (single file via vite-plugin-singlefile, opens from `file://` with no network). Fonts come from @fontsource, not Google Fonts.
7. **Accessibility:** respect `prefers-reduced-motion`; never use colour alone for state; buttons ≥ 56 px on mobile; keyboard keys 1–4 pick choices.
8. **Performance:** DPR ≤ 1.5, < 60 meshes, no shadows on mobile, Lite 2D mode fallback. Textures at most 2048 × 1024 JPG, at most 8 new textures.
   If WebGL fails to start or the context is lost, switch to Lite mode automatically. Never show a blank screen.
9b. **Tone (players aged 10 to 14):** not childish, not technical. Sentences of 15 words or fewer. A real term is fine once with a plain gloss, for example "regolith (Moon soil)". Crew speak like professionals with personality. No exclamation-mark spam.
9c. **NASA API key:** `NASA_API_KEY` in `.env`, read only by `scripts/snapshot.mjs` (Node). Browser code never reads a key (anything `VITE_` ends up in the built file). Live DONKI in the browser uses the keyless CCMC host, then `DEMO_KEY`, then the snapshot.
9. **Art direction: "Flight Deck"** (LUNA_BUILD.md A2, replaces SPEC Part 7's "premium toy diorama"): a real mission-control display built
   around real NASA imagery. The base modules and BOLT stay as they are; the frame around them changes. Tokens in `tailwind.config.ts` only;
   build screens from `src/ui/components/deck/` (Frame, Readout, GaugeTile, Callout, Timeline, PrimaryButton, DataTag).
   Banned: purple-blue gradients, emoji as icons, AI-generated images, walls of text, logos or names of real companies, glow on everything,
   bloom or post-processing, decorative fake numbers, glass on everything (at most 2 glass frames on screen). **Every number on screen is a
   real game value or a real NASA value.**
10. Keep game logic in `src/engine/` as pure TypeScript with tests. `npm test` must pass before you say a phase is done.
11. **NASA rule: AI-written code must be acknowledged in text and metadata.** Keep a one-line "Built with help from Claude (Anthropic)" header comment in main source files, say so in package.json "description" and CREDITS.md, and on the in-game credits screen.
12. **No images, video or audio of real people** (NASA bans any likeness of under-18s). Characters are built from shapes.
13. **NASA data must drive gameplay**, not just decorate it (NASA's Relevance criterion). Never add a data feature that is only a label.

## After every phase
- Run `npm test` and `npm run build`; fix any errors.
- Tell Boss: what changed (2–3 lines), how to see it (`npm run dev` → the URL), and any `TODO_VERIFY` items.
- Commit with a clear message.
