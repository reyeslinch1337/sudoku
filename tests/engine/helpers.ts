import { type Grid, bit } from '../../src/engine/grid';
import type { Cand, Step } from '../../src/engine/step';
import { applyStep } from '../../src/engine/step';
import { solveFrom } from '../../src/engine/solver';
import { cloneGrid } from '../../src/engine/grid';

/** A grid with no digits and every candidate present; tests then remove candidates. */
export function openGrid(): Grid {
  return { digits: new Uint8Array(81), cands: new Uint16Array(81).fill(0x1ff) };
}

/** Restrict digit d to the given cells within the listed cells' scope: removes d elsewhere. */
export function onlyAt(g: Grid, d: number, cells: number[], scope: number[]): void {
  for (const c of scope) if (!cells.includes(c)) g.cands[c] &= ~bit(d);
}

export function setCands(g: Grid, cell: number, digits: number[]): void {
  g.cands[cell] = digits.reduce((m, d) => m | bit(d), 0);
}

export const sortCands = (cs: Cand[]): string[] => cs.map((c) => `${c.cell}:${c.digit}`).sort();

/**
 * Throws if any step of the logical solve contradicts the known solution.
 * Returns the solve result for further checks.
 */
export function checkSoundness(start: Grid, solution: ArrayLike<number>) {
  const res = solveFrom(start);
  const g = cloneGrid(start);
  for (const s of res.steps) {
    assertStepSound(s, solution);
    applyStep(g, s);
  }
  return res;
}

export function assertStepSound(s: Step, solution: ArrayLike<number>): void {
  for (const p of s.placements)
    if (solution[p.cell] !== p.digit)
      throw new Error(
        `${s.technique} placed ${p.digit} at ${p.cell}, solution ${solution[p.cell]}`,
      );
  for (const e of s.eliminations)
    if (solution[e.cell] === e.digit)
      throw new Error(`${s.technique} removed the solution digit ${e.digit} at ${e.cell}`);
}
