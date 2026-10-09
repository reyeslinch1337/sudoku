import { countSolutions, randomSolution } from './solve';
import { type Rng, shuffle } from './random';

/** Removes clues in random order while the solution stays unique. */
export function minimize(rng: Rng, digits: ArrayLike<number>): Uint8Array {
  const d = Uint8Array.from(digits);
  const order = shuffle(
    rng,
    [...Array(81).keys()].filter((i) => d[i]),
  );
  for (const i of order) {
    const v = d[i];
    d[i] = 0;
    if (countSolutions(d, 2) !== 1) d[i] = v;
  }
  return d;
}

/** A random minimal puzzle with a unique solution. */
export function randomPuzzle(rng: Rng): Uint8Array {
  return minimize(rng, randomSolution(rng));
}
