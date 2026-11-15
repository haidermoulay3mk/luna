// Built with help from Claude (Anthropic).
// First-time tutorial: 4 short steps before Mission 1 (the 3 gauges, every choice costs
// something, the timer, Why?). Skippable, and it only runs once per commander.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EVENTS } from '../../data/content';
import { DIFFICULTY, STORM_SECONDS, GAUGE_IDS, GAUGE_LABEL } from '../../engine/balance';
import type { GaugeId } from '../../engine/types';
import { difficultyOf, useGameStore } from '../../store/gameStore';
import { GAUGE_TEXT } from '../components/Gauge';
import { TimerRing } from '../components/TimerRing';
import { CautionIcon, CostIcon, CriticalIcon, GAUGE_ICON, GainIcon, GoodIcon, RocketIcon, WhyIcon } from '../icons/Icons';

const GAUGE_INFO: Record<GaugeId, string> = {
  power: 'Electricity from the solar panels and batteries.',
  life: 'Air, water and food for the crew.',
  crew: 'Health, mood and safety from radiation.',
};

export function Tutorial() {
  const name = useGameStore((s) => s.progress?.name ?? 'Commander');
  const difficulty = useGameStore(difficultyOf);
  const firstTime = useGameStore((s) => (s.progress?.storyIndex ?? 0) === 0 && Object.keys(s.progress?.stars ?? {}).length === 0);
  const finish = useGameStore((s) => s.finishTutorial);
  const [step, setStep] = useState(0);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [step]);

  const timer = DIFFICULTY[difficulty].timerSeconds;
  const example = EVENTS[0]?.choices[0];

  const steps: { title: string; body: ReactNode }[] = [
    {
      title: 'Your base has 3 gauges',
      body: (
        <>
          <ul className="space-y-3">
            {GAUGE_IDS.map((id) => {
              const Icon = GAUGE_ICON[id];
              return (
                <li key={id} className="flex items-center gap-3">
                  <Icon className={`shrink-0 text-3xl ${GAUGE_TEXT[id]}`} />
                  <span>
                    <b className="font-display">{GAUGE_LABEL[id]}:</b> {GAUGE_INFO[id]}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4">Keep them out of the red. A shape shows how each one is doing:</p>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-bold">
            <span className="inline-flex items-center gap-1.5 text-ok">
              <GoodIcon /> Good
            </span>
            <span className="inline-flex items-center gap-1.5 text-warn">
              <CautionIcon /> Caution
            </span>
            <span className="inline-flex items-center gap-1.5 text-bad">
              <CriticalIcon /> Critical
            </span>
          </p>
        </>
      ),
    },
    {
      title: 'Every choice costs something',
      body: (
        <>
          <p>Every choice helps something and costs something. There is no free choice!</p>
          {example && (
            <div className="mt-4 rounded-panel border border-line bg-white/[0.04] px-4 py-3">
              <p className="font-display text-xl font-bold">{example.label}</p>
              <p className="mt-2 flex items-center gap-1.5">
                <GainIcon className="text-ok" /> <span className="sr-only">Gain:</span>
                {example.benefit}
              </p>
              <p className="flex items-center gap-1.5">
                <CostIcon className="text-bad" /> <span className="sr-only">Cost:</span>
                {example.cost}
              </p>
            </div>
          )}
          <p className="mt-4">Green arrow up: what you gain. Red arrow down: what it costs.</p>
        </>
      ),
    },
    {
      title: timer ? 'Every card has a timer' : 'Take your time',
      body: (
        <>
          <div className="flex items-center gap-4">
            <TimerRing left={timer ?? 10} total={timer ?? 10} />
            <p>{timer ? `You have ${timer} seconds for each card. Storm cards give you ${STORM_SECONDS}.` : 'On Explorer there is no timer.'}</p>
          </div>
          <p className="mt-3">
            {timer
              ? 'If time runs out, the crew follows the standard plan.'
              : 'On harder levels, every card has a timer.'}
          </p>
        </>
      ),
    },
    {
      title: 'Your choices change the base',
      body: (
        <>
          <p>Every decision changes your base: the lights, the batteries, the plants and more.</p>
          <p className="mt-3 flex items-start gap-2">
            <WhyIcon className="mt-1 shrink-0 text-sun" />
            <span>
              After each choice, a <b>Why?</b> note shows the real NASA science behind it.
            </span>
          </p>
          <p className="mt-3 flex items-start gap-2">
            <RocketIcon className="mt-1 shrink-0 text-sun" />
            <span>
              Between missions you fly your rocket across the Moon: <kbd className="key">W</kbd> <kbd className="key">A</kbd>{' '}
              <kbd className="key">S</kbd> <kbd className="key">D</kbd> to steer. Dodge the rocks!
            </span>
          </p>
          <p className="mt-3 font-display font-bold">The crew is counting on you, Commander {name}!</p>
        </>
      ),
    },
  ];
  const last = step === steps.length - 1;

  return (
    <>
      <section
        aria-labelledby="tutorial-title"
        className="hud mx-auto w-full max-w-xl p-6 lg:pointer-events-auto lg:absolute lg:left-6 lg:top-1/2 lg:mx-0 lg:w-[34rem] lg:-translate-y-1/2"
      >
        <p className="eyebrow">
          How to play · Step {step + 1} of {steps.length}
        </p>
        <h1 id="tutorial-title" className="mt-2 font-display text-3xl font-bold tracking-tight">
          {steps[step].title}
        </h1>
        <div className="mt-4">{steps[step].body}</div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button ref={primary} type="button" onClick={() => (last ? finish() : setStep(step + 1))} className="btn-primary">
            {last ? (firstTime ? 'Start Mission 1' : 'Back to the map') : 'Next'}
          </button>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary">
              Back
            </button>
          )}
          {!last && (
            <button type="button" onClick={finish} className="btn-secondary sm:ml-auto">
              Skip tutorial
            </button>
          )}
        </div>
      </section>
    </>
  );
}
