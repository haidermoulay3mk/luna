// Built with help from Claude (Anthropic).
// The mission screen (LUNA_BUILD A2.5). The 3D base fills the window. From 1024 px a mission-
// control grid sits over it: left rail (the three gauges and a Systems frame with the other nine
// tracked factors, where the Ripple lights up), the event card docked bottom centre, and a right
// rail (objective, timer ring, sol, space weather, Mars Cargo). The goal track runs along the top
// and the chapter's mission track sits bottom left. Under 1024 px: the compact mobile layout.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ORDERS, chapterForMission } from '../../data/content';
import { trackView } from '../../engine/campaign';
import { useCan3D } from '../../scene/space/webgl';
import { WalkScene } from '../../scene/walk/WalkScene';
import { missionSite, outpostOfMission } from '../../scene/walk/objective';
import { useWalk } from '../../store/walk';
import { ControlsHint, InteractPrompt, ObjectivePanel, TouchPad } from '../components/WalkHud';
import { CrewInScene, useMyBand } from '../../net/CrewInScene';
import { usePrefersReducedMotion } from '../hooks';
import { GAUGE_IDS, SPARE_PARTS } from '../../engine/balance';
import { gaugesOf } from '../../engine/reducer';
import { FACTOR_LABEL, HIGHER_IS_WORSE, type Factor } from '../../engine/ripple';
import type { GaugeId } from '../../engine/types';
import { MoonbaseScene } from '../../scene/MoonbaseScene';
import { useCardTimer } from '../../store/cardTimer';
import { sceneFocus, useGameStore } from '../../store/gameStore';
import { HelpDialog, SettingsDialog } from '../components/Dialog';
import { EventCard } from '../components/EventCard';
import { CargoMeter, GoalStrip } from '../components/GoalStrip';
import { Frame, GaugeTile, Readout, Timeline } from '../components/deck';
import { RippleView, rippleDelays } from '../components/RippleView';
import { SpaceWeatherChip } from '../components/SpaceWeatherChip';
import { Objectives, PartsList, StatusPanel } from '../components/StatusPanel';
import { TimerRing } from '../components/TimerRing';
import { WhyPopup } from '../components/WhyPanel';
import { useIsDesktop, useKeyboardControls } from '../hooks';
import { HelpIcon, LunaMark, MapIcon, SettingsIcon } from '../icons/Icons';

export function Play() {
  useKeyboardControls();
  const desktop = useIsDesktop();

  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      <div className="absolute inset-0">
        <PlayScene overlay={desktop} />
        <p className="sr-only">
          3D view of the base on the surface: a hub with a dome, tunnels to the greenhouse, oxygen plant, water recycler, battery
          bank, radiation shelter and rover garage, a solar field, an antenna, landing pads, the rocket, BOLT the robot and your astronaut.
        </p>
      </div>
      {desktop ? <DeckLayout /> : <CompactLayout />}
      <RippleView />
      <WhyPopup />
    </div>
  );
}

/**
 * The 3D world: walk the astronaut to the mission site (WASD), then the card opens there. If 3D cannot
 * run at all, the 2D drawing of the base is shown and the walk is skipped.
 */
