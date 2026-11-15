# Credits: Luna: Junior Astronaut Mission Trainer

(The game was called OUTPOST until 14 November 2026.)

Team GWIN · NASA Space Apps 2026 · Bahrain

## Use of AI

The game concept, story, missions and rules were created by our team.
The code in this project was written with help from **Claude (Anthropic)**, an AI assistant.
Main source files carry the header comment `Built with help from Claude (Anthropic).`,
and the same note appears in `package.json`, the page metadata and on screen.

No AI-generated images, video or audio are used. Every visual is drawn in code
(SVG, CSS and 3D shapes: the astronauts, the rocket and its flame, the station, the base, the ground,
Olympus Mons, satellites, asteroids, the stars), with one exception: the planet surface maps are real NASA
images (below). Sounds are synthesised with the Web Audio API.

The astronaut is styled after a reference photo of a white surface suit; it is built from simple shapes and
carries no agency logos or flags. Nothing in the game shows a real person.

## Planet maps (real NASA images, public domain)

- **Mars:** Viking MDIM 2.1 colour mosaic, NASA / JPL / USGS
  (<https://astrogeology.usgs.gov/search/details/Mars/Viking/MDIM21/Mars_Viking_MDIM21_ClrMosaic_global_232m/cub>),
  via Wikimedia Commons "File:Mars Viking MDIM21 ClrMosaic 1km.jpg", resized to 2048 × 1024.
- **Earth:** Blue Marble Next Generation, Reto Stöckli, NASA Earth Observatory (<https://neo.sci.gsfc.nasa.gov>),
  via Wikimedia Commons (shaded relief added by NordNordWest), resized to 1024 × 512.
- **Jupiter:** Cassini cylindrical map PIA07782, NASA / JPL / Space Science Institute
  (<http://photojournal.jpl.nasa.gov/catalog/PIA07782>), resized to 1024 × 512.
- Mercury, Venus, Saturn (and its rings), Uranus, Neptune, the Sun, the stars and the Milky Way are drawn in code.

## Space weather data

Live and archived data from NASA DONKI (<https://ccmc.gsfc.nasa.gov/tools/DONKI/>) through <https://api.nasa.gov/>.
`npm run snapshot` saves the archived copy used offline.

## Sound

Every sound is synthesised in code with the Web Audio API. There are no audio files.

## Moon map

The Moon's surface is the colour map from NASA's **CGI Moon Kit** (Lunar Reconnaissance Orbiter
camera data), by NASA's Scientific Visualization Studio (Ernie Wright, Noah Petro):
<https://svs.gsfc.nasa.gov/4720/>. Public domain. We downloaded it through Wikimedia Commons
("File:CGI Moon Kit - Lroc color poles.tif") and resized it to 2048 × 1024.

## Data sources

Every NASA and CSA source is listed in [`src/data/sources.json`](src/data/sources.json)
and will appear on the in-game "Real NASA data used" screen.
Facts still waiting for a checked source are marked `TODO_VERIFY` in the code.

## Libraries (all open source)

| Library | Version | License |
|---|---|---|
| React, React DOM | 18.3.1 | MIT |
| Vite | 8.3.8 | MIT |
| @vitejs/plugin-react | 6.3.0 | MIT |
| vite-plugin-singlefile | 2.3.4 | MIT |
| TypeScript | 7.0.2 | Apache-2.0 |
| Tailwind CSS | 3.4.19 | MIT |
| PostCSS, Autoprefixer | 8.5.33, 10.6.2 | MIT |
| Zustand | 5.1.0 | MIT |
| Framer Motion | 14.14.0 | MIT |
| three.js | 0.187.0 | MIT |
| @react-three/fiber | 8.18.0 | MIT |
| @react-three/drei | 9.122.0 | MIT |
| PeerJS (online party: connects players' browsers directly) | 1.5.4 | MIT |
| Vitest | 5.1.0 | MIT |
| jsdom, Testing Library (tests only) | 31.0.1, 16.3.3 / 10.4.2 | MIT |
| @react-three/test-renderer (tests only: runs the 3D scenes without a screen) | 8.2.4 | MIT |

## Fonts

| Font | Packaged by | License |
|---|---|---|
| Space Grotesk | @fontsource/space-grotesk 5.3.0 | SIL Open Font License 1.1 |
| Nunito Sans | @fontsource/nunito-sans 5.3.0 | SIL Open Font License 1.1 |
| Michroma | @fontsource/michroma 5.3.0 | SIL Open Font License 1.1 |
| JetBrains Mono | @fontsource/jetbrains-mono 5.3.0 | SIL Open Font License 1.1 |

## Online party service

Crew mode online uses the free public PeerJS server (0.peerjs.com) only to introduce players' browsers to
each other; game data then travels directly between the devices (WebRTC). No account, no chat. The only thing
shared is the name each player types. Party play needs internet; solo play works offline from the USB file.
