# Luna · Junior Astronaut Mission Trainer

**Play online:** https://luna-swart-phi.vercel.app


**NASA Space Apps Challenge 2026 · Team GWIN · Bahrain**

> Get your crew from Earth to the summit of Olympus Mons and switch on Olympus Station.

Luna is a 3D exploration and decision game for players aged 7 to 12. You walk your own astronaut around a
Moon base, fly the rocket through real near-Earth asteroids, make the calls that keep the crew alive, and
finally climb Olympus Mons on Mars to plant the mission flag. Play solo, or with friends online in a crew.

## How it plays

1. **Walk the base.** Third-person astronaut on the lunar surface: `W A S D` move, `Shift` run, `Space` jump
   (real Moon and Mars gravity, so jumps float on the Moon), drag the mouse or `Q`/`R` to look, wheel to zoom.
2. **Follow the objective.** An amber beacon shows where the next mission happens (the greenhouse, the solar
   field, the antenna...). Walk there and press `E`.
3. **Decide.** A mission card pops up with a real problem and 2 to 4 choices (`1`–`4`), on a timer. The base
   gauges on the left (Power, Life Support, Crew) change, and the Ripple view shows every system the choice touched.
   A Why? card explains the real science behind it.
4. **Hop between sites.** Some missions are out at field sites (a rim solar array, an ice-crater drill rig, a
   broken-down rover, a relay mast). Fly the hopper low over the land with `Space`/`Shift` (climb, sink), `W`/`S`
   and `A`/`D`, weave between tall rock spires, find the beacon and land softly on its pad. Real gravity pulls the
   hopper down, so hovering on Mars burns more fuel, and NASA's space-weather risk decides if a flare warning comes.
5. **Fly.** Board the rocket, launch, and dodge satellites, debris and real asteroids. A clean flight earns a star.
6. **Climb.** On Mars, the last chapter is a climb up Olympus Mons, camp by camp, to plant the flag at the summit.
   How many of Olympus Station's lights come on depends on the stars your crew earned.

Finished missions stay on the map to look at; the story always moves forward.

## Crew mode (online)

One player creates a party and gets a 5-letter code; friends join from their own devices with the code
(up to 4). The crew lines up in the lobby, each astronaut with a role stripe: Power Engineer, Life Support
Officer, Flight Doctor, Mission Specialist. In the game everyone walks their own astronaut and sees the others,
and every decision is a crew vote. Majority wins; a split goes to the officer whose gauge the card mainly affects.

Devices connect directly with WebRTC through [PeerJS](https://peerjs.com) (free, no account). Only the name each
player types is shared. There is no chat. Crew mode needs internet; solo play works offline.

## Real NASA data in the game

| Data | What it changes in play |
| --- | --- |
| NASA DONKI space weather (live, or a saved snapshot offline) | How often solar-flare problems hit during flights and hops, and extra radiation and power stress on storm missions |
| Surface gravity of the Moon and Mars | How high the astronaut jumps, and how hard the hopper works to stay up (more fuel on Mars) |
| NASA NeoWs near-Earth asteroids (saved snapshot) | The rocks in the Moon-to-Mars flight: real names, sizes and speeds, hazard markers |
| NASA planet imagery (LRO Moon, Viking Mars, Blue Marble Earth, Cassini Jupiter) | The planets and maps |
| NASA articles cited on every mission card | The Why? science cards and the numbers behind each choice |

The game never labels saved data as live. Sources are listed in `src/data/sources.json` and on the in-game
Credits screen.

## Run it

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # engine, content, world and crew tests, plus headless 3D play-tests of every flight
npm run build      # online build → dist/
npm run build:usb  # one offline file → dist-usb/index.html (double-click to play, no internet needed)
```

`npm run snapshot` refreshes the saved NASA data. Put a free NASA API key in `.env` as `NASA_API_KEY=...`
(see `.env.example`); the key is only read by that Node script and never goes into the game files.

Press `Shift + D` in the game for the demo jump (any chapter or flight).

## Built with

React, TypeScript, Vite, three.js (@react-three/fiber, drei), Zustand, Tailwind CSS, PeerJS. Every 3D model
(astronauts, base, rocket, flame, satellites, asteroids, terrain, Olympus Mons) is built in code. Sounds are
synthesised with the Web Audio API.

## Credits and use of AI

The game concept, story, missions and design are by Team GWIN. The code was written with help from
**Claude (Anthropic)**, an AI assistant; main source files carry the note `Built with help from Claude (Anthropic).`
No AI-generated images, video or audio are used, and nothing in the game shows a real person.
Full credits and licences: [CREDITS.md](CREDITS.md). The original build spec is in [SPEC.md](SPEC.md).

## Licence

The code is released under the [MIT Licence](LICENSE) (Team GWIN, 2026). NASA imagery used in the game is in the
public domain; fonts and libraries keep their own licences (see [CREDITS.md](CREDITS.md)).
