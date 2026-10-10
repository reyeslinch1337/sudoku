// Picking puzzles for levels 10 and 11+ from published collections of the hardest puzzles.

import type { BankEntry } from './generator';
import { formatDigits, parseDigits } from './grid';
import { type Rng, randInt } from './random';
import { countSolutions } from './solve';
import { solveLogically } from './solver';
import { fingerprint } from './transform';

/** A collection line in the '.'-form, or null if it does not start with a puzzle. */
export function normalizeLine(line: string): string | null {
  const m = /^[0-9.]{81}/.exec(line.trim());
  return m ? formatDigits(parseDigits(m[0])) : null;
}

export interface CollectionPick {
  level: 10 | 11;
  quota: number;
  rng: Rng;
  /** Fingerprints already in the bank; accepted puzzles are added to it. */
  seen: Set<string>;
  /** Normalized puzzle strings that must not be taken. */
  exclude?: Set<string>;
}

/**
 * Takes up to `quota` puzzles in random order. A puzzle qualifies when it has one solution, is
 * not a duplicate of anything in the bank and is beyond our solver.
 */
export function pickFromCollection(lines: string[], o: CollectionPick): BankEntry[] {
  const order = lines.map((_, i) => i);
  const out: BankEntry[] = [];
  for (let k = 0; k < order.length && out.length < o.quota; k++) {
    // Lazy Fisher-Yates: only the prefix that is actually visited gets shuffled.
    const j = k + randInt(o.rng, order.length - k);
    [order[k], order[j]] = [order[j], order[k]];
    const p = normalizeLine(lines[order[k]]);
    if (!p || o.exclude?.has(p)) continue;
    const d = parseDigits(p);
    if (countSolutions(d, 2) !== 1) continue;
    const f = fingerprint(d);
    if (o.seen.has(f)) continue;
    if (solveLogically(d).solved) continue;
    o.seen.add(f);
    out.push({ p, l: o.level });
  }
  return out;
}
