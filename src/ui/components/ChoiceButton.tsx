// Built with help from Claude (Anthropic).
// One choice on the event card, kept compact: key hint [1] and label on top, then one short
// line each for what you gain, what it costs and any risk (arrow / warning icons, not colour alone).
// Flight Deck: a slim outlined row, accent edge on hover, mono key hint.
import { sfx } from '../sound';
import type { CSSProperties, ReactNode } from 'react';
import type { Choice } from '../../engine/types';
import { CautionIcon, CostIcon, GainIcon, RiskIcon } from '../icons/Icons';

export function ChoiceButton({ choice, index, onPick }: { choice: Choice; index: number; onPick: () => void }) {
  return (
    <button onMouseEnter={() => sfx.hover()}
      type="button"
      onClick={onPick}
      aria-keyshortcuts={String(index + 1)}
      style={{ '--i': index } as CSSProperties}
      className="choice-row group flex min-h-14 w-full flex-col rounded-btn border border-line bg-space-950/40 px-3 py-2.5 text-left hover:border-sun/70 hover:bg-space-800"
    >
      <span className="flex items-center gap-2">
        <kbd className="choice-key font-mono text-xs font-bold text-sun" aria-hidden>
          [{index + 1}]
        </kbd>
        <span className="font-display text-base font-bold leading-snug">{choice.label}</span>
      </span>
      <span className="mt-1.5 flex flex-col gap-0.5 text-sm leading-snug">
        <Line icon={<GainIcon className="text-ok" />} label="Gain">
          {choice.benefit}
        </Line>
        <Line icon={<CostIcon className="text-bad" />} label="Cost">
          {choice.cost}
        </Line>
        {choice.risk && (
          <Line icon={choice.riskChance ? <RiskIcon className="text-warn" /> : <CautionIcon className="text-warn" />} label="Risk">
            <span className="text-ink-soft">{choice.risk}</span>
          </Line>
        )}
      </span>
    </button>
  );
}

function Line({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <span className="flex items-start gap-1.5 text-ink">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="sr-only">{label}:</span>
      <span>{children}</span>
    </span>
  );
}
