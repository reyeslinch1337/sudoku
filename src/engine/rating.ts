// Difficulty ratings, calibrated to resemble the Sudoku Explainer scale.

export const RATING = {
  hiddenSingleBox: 1.2,
  hiddenSingleLine: 1.5,
  nakedSingle: 2.3,
  pointing: 2.6,
  claiming: 2.8,
  nakedPair: 3.0,
  xWing: 3.2,
  hiddenPair: 3.4,
  finnedXWing: 3.5,
  nakedTriple: 3.6,
  swordfish: 3.8,
  hiddenTriple: 4.0,
  finnedSwordfish: 4.1,
  xyWing: 4.2,
  xyzWing: 4.4,
  uniqueRectangle1: 4.5,
  uniqueRectangle2: 4.6,
  uniqueRectangle4: 4.6,
  wWing: 4.6,
  nakedQuad: 5.0,
  jellyfish: 5.2,
  hiddenQuad: 5.4,
  bug1: 5.6,
} as const;

/** Rating of a puzzle for which no logical solution was found. */
export const UNSOLVED_RATING = 99;
