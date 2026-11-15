// Built with help from Claude (Anthropic).
import { useEffect, useState } from 'react';
import { currentEvent, useGameStore } from '../store/gameStore';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** SPEC Part 8: every effect has a reduced-motion version. */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** SPEC Part 6: desktop layout from 1024 px. */
// The three-column mission deck needs room: on smaller or zoomed laptop screens the compact layout is
// used instead, so panels never overlap (friend's laptop, 15 Nov).
export const useIsDesktop = () => useMediaQuery('(min-width: 1280px) and (min-height: 720px)');

/** SPEC Part 10 keys during a mission: 1–4 pick a choice, Space continues, W opens Why?. */
export function useKeyboardControls() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (document.querySelector('dialog[open]')) return; // settings or help is open
      const store = useGameStore.getState();
      if (store.screen !== 'play') return;
      const onControl = e.target instanceof Element && e.target.closest('button, a, input, select, textarea') !== null;
      const playing = store.step === 'playing';

      // The Ripple view plays after a choice: Enter or Space skips it (then Why? opens).
      if (store.rippleOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          store.finishRipple();
        }
        return;
      }

      if (playing && store.state.phase === 'choosing' && /^[1-4]$/.test(e.key)) {
        const choice = currentEvent(store)?.choices[Number(e.key) - 1];
        if (choice) {
          e.preventDefault();
          store.choose(choice.id);
        }
        return;
      }
      // A focused button already handles Space itself.
      if (e.key === ' ' && !onControl) {
        if (store.step === 'briefing') store.nextBriefingPage();
        else if (store.state.phase === 'outcome') store.next();
        else return;
        e.preventDefault();
        return;
      }
      if (e.key.toLowerCase() === 'w' && playing && store.state.phase !== 'choosing') store.toggleWhy();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
