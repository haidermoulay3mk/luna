// Built with help from Claude (Anthropic).
// Credits and "Real NASA data used" (SPEC Parts 12 and 14): every source from sources.json in
// the citation format NASA asks for, the open-source libraries and fonts, the team, and the
// required note that the code was written with help from an AI assistant.
import sources from '../../data/sources.json';
import { useGameStore } from '../../store/gameStore';
import { DONKI_PAGE, useSpaceWeather, weatherLabel } from '../../store/spaceWeather';
import { CloseIcon, LunaMark } from '../icons/Icons';

const ACCESSED = 'Accessed 14 Nov 2026';

const LIBRARIES = [
  ['React, React DOM', 'MIT'],
  ['Vite, @vitejs/plugin-react, vite-plugin-singlefile', 'MIT'],
  ['TypeScript', 'Apache-2.0'],
  ['Tailwind CSS, PostCSS, Autoprefixer', 'MIT'],
  ['Zustand', 'MIT'],
  ['three.js, @react-three/fiber, @react-three/drei', 'MIT'],
  ['Framer Motion', 'MIT'],
  ['PeerJS (online party: browsers connect directly; free public PeerJS server introduces them)', 'MIT'],
  ['Vitest, jsdom, Testing Library (tests only)', 'MIT'],
  ['Fonts: Michroma, Space Grotesk, Nunito Sans, JetBrains Mono (via @fontsource)', 'SIL Open Font License 1.1'],
];

export function Credits() {
  const showSystem = useGameStore((s) => s.showSystem);
  const status = useSpaceWeather((s) => s.status);
  const snapshot = useSpaceWeather((s) => s.snapshot);
  const nasa = sources.filter((s) => s.org === 'NASA');
  const csa = sources.filter((s) => s.org !== 'NASA');
  return (
    <div className="min-h-dvh bg-space-950 p-3 lg:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center gap-3">
          <LunaMark className="text-2xl text-sun" />
          <h1 className="font-display text-3xl font-bold">Credits and real NASA data</h1>
          <button type="button" onClick={showSystem} aria-label="Close credits" className="hud-btn ml-auto">
            <CloseIcon />
          </button>
        </header>

        <section className="hud mt-4 p-4">
          <h2 className="font-display text-xl font-bold">Made by</h2>
          <p className="mt-1">Team GWIN · NASA Space Apps Challenge 2026 · Bahrain.</p>
          <p className="mt-2 text-ink">
            The game idea, story, missions and rules are by our team. The code was written with help from{' '}
            <b>Claude (Anthropic)</b>, an AI assistant. No AI-generated images, video or audio are used: the 3D scenes are drawn in
            code, and the planet surfaces are real NASA images.
          </p>
        </section>

        <section className="hud mt-4 p-4">
          <h2 className="font-display text-xl font-bold">Real NASA data used</h2>
          <p className="mt-1 text-ink">
            Space weather: {weatherLabel(status, snapshot)}, from NASA DONKI (
            <a href={DONKI_PAGE} target="_blank" rel="noreferrer" className="text-sun underline">
              ccmc.gsfc.nasa.gov/tools/DONKI
            </a>
            ). It sets the risk level that changes flights and storm missions.
          </p>
          <SourceList items={nasa} />
          {csa.length > 0 && (
            <>
              <h3 className="mt-4 font-display font-bold">Canadian Space Agency</h3>
              <SourceList items={csa} />
            </>
          )}
          <p className="mt-3 text-sm text-ink-faint">
            Sources marked "link to be added" are still being checked by our team. Real facts in the game come only from these
            sources.
          </p>
        </section>

        <section className="hud mt-4 p-4">
          <h2 className="font-display text-xl font-bold">Open-source software</h2>
          <ul className="mt-2 grid gap-1 text-ink sm:grid-cols-2">
            {LIBRARIES.map(([name, license]) => (
              <li key={name}>
                {name} <span className="text-ink-faint">· {license}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SourceList({ items }: { items: typeof sources }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((s) => (
        <li key={s.id} className="text-base">
          <span className="font-bold">{s.title}.</span> {s.org}.{' '}
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-sun underline underline-offset-2">
              {s.url}
            </a>
          ) : (
            <span className="text-ink-faint">(link to be added)</span>
          )}
          . {ACCESSED}. <span className="text-ink-faint">Used for: {s.usedFor}.</span>
        </li>
      ))}
    </ul>
  );
}
