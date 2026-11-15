// Built with help from Claude (Anthropic).
// The flight screen (LUNA_BUILD B5 + A2.5): the 3D flight fills the window and the HUD keeps
// the view clear. Top left: speed and distance to target. Top right: the Safety ring. Bottom
// centre: the flight timeline (Launch · Cruise · Approach · Landing). Bottom left: Mission Control
// in a glass frame. Bottom right: the honest label for the asteroids. Plus the destination pin
// and edge arrow, real NASA names next to asteroids, the crash flash, the TOUCHDOWN stamp
// (a smooth landing cut-scene), and touch buttons on phones and tablets. No autopilot (Boss, 15 Nov): you fly it.
import { useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import { NEOWS, START_PLACES, chapterForMission, missionById, placeById, placeForMission, worldOf } from '../../data/content';
import { trackView } from '../../engine/campaign';
import { FLIGHT_EFFECTS, FLIGHT_PHASES, FLIGHT_PHASE_LABEL, SAFETY, type FlightKind, type ShipInput } from '../../engine/flight';
import { FLARE_WEIGHT } from '../../engine/spaceWeather';
import { FlightScene } from '../../scene/flight/FlightScene';
import { touchAxes, useFlightKeyboard } from '../../scene/flight/input';
import { useCan3D } from '../../scene/space/webgl';
import { useFlightHud } from '../../store/flightHud';
import { useGameStore } from '../../store/gameStore';
import { useSpaceWeather } from '../../store/spaceWeather';
import { DataTag, Frame, Readout, Timeline, shortDate, type Stop } from '../components/deck';
import { usePrefersReducedMotion } from '../hooks';
import { ChevronIcon, MapIcon, RocketIcon, SignalIcon, StateIcon } from '../icons/Icons';
import { IconButton } from './Play';

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const FLIGHT_TITLE: Record<FlightKind, string> = { 'earth-moon': 'Flight 1 · Earth to the Moon', 'moon-mars': 'Flight 2 · Moon to Mars' };

export function Flight() {
  const progress = useGameStore((s) => s.progress);
  const flightTarget = useGameStore((s) => s.flightTarget);
  const arrive = useGameStore((s) => s.arrive);
  // Real NASA space weather sets how often solar flare warnings pop up during the flight.
  const level = useSpaceWeather((s) => s.summary.level);
  const goHome = useGameStore((s) => s.goHome);
  const webgl = useCan3D();
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  useFlightKeyboard(webgl);
  useSkipLandingKey();

  const mission = flightTarget === null ? undefined : missionById(flightTarget);
  const world = mission ? worldOf(mission) : 'moon';
  const saved = progress ? trackView(progress, world).location : undefined;
  const from = placeById(saved && placeById(saved) ? saved : START_PLACES[world]);
  if (!mission || !from) {
    // Nothing to fly to (should not happen): never leave a blank screen.
    return (
      <div className="grid h-dvh place-items-center bg-space-950 p-4">
        <div className="panel max-w-md p-6 text-center">
          <p className="text-lg">No flight is planned right now.</p>
          <button type="button" onClick={goHome} className="btn-primary mt-4">
            Back to the map
          </button>
        </div>
      </div>
    );
  }
  const to = placeForMission(mission.id);
  // The flight into chapter 1 or 5 is Flight 1 or Flight 2 (LUNA_BUILD B1).
  const chapter = chapterForMission(mission.id);
  const kind: FlightKind | undefined = chapter?.flightIn && chapter.missions[0] === mission.id ? chapter.flightIn : undefined;
  const asteroids = kind === 'moon-mars' ? NEOWS.asteroids : undefined;

  const autopilot = () => {
    const { hits, astronauts } = useFlightHud.getState();
    arrive({ hits: webgl ? hits : 0, astronauts: webgl ? astronauts : 0, autopilot: true });
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      {webgl && (
        <div className="absolute inset-0">
          <FlightScene world={world} from={from} to={to} onArrive={arrive} flareWeight={FLARE_WEIGHT[level]} kind={kind} asteroids={asteroids} />
        </div>
      )}
      <div className="pointer-events-none relative z-10 flex h-full flex-col gap-2 p-2 lg:gap-3 lg:p-3">
        <header className="pointer-events-auto flex items-center gap-2">
          <div className="hud flex min-w-0 items-center gap-3 px-3 py-2">
            <RocketIcon className="shrink-0 text-xl text-sun" />
            <span className="min-w-0 leading-tight">
              {kind && <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-sun">{FLIGHT_TITLE[kind]}</span>}
              <span className="block truncate font-display font-bold">
                <span className="text-ink-faint">Flight to </span>
                {to.name}
              </span>
            </span>
          </div>
          <DataTag className="hidden bg-space-900/80 sm:inline-flex">Time compressed</DataTag>
          <div className="ml-auto flex items-center gap-2">
            <IconButton label="Back to the map" onClick={goHome}>
              <MapIcon />
            </IconButton>
          </div>
        </header>
        {webgl ? (
          <FlightHud to={to.name} touch={touch} hasStation={world === 'moon'} kind={kind} />
        ) : (
          <div className="hud pointer-events-auto m-auto max-w-md p-6 text-center">
            <p className="text-lg">This device can't show the 3D flight.</p>
            <button type="button" onClick={autopilot} className="btn-primary mt-4">
              Continue to the base
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Space (or Enter) skips the touchdown animation once it has started. */
function useSkipLandingKey() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const { status } = useFlightHud.getState();
      if ((status === 'landing' || status === 'landed') && (e.key === 'Enter' || e.key === 'Escape')) {
        useFlightHud.setState({ skipLanding: true });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function FlightHud({ to, touch, hasStation, kind }: { to: string; touch: boolean; hasStation: boolean; kind?: FlightKind }) {
  const hud = useFlightHud();
  const stops: Stop[] = FLIGHT_PHASES.map((phase, i) => {
    const current = FLIGHT_PHASES.indexOf(hud.phase);
    return { label: FLIGHT_PHASE_LABEL[phase], state: i < current ? 'done' : i === current ? 'current' : 'next' };
  });
  return (
    <>
      <Toast />
      {hud.status === 'flying' && <GuideArrow />}
      {hud.status === 'flying' && <AsteroidLabels />}
      {hud.problem?.flare && <div aria-hidden className="flare-vignette pointer-events-none absolute inset-0 -z-0" />}
      {hud.status === 'crashed' && <CrashFlash />}
      {(hud.status === 'landing' || hud.status === 'landed') && <Touchdown place={to} landed={hud.status === 'landed'} />}

      <div className="flex items-start justify-between gap-3">
        {/* Top left: speed and distance to the target. */}
        <section aria-label="Flight readouts" className="hud pointer-events-auto grid grid-cols-2 gap-x-5 gap-y-2 px-3 py-2.5">
          <Readout instant label="Speed" value={hud.speedMs} unit="m/s" size="md" />
          <Readout instant label="To target" value={hud.targetKm} unit="km" size="md" tone="text-sun" />
          <Readout instant label="Altitude" value={hud.altitudeKm} digits={1} unit="km" size="md" className="max-sm:hidden" />
          <div className="max-sm:hidden">
            <Readout instant label="Fuel" value={hud.fuel} unit="%" size="md" tone={hud.fuel < 20 ? 'text-warn' : 'text-ink'} />
            {hud.fuel <= 0 && <p className="mt-1 font-mono text-[11px] uppercase text-warn">Reserve cells only</p>}
          </div>
          {hasStation && (
            <p className="col-span-2 max-w-[17rem] font-mono text-[11px] uppercase leading-snug tracking-[0.08em] text-ink-soft">
              {hud.docked
                ? `Docked at Gateway · ${hud.astronauts} astronauts aboard`
                : `Gateway ${fmt(hud.stationKm)} km · optional dock: +${FLIGHT_EFFECTS.astronautsPerDock} crew, refuel`}
            </p>
          )}
        </section>
        {/* Top right: Safety. */}
        <SafetyRing safety={hud.safety} crashes={hud.crashes} />
      </div>

      <div className="min-h-0 flex-1" />

      <div className="flex flex-wrap items-end gap-3">
        {/* Bottom left: Mission Control (glass), or the key help. */}
        <div className="pointer-events-auto w-full max-w-sm">{hud.problem ? <CommsPanel /> : touch ? <TouchControls /> : <KeyHelp />}</div>
        {/* Bottom centre: the flight timeline. */}
        <div className="hud plain pointer-events-auto mx-auto min-w-[16rem] flex-1 px-4 py-2 sm:max-w-md">
          <Timeline label="Flight phases" stops={stops} />
        </div>
        {/* Bottom right: where the obstacles come from, honestly. */}
        <ObstacleNote kind={kind} />
        {touch && <ThrustButtons />}
      </div>
    </>
  );
}

/** The honest label: real asteroids (sizes and speeds real, positions set by the game), or game-made obstacles. */
function ObstacleNote({ kind }: { kind?: FlightKind }) {
  if (kind === 'moon-mars') {
    return (
      <section aria-label="Where the asteroids come from" className="hud plain pointer-events-auto max-w-xs px-3 py-2">
        <p className="text-sm leading-snug text-ink">
          Real near-Earth asteroids NASA tracked {shortDate(`${NEOWS.startDate}T00:00:00Z`)} to {shortDate(`${NEOWS.endDate}T00:00:00Z`)}.
          Sizes and speeds are real. Positions are set by the game.
        </p>
        <DataTag className="mt-1.5">NASA NeoWs · saved {shortDate(NEOWS.fetchedAt)}</DataTag>
      </section>
    );
  }
  return (
    <p className="hud plain pointer-events-auto max-w-xs px-3 py-2 text-sm leading-snug text-ink-soft">
      Satellites and debris are placed by the game. Real space is far emptier.
    </p>
  );
}

/** Safety 0–100: a ring with the number, and a shape + word (Clean flight at 80+), never colour alone. */
export function SafetyRing({ safety, crashes }: { safety: number; crashes: number }) {
  const shown = Math.round(safety);
  const state = shown >= SAFETY.clean ? 'good' : shown >= 30 ? 'caution' : 'critical';
  const tone = { good: 'text-ok', caution: 'text-warn', critical: 'text-bad' }[state];
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <section aria-label={`Safety ${shown} of 100. ${shown >= SAFETY.clean ? 'Clean flight.' : `${SAFETY.clean} or more at landing is a clean flight.`}`} className="hud pointer-events-auto flex items-center gap-3 px-3 py-2">
      <div className="relative grid h-16 w-16 place-items-center">
        <svg viewBox="0 0 64 64" aria-hidden className="absolute inset-0 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="4" />
          {/* The clean-flight line at 80 */}
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth="6" strokeDasharray={`1.2 ${c}`} strokeDashoffset={-c * (SAFETY.clean / 100)} />
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className={`${tone} motion-safe:transition-all`} strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} />
        </svg>
        <span className="hud-value text-xl">{shown}</span>
      </div>
      <div className="leading-tight">
        <p className="hud-label">Safety</p>
        <p className={`mt-1 flex items-center gap-1 font-mono text-[11px] font-bold uppercase ${tone}`}>
          <StateIcon state={state} /> {shown >= SAFETY.clean ? 'Clean flight' : `${SAFETY.clean}+ = clean`}
        </p>
        <p className="mt-1 font-mono text-[11px] text-ink-faint">
          Pass +{SAFETY.pass} · Graze {SAFETY.graze}
        </p>
        {crashes > 0 && <p className="font-mono text-[11px] text-ink-faint">Restarts: {crashes}</p>}
      </div>
    </section>
  );
}

/** The current in-flight problem: who is calling, what is wrong, what to do, and the real skill behind it. */
function CommsPanel() {
  const problem = useFlightHud((s) => s.problem);
  if (!problem) return null;
  const share = Math.max(0, Math.min(1, problem.left / problem.seconds));
  return (
    <Frame key={problem.id} glass label={`Mission Control · ${problem.from}`} index="MC" aria-label={`${problem.from}: ${problem.title}`} bodyClassName="p-3">
      <p role="status" className="font-display text-lg font-bold">
        {problem.title}
      </p>
      <p className="text-sm text-ink">{problem.message}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-sun">
        <SignalIcon className="shrink-0" /> {problem.action}
      </p>
      <div aria-hidden className="mt-2 h-1 overflow-hidden bg-white/10">
        <div className={`h-full ${problem.flare ? 'bg-warn' : 'bg-white/70'}`} style={{ width: `${share * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        <b className="text-ink">Real astronaut skill:</b> {problem.skill}
      </p>
    </Frame>
  );
}

function Toast() {
  const toast = useFlightHud((s) => s.toast);
  const [shown, setShown] = useState(toast);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const id = window.setTimeout(() => setShown(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!shown) return null;
  const tone = { good: 'border-ok/60 text-ok', bad: 'border-bad/60 text-bad', info: 'border-line-strong text-white' }[shown.tone];
  return (
    <p key={shown.id} role="status" className={`hud toast-in absolute left-1/2 top-20 z-20 -translate-x-1/2 border px-4 py-2 font-display font-bold ${tone}`}>
      {shown.text}
    </p>
  );
}

/** A short white-amber flash for a crash (a plain fade with reduced motion). */
function CrashFlash() {
  return (
    <div role="status" className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#ffcf8a]/20 toast-in">
      <p className="hud px-5 py-3 font-mono text-lg font-bold uppercase tracking-[0.14em] text-bad">Impact · restarting flight</p>
    </div>
  );
}

/** "TOUCHDOWN · [place]" stamp, with a Skip button while the landing plays. */
function Touchdown({ place, landed }: { place: string; landed: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] z-20 flex flex-col items-center gap-3">
      {landed && (
        <p
          role="status"
          className={`border-2 border-sun px-5 py-2 font-title text-xl uppercase tracking-[0.12em] text-sun ${reduced ? 'toast-in' : 'touchdown-stamp'}`}
        >
          Touchdown · {place}
        </p>
      )}
      <button type="button" onClick={() => useFlightHud.setState({ skipLanding: true })} className="btn-secondary pointer-events-auto min-h-11 bg-space-900/80 px-4 text-sm">
        Skip <kbd className="key">Enter</kbd>
      </button>
    </div>
  );
}

/** Real NASA names next to the nearest asteroids, with a warning shape on potentially hazardous ones. */
function AsteroidLabels() {
  const labels = useFlightHud((s) => s.labels);
  return (
    <>
      {labels.map((label) => (
        <div
          key={label.key}
          aria-hidden
          className="pointer-events-none absolute z-0 -translate-y-full"
          style={{ left: `${50 + label.x * 50}%`, top: `${50 - label.y * 50}%` }}
        >
          <div className="ml-3 -mt-2 whitespace-nowrap border-l border-line-strong pl-1.5 font-mono text-[11px] leading-tight">
            <span className="flex items-center gap-1 text-ink">
              {label.hazardous && (
                <svg viewBox="0 0 12 12" className="h-3 w-3 text-warn" aria-hidden>
                  <path d="M6 1 L11 10.5 H1 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M6 4.5 V7.2 M6 8.6 V9" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              )}
              {label.name}
            </span>
            <span className="block text-ink-faint">
              {fmt(label.diameterM ?? 0)} m · {fmt(label.speedKmS ?? 0, 1)} km/s{label.hazardous ? ' · hazardous' : ''}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

/** The destination pin on the landing site, or an arrow at the screen edge pointing to it when it is out of view. */
function GuideArrow() {
  const guide = useFlightHud((s) => s.guide);
  const targetKm = useFlightHud((s) => s.targetKm);
  const angle = Math.atan2(-guide.y, guide.x);
  const edge = Math.max(Math.abs(guide.x), Math.abs(guide.y), 1e-3);
  const x = guide.onScreen ? guide.x : guide.x / edge;
  const y = guide.onScreen ? guide.y : guide.y / edge;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${50 + x * 44}%`, top: `${50 - y * 40}%` }}
    >
      {guide.onScreen ? (
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 24 32" className="h-8 w-6 text-sun">
            <path d="M12 31 C12 31 2 18 2 11 a10 10 0 0 1 20 0 c0 7 -10 20 -10 20 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="11" r="3.5" fill="currentColor" />
          </svg>
          <span className="mt-1 bg-space-950/70 px-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-sun">Land · {fmt(targetKm)} km</span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: `rotate(${angle}rad)` }}>
            <path d="M6 9 L28 17 L6 25 L11 17 Z" fill="#FFB547" />
          </svg>
          <span className="bg-space-950/70 px-1 font-mono text-[11px] font-bold text-sun">{fmt(targetKm)} km</span>
        </div>
      )}
    </div>
  );
}

function KeyHelp() {
  const key = 'key h-6 min-w-6 text-xs';
  return (
    <div className="hud plain hidden space-y-1 px-3 py-2 text-xs text-ink-soft lg:block">
      <p>
        <kbd className={key}>W</kbd> <kbd className={key}>S</kbd> engine forward / brake
      </p>
      <p>
        <kbd className={key}>A</kbd> <kbd className={key}>D</kbd> turn left / right
      </p>
      <p>
        <kbd className={key}>Space</kbd> <kbd className={key}>Shift</kbd> rise / sink
      </p>
      <p>
        <kbd className={key}>↑</kbd> <kbd className={key}>↓</kbd> tilt the nose
      </p>
    </div>
  );
}

/** Hold-to-steer buttons for touch screens (each 56 px). */
function HoldButton({ axis, value, label, children }: { axis: keyof ShipInput; value: number; label: string; children: ReactNode }) {
  const set = (on: boolean) => (e: PointerEvent) => {
    e.preventDefault();
    touchAxes[axis] = on ? value : 0;
  };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onPointerLeave={set(false)}
      className="hud-btn touch-none select-none font-mono text-sm font-bold"
    >
      {children}
    </button>
  );
}

export function TouchControls() {
  return (
    <div className="grid w-max grid-cols-3 gap-1.5">
      <span />
      <HoldButton axis="lift" value={1} label="Rise">
        <ChevronIcon className="rotate-180" />
      </HoldButton>
      <span />
      <HoldButton axis="turn" value={-1} label="Turn left">
        <ChevronIcon className="rotate-90" />
      </HoldButton>
      <HoldButton axis="lift" value={-1} label="Sink">
        <ChevronIcon />
      </HoldButton>
      <HoldButton axis="turn" value={1} label="Turn right">
        <ChevronIcon className="-rotate-90" />
      </HoldButton>
    </div>
  );
}

export function ThrustButtons() {
  return (
    <div className="pointer-events-auto flex flex-col gap-1.5">
      <HoldButton axis="thrust" value={1} label="Thrust">
        GO
      </HoldButton>
      <HoldButton axis="thrust" value={-1} label="Brake">
        STOP
      </HoldButton>
    </div>
  );
}
