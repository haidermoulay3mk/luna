// Built with help from Claude (Anthropic).
// The card timer, shared so the right rail's TimerRing (desktop) shows the same countdown as the
// event card (LUNA_BUILD A2.5). The event card writes it; nothing else does.
import { create } from 'zustand';

interface CardTimer {
  left: number | null;
  total: number | null;
}

export const useCardTimer = create<CardTimer>()(() => ({ left: null, total: null }));
