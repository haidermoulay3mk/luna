// Built with help from Claude (Anthropic).
// Home: the map of the world you are on (the Moon or Mars, from NASA's real photos) fills the
// screen like a maps app. The "Solar System" button goes back to the planets.
// Top bar: commander, stars and rank. Left: the missions. Right: zoom buttons.
// Bottom: a card for the selected place, or the next mission, with a "Fly there" button.
import { sfx } from '../sound';
import { useState } from 'react';
import { CHAPTERS, ORDERS, START_PLACES, WORLD_NAME, missionById, needsFlight, placeById, placeForMission, placesOn, type Place } from '../../data/content';
import { STARS_PER_CHAPTER } from '../../engine/balance';
import { isUnlocked, trackView, worldUnlocked, type WorldId } from '../../engine/campaign';
import { isOlympusEnding } from '../../engine/scoring';
import { GoalStrip } from '../components/GoalStrip';
import { rankFor } from '../../engine/scoring';
import { mapControls } from '../../scene/MoonMap';
import { useGameStore } from '../../store/gameStore';
import { useMapUi } from '../../store/mapUi';
import { HelpDialog, SettingsDialog } from '../components/Dialog';
import { MissionLogButton } from '../components/MissionLog';
import { SpaceWeatherChip } from '../components/SpaceWeatherChip';
import { CloseIcon, HelpIcon, LockIcon, LunaMark, MapIcon, MinusIcon, PlusIcon, RocketIcon, SettingsIcon, StarIcon, SunIcon } from '../icons/Icons';
import { IconButton } from './Play';

export function Home() {
  const progress = useGameStore((s) => s.progress);
  const world = useGameStore((s) => s.world);
  const switchCommander = useGameStore((s) => s.switchCommander);
  const showSystem = useGameStore((s) => s.showSystem);
  const [dialog, setDialog] = useState<'settings' | 'help' | null>(null);
  if (!progress) return null;
  const maxStars = chaptersOn(world).length * STARS_PER_CHAPTER;
  const stars = worldStars(progress.chapterStars, world);
  const rank = rankFor(stars, maxStars);

  return (
    <div className="flex h-full flex-col gap-3">
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
            {stars}/{maxStars}
          </span>
          <span className="text-sm text-ink-soft">
            on {WORLD_NAME[world]} · {rank.label}
          </span>
        </div>
        <SpaceWeatherChip />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={showSystem} className="hud-btn w-auto gap-2 px-3 text-sm font-bold lg:w-auto">
            <SunIcon /> Solar System
          </button>
          <MissionLogButton />
          <IconButton label="Settings" onClick={() => setDialog('settings')}>
            <SettingsIcon />
          </IconButton>
          <IconButton label="How to play" onClick={() => setDialog('help')}>
            <HelpIcon />
          </IconButton>
          <button type="button" onClick={switchCommander} className="hud-btn w-auto px-3 text-sm font-bold lg:w-auto">
            Not {progress.name}?
          </button>
        </div>
      </header>

      <GoalStrip className="pointer-events-auto" />
      <div className="flex min-h-0 flex-1 gap-3">
        <MissionList />
        <div className="flex-1" />
        <ZoomButtons />
      </div>

      <PlaceCard />
      <p className="pointer-events-auto text-center text-xs text-ink-faint">
        Drag to spin · scroll or pinch to zoom · click a place. Maps: NASA (LRO, Viking), public domain.
      </p>
      <SettingsDialog open={dialog === 'settings'} onClose={() => setDialog(null)} />
      <HelpDialog open={dialog === 'help'} onClose={() => setDialog(null)} />
    </div>
  );
}