function PlayScene({ overlay }: { overlay: boolean }) {
  const can3D = useCan3D();
  const reduced = usePrefersReducedMotion();
  const world = useGameStore((s) => s.world);
  const mission = useGameStore((s) => s.mission);
  const step = useGameStore((s) => s.step);
  const parts = useGameStore((s) => s.state.parts);
  const progress = useGameStore((s) => s.progress);
  const reachObjective = useGameStore((s) => s.reachObjective);
  const focus = useGameStore(sceneFocus);
  const band = useMyBand();
  const site = useMemo(() => missionSite(mission), [mission]);
  const walking = step === 'walk';
  useEffect(() => {
    if (!can3D && walking) reachObjective();
  }, [can3D, walking, reachObjective]);
  const interactables = useMemo(
    () => (walking ? [{ id: 'mission', x: site.x, z: site.z, radius: site.radius, label: `Start mission: ${mission.title}` }] : []),
    [walking, site, mission.title],
  );
  if (!can3D) return <MoonbaseScene focus={focus} parts={parts} overlay={overlay} />;
  // Camps on Olympus Mons whose missions are done (chapter 6 = the last three Mars missions).
  const marsIndex = progress ? trackView(progress, 'mars').storyIndex : 0;
  const camps = Math.max(0, Math.min(3, marsIndex - (ORDERS.mars.length - 3)));
  return (
    <WalkScene
      world={world}
      parts={parts}
      frozen={!walking}
      interactables={interactables}
      onInteract={reachObjective}
      objective={walking ? { x: site.x, z: site.z, label: site.name } : null}
      reduced={reduced}
      band={band}
      campsReached={camps}
      crew={<CrewInScene />}
      parkedAt={outpostOfMission(mission).pad}
    />
  );
}

/** While walking: the objective on top, the "E" prompt, the controls line and the touch pad. */
function WalkPanel() {
  const mission = useGameStore((s) => s.mission);
  const reachObjective = useGameStore((s) => s.reachObjective);
  const site = useMemo(() => missionSite(mission), [mission]);
  const use = () => {
    if (useWalk.getState().near) reachObjective();
  };
  return (
    <div className="flex w-full max-w-[640px] flex-col gap-2">
      <ObjectivePanel
        index={`M${String(mission.id).padStart(2, '0')}`}
        title={mission.title}
        line={site.line}
        x={site.x}
        z={site.z}
        className="pointer-events-auto"
      />
      <InteractPrompt onUse={use} />
      <ControlsHint className="pointer-events-auto self-center" />
      <TouchPad onUse={use} />
    </div>
  );
}

/** The card, or the walk panel while the astronaut is on the way to the mission site. */
function CardOrWalk({ className }: { className: string }) {
  const step = useGameStore((s) => s.step);
  return step === 'walk' ? <WalkPanel /> : <EventCard className={className} />;
}

/** Under 1024 px: status strip on top, card at the bottom (the earlier layout, restyled). */
function CompactLayout() {
  return (
    <div className="pointer-events-none relative z-10 flex h-full flex-col gap-2 p-2">
      <TopBar />
      <GoalStrip className="pointer-events-auto hidden md:flex" />
      <StatusPanel className="pointer-events-auto" />
      <div className="flex min-h-0 flex-1 items-end">
        <CardOrWalk className="no-scrollbar pointer-events-auto max-h-[52dvh] overflow-y-auto" />
      </div>
    </div>
  );
}

/** From 1024 px: the mission-control grid, 280 px | 1fr | 300 px. */
function DeckLayout() {
  return (
    <div className="pointer-events-none relative z-10 grid h-full grid-rows-[auto_auto_minmax(0,1fr)] gap-2 p-3">
      <TopBar />
      <GoalStrip className="pointer-events-auto h-10" />
      <div className="grid min-h-0 grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(230px,280px)] gap-3">
        <div className="pointer-events-auto flex min-h-0 flex-col gap-3 overflow-y-auto pb-1 pr-1">
          <GaugeRail />
          <SystemsFrame />
          <div className="flex-1" />
          <MissionTrack />
        </div>
        <div className="flex min-h-0 flex-col items-center justify-end">
          <CardOrWalk className="no-scrollbar pointer-events-auto max-h-full w-full max-w-[640px] overflow-y-auto" />
        </div>
        <div className="pointer-events-auto flex min-h-0 flex-col gap-3 overflow-y-auto pb-1 pl-1">
          <Frame index="03" label="Objective" bodyClassName="px-3 pb-3">
            <Objectives />
          </Frame>
          <TimerFrame />
          <SolFrame />
          <SpaceWeatherChip className="w-full" />
          <Frame index="06" label="Mars cargo" bodyClassName="p-3">
            <CargoRail />
          </Frame>
        </div>
      </div>
    </div>
  );
}

