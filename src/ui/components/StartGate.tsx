// Built with help from Claude (Anthropic).
// The first thing on screen when Luna opens: one Start button (Boss, 15 Nov). Nothing 3D loads
// until it is pressed, and the press also unlocks sound (browsers need a click first).
import { useEffect, useState, type ReactNode } from 'react';
import { PrimaryButton } from './deck/PrimaryButton';
import { LoadingTrailer } from './LoadingScreen';

export function StartGate({ children }: { children: ReactNode }) {
  const [started, setStarted] = useState(import.meta.env.MODE === 'test'); // play-tests start past the gate
  const [loading, setLoading] = useState(import.meta.env.MODE !== 'test');
  useEffect(() => {
    if (started || loading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') setStarted(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, loading]);
  if (started) return <>{children}</>;
  // The loading trailer plays first; then the Start button (it also unlocks sound).
  if (loading) return <LoadingTrailer onDone={() => setLoading(false)} />;
  return (
    <main className="start-gate fixed inset-0 flex flex-col items-center justify-center gap-8 bg-black px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">Team GWIN · NASA Space Apps 2026</p>
      <h1 className="text-5xl font-semibold tracking-wide sm:text-7xl">LUNA</h1>
      <p className="max-w-sm opacity-80">Junior Astronaut Mission Trainer</p>
      <PrimaryButton autoFocus hint="Enter" className="pulse-soft" onClick={() => setStarted(true)}>
        Start
      </PrimaryButton>
    </main>
  );
}
