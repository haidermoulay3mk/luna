# Testing checklist (SPEC Part 13), Phase 6

Checked on 14 Nov 2026 by Claude (Anthropic) with `npm test` (69 automated tests) and by reading the code.
**This PC had too little free memory to open the 3D in a browser, so every "Needs a person" line must be checked by the team.**

| # | Check | Result | How it was checked / what to do |
|---|-------|--------|---------------------------------|
| 1 | A child starts playing with no instructions within 30 s | Needs a person | Name screen → short tutorial → straight into the first flight and Mission 1. Watch a 7–12 year old try it. |
| 2 | Every mission shows its objective at all times | Pass | Status panel always shows Objective and Bonus (ticked live). The UI test checks it on every card. |
| 3 | `npm test` passes (no free choices, no instant game over, all endings reachable) | Pass | 69 tests, including every Moon and Mars card, two full stories, flight rules and space weather rules. |
| 4 | Every urgent event has a default choice and explains it on timeout | Pass | Checked by the content tests; the timeout message is shown on the result card. |
| 5 | Every Why? text has a working source link, checked by Member 4 | **Fail (team)** | Most NASA sources have no link yet; they show "(link to be added)". List in STATE.md. |
| 6 | No number in the game is invented | Partly | NASA facts come from the team's sheets or SPEC Part 18 notes. New cards written by Claude are marked `draft` and their facts `TODO_VERIFY`. Game-balance numbers are ours and are not NASA facts. |
| 7 | Space weather: live works · without the key falls back · with Wi-Fi off says "Archived NASA data from [date]" | Code done; needs a person | Fallback chain and labels are in `src/store/spaceWeather.ts`. NASA's own flare list (FLR) returned "404 Not Found" on 14 Nov; the game says so instead of guessing. Try it with Wi-Fi on and off. |
| 8 | Never says "live" when offline | Pass | Only a fresh NASA answer is labelled "Live NASA data". |
| 9 | "Educational simulation" note | Removed | Boss asked to remove it (14 Nov). |
| 10 | Works on 375 px phone, tablet, laptop; no sideways scrolling | Needs a person | Layouts use full-screen flex with wrapping; not seen on a real phone yet. |
| 11 | Buttons ≥ 56 px on phones; text ≥ 18 px | Partly | All icon buttons are 56 px on phones. Boss asked for a more compact mission card, so choice details are 14–16 px; story text stays 18 px. |
| 12 | Keyboard only: can play a full mission | Pass | 1–4 pick choices, Space continues, W reopens Why?, WASD + Space/Shift fly. The UI test picks every choice with the keyboard. |
| 13 | `prefers-reduced-motion`: no shake, no particles, no flying camera | Pass (code) | Camera snaps instead of gliding, no shake, no exhaust / dust / comet particles, cards fade instead of spring. |
| 14 | Colour-blind: states readable in greyscale | Pass (code) | Every state has its own shape and word (circle / triangle / octagon), also for the space weather risk. |
| 15 | 30+ fps on the weakest laptop, or Lite mode turns on | Code done; needs a person | Lite mode turns on by itself after 3 s under 30 fps (once per visit), with "Turn 3D back on". |
| 16 | Sound off by default; mute works | Pass (code) | Sound starts off; the mute button is always on screen; volume in Settings. |
| 17 | `dist-usb/index.html` opens by double-click, Wi-Fi off, on a new laptop | Needs a person | The file has no outside scripts, styles or fonts; the NASA maps are inside it (about 3 MB). Only the space weather request goes online, and it falls back. |
| 18 | Tier 1 playthrough ≈ 20 min; whole game under 90 min | Needs a person | Now 12 Moon cards + 6 Mars cards + flights. Time one full play. |
| 19 | All text in English; spelling checked | Needs a person | Read through the cards once. |
