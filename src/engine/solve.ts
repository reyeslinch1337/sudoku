// Brute-force search used for uniqueness checks and for finding the solution of a puzzle.

import { ALL, CELL_UNITS, POPCOUNT, UNITS, bit } from './grid';
import { type Rng, shuffle } from './random';

interface SearchState {
  digits: Uint8Array;
  used: Uint16Array; // 27 unit masks
}

function initState(digits: ArrayLike<number>): SearchState | null {
  const d = Uint8Array.from(digits);
  const used = new Uint16Array(27);
  for (let i = 0; i < 81; i++) {
    if (!d[i]) continue;
    const b = bit(d[i]);
    for (const u of CELL_UNITS[i]) {
      if (used[u] & b) return null;
      used[u] |= b;
    }
  }
  return { digits: d, used };
}

function freeMask(s: SearchState, i: number): number {
  const [r, c, b] = CELL_UNITS[i];
  return ALL & ~(s.used[r] | s.used[c] | s.used[b]);
}

const free = new Uint16Array(81);

/**
 * Depth-first search. At each node it takes a forced move (a naked or hidden single) when one
 * exists, otherwise branches on the most constrained cell. Calls onSolution for every solution
 * found; stops when it returns true.
 */
function search(
  s: SearchState,
  onSolution: (digits: Uint8Array) => boolean,
  rng: Rng | null,
): boolean {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (s.digits[i]) continue;
    const m = freeMask(s, i);
    const n = POPCOUNT[m];
    if (n === 0) return false;
    free[i] = m;
    if (n < bestCount) {
      best = i;
      bestMask = m;
      bestCount = n;
    }
  }
  if (best < 0) return onSolution(s.digits);

  if (bestCount > 1) {
    // Look for a hidden single; also detect a digit with no place left in a unit.
    for (let u = 0; u < 27 && bestCount > 1; u++) {
      let once = 0;
      let twice = 0;
      const cells = UNITS[u];
      for (let k = 0; k < 9; k++) {
        const i = cells[k];
        if (s.digits[i]) continue;
        const m = free[i];
        twice |= once & m;
        once |= m;
      }
      if ((once | s.used[u]) !== ALL) return false;
      const single = once & ~twice;
      if (single) {
        const b = single & -single;
        for (let k = 0; k < 9; k++) {
          const i = cells[k];
          if (!s.digits[i] && free[i] & b) {
            best = i;
            bestMask = b;
            bestCount = 1;
            break;
          }
        }
      }
    }
  }

  const [r, c, b] = CELL_UNITS[best];
  const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (rng && bestCount > 1) shuffle(rng, ds);
  for (const d of ds) {
    const m = bit(d);
    if (!(bestMask & m)) continue;
    s.digits[best] = d;
    s.used[r] |= m;
    s.used[c] |= m;
    s.used[b] |= m;
    const stop = search(s, onSolution, rng);
    s.used[r] &= ~m;
    s.used[c] &= ~m;
    s.used[b] &= ~m;
    s.digits[best] = 0;
    if (stop) return true;
  }
  return false;
}

/** Number of solutions, counting no further than limit. */
export function countSolutions(digits: ArrayLike<number>, limit = 2): number {
  const s = initState(digits);
  if (!s) return 0;
  let count = 0;
  search(
    s,
    () => {
      count++;
      return count >= limit;
    },
    null,
  );
  return count;
}

/** First solution found, or null. */
export function solve(digits: ArrayLike<number>): Uint8Array | null {
  const s = initState(digits);
  if (!s) return null;
  let result: Uint8Array | null = null;
  search(
    s,
    (d) => {
      result = d.slice();
      return true;
    },
    null,
  );
  return result;
}

/** A random solution of the given digits (a random complete grid for an empty one), or null. */
export function randomSolution(
  rng: Rng,
  digits: ArrayLike<number> = new Uint8Array(81),
): Uint8Array | null {
  const s = initState(digits);
  if (!s) return null;
  let result: Uint8Array | null = null;
  search(
    s,
    (d) => {
      result = d.slice();
      return true;
    },
    rng,
  );
  return result;
}
