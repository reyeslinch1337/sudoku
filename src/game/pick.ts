import type { BankEntry, Level } from '../engine/generator';
import { type Rng, randInt } from '../engine/random';
import { randomTransform } from '../engine/transform';
import type { PuzzleRef } from './state';

/**
 * A random unsolved puzzle of the level with a fresh transformation; any puzzle of the level once
 * all are solved.
 */
export function pickPuzzle(
  bank: BankEntry[],
  level: Level,
  solved: Set<string>,
  rng: Rng,
): PuzzleRef {
  const ofLevel = bank.filter((e) => e.l === level);
  const all = ofLevel.length ? ofLevel : bank;
  const open = all.filter((e) => !solved.has(e.p));
  const pool = open.length ? open : all;
  const e = pool[randInt(rng, pool.length)];
  return { id: e.p, rating: e.r ?? e.l, level: e.l, transform: randomTransform(rng) };
}

/** How the rating of a game is shown: a number for level 9, the level name for 10 and 11+. */
export function ratingLabel(ref: Pick<PuzzleRef, 'rating' | 'level'>): string {
  if (ref.level === 11) return '11+';
  if (ref.level === 10) return '10';
  return ref.rating.toFixed(1);
}