function MissionList() {
  const progress = useGameStore((s) => s.progress);
  const world = useGameStore((s) => s.world);
  const select = useMapUi((s) => s.select);
  const selected = useMapUi((s) => s.selected);
  if (!progress) return null;
  const order = ORDERS[world];
  const view = trackView(progress, world);
  return (
    <nav aria-label="Missions" className="hud pointer-events-auto hidden w-[17rem] self-start overflow-y-auto p-3 lg:block">
      <p className="hud-label">Missions on {WORLD_NAME[world]}</p>
      <ol className="mt-2 space-y-1">
        {order.map((id, index) => {
          const mission = missionById(id);
          if (!mission) return null;
          const chapter = CHAPTERS.find((c) => c.missions[0] === id);
          const place = placeForMission(id);
          const unlocked = isUnlocked(view, id, order);
          const isNext = index === view.storyIndex;
          const stars = progress.stars[id] ?? 0;
          return (
            <li key={id}>
              {chapter && (
                <p className="mb-1 mt-3 flex items-baseline gap-2 first:mt-0">
                  <span className="font-mono text-[11px] font-bold text-sun">{String(chapter.id).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase tracking-[0.08em]">{chapter.title}</span>
                  <span className="font-mono text-[11px] text-ink-soft">
                    {progress.chapterStars?.[String(chapter.id)] ?? 0}/{STARS_PER_CHAPTER}
                    <span className="sr-only"> stars</span>
                  </span>
                </p>
              )}
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => select(place.id)}
                aria-label={`Mission ${id}: ${mission.title}, at ${place.name}. ${isNext ? 'Next up' : unlocked ? `Done, ${stars} of 3 stars` : 'Locked'}. Show on the map.`}
                className={`flex w-full items-center gap-2.5 rounded-btn border px-2.5 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                  isNext ? 'border-[#FFB547]/60 bg-[#FFB547]/10' : selected === place.id ? 'border-line-strong' : 'border-transparent hover:bg-white/5'
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-xs font-bold">{id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold">{mission.title}</span>
                  <span className="block truncate text-xs text-ink-faint">{isNext ? `Next · ${place.name}` : place.name}</span>
                </span>
                {!unlocked ? (
                  <LockIcon className="shrink-0 text-ink-faint" />
                ) : (
                  !isNext && (
                    <span className="flex shrink-0" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <StarIcon key={i} filled={i < stars} className={`text-sm ${i < stars ? 'text-sun' : 'text-white/25'}`} />
                      ))}
                    </span>
                  )
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ZoomButtons() {
  return (
    <div className="pointer-events-auto flex flex-col gap-2 self-center">
      <IconButton label="Zoom in" onClick={() => mapControls.zoom(0.7)}>
        <PlusIcon />
      </IconButton>
      <IconButton label="Zoom out" onClick={() => mapControls.zoom(1.4)}>
        <MinusIcon />
      </IconButton>
      <IconButton label="Show the whole Moon" onClick={() => mapControls.reset()}>
        <MapIcon />
      </IconButton>
    </div>
  );
}

const KIND_LABEL: Record<Place['kind'], string> = {
  base: 'Your base',
  outpost: 'Outpost',
  landmark: 'Real place',
  station: 'Space station',
  orbit: 'Orbit',
  camp: 'Camp on Olympus Mons',
};

/** The selected place, or (with nothing selected) the next mission. */
function PlaceCard() {
  const progress = useGameStore((s) => s.progress);
  const playMission = useGameStore((s) => s.playMission);
  const showEnding = useGameStore((s) => s.showEnding);
  const newStory = useGameStore((s) => s.newStory);
  const selected = useMapUi((s) => s.selected);
  const select = useMapUi((s) => s.select);
  const world = useGameStore((s) => s.world);
  if (!progress) return null;

  const order = ORDERS[world];
  const view = trackView(progress, world);
  const here = view.location && placeById(view.location) ? view.location : START_PLACES[world];
  const launchToMars = useGameStore((s) => s.launchToMars);
  const moonDone = world === 'moon' && worldUnlocked(progress, 'mars', ORDERS.moon);
  const marsEnding = world === 'mars' && isOlympusEnding(view.ending);
  const nextId = order[view.storyIndex];
  const next = nextId === undefined ? undefined : missionById(nextId);
  const place = selected ? placeById(selected) : next ? placeForMission(next.id) : undefined;
  const missions = (place?.missions ?? []).filter((id) => isUnlocked(view, id, order));
  // The next story mission comes first.
  missions.sort((a, b) => (a === nextId ? -1 : b === nextId ? 1 : a - b));

  return (
    <section aria-label="Selected place" className="hud pointer-events-auto mx-auto w-full max-w-2xl p-4">
      {place ? (
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="hud-label">
              {KIND_LABEL[place.kind]}
              {place.id === here && ' · Your rocket is here'}
            </p>
            <h2 className="font-display text-2xl font-bold">{place.name}</h2>
            <p className="text-sm text-ink-soft">{place.where}</p>
            <p className="mt-1 text-sm text-ink">{place.about}</p>
          </div>
          {selected && (
            <button type="button" onClick={() => select(null)} aria-label="Close" className="hud-btn shrink-0">
              <CloseIcon />
            </button>
          )}
        </div>
      ) : (
        <p className="font-display text-xl font-bold">{moonDone ? 'The Moon chapters are done. The rocket is loaded for Mars.' : 'Your story is complete.'}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {missions.map((id) => {
          const mission = missionById(id)!;
          const fly = needsFlight(placeById(here), placeForMission(id));
          const isNext = id === nextId;
          // Finished missions: the result, plus a purple Replay button (Boss, 15 Nov). A replay keeps the
          // best stars and never moves the story back (isStoryRun in campaign.ts).
          if (!isNext) {
            const stars = progress.stars[String(id)] ?? 0;
            return (
              <span key={id} className="flex items-center gap-2">
              <span
                className="flex min-h-11 items-center gap-2 border border-line px-3 text-base text-ink-soft"
                aria-label={`${mission.title}: done, ${stars} of 3 stars`}
              >
                <span aria-hidden className="text-ok">
                  ✓
                </span>
                {mission.title}
                <span aria-hidden className="font-mono text-sm text-sun">
                  {'★'.repeat(stars)}
                  {'☆'.repeat(Math.max(0, 3 - stars))}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  playMission(id);
                }}
                aria-label={`Replay ${mission.title}`}
                className="min-h-11 rounded-btn border border-violet-300/60 bg-violet-600 px-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500"
              >
                ↻ Replay
              </button>
              </span>
            );
          }
          return (
            <button key={id} type="button" onClick={() => playMission(id)} className="btn-primary">
              {fly ? <RocketIcon /> : null}
              {fly ? 'Fly there' : 'Start'}: {mission.title}
            </button>
          );
        })}
        {moonDone && (
          <button type="button" onClick={launchToMars} className="btn-primary">
            <RocketIcon /> Launch to Mars
          </button>
        )}
        {marsEnding && (
          <button type="button" onClick={showEnding} className="btn-primary">
            See your ending
          </button>
        )}
        {!next && (
          <button type="button" onClick={newStory} className="btn-secondary">
            Play the story again
          </button>
        )}
        {place && place.missions.length > 0 && missions.length === 0 && (
          <p className="flex items-center gap-2 text-ink-faint">
            <LockIcon /> Finish the earlier missions first.
          </p>
        )}
      </div>
      {!selected && <PlacesHint />}
    </section>
  );
}

function PlacesHint() {
  const select = useMapUi((s) => s.select);
  const world = useGameStore((s) => s.world);
  const landmarks = placesOn(world).filter((p) => p.kind === 'landmark' || p.kind === 'station');
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-ink-faint">
      Explore:
      {landmarks.map((p) => (
        <button key={p.id} type="button" onClick={() => select(p.id)} className="rounded-full border border-line px-2.5 py-1 text-ink hover:border-sun">
          {p.name}
        </button>
      ))}
    </p>
  );
}

/** The chapters played on one world. */
export const chaptersOn = (world: WorldId) => CHAPTERS.filter((c) => c.world === world);

/** Stars earned in one world's chapters (5 per chapter). */
export const worldStars = (chapterStars: Record<string, number> | undefined, world: WorldId) =>
  chaptersOn(world).reduce((sum, c) => sum + (chapterStars?.[String(c.id)] ?? 0), 0);
