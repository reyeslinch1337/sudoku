// Puzzle bank generation primitives. Pure functions; the Node script drives them in parallel.

import { countSolutions, randomSolution } from './solve';
import { minimize, randomPuzzle } from './minimize';
import { type Rng, randInt, shuffle } from './random';
import { solveLogically } from './solver';
import { formatDigits, parseDigits } from './grid';
import { fingerprint } from './transform';

export const MIN_RATING = 9.0;
/** Puzzles solvable with techniques up to this rating are discarded before full rating. */
export const FAST_FILTER_RATING = 6.6;
export const LINEAGE_CAP = 20;

export interface Bucket {
  name: string;
  min: number;
  max: number;
  quota: number;
}

/** Most puzzles per difficulty level in the bank. */
export const LEVEL_QUOTA = 167;

/** Generated puzzles form level 9; levels 10 and 11+ come from collections. */
export const BUCKETS: Bucket[] = [{ name: '9', min: 9.0, max: 9.5, quota: LEVEL_QUOTA }];

/** 9: our generated puzzles; 10: hardest collection below SE 11; 11: SE 11 and above. */
export type Level = 9 | 10 | 11;
export const LEVELS: Level[] = [9, 10, 11];

export interface BankEntry {
  /** 81 characters, '.' for empty cells. */
  p: string;
  l: Level;
  /** Rating with one decimal; only level 9 has one. */
  r?: number;
}

/** Rating of a puzzle, or null when it is too easy or not solvable by the solver. */
export function ratePuzzle(digits: Uint8Array, minRating = MIN_RATING): number | null {
  if (minRating > FAST_FILTER_RATING && solveLogically(digits, FAST_FILTER_RATING).solved)
    return null;
  const res = solveLogically(digits);
  if (!res.solved || res.rating < minRating) return null;
  return res.rating;
}

/**
 * Replaces 1-3 clues: removes them, completes the puzzle to a random solution of what is left,
 * adds clues from that solution until the solution is unique, then minimizes.
 */
export function mutate(rng: Rng, digits: Uint8Array): Uint8Array | null {
  const d = digits.slice();
  const clues = shuffle(
    rng,
    [...Array(81).keys()].filter((i) => d[i]),
  );
  const k = 1 + randInt(rng, 3);
  for (let i = 0; i < k; i++) d[clues[i]] = 0;
  const sol = randomSolution(rng, d);
  if (!sol) return null;
  const empties = shuffle(
    rng,
    [...Array(81).keys()].filter((i) => !d[i] && !clues.slice(0, k).includes(i)),
  );
  let added = 0;
  for (const i of empties) {
    d[i] = sol[i];
    added++;
    if (added >= k && countSolutions(d, 2) === 1) break;
  }
  if (countSolutions(d, 2) !== 1) return null;
  return minimize(rng, d);
}

export interface Found {
  p: string;
  r: number;
}

/** Tries `attempts` fresh random puzzles; returns the hard ones. */
export function searchFresh(rng: Rng, attempts: number, minRating = MIN_RATING): Found[] {
  const out: Found[] = [];
  for (let i = 0; i < attempts; i++) {
    const p = randomPuzzle(rng);
    const r = ratePuzzle(p, minRating);
    if (r !== null) out.push({ p: formatDigits(p), r });
  }
  return out;
}

/** Tries `attempts` mutations of a parent; returns the hard ones. */
export function searchMutations(
  rng: Rng,
  parent: string,
  attempts: number,
  minRating = MIN_RATING,
): Found[] {
  const out: Found[] = [];
  const base = parseDigits(parent);
  for (let i = 0; i < attempts; i++) {
    const m = mutate(rng, base);
    if (!m) continue;
    const r = ratePuzzle(m, minRating);
    if (r !== null) out.push({ p: formatDigits(m), r });
  }
  return out;
}

export interface Candidate extends Found {
  lineage: number;
}

