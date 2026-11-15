// Built with help from Claude (Anthropic).
// The walkable story moments between missions:
//  · Board: after the Moon chapters, walk to the rocket on the launch pad and launch for Mars
//    (lift-off cut-scene with the flame and rolling smoke), then the flight.
//  · Summit: after the climb, walk to the top of Olympus Mons and plant the mission flag; then
//    Olympus Station's lights come on, as many as the stars earned (LUNA_BUILD B2).
//  · EndingBackdrop: the lit summit in 3D behind the ending recap.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CHAPTERS } from '../../data/content';
import { trackView } from '../../engine/campaign';
import { olympusEnding, totalChapterStars } from '../../engine/chapters';
import { isOlympusEnding, type OlympusEnding } from '../../engine/scoring';
import { CrewInScene, useMyBand } from '../../net/CrewInScene';
import { useCan3D } from '../../scene/space/webgl';
import { LIT_BY_TIER } from '../../scene/walk/Olympus';
import { WalkScene } from '../../scene/walk/WalkScene';
import { ROCKET_SITE, SUMMIT_SITE } from '../../scene/walk/objective';
import { useGameStore } from '../../store/gameStore';
import { useWalk } from '../../store/walk';
import { usePrefersReducedMotion } from '../hooks';
import { ControlsHint, InteractPrompt, ObjectivePanel, TouchPad } from '../components/WalkHud';
import { Frame, PrimaryButton } from '../components/deck';
import { sfx } from '../sound';

function Shell({ children, scene }: { children: ReactNode; scene: ReactNode }) {
  return (
    <div className="relative h-dvh overflow-hidden bg-space-950 text-white">
      <div className="absolute inset-0">{scene}</div>
      <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-between gap-3 p-3 lg:p-5">{children}</div>
    </div>
  );
}

// ---- Board the rocket ----

export function Board() {
  const can3D = useCan3D();
  const reduced = usePrefersReducedMotion();
  const band = useMyBand();
  const parts = useGameStore((s) => s.state.parts);
  const boardRocket = useGameStore((s) => s.boardRocket);
  const [launching, setLaunching] = useState(false);
  useEffect(() => {
    if (!can3D) boardRocket();
  }, [can3D, boardRocket]);
  const interactables = useMemo(
    () => (launching ? [] : [{ id: 'rocket', x: ROCKET_SITE.x, z: ROCKET_SITE.z, radius: ROCKET_SITE.radius, label: 'Board the rocket and launch' }]),
    [launching],
  );
  const launch = () => {
    if (launching) return;
    setLaunching(true);
    sfx.radio();
  };
  const use = () => {
    if (useWalk.getState().near) launch();
  };
  return (
    <Shell
      scene={
        can3D && (
          <WalkScene
            world="moon"
            parts={parts}
            frozen={launching}
            interactables={interactables}
            onInteract={launch}
            objective={{ x: ROCKET_SITE.x, z: ROCKET_SITE.z, label: ROCKET_SITE.name }}
            reduced={reduced}
            band={band}
            launching={launching}
            onLaunched={boardRocket}
            crew={<CrewInScene />}
          />
        )
      }
    >
      {launching ? (
        <p className="hud mt-[18vh] px-5 py-2 font-title text-xl uppercase tracking-[0.14em] text-sun">Lift-off · Moonbase Horizon → Mars</p>
      ) : (
        <>
          <ObjectivePanel index="C4" title="Launch to Mars" line={ROCKET_SITE.line} x={ROCKET_SITE.x} z={ROCKET_SITE.z} className="pointer-events-auto w-full max-w-[640px]" />
          <div className="flex w-full max-w-[640px] flex-col gap-2">
            <InteractPrompt onUse={use} />
            <ControlsHint className="pointer-events-auto self-center" />
            <TouchPad onUse={use} />
          </div>
        </>
      )}
    </Shell>
  );
}

// ---- The summit and the flag ----

/** The ending tier from the saved Mars story (or from the stars if it is not recorded yet). */
function useTier(): OlympusEnding {
  const progress = useGameStore((s) => s.progress);
  if (!progress) return 'beacon';
  const saved = trackView(progress, 'mars').ending;
  return isOlympusEnding(saved) ? saved : olympusEnding(totalChapterStars(progress, CHAPTERS));
}

