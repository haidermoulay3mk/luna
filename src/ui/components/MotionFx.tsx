// Built with help from Claude (Anthropic).
// Motion everywhere (Boss: "add an animation to when clicking on buttons, increase motion
// graphics"): every button press squashes and springs back, throws an amber ring and sparks out
// from the pointer and clicks softly; every screen change sweeps an amber scan line down the view.
// Pure CSS animations (index.css), no images. With reduced motion only the sound stays.
import { useEffect, useRef, useState } from 'react';
import type { Screen } from '../../store/gameStore';
import { usePrefersReducedMotion } from '../hooks';
import { sfx } from '../sound';

const PRESSABLE = 'button:not(:disabled), a[href], [role="button"], summary';

export function ClickFx() {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target.closest<HTMLElement>(PRESSABLE) : null;
      if (!target) return;
      sfx.click();
      if (reduced) return;
      // Squash and spring back.
      target.classList.remove('btn-pop');
      void target.offsetWidth; // restarts the animation on quick repeat presses
      target.classList.add('btn-pop');
      window.setTimeout(() => target.classList.remove('btn-pop'), 300);
      // Ring and sparks at the pointer.
      const fx = document.createElement('div');
      fx.className = 'click-fx';
      fx.setAttribute('aria-hidden', 'true');
      fx.style.left = `${e.clientX}px`;
      fx.style.top = `${e.clientY}px`;
      const ring = document.createElement('div');
      ring.className = 'click-fx-ring';
      fx.appendChild(ring);
      for (let i = 0; i < 8; i++) {
        const spark = document.createElement('div');
        spark.className = 'click-fx-spark';
        spark.style.setProperty('--a', `${i * 45 + Math.random() * 20}deg`);
        fx.appendChild(spark);
      }
      document.body.appendChild(fx);
      window.setTimeout(() => fx.remove(), 650);
    };
    // Keyboard presses get the same feedback: 1–4 press the matching choice, Space/Enter the focused button.
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || reduced) return;
      const target =
        /^[1-4]$/.test(e.key)
          ? document.querySelector<HTMLElement>(`[aria-keyshortcuts="${e.key}"]`)
          : e.key === 'Enter' || e.key === ' '
            ? document.activeElement instanceof HTMLButtonElement
              ? document.activeElement
              : null
            : null;
      if (!target) return;
      target.classList.remove('btn-pop');
      void target.offsetWidth;
      target.classList.add('btn-pop');
      window.setTimeout(() => target.classList.remove('btn-pop'), 300);
    };
    document.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
  }, [reduced]);
  return null;
}

/** An amber scan line sweeps down over a dark veil each time the screen changes. */
export function ScreenWipe({ screen }: { screen: Screen }) {
  const reduced = usePrefersReducedMotion();
  const first = useRef(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setKey((k) => k + 1);
  }, [screen]);
  if (reduced || key === 0) return null;
  return <div key={key} aria-hidden className="screen-wipe" onAnimationEnd={() => setKey(0)} />;
}