/**
 * Picks bank entries honoring quotas and the lineage cap. Within a bucket the rating levels
 * (7.0, 7.1, ...) take turns, so the bank spreads over the whole range instead of piling up at
 * its easiest end. Within a level, candidates keep their discovery order.
 */
export function selectBank(
  candidates: Candidate[],
  buckets: Bucket[] = BUCKETS,
  lineageCap = LINEAGE_CAP,
): BankEntry[] {
  const perLineage = new Map<number, number>();
  const out: BankEntry[] = [];
  for (const b of buckets) {
    const levels = new Map<number, Candidate[]>();
    for (const c of candidates) {
      if (c.r < b.min - 1e-9 || c.r > b.max + 1e-9) continue;
      const key = Math.round(c.r * 10);
      if (!levels.has(key)) levels.set(key, []);
      levels.get(key)!.push(c);
    }
    const queues = [...levels.entries()].sort((x, y) => x[0] - y[0]).map(([, q]) => q);
    const pos = queues.map(() => 0);
    let taken = 0;
    while (taken < b.quota) {
      let progressed = false;
      for (let k = 0; k < queues.length && taken < b.quota; k++) {
        const q = queues[k];
        while (pos[k] < q.length) {
          const c = q[pos[k]++];
          if ((perLineage.get(c.lineage) ?? 0) >= lineageCap) continue;
          perLineage.set(c.lineage, (perLineage.get(c.lineage) ?? 0) + 1);
          out.push({ p: c.p, l: 9, r: c.r });
          taken++;
          progressed = true;
          break;
        }
      }
      if (!progressed) break;
    }
  }
  return out;
}

export interface BankProblem {
  index: number;
  problem: string;
}

/**
 * Checks bank entries; returns the problems found (empty when the bank is valid). Level 9 is
 * checked in full; levels 10 and 11+ must have one solution and be beyond our solver.
 */
export function verifyEntries(entries: BankEntry[], buckets: Bucket[] = BUCKETS): BankProblem[] {
  const problems: BankProblem[] = [];
  const seen = new Map<string, number>();
  entries.forEach((e, index) => {
    const report = (problem: string) => problems.push({ index, problem });
    if (!/^[1-9.]{81}$/.test(e.p)) return report('bad format');
    if (!LEVELS.includes(e.l)) return report(`unknown level ${e.l}`);
    const d = parseDigits(e.p);
    if (countSolutions(d, 2) !== 1) return report('solution is not unique');
    const f = fingerprint(d);
    const prev = seen.get(f);
    if (prev !== undefined) report(`duplicate of entry ${prev}`);
    else seen.set(f, index);
    const res = solveLogically(d);
    if (e.l !== 9) {
      if (e.r !== undefined) report('only level 9 has a rating');
      if (res.solved) report('solver solves it, so it belongs below this level');
      return;
    }
    if (!res.solved) return report('solver does not solve it');
    if (e.r === undefined || Math.abs(res.rating - e.r) > 1e-9)
      report(`rating ${res.rating} differs from stored ${e.r}`);
    if (e.r !== undefined && !buckets.some((b) => e.r! >= b.min - 1e-9 && e.r! <= b.max + 1e-9))
      report(`rating ${e.r} outside every bucket`);
    for (let i = 0; i < 81; i++) {
      if (!d[i]) continue;
      const v = d[i];
      d[i] = 0;
      const n = countSolutions(d, 2);
      d[i] = v;
      if (n === 1) return report('not minimal');
    }
  });
  return problems;
}

/** Problems with the bank as a whole: every level present and within its quota. */
export function verifyQuotas(entries: BankEntry[], quota = LEVEL_QUOTA): string[] {
  const out: string[] = [];
  for (const l of LEVELS) {
    const n = entries.filter((e) => e.l === l).length;
    if (n === 0) out.push(`level ${l}: no puzzles`);
    if (n > quota) out.push(`level ${l}: ${n} puzzles, at most ${quota}`);
  }
  return out;
}
