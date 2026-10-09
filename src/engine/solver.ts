// Human-style solver: repeatedly applies the simplest technique that makes progress.

import { type Grid, cloneGrid, gridFromDigits, isSolved } from './grid';
import { RATING, UNSOLVED_RATING } from './rating';
import { type Step, applyStep } from './step';
import { hiddenSingleBox, hiddenSingleLine, nakedSingle } from './techniques/singles';
import { claiming, pointing } from './techniques/intersections';
import {
  hiddenPair,
  hiddenQuad,
  hiddenTriple,
  nakedPair,
  nakedQuad,
  nakedTriple,
} from './techniques/subsets';
import { finnedSwordfish, finnedXWing, jellyfish, swordfish, xWing } from './techniques/fish';
import { wWing, xyWing, xyzWing } from './techniques/wings';
import {
  bug1,
  uniqueRectangle1,
  uniqueRectangle2,
  uniqueRectangle4,
} from './techniques/uniqueness';

export interface Technique {
  /** Lowest rating the technique can produce; used to order and to cap the search. */
  rating: number;
  find: (g: Grid) => Step | null;
}

export const TECHNIQUES: Technique[] = [
  { rating: RATING.hiddenSingleBox, find: hiddenSingleBox },
  { rating: RATING.hiddenSingleLine, find: hiddenSingleLine },
  { rating: RATING.nakedSingle, find: nakedSingle },
  { rating: RATING.pointing, find: pointing },
  { rating: RATING.claiming, find: claiming },
  { rating: RATING.nakedPair, find: nakedPair },
  { rating: RATING.xWing, find: xWing },
  { rating: RATING.hiddenPair, find: hiddenPair },
  { rating: RATING.finnedXWing, find: finnedXWing },
  { rating: RATING.nakedTriple, find: nakedTriple },
  { rating: RATING.swordfish, find: swordfish },
  { rating: RATING.hiddenTriple, find: hiddenTriple },
  { rating: RATING.finnedSwordfish, find: finnedSwordfish },
  { rating: RATING.xyWing, find: xyWing },
  { rating: RATING.xyzWing, find: xyzWing },
  { rating: RATING.uniqueRectangle1, find: uniqueRectangle1 },
  { rating: RATING.uniqueRectangle2, find: uniqueRectangle2 },
  { rating: RATING.uniqueRectangle4, find: uniqueRectangle4 },
  { rating: RATING.wWing, find: wWing },
  { rating: RATING.nakedQuad, find: nakedQuad },
  { rating: RATING.jellyfish, find: jellyfish },
  { rating: RATING.hiddenQuad, find: hiddenQuad },
  { rating: RATING.bug1, find: bug1 },
];

/** The simplest available step, considering only techniques rated at most maxRating. */
export function nextStep(g: Grid, maxRating = Infinity): Step | null {
  for (const t of TECHNIQUES) {
    if (t.rating > maxRating) break;
    const s = t.find(g);
    if (s) return s;
  }
  return null;
}

export interface SolveResult {
  solved: boolean;
  steps: Step[];
  /** Hardest step rating, or UNSOLVED_RATING when stuck. */
  rating: number;
  grid: Grid;
}

export function solveFrom(start: Grid, maxRating = Infinity): SolveResult {
  const g = cloneGrid(start);
  const steps: Step[] = [];
  let rating = 0;
  while (!isSolved(g)) {
    const s = nextStep(g, maxRating);
    if (!s) return { solved: false, steps, rating: UNSOLVED_RATING, grid: g };
    applyStep(g, s);
    steps.push(s);
    rating = Math.max(rating, s.rating);
  }
  return { solved: true, steps, rating, grid: g };
}

export const solveLogically = (digits: ArrayLike<number>, maxRating = Infinity): SolveResult =>
  solveFrom(gridFromDigits(digits), maxRating);