/** Left rail: Power, Life Support and Crew as GaugeTiles (tap one to see its parts). */
function GaugeRail() {
  const parts = useGameStore((s) => s.state.parts);
  const outcome = useGameStore((s) => s.outcome);
  const [open, setOpen] = useState<GaugeId | null>(null);
  const gauges = gaugesOf(parts);
  return (
    <Frame index="01" label="Base status" bodyClassName="divide-y divide-line">
      {GAUGE_IDS.map((id) => (
        <div key={id}>
          <GaugeTile
            id={id}
            value={gauges[id]}
            delta={outcome ? Math.round(outcome.after[id]) - Math.round(outcome.before[id]) : null}
            expanded={open === id}
            onClick={() => setOpen(open === id ? null : id)}
          />
          {open === id && <PartsList id={id} parts={parts} className="mx-3 mb-3 mt-0" />}
        </div>
      ))}
    </Frame>
  );
}

/** The nine other tracked factors in a 3 × 3 grid. After a choice, the ones it touched light up in turn (the Ripple). */
const SYSTEMS: Factor[] = ['solar', 'battery', 'oxygen', 'water', 'food', 'health', 'morale', 'radiation', 'spareParts'];

function SystemsFrame() {
  const state = useGameStore((s) => s.state);
  const ripple = useGameStore((s) => s.ripple);
  const rippleOpen = useGameStore((s) => s.rippleOpen);
  const delays = ripple ? rippleDelays(ripple) : {};
  const value = (f: Factor) => (f === 'spareParts' ? state.spareParts : Math.round(state.parts[f as keyof typeof state.parts]));
  const share = (f: Factor) => (f === 'spareParts' ? state.spareParts / SPARE_PARTS.max : value(f) / 100);
  return (
    <Frame
      index="02"
      label="Systems"
      right={rippleOpen && ripple ? <span className="font-mono text-[11px] font-bold text-sun">{ripple.touched} touched</span> : undefined}
      bodyClassName="grid grid-cols-3 gap-1.5 p-2"
    >
      {SYSTEMS.map((f) => {
        const delta = rippleOpen ? ripple?.deltas[f] : undefined;
        const lit = delta !== undefined;
        const good = lit && (HIGHER_IS_WORSE.has(f) ? delta < 0 : delta > 0);
        return (
          <div
            key={f}
            className={`rounded-btn border px-1.5 py-1 ${lit ? 'ripple-chip border-sun bg-sun/10' : 'border-line bg-space-950/40'}`}
            style={lit ? ({ animationDelay: `${delays[f] ?? 0}s` } as CSSProperties) : undefined}
          >
            <p className="truncate font-mono text-[11px] uppercase tracking-[0.06em] text-ink-faint">
              {FACTOR_LABEL[f].replace('Radiation dose', 'Dose').replace('Spare parts', 'Parts')}
            </p>
            <p className="flex items-baseline justify-between gap-1">
              <span className="hud-value text-base">{value(f)}</span>
              {lit && (
                <span className={`font-mono text-[11px] font-bold ${good ? 'text-ok' : 'text-bad'}`}>
                  {delta > 0 ? '▲' : '▼'}
                  {Math.abs(delta)}
                </span>
              )}
            </p>
            <span aria-hidden className="mt-0.5 block h-0.5 bg-white/10">
              <span className={`block h-full ${f === 'radiation' ? 'bg-white/50' : 'bg-white/80'}`} style={{ width: `${Math.max(0, Math.min(1, share(f))) * 100}%` }} />
            </span>
          </div>
        );
      })}
      <p className="col-span-3 font-mono text-[11px] text-ink-faint">Dose: lower is better</p>
    </Frame>
  );
}

