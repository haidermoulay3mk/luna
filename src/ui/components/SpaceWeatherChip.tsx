// Built with help from Claude (Anthropic).
// Live Space Weather (SPEC 4.5): a small chip with the risk level and an honest DataTag
// ("NASA DONKI · LIVE" or "NASA DONKI · SAVED 14 NOV"). Clicking it explains what NASA recorded
// and what that changes in the game, with a link to DONKI. Each level has its own shape
// (circle / triangle / octagon), not just a colour.
import { useState } from 'react';
import { FLARE_WEIGHT, riskSentence } from '../../engine/spaceWeather';
import type { GaugeState, RiskLevel } from '../../engine/types';
import { DONKI_PAGE, useSpaceWeather, weatherLabel } from '../../store/spaceWeather';
import { StateIcon } from '../icons/Icons';
import { DataTag, dataTagText } from './deck/DataTag';
import { Dialog } from './Dialog';

export const RISK_SHAPE: Record<RiskLevel, GaugeState> = { LOW: 'good', MODERATE: 'caution', HIGH: 'critical' };
export const RISK_TONE: Record<RiskLevel, string> = { LOW: 'text-ok', MODERATE: 'text-warn', HIGH: 'text-bad' };
export const RISK_WORD: Record<RiskLevel, string> = { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High' };
const IN_GAME: Record<RiskLevel, string> = {
  LOW: 'Solar flare warnings are rare during flights, and storm missions start normally.',
  MODERATE: 'Solar flare warnings come more often during flights, and storm missions start with Radiation dose +5.',
  HIGH: 'Solar flare warnings come often during flights, and storm missions start with Radiation dose +10 and Power −5.',
};

/** The honest DataTag for the space weather on screen right now. */
export function useDonkiTag() {
  const status = useSpaceWeather((s) => s.status);
  const fetchedAt = useSpaceWeather((s) => s.snapshot.fetchedAt);
  return { text: dataTagText('NASA DONKI', status, fetchedAt), live: status === 'live' };
}

export function SpaceWeatherChip({ className = '' }: { className?: string }) {
  const status = useSpaceWeather((s) => s.status);
  const snapshot = useSpaceWeather((s) => s.snapshot);
  const summary = useSpaceWeather((s) => s.summary);
  const tag = useDonkiTag();
  const [open, setOpen] = useState(false);
  const level = summary.level;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`hud plain flex min-h-14 items-center gap-2.5 px-3 py-1.5 text-left hover:border-line-strong hover:bg-space-800 lg:min-h-0 ${className}`}
        aria-label={`Space weather risk: ${RISK_WORD[level]}. ${weatherLabel(status, snapshot)}. Show details.`}
      >
        <StateIcon state={RISK_SHAPE[level]} className={`shrink-0 text-lg ${RISK_TONE[level]}`} />
        <span className="leading-tight">
          <span className="hud-label block">Space weather</span>
          <span className={`block font-mono text-sm font-bold uppercase ${RISK_TONE[level]}`}>{RISK_WORD[level]}</span>
          <DataTag live={tag.live} className="mt-1 border-none px-0 py-0">
            {tag.text}
          </DataTag>
        </span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Space weather">
        <p className={`flex items-center gap-2 font-mono text-lg font-bold uppercase ${RISK_TONE[level]}`}>
          <StateIcon state={RISK_SHAPE[level]} /> Risk: {RISK_WORD[level]}
        </p>
        <p className="mt-2">{riskSentence(summary, snapshot.missing)}</p>
        <p className="mt-3 text-ink">
          <b className="font-display text-white">In the game:</b> {IN_GAME[level]}
        </p>
        <p className="mt-3 font-mono text-xs text-ink-faint">
          {weatherLabel(status, snapshot)}. Flare warnings in flight: ×{FLARE_WEIGHT[level]} as often as usual.
        </p>
        <a href={DONKI_PAGE} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sun underline underline-offset-4">
          Where does this come from? NASA DONKI
        </a>
      </Dialog>
    </>
  );
}
