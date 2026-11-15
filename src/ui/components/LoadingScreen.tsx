// Built with help from Claude (Anthropic).
// Loading screen (Boss, 15 Nov): "Loading" in the middle, "Made with real NASA data" under it, and
// behind it a rocket flying to Mars. The "video" is an animation drawn in code (CSS + SVG) over
// NASA's real Viking map of Mars: no AI-generated video (CLAUDE.md rule 2), nothing to download.
import { useEffect, useRef, useState } from 'react';
import marsUrl from '../../assets/mars-color-2k.jpg';
import { SHOT_CAPTION, TRAILER_SECONDS, TrailerScene } from '../../scene/Trailer';
import { useCan3D } from '../../scene/space/webgl';
import { usePrefersReducedMotion } from '../hooks';

/**
 * The loading screen with the 3D trailer behind it. Calls onDone when the trailer ends or is
 * skipped (Skip button, Enter, Space or Escape). No WebGL: the 2D version for a few seconds.
 */
export function LoadingTrailer({ onDone }: { onDone: () => void }) {
  const can3D = useCan3D();
  const reduced = usePrefersReducedMotion();
  const clock = useRef(0);
  const [t, setT] = useState(0);
  const done = useRef(false);
  const finish = useRef(onDone);
  finish.current = onDone;
  const end = () => {
    if (done.current) return;
    done.current = true;
    finish.current();
  };
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!can3D) clock.current += 0.1;
      setT(clock.current);
      if (clock.current >= (can3D ? TRAILER_SECONDS : 4)) end();
    }, 100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        end();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [can3D]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!can3D) return <LoadingScreen />;
  const progress = Math.min(1, t / TRAILER_SECONDS);
  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-black" aria-busy="true">
      <div className="absolute inset-0">
        <TrailerScene clock={clock} reduced={reduced} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">{SHOT_CAPTION(t)}</p>
        <p className="font-title text-3xl uppercase tracking-[0.2em] text-white sm:text-4xl">
          Loading<span className="loading-dots" aria-hidden />
        </p>
        <p className="font-mono text-sm uppercase tracking-[0.25em] text-sun">Made with real NASA data</p>
        <div className="mt-2 h-1 w-64 max-w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Loading">
          <div className="h-full bg-sun" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <button type="button" onClick={end} className="btn-secondary absolute right-4 top-4 min-h-11">
        Skip <kbd className="key">Enter</kbd>
      </button>
    </main>
  );
}

export function LoadingScreen() {
  return (
    <main className="loading-screen fixed inset-0 z-50 overflow-hidden bg-black" aria-busy="true">
      {/* Stars rushing past (two layers at different speeds). */}
      <div className="loading-stars loading-stars-a" aria-hidden />
      <div className="loading-stars loading-stars-b" aria-hidden />
      {/* Mars, growing as the rocket gets closer. */}
      <div className="loading-mars" aria-hidden style={{ backgroundImage: `url(${marsUrl})` }} />
      {/* The rocket, heading for Mars, with a flickering engine flame. */}
      <svg className="loading-rocket" viewBox="0 0 60 140" aria-hidden>
        <path className="loading-flame" d="M22 108 Q30 140 38 108 Z" fill="#FFB547" />
        <path d="M30 4 C44 22 46 50 44 104 L16 104 C14 50 16 22 30 4 Z" fill="#ECEAE4" />
        <path d="M30 4 C36 12 39 20 41 30 L19 30 C21 20 24 12 30 4 Z" fill="#c9cdd6" />
        <circle cx="30" cy="52" r="6" fill="#1b2433" stroke="#9aa0aa" strokeWidth="2" />
        <path d="M16 80 L4 106 L16 102 Z M44 80 L56 106 L44 102 Z" fill="#c45a3c" />
        <rect x="20" y="102" width="20" height="6" rx="2" fill="#6b7280" />
      </svg>
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-title text-4xl uppercase tracking-[0.2em] text-white sm:text-5xl">
          Loading<span className="loading-dots" aria-hidden />
        </p>
        <p className="font-mono text-sm uppercase tracking-[0.25em] text-sun">Made with real NASA data</p>
      </div>
    </main>
  );
}
