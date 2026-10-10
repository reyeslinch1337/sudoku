import type { BankEntry } from '../engine/generator';
import { type Rng, randInt } from '../engine/random';
import { randomTransform } from '../engine/transform';
import type { PuzzleRef } from './state';

/** A random unsolved puzzle with a fresh transformation; any puzzle once all are solved. */
export function pickPuzzle(bank: BankEntry[], solved: Set<string>, rng: Rng): PuzzleRef {
  // Level choice arrives with the level picker; until then games come from level 9.
  const level9 = bank.filter((e) => e.l === 9);
  const all = level9.length ? level9 : bank;
  const open = all.filter((e) => !solved.has(e.p));
  const pool = open.length ? open : all;
  const e = pool[randInt(rng, pool.length)];
  return { id: e.p, rating: e.r ?? e.l, transform: randomTransform(rng) };
}
