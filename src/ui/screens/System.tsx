// Built with help from Claude (Anthropic).
// The Solar System screen: the planets move on their orbits behind the panels. Missions exist
// only where they are realistic: on the Moon (people have been there) and on Mars (the next
// step NASA is preparing for, opened after the Moon story). Every other planet says honestly
// why no crew can go there yet.
import { useState } from 'react';
import { ORDERS, WORLD_NAME } from '../../data/content';
import { CHAPTERS } from '../../data/content';
import { STARS_PER_CHAPTER } from '../../engine/balance';
import { trackView, worldUnlocked, type WorldId } from '../../engine/campaign';
import { MAX_STARS, totalChapterStars } from '../../engine/chapters';
import { GoalStrip } from '../components/GoalStrip';
import { chaptersOn, worldStars } from './Home';
import { rankFor } from '../../engine/scoring';
import { PLANETS, STATUS_TEXT, SolarSystem, systemControls, type Planet, type PlanetStatus } from '../../scene/SolarSystem';
import { useGameStore } from '../../store/gameStore';
import { HelpDialog, SettingsDialog } from '../components/Dialog';
import { MissionLogButton } from '../components/MissionLog';
import { SpaceWeatherChip } from '../components/SpaceWeatherChip';
import { CloseIcon, HelpIcon, LockIcon, LunaMark, MapIcon, MinusIcon, PlusIcon, SettingsIcon, StarIcon } from '../icons/Icons';
import { IconButton } from './Play';

const ALL_STARS = MAX_STARS(CHAPTERS);

export function System() {
  const progress = useGameStore((s) => s.progress);
  const switchCommander = useGameStore((s) => s.switchCommander);
  const showCredits = useGameStore((s) => s.showCredits);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'settings' | 'help' | null>(null);
  if (!progress) return null;

  const status = (p: Planet): PlanetStatus => {
    if (p.visited === 'home') return 'home';
    if (!p.world) return 'noCrew';
    return worldUnlocked(progress, p.world, ORDERS.moon) ? 'missions' : 'locked';
  };
  const stars = totalChapterStars(progress, CHAPTERS);
  const planet = PLANETS.find((p) => p.id === selected);

  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      <div className="absolute inset-0">
        <SolarSystem selected={selected} onSelect={setSelected} status={status} />
        <p className="sr-only">3D view of the Sun and the eight planets moving on their orbits.</p>
      </div>
      <div className="pointer-events-none relative z-10 flex h-full flex-col gap-3 p-3 lg:p-5">
        <header className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="hud flex items-center gap-3 px-3 py-2">
            <LunaMark className="text-xl text-sun" />
            <span className="font-display text-lg font-bold tracking-[0.12em]">LUNA</span>
            <span aria-hidden className="h-5 w-px bg-white/15" />
            <h1 className="font-display font-bold">Commander {progress.name}</h1>
          </div>
          <div className="hud flex items-center gap-2 px-3 py-2">
            <StarIcon filled className="text-sun" />
            <span className="hud-value">
              {stars}/{ALL_STARS}
            </span>
            <span className="text-sm text-ink-soft">· {rankFor(stars, ALL_STARS).label}</span>
          </div>
          <SpaceWeatherChip />
          <div className="ml-auto flex items-center gap-2">
            <MissionLogButton />
          <IconButton label="Settings" onClick={() => setDialog('settings')}>
              <SettingsIcon />
            </IconButton>
            <IconButton label="How to play" onClick={() => setDialog('help')}>
              <HelpIcon />
            </IconButton>
            <button type="button" onClick={showCredits} className="hud-btn w-auto px-3 text-sm font-bold lg:w-auto">
              Credits &amp; NASA data
            </button>
            <button type="button" onClick={switchCommander} className="hud-btn w-auto px-3 text-sm font-bold lg:w-auto">
              Not {progress.name}?
            </button>
          </div>
        </header>

        <GoalStrip className="pointer-events-auto" />
        <div className="flex min-h-0 flex-1 gap-3">
          <nav aria-label="Your missions" className="pointer-events-auto flex w-full max-w-[19rem] flex-col gap-2 self-start">
            <p className="hud-label px-1">Your missions</p>
            <WorldCard world="moon" onShow={() => setSelected('moon')} />
            <WorldCard world="mars" onShow={() => setSelected('mars')} />
          </nav>
          <div className="flex-1" />
          <div className="pointer-events-auto flex flex-col gap-2 self-center">
            <IconButton label="Zoom in" onClick={() => systemControls.zoom(0.7)}>
              <PlusIcon />
            </IconButton>
            <IconButton label="Zoom out" onClick={() => systemControls.zoom(1.4)}>
              <MinusIcon />
            </IconButton>
            <IconButton
              label="Show the whole Solar System"
              onClick={() => {
                setSelected(null);
                systemControls.reset();
              }}
            >
              <MapIcon />
            </IconButton>
          </div>
        </div>

        {planet && <PlanetCard planet={planet} status={status(planet)} onClose={() => setSelected(null)} />}
        <p className="pointer-events-auto text-center text-xs text-ink-faint">
          Drag to turn · scroll or pinch to zoom · click a planet. Sizes and distances are not to scale; orbit speeds keep the real
          ratios. Maps of Earth, the Moon, Mars and Jupiter: NASA, public domain.
        </p>
      </div>
      <SettingsDialog open={dialog === 'settings'} onClose={() => setDialog(null)} />
      <HelpDialog open={dialog === 'help'} onClose={() => setDialog(null)} />
    </div>
  );
}

