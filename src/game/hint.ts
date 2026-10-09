// Hint for the player's current position: an error if there is one, else the next logical step.

import { nextStep } from '../engine/solver';
import type { Step } from '../engine/step';
import { type BoardView, type GameError, effectiveGrid, findErrors } from './check';

export type Hint =
  { kind: 'error'; error: GameError } | { kind: 'step'; step: Step } | { kind: 'none' };

export interface HintInput extends BoardView {
  givens: number[];
  solution: number[];
}

export function computeHint(input: HintInput): Hint {
  const errors = findErrors(input, input.givens, input.solution);
  if (errors.length) return { kind: 'error', error: errors[0] };
  const step = nextStep(effectiveGrid(input));
  return step ? { kind: 'step', step } : { kind: 'none' };
}
