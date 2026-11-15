// Built with help from Claude (Anthropic).
// Science Card (SPEC 4.6): the mission's real NASA fact, unlocked when the mission is done.
import type { GameEvent } from '../../engine/types';
import { WhyIcon } from '../icons/Icons';
import { WhyContent } from './WhyPanel';

export function ScienceCard({ event }: { event: GameEvent }) {
  return (
    <section aria-label="Science card" className="mt-3 rounded-btn border border-sun/40 bg-sun/5 p-3 text-base">
      <p className="eyebrow flex items-center gap-2">
        <WhyIcon className="text-sun" /> Science card unlocked
      </p>
      <div className="mt-2">
        <WhyContent event={event} />
      </div>
    </section>
  );
}