/** A campaign: how far you got, your stars, and the button to open that world's map. */
function WorldCard({ world, onShow }: { world: WorldId; onShow: () => void }) {
  const progress = useGameStore((s) => s.progress);
  const openWorld = useGameStore((s) => s.openWorld);
  if (!progress) return null;
  const order = ORDERS[world];
  const view = trackView(progress, world);
  const open = worldUnlocked(progress, world, ORDERS.moon);
  const done = Math.min(view.storyIndex, order.length);
  const name = world === 'moon' ? 'Moon' : 'Mars';
  return (
    <section className="hud p-3">
      <button type="button" onClick={onShow} className="w-full text-left">
        <p className="hud-label">{world === 'moon' ? 'People have been here' : 'The next giant leap'}</p>
        <h2 className="font-display text-xl font-bold">{world === 'moon' ? 'The Moon' : 'Mars'}</h2>
      </button>
      {open ? (
        <>
          <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-sun" style={{ width: `${(done / order.length) * 100}%` }} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            {done} of {order.length} missions · <StarIcon filled className="text-sun" /> {worldStars(progress.chapterStars, world)}/
            {chaptersOn(world).length * STARS_PER_CHAPTER}
            {view.ending && ' · story finished'}
          </p>
          <button type="button" onClick={() => openWorld(world)} className="btn-primary mt-2 w-full">
            {done === 0 ? 'Start' : 'Open'} {name} map
          </button>
        </>
      ) : (
        <p className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
          <LockIcon className="mt-0.5 shrink-0" /> Opens after you finish the story on {WORLD_NAME.moon}. Crews practise on the Moon
          before going further.
        </p>
      )}
    </section>
  );
}

function PlanetCard({ planet, status, onClose }: { planet: Planet; status: PlanetStatus; onClose: () => void }) {
  const openWorld = useGameStore((s) => s.openWorld);
  const visited = { home: 'Our home planet', humans: 'People have walked here', robots: 'Only robots have been here' }[planet.visited];
  return (
    <section aria-label={planet.name} className="hud pointer-events-auto mx-auto w-full max-w-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="hud-label">
            {visited} · {STATUS_TEXT[status]}
          </p>
          <h2 className="font-display text-2xl font-bold">{planet.name}</h2>
          <ul className="mt-1 space-y-1 text-base text-ink">
            {planet.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          {planet.whyNot && (
            <p className="mt-2 text-base">
              <b className="font-display">Why no crew yet:</b> <span className="text-ink">{planet.whyNot}</span>
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="hud-btn shrink-0">
          <CloseIcon />
        </button>
      </div>
      {planet.world && status === 'missions' && (
        <button type="button" onClick={() => openWorld(planet.world!)} className="btn-primary mt-3">
          Open the {planet.world === 'moon' ? 'Moon' : 'Mars'} map
        </button>
      )}
    </section>
  );
}