export function Summit() {
  const can3D = useCan3D();
  const reduced = usePrefersReducedMotion();
  const band = useMyBand();
  const parts = useGameStore((s) => s.state.parts);
  const showEnding = useGameStore((s) => s.showEnding);
  const tier = useTier();
  const [phase, setPhase] = useState<'walk' | 'flag' | 'lights' | 'done'>('walk');
  const [flag, setFlag] = useState(0);
  const [lights, setLights] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!can3D) showEnding();
  }, [can3D, showEnding]);
  // The flag goes up over 2.5 s, then the station's lights come on one by one over 4 s.
  useEffect(() => {
    if (phase !== 'flag' && phase !== 'lights') return;
    const start = performance.now();
    const length = reduced ? 1 : phase === 'flag' ? 2500 : 4000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / length);
      if (phase === 'flag') setFlag(Math.max(0.02, t));
      else setLights(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else if (phase === 'flag') {
        sfx.stamp();
        setPhase('lights');
      } else {
        sfx.chime();
        setPhase('done');
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, reduced]);
  const plant = () => {
    if (phase === 'walk') setPhase('flag');
  };
  const use = () => {
    if (useWalk.getState().near) plant();
  };
  const interactables = useMemo(
    () => (phase === 'walk' ? [{ id: 'flag', x: SUMMIT_SITE.x, z: SUMMIT_SITE.z, radius: SUMMIT_SITE.radius, label: 'Plant the mission flag' }] : []),
    [phase],
  );
  const lit = LIT_BY_TIER[tier];
  return (
    <Shell
      scene={
        can3D && (
          <WalkScene
            world="mars"
            parts={parts}
            frozen={phase !== 'walk'}
            interactables={interactables}
            onInteract={plant}
            objective={phase === 'walk' ? { x: SUMMIT_SITE.x, z: SUMMIT_SITE.z, label: SUMMIT_SITE.name } : null}
            reduced={reduced}
            band={band}
            campsReached={3}
            flag={phase === 'walk' ? 0 : flag}
            station={phase === 'lights' || phase === 'done' ? { tier, progress: lights } : null}
            crew={<CrewInScene />}
          />
        )
      }
    >
      {phase === 'walk' ? (
        <>
          <ObjectivePanel index="C6" title="The summit" line={SUMMIT_SITE.line} x={SUMMIT_SITE.x} z={SUMMIT_SITE.z} className="pointer-events-auto w-full max-w-[640px]" />
          <div className="flex w-full max-w-[640px] flex-col gap-2">
            <InteractPrompt onUse={use} />
            <ControlsHint className="pointer-events-auto self-center" />
            <TouchPad onUse={use} />
          </div>
        </>
      ) : (
        <>
          <p className="hud mt-[14vh] px-5 py-2 font-title text-xl uppercase tracking-[0.12em] text-sun">First light on Olympus</p>
          {phase === 'done' && (
            <Frame index="★" label="Olympus Station" className="pointer-events-auto w-full max-w-md" bodyClassName="flex flex-col gap-3 p-4">
              <p className="text-lg">
                <span className="hud-value">{lit}</span> of 5 station modules lit. The crew planted the flag on the caldera rim.
              </p>
              <PrimaryButton onClick={showEnding}>See your ending</PrimaryButton>
            </Frame>
          )}
        </>
      )}
    </Shell>
  );
}

/** The ending recap sits over the lit summit, in 3D. */
export function EndingBackdrop({ children }: { children: ReactNode }) {
  const can3D = useCan3D();
  const reduced = usePrefersReducedMotion();
  const band = useMyBand();
  const parts = useGameStore((s) => s.state.parts);
  const tier = useTier();
  const none = useMemo(() => [], []);
  return (
    <div className="relative h-dvh overflow-hidden bg-space-950">
      {can3D && (
        <div className="absolute inset-0">
          <WalkScene
            world="mars"
            parts={parts}
            frozen
            interactables={none}
            onInteract={() => {}}
            objective={null}
            reduced={reduced}
            band={band}
            campsReached={3}
            flag={1}
            station={{ tier, progress: 1 }}
            crew={<CrewInScene />}
          />
        </div>
      )}
      <div className="relative z-10 h-full overflow-y-auto p-3 lg:p-5">{children}</div>
    </div>
  );
}
