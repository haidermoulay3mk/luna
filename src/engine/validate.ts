// Built with help from Claude (Anthropic).
// Content checks for events and missions. engine.test.ts runs these over all game data,
// so a free choice, a hidden risk or a missing default makes `npm test` fail.
import { EFFECT_SIZE, SPARE_PARTS, TEXT_LIMITS, TIME_MAX } from './balance';
import { isCost } from './reducer';
import type { Effect, GameEvent, Mission } from './types';

/** sourceId for a fact with no checked NASA source yet. Listed at the end of every phase. */
export const TODO_VERIFY = 'TODO_VERIFY';

/** Counts words; a lone symbol such as "&" is not a word. */
const wordCount = (text: string) => text.trim().split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

function checkEffect(effect: Effect, where: string): string[] {
  const errors: string[] = [];
  const { target, delta, delaySols } = effect;
  if (!Number.isFinite(delta) || delta === 0) {
    errors.push(`${where}: delta must be a non-zero number`);
  } else if (target === 'spareParts') {
    if (!Number.isInteger(delta) || Math.abs(delta) > SPARE_PARTS.max) errors.push(`${where}: spare parts change must be a whole number up to ${SPARE_PARTS.max}`);
  } else if (target === 'time') {
    if (!Number.isInteger(delta) || delta < 1 || delta > TIME_MAX) errors.push(`${where}: time must be 1 to ${TIME_MAX} sols`);
    if (delaySols) errors.push(`${where}: a time cost cannot be delayed`);
  } else if (target !== 'progress') {
    const size = Math.abs(delta);
    if (size < EFFECT_SIZE.min || size > EFFECT_SIZE.max) {
      errors.push(`${where}: ${target} ${delta} is outside ±${EFFECT_SIZE.min} to ±${EFFECT_SIZE.max}`);
    }
  }
  if (delaySols !== undefined && (!Number.isInteger(delaySols) || delaySols < 0)) {
    errors.push(`${where}: delaySols must be a whole number, 0 or more`);
  }
  return errors;
}

/** Returns a list of problems; an empty list means the event is good to ship. */
export function validateEvent(event: GameEvent, sourceIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const at = `event ${event.id}`;

  const [minTitle, maxTitle] = TEXT_LIMITS.titleWords;
  const titleWords = wordCount(event.title);
  if (titleWords < minTitle || titleWords > maxTitle) errors.push(`${at}: title should be ${minTitle}–${maxTitle} words`);
  if (wordCount(event.context) > TEXT_LIMITS.contextWords) errors.push(`${at}: context is over ${TEXT_LIMITS.contextWords} words`);

  const [minChoices, maxChoices] = TEXT_LIMITS.choices;
  if (event.choices.length < minChoices || event.choices.length > maxChoices) {
    errors.push(`${at}: needs ${minChoices}–${maxChoices} choices, has ${event.choices.length}`);
  }

  const ids = new Set<string>();
  for (const choice of event.choices) {
    const where = `${at} choice ${choice.id}`;
    if (ids.has(choice.id)) errors.push(`${where}: duplicate choice id`);
    ids.add(choice.id);
    if (wordCount(choice.label) > TEXT_LIMITS.labelWords) errors.push(`${where}: label is over ${TEXT_LIMITS.labelWords} words`);
    if (!choice.result.trim()) errors.push(`${where}: missing result sentence`);
    choice.effects.forEach((effect, i) => errors.push(...checkEffect(effect, `${where} effect ${i}`)));

    // SPEC 4.3 "No free choice": every choice must cost something.
    if (!choice.effects.some(isCost)) errors.push(`${where}: free choice (every choice needs at least one cost)`);

    // SPEC 4.3 "No luck-only outcomes": a random roll is only allowed for a risk shown on the card.
    const rolls = choice.riskChance !== undefined || (choice.riskEffects?.length ?? 0) > 0;
    if (rolls) {
      const chance = choice.riskChance ?? 0;
      if (!choice.risk?.trim()) errors.push(`${where}: a random risk needs risk text on the card`);
      if (!(chance > 0 && chance <= 1)) errors.push(`${where}: riskChance must be above 0 and at most 1`);
      if (!choice.riskEffects?.length) errors.push(`${where}: riskChance without riskEffects`);
      choice.riskEffects?.forEach((effect, i) => {
        errors.push(...checkEffect(effect, `${where} risk effect ${i}`));
        if (!isCost(effect)) errors.push(`${where} risk effect ${i}: a risk must be a cost`);
      });
    }
  }

  if (event.urgent) {
    if (!event.defaultChoiceId) errors.push(`${at}: urgent events need a defaultChoiceId`);
    else if (!ids.has(event.defaultChoiceId)) errors.push(`${at}: defaultChoiceId "${event.defaultChoiceId}" is not one of its choices`);
  }

  if (!event.why.text.trim()) errors.push(`${at}: missing Why? text`);
  if (event.why.sourceId !== TODO_VERIFY && !sourceIds.has(event.why.sourceId)) {
    errors.push(`${at}: sourceId "${event.why.sourceId}" is not in sources.json`);
  }
  return errors;
}

export function validateMission(mission: Mission, events: ReadonlyMap<string, GameEvent>): string[] {
  const errors: string[] = [];
  const at = `mission ${mission.id}`;
  if (mission.eventIds.length === 0) errors.push(`${at}: has no events`);
  if (!Number.isInteger(mission.sols) || mission.sols < 0) errors.push(`${at}: sols must be a whole number, 0 or more`);
  if (!Number.isInteger(mission.day) || mission.day < 1) errors.push(`${at}: day must be a whole number, 1 or more`);
  if (mission.successIf.length === 0) errors.push(`${at}: needs at least one successIf objective`);
  for (const id of mission.eventIds) {
    const event = events.get(id);
    if (!event) errors.push(`${at}: event "${id}" not found`);
    else if (event.missionId !== mission.id) errors.push(`${at}: event "${id}" belongs to mission ${event.missionId}`);
  }
  return errors;
}
