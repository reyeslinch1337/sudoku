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
  skyscraper: 6.6,
  twoStringKite: 6.6,
  xChain: 6.6,
  xyChain: 6.6,
  aic: 7.0,
  chainMax: 7.5,
  alsXz: 7.0,
  alsXyWing: 7.4,
  alsMax: 7.8,
  forcingChain: 8.0,
  forcingMax: 9.5,
} as const;

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Base rating plus 0.1 for every 2 links beyond 4, capped at max. */
export function chainRating(base: number, links: number, max: number): number {
  return Math.min(max, round1(base + 0.1 * Math.ceil(Math.max(0, links - 4) / 2)));
}

/** Base rating plus 0.1 per extra cell beyond minCells, capped at max. */
export function sizeRating(base: number, cells: number, minCells: number, max: number): number {
  return Math.min(max, round1(base + 0.1 * Math.max(0, cells - minCells)));
}

/** Rating of a puzzle for which no logical solution was found. */
export const UNSOLVED_RATING = 99;
