// Built with help from Claude (Anthropic).
// The HUD while walking: the objective (what to do, how far, which way), the "E" prompt when the
// astronaut stands at something usable, a short controls line, and touch buttons on phones/tablets.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { touchInput, useWalk, walkLive } from '../../store/walk';
import { Frame } from './deck';

/** The objective, the live distance and an arrow that points to it relative to the camera. */
export function ObjectivePanel({
  index = '00',
  title,
  line,
  x,
  z,
  className = '',
}: {
  index?: string;
  title: string;
  line: string;
  x: number;
  z: number;
  className?: string;
}) {
  const dist = useRef<HTMLSpanElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const dx = x - walkLive.x;
      const dz = z - walkLive.z;
      if (dist.current) dist.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
      if (arrow.current) {
        // The target's bearing compared with where the camera looks (up = straight ahead).
        const toTarget = Math.atan2(dx, dz);
        const forward = walkLive.camYaw + Math.PI;
        arrow.current.style.transform = `rotate(${forward - toTarget}rad)`;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [x, z]);
  return (
    <Frame index={index} label="Objective" className={className} bodyClassName="flex items-center gap-3 px-3 pb-3">
      <svg ref={arrow} viewBox="0 0 24 24" className="h-10 w-10 shrink-0 text-sun" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <path d="M12 3 L18 16 L12 13 L6 16 Z" fill="currentColor" />
      </svg>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-bold">{title}</p>
        <p className="text-base text-ink-soft">
          {line} · <span ref={dist} className="font-mono text-sun">–</span>
        </p>
      </div>
    </Frame>
  );
}

/** "[E] Start the mission" when standing at something usable. */
export function InteractPrompt({ onUse }: { onUse: () => void }) {
  const near = useWalk((s) => s.near);
  if (!near) return null;
  return (
    <button type="button" onClick={onUse} className="btn-primary pointer-events-auto mx-auto flex items-center gap-3 px-5 text-base">
      <kbd className="rounded-[4px] border border-space-950/40 px-2 font-mono text-sm">E</kbd>
      {near.label}
    </button>
  );
}

export function ControlsHint({ className = '' }: { className?: string }) {
  return (
    <p className={`hud plain hidden px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft md:block ${className}`}>
      <Key>W A S D</Key> move · <Key>Shift</Key> run · <Key>Space</Key> jump · drag or <Key>Q</Key>
      <Key>R</Key> look · <Key>E</Key> use
    </p>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <kbd className="mx-0.5 rounded-[4px] border border-line-strong px-1 text-white">{children}</kbd>;
}

/** Touch screens: a four-way pad, run, jump and use. Writes the same input the keyboard does. */
export function TouchPad({ onUse }: { onUse: () => void }) {
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  useEffect(
    () => () => {
      Object.assign(touchInput, { x: 0, z: 0, run: false, jump: false });
    },
    [],
  );
  if (!touch) return null;
  const hold = (set: () => void, clear: () => void) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      e.preventDefault();
      set();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  });
  const pad = 'hud-btn h-14 w-14 select-none touch-none font-mono text-base';
  return (
    <div className="pointer-events-auto flex items-end justify-between gap-3">
      <div className="grid grid-cols-3 gap-1">
        <span />
        <button type="button" aria-label="Walk forward" className={pad} {...hold(() => (touchInput.z = -1), () => (touchInput.z = 0))}>
          ▲
        </button>
        <span />
        <button type="button" aria-label="Walk left" className={pad} {...hold(() => (touchInput.x = -1), () => (touchInput.x = 0))}>
          ◀
        </button>
        <button type="button" aria-label="Walk back" className={pad} {...hold(() => (touchInput.z = 1), () => (touchInput.z = 0))}>
          ▼
        </button>
        <button type="button" aria-label="Walk right" className={pad} {...hold(() => (touchInput.x = 1), () => (touchInput.x = 0))}>
          ▶
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" className={pad} {...hold(() => (touchInput.run = true), () => (touchInput.run = false))}>
          Run
        </button>
        <button type="button" className={pad} {...hold(() => (touchInput.jump = true), () => (touchInput.jump = false))}>
          Jump
        </button>
        <button type="button" className={pad} onClick={onUse}>
          Use
        </button>
      </div>
    </div>
  );
}
