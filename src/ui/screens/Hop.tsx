// Built with help from Claude (Anthropic).
// The hop screen: fly the hopper from the outpost the crew is at to the next mission's outpost
// (Boss: "a flying simulator all across the missions, going from mission to mission, to find a
// location and avoid any obstacles"). The 3D fills the window; the HUD keeps the view clear.
// Top: where to go, with an arrow that turns towards the beacon. Left: height above the ground,
// climb, speed, fuel. Right: Safety. Real data in play: the world's gravity, and NASA DONKI's
// space-weather risk, which sets the chance of a solar flare warning during the hop.
import { useEffect, useMemo, useState } from 'react';
import { WORLD_NAME, missionById, worldOf } from '../../data/content';
import { HOP, HOP_FLARE, hopFlareChance } from '../../engine/hop';
import { FLARE_WEIGHT } from '../../engine/spaceWeather';
import { HopScene, useHopHud } from '../../scene/hop/HopScene';
import { useCan3D } from '../../scene/space/webgl';
import { GRAVITY } from '../../scene/walk/layout';
import { outpostBefore, outpostOfMission } from '../../scene/walk/objective';
import { useGameStore } from '../../store/gameStore';
import { useSpaceWeather } from '../../store/spaceWeather';
import { DataTag, Readout } from '../components/deck';
import { RISK_WORD } from '../components/SpaceWeatherChip';
import { usePrefersReducedMotion } from '../hooks';
import { MapIcon, RocketIcon, StateIcon } from '../icons/Icons';
import { SafetyRing, ThrustButtons, TouchControls } from './Flight';
import { IconButton } from './Play';

export function Hop() {
  const flightTarget = useGameStore((s) => s.flightTarget);
  const finishHop = useGameStore((s) => s.finishHop);
  const goHome = useGameStore((s) => s.goHome);
  const parts = useGameStore((s) => s.state.parts);
  const level = useSpaceWeather((s) => s.summary.level);
  const can3D = useCan3D();
  const reduced = usePrefersReducedMotion();
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const mission = flightTarget === null ? undefined : missionById(flightTarget);
  const route = useMemo(() => (mission ? { from: outpostBefore(mission.id), to: outpostOfMission(mission) } : null), [mission]);
  // NASA DONKI's real risk level sets the chance of a flare warning on this hop.
  const [flare] = useState(() => Math.random() < hopFlareChance(FLARE_WEIGHT[level]));

  // No 3D at all on this device: the crew gets there without the flight (never a blank screen).
  useEffect(() => {
    if (!can3D && mission) finishHop({ hits: 0, astronauts: 0, flares: 0, autopilot: true });
  }, [can3D, mission, finishHop]);

  if (!mission || !route) {
    return (
      <div className="grid h-dvh place-items-center bg-space-950 p-4">
        <div className="panel max-w-md p-6 text-center">
          <p className="text-lg">No hop is planned right now.</p>
          <button type="button" onClick={goHome} className="btn-primary mt-4">
            Back to the map
          </button>
        </div>
      </div>
    );
  }
  const world = worldOf(mission);

  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      {can3D && (
        <div className="absolute inset-0">
          <HopScene world={world} from={route.from} to={route.to} parts={parts} flare={flare} reduced={reduced} onLanded={finishHop} />
        </div>
      )}
      <div className="pointer-events-none relative z-10 flex h-full flex-col gap-2 p-2 lg:gap-3 lg:p-3">
        <header className="pointer-events-auto flex items-center gap-2">
          <div className="hud flex min-w-0 items-center gap-3 px-3 py-2">
            <RocketIcon className="shrink-0 text-xl text-sun" />
            <span className="min-w-0 leading-tight">
              <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-sun">Hop · next mission: {mission.title}</span>
              <span className="block truncate font-display font-bold">
                <span className="text-ink-faint">Fly to </span>
                {route.to.name}
              </span>
            </span>
          </div>
          <DataTag className="hidden bg-space-900/80 sm:inline-flex">
            Gravity {GRAVITY[world]} m/s² · {WORLD_NAME[world]}
          </DataTag>
          <div className="ml-auto flex items-center gap-2">
            <IconButton label="Back to the map" onClick={goHome}>
              <MapIcon />
            </IconButton>
          </div>
        </header>
        <HopHudView to={route.to.name} touch={touch} level={RISK_WORD[level]} reduced={reduced} />
      </div>
    </div>
  );
}

