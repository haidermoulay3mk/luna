// Built with help from Claude (Anthropic).
// "Why?": the short science explanation behind a choice, with its NASA source.
// It pops up after every decision and the player closes it (Boss's design).
import sources from '../../data/sources.json';
import type { GameEvent } from '../../engine/types';
import { TODO_VERIFY } from '../../engine/validate';
import { eventById, useGameStore } from '../../store/gameStore';
import { CautionIcon, WhyIcon } from '../icons/Icons';
import { Dialog } from './Dialog';

export function WhyContent({ event, id }: { event: GameEvent; id?: string }) {
  const source = sources.find((s) => s.id === event.why.sourceId);
  return (
    <div id={id}>
      <p>{event.why.text}</p>
      {source && !source.url ? (
        <p className="mt-3 text-ink-soft">Source: {source.title} (link to be added)</p>
      ) : source ? (
        <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sun underline underline-offset-4">
          Source: {source.title}
        </a>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-warn">
          <CautionIcon className="mt-1 shrink-0" />
          Source not checked yet ({event.why.sourceId === TODO_VERIFY ? TODO_VERIFY : 'unknown source id'})
        </p>
      )}
    </div>
  );
}

/** SPEC 4.6 "Why?": pops up by itself after each decision; the player closes it. */
export function WhyPopup() {
  const whyOpen = useGameStore((s) => s.whyOpen);
  const closeWhy = useGameStore((s) => s.closeWhy);
  const outcome = useGameStore((s) => s.outcome);
  const event = outcome ? eventById(outcome.eventId) : undefined;
  const choice = event?.choices.find((c) => c.id === outcome?.choiceId);
  return (
    <Dialog open={whyOpen && Boolean(event)} onClose={closeWhy} title="Why?">
      {event && (
        <>
          {choice && (
            <p className="flex items-center gap-2 text-ink-soft">
              <WhyIcon className="shrink-0 text-sun" /> You chose: <b className="text-white">{choice.label}</b>
            </p>
          )}
          <div className="mt-3 text-xl leading-relaxed">
            <WhyContent event={event} id="why-text" />
          </div>
          <button type="button" onClick={closeWhy} className="btn-primary mt-5 w-full">
            Got it
          </button>
        </>
      )}
    </Dialog>
  );
}
