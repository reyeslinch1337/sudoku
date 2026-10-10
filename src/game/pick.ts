import type { BankEntry } from '../engine/generator';
import { type Rng, randInt } from '../engine/random';
import { randomTransform } from '../engine/transform';
import type { PuzzleRef } from './state';

/** A random unsolved puzzle with a fresh transformation; any puzzle once all are solved. */
export function pickPuzzle(bank: BankEntry[], solved: Set<string>, rng: Rng): PuzzleRef {
  const open = bank.filter((e) => !solved.has(e.p));
  const pool = open.length ? open : bank;
  const e = pool[randInt(rng, pool.length)];
  return { id: e.p, rating: e.r ?? e.l, transform: randomTransform(rng) };
}
