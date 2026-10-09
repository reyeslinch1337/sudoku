// Comparing the player's board with the solution, and the candidates hints work from.

import { type Grid, PEERS, basicCandidates } from '../engine/grid';

export interface BoardView {
  values: number[];
  notes: number[];
}

/**
 * Candidates per spec: the player's notes where a cell has any, otherwise every digit allowed by
 * the placed digits; in both cases minus digits already placed among the cell's peers.
 */
export function effectiveGrid(b: BoardView): Grid {
  const allowed = basicCandidates(b.values);
  const cands = new Uint16Array(81);
  for (let i = 0; i < 81; i++) {
    if (b.values[i]) continue;
    cands[i] = b.notes[i] ? b.notes[i] & allowed[i] : allowed[i];
  }
  return { digits: Uint8Array.from(b.values), cands };
}

export type GameError =
  | { kind: 'wrongDigit'; cell: number; digit: number }
  | { kind: 'lostCandidate'; cell: number; digit: number };

export function findErrors(b: BoardView, givens: number[], solution: number[]): GameError[] {
  const out: GameError[] = [];
  for (let i = 0; i < 81; i++) {
    if (givens[i]) continue;
    const v = b.values[i];
    if (v && v !== solution[i]) out.push({ kind: 'wrongDigit', cell: i, digit: v });
    else if (!v && b.notes[i] && !(b.notes[i] & (1 << (solution[i] - 1))))
      out.push({ kind: 'lostCandidate', cell: i, digit: solution[i] });
  }
  return out;
}

/** Cells whose digit repeats within a row, column or box. */
export function conflicts(values: number[]): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    for (const p of PEERS[i]) if (values[p] === values[i]) out.add(i);
  }
  return out;
}

/** How many times each digit 1-9 is placed (index 0 unused). */
export function digitCounts(values: number[]): number[] {
  const counts = new Array(10).fill(0);
  for (const v of values) if (v) counts[v]++;
  return counts;
}