function HopHudView({ to, touch, level, reduced }: { to: string; touch: boolean; level: string; reduced: boolean }) {
  const hud = useHopHud();
  const near = hud.distance < 70;
  const fast = hud.climb < -HOP.softLanding;
  return (
    <>
      <HopToast />
      {hud.flareLeft !== null && <div aria-hidden className="flare-vignette pointer-events-none absolute inset-0 -z-0" />}
      {hud.phase === 'crashed' && (
        <div role="status" className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#ffcf8a]/20 toast-in">
          <p className="hud px-5 py-3 font-mono text-lg font-bold uppercase tracking-[0.14em] text-bad">Impact · back to the pad</p>
        </div>
      )}
      {hud.phase === 'landed' && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] z-20 flex justify-center">
          <p
            role="status"
            className={`border-2 border-sun bg-space-950/60 px-5 py-2 font-title text-xl uppercase tracking-[0.12em] text-sun ${reduced ? 'toast-in' : 'touchdown-stamp'}`}
          >
            Touchdown · {to}
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <section aria-label="Hopper readouts" className="hud pointer-events-auto grid grid-cols-2 gap-x-5 gap-y-2 px-3 py-2.5">
          <Readout instant label="Height" value={hud.altitude} unit="m" size="md" />
          <Readout instant label="Climb" value={hud.climb} digits={1} unit="m/s" size="md" tone={fast && near ? 'text-warn' : 'text-ink'} />
          <Readout instant label="Speed" value={hud.speed} unit="m/s" size="md" className="max-sm:hidden" />
          <div className="max-sm:hidden">
            <Readout instant label="Fuel" value={hud.fuel} unit="%" size="md" tone={hud.fuel < 20 ? 'text-warn' : 'text-ink'} />
            {hud.fuel <= 0 && <p className="mt-1 font-mono text-[11px] uppercase text-warn">Reserve cells only</p>}
          </div>
          <p className="col-span-2 max-w-[16rem] font-mono text-[11px] uppercase leading-snug tracking-[0.08em] text-ink-faint">
            Ceiling {HOP.ceiling} m · land under {HOP.softLanding} m/s
          </p>
        </section>
        <BeaconArrow bearing={hud.bearing} distance={hud.distance} />
        <SafetyRing safety={hud.safety} crashes={hud.crashes} />
      </div>

      <div className="min-h-0 flex-1" />

      {hud.phase === 'flying' && hud.rock && hud.rock.distance < 45 && (
        <p role="alert" className="hud mx-auto flex items-center gap-2 border border-warn/70 px-4 py-2 font-display text-lg font-bold text-warn critical-pulse">
          <StateIcon state="critical" /> Rock ahead · {Math.round(hud.rock.distance)} m · turn {hud.rock.side > 0 ? 'left' : 'right'} or climb
        </p>
      )}
      {hud.phase === 'pad' && (
        <p className={`hud mx-auto px-4 py-2 font-display text-lg font-bold ${reduced ? '' : 'pulse-soft'}`}>
          Press <kbd className="key">W</kbd> to lift off
        </p>
      )}
      {hud.phase === 'flying' && near && (
        <p className="hud mx-auto flex items-center gap-2 px-4 py-2 font-display font-bold">
          <StateIcon state={fast ? 'caution' : 'good'} />
          {fast ? 'Too fast · ease off Shift' : 'Over the pad: hold Shift to sink, gently'}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="pointer-events-auto w-full max-w-sm">
          {hud.flareLeft !== null ? <FlarePanel left={hud.flareLeft} level={level} /> : touch ? <TouchControls /> : <HopKeys />}
        </div>
        <p className="hud plain pointer-events-auto ml-auto max-w-xs px-3 py-2 text-sm leading-snug text-ink-soft">
          Rock spires are placed by the game. Gravity is real: hovering burns more fuel on Mars.
        </p>
        {touch && <ThrustButtons />}
      </div>
    </>
  );
}

/** The arrow at the top turns towards the beacon; a word says which way too (not the arrow alone). */
function BeaconArrow({ bearing, distance }: { bearing: number; distance: number }) {
  const deg = (bearing * 180) / Math.PI;
  const word = Math.abs(deg) < 15 ? 'Ahead' : deg > 0 ? (deg > 120 ? 'Behind · turn right' : 'Turn right') : deg < -120 ? 'Behind · turn left' : 'Turn left';
  return (
    <section aria-label={`Beacon ${Math.round(distance)} metres, ${word}`} className="hud pointer-events-auto flex flex-col items-center px-4 py-2">
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: `rotate(${deg}deg)` }} className="motion-safe:transition-transform">
        <path d="M22 4 L34 34 L22 27 L10 34 Z" fill="#FFB547" />
      </svg>
      <span className="hud-value text-xl text-sun">{Math.round(distance)} m</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">{word}</span>
    </section>
  );
}

function FlarePanel({ left, level }: { left: number; level: string }) {
  return (
    <section role="status" className="hud border border-warn/60 p-3">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-warn">
        <StateIcon state="critical" /> Solar flare warning
      </p>
      <p className="text-sm text-ink">Land within {Math.ceil(left)} s, or the crew takes a radiation dose.</p>
      <div aria-hidden className="mt-2 h-1 overflow-hidden bg-white/10">
        <div className="h-full bg-warn" style={{ width: `${(left / HOP_FLARE.deadline) * 100}%` }} />
      </div>
      <DataTag className="mt-2">NASA DONKI space weather risk: {level}</DataTag>
    </section>
  );
}

function HopKeys() {
  const key = 'key h-6 min-w-6 text-xs';
  return (
    <div className="hud plain hidden space-y-1 px-3 py-2 text-xs text-ink-soft lg:block">
      <p>
        <kbd className={key}>W</kbd> lift off · height is held for you · slow down over the beacon and it lands itself
      </p>
      <p>
        <kbd className={key}>W</kbd> <kbd className={key}>S</kbd> forward / brake
      </p>
      <p>
        <kbd className={key}>A</kbd> <kbd className={key}>D</kbd> turn left / right
      </p>
    </div>
  );
}

function HopToast() {
  const toast = useHopHud((s) => s.toast);
  const [shown, setShown] = useState(toast);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const id = window.setTimeout(() => setShown(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!shown) return null;
  const tone = { good: 'border-ok/60 text-ok', bad: 'border-bad/60 text-bad', info: 'border-line-strong text-white' }[shown.tone];
  return (
    <p key={shown.id} role="status" className={`hud toast-in absolute left-1/2 top-28 z-20 -translate-x-1/2 border px-4 py-2 font-display font-bold ${tone}`}>
      {shown.text}
    </p>
  );
}