/** Bottom left: this chapter's three missions (1 · 2 · 3). */
function MissionTrack() {
  const mission = useGameStore((s) => s.mission);
  const chapter = chapterForMission(mission.id);
  if (!chapter) return null;
  const at = chapter.missions.indexOf(mission.id);
  return (
    <Frame index={String(chapter.id).padStart(2, '0')} label={chapter.title} bodyClassName="px-3 py-2">
      <Timeline
        label={`Chapter ${chapter.id} missions`}
        stops={chapter.missions.map((_, i) => ({ label: `Mission ${i + 1}`, state: i < at ? 'done' : i === at ? 'current' : 'next' }))}
      />
    </Frame>
  );
}

function TimerFrame() {
  const left = useCardTimer((s) => s.left);
  const total = useCardTimer((s) => s.total);
  const phase = useGameStore((s) => s.state.phase);
  if (left === null || total === null || phase !== 'choosing') return null;
  return (
    <Frame index="04" label="Time to decide" bodyClassName="flex items-center gap-3 p-3">
      <TimerRing left={left} total={total} className="h-20 w-20" />
      <p className="text-base text-ink-soft">{total <= 10 ? 'Storm card: 10 seconds.' : 'When time runs out, the crew follows the standard plan.'}</p>
    </Frame>
  );
}

function SolFrame() {
  const sol = useGameStore((s) => s.state.sol);
  const day = useGameStore((s) => s.mission.day);
  const bolt = useGameStore((s) => s.state.bolt);
  return (
    <Frame index="05" label="Mission clock" bodyClassName="grid grid-cols-3 gap-2 p-3">
      <Readout label="Sol" value={sol} size="md" />
      <Readout label="Day" value={day} size="md" />
      <Readout label="BOLT" value={bolt} unit="%" size="md" />
    </Frame>
  );
}

function CargoRail() {
  const progress = useGameStore((s) => s.progress);
  const world = useGameStore((s) => s.world);
  return (
    <>
      <CargoMeter crates={progress?.cargo ?? 0} />
      <p className="mt-2 text-sm text-ink-soft">
        {world === 'moon' ? 'After each mission: +1 crate for each gauge at 60 or more.' : 'Your Moon cargo set your starting gauges here.'}
      </p>
    </>
  );
}

function TopBar() {
  const mission = useGameStore((s) => s.mission);
  const sol = useGameStore((s) => s.state.sol);
  const goHome = useGameStore((s) => s.goHome);
  const [dialog, setDialog] = useState<'settings' | 'help' | null>(null);
  return (
    <header className="pointer-events-auto flex items-center gap-2">
      <div className="hud flex min-w-0 items-center gap-3 px-3 py-2">
        <LunaMark className="hidden shrink-0 text-xl text-sun sm:block" />
        <span className="hidden font-title text-base uppercase tracking-[0.12em] sm:inline">Luna</span>
        <span aria-hidden className="hidden h-5 w-px bg-line-strong sm:block" />
        <span className="min-w-0 truncate font-display font-bold">
          <span className="font-mono text-sm text-ink-faint">M{String(mission.id).padStart(2, '0')} · </span>
          {mission.title}
        </span>
      </div>
      <Chip label="Day">{mission.day}</Chip>
      <Chip label="Sol">{sol}</Chip>
      <div className="lg:hidden">
        <SpaceWeatherChip className="hidden md:flex" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <IconButton label="Back to the map" onClick={goHome}>
          <MapIcon />
        </IconButton>
        <IconButton label="Settings" onClick={() => setDialog('settings')}>
          <SettingsIcon />
        </IconButton>
        <IconButton label="How to play" onClick={() => setDialog('help')}>
          <HelpIcon />
        </IconButton>
      </div>
      <SettingsDialog open={dialog === 'settings'} onClose={() => setDialog(null)} />
      <HelpDialog open={dialog === 'help'} onClose={() => setDialog(null)} />
    </header>
  );
}

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="hud plain hidden flex-col items-center px-3 py-1.5 sm:flex lg:hidden">
      <span className="hud-label">{label}</span>
      <span className="hud-value text-lg">{children}</span>
    </div>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="hud-btn">
      {children}
    </button>
  );
}
