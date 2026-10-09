// Techniques that rely on the puzzle having a single solution.

import {
  type Grid,
  CELL_UNITS,
  PEERS,
  POPCOUNT,
  UNITS,
  bit,
  boxOf,
  cellAt,
  colOf,
  digitsOf,
  rowOf,
  sees,
} from '../grid';
import { RATING } from '../rating';
import { type Cand, type Mark, type Step, makeStep } from '../step';

interface Rect {
  cells: [number, number, number, number]; // (r1,c1), (r1,c2), (r2,c1), (r2,c2)
  a: number;
  b: number;
}

function* rectangles(g: Grid): Generator<Rect> {
  for (let r1 = 0; r1 < 9; r1++)
    for (let r2 = r1 + 1; r2 < 9; r2++)
      for (let c1 = 0; c1 < 9; c1++)
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const cells: Rect['cells'] = [
            cellAt(r1, c1),
            cellAt(r1, c2),
            cellAt(r2, c1),
            cellAt(r2, c2),
          ];
          if (new Set(cells.map(boxOf)).size !== 2) continue;
          if (cells.some((c) => g.digits[c])) continue;
          const common =
            g.cands[cells[0]] & g.cands[cells[1]] & g.cands[cells[2]] & g.cands[cells[3]];
          if (POPCOUNT[common] < 2) continue;
          const ds = digitsOf(common);
          for (let i = 0; i < ds.length; i++)
            for (let j = i + 1; j < ds.length; j++) yield { cells, a: ds[i], b: ds[j] };
        }
}

const sameLine = (x: number, y: number) => rowOf(x) === rowOf(y) || colOf(x) === colOf(y);

function rectMarks(g: Grid, r: Rect): Mark[] {
  return r.cells.flatMap((cell) =>
    digitsOf(g.cands[cell] & (bit(r.a) | bit(r.b))).map((digit) => ({
      cell,
      digit,
      role: 'key' as const,
    })),
  );
}

export function uniqueRectangle1(g: Grid): Step | null {
  for (const r of rectangles(g)) {
    const ab = bit(r.a) | bit(r.b);
    const roof = r.cells.filter((c) => g.cands[c] !== ab);
    if (roof.length !== 1) continue;
    const elims: Cand[] = [r.a, r.b].map((digit) => ({ cell: roof[0], digit }));
    return makeStep('unique-rectangle-1', RATING.uniqueRectangle1, {
      eliminations: elims,
      cells: [...r.cells],
      marks: rectMarks(g, r).filter((m) => m.cell !== roof[0]),
    });
  }
  return null;
}

export function uniqueRectangle2(g: Grid): Step | null {
  for (const r of rectangles(g)) {
    const ab = bit(r.a) | bit(r.b);
    const floor = r.cells.filter((c) => g.cands[c] === ab);
    const roof = r.cells.filter((c) => g.cands[c] !== ab);
    if (floor.length !== 2 || !sameLine(floor[0], floor[1])) continue;
    const extra = g.cands[roof[0]] & ~ab;
    if (POPCOUNT[extra] !== 1 || g.cands[roof[1]] !== g.cands[roof[0]]) continue;
    const c = digitsOf(extra)[0];
    const elims: Cand[] = PEERS[roof[0]]
      .filter((p) => p !== roof[1] && sees(p, roof[1]) && g.cands[p] & extra)
      .map((cell) => ({ cell, digit: c }));
    if (!elims.length) continue;
    return makeStep('unique-rectangle-2', RATING.uniqueRectangle2, {
      eliminations: elims,
      cells: [...r.cells],
      marks: [...rectMarks(g, r), ...roof.map((cell) => ({ cell, digit: c, role: 'on' as const }))],
    });
  }
  return null;
}

export function uniqueRectangle4(g: Grid): Step | null {
  for (const r of rectangles(g)) {
    const ab = bit(r.a) | bit(r.b);
    const floor = r.cells.filter((c) => g.cands[c] === ab);
    const roof = r.cells.filter((c) => g.cands[c] !== ab);
    if (floor.length !== 2 || !sameLine(floor[0], floor[1])) continue;
    const shared = CELL_UNITS[roof[0]].filter((u) => CELL_UNITS[roof[1]].includes(u));
    for (const [x, y] of [
      [r.a, r.b],
      [r.b, r.a],
    ]) {
      const u = shared.find((u) => UNITS[u].filter((c) => g.cands[c] & bit(x)).length === 2);
      if (u === undefined) continue;
      return makeStep('unique-rectangle-4', RATING.uniqueRectangle4, {
        eliminations: roof.map((cell) => ({ cell, digit: y })),
        cells: [...r.cells],
        units: [u],
        marks: rectMarks(g, r).filter((m) => !(roof.includes(m.cell) && m.digit === y)),
      });
    }
  }
  return null;
}

/**
 * Bivalue Universal Grave + 1: every unsolved cell is bivalue except one trivalue cell. The digit
 * that appears three times in that cell's units must go there, or the puzzle would have two
 * solutions.
 */
export function bug1(g: Grid): Step | null {
  let tri = -1;
  for (let c = 0; c < 81; c++) {
    if (g.digits[c]) continue;
    const n = POPCOUNT[g.cands[c]];
    if (n === 2) continue;
    if (n !== 3 || tri >= 0) return null;
    tri = c;
  }
  if (tri < 0) return null;
  let target = 0;
  for (const d of digitsOf(g.cands[tri])) {
    if (CELL_UNITS[tri].every((u) => UNITS[u].filter((c) => g.cands[c] & bit(d)).length === 3)) {
      if (target) return null;
      target = d;
    }
  }
  if (!target) return null;
  // Every other unit/digit pair must be a perfect pair.
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      const n = UNITS[u].filter((c) => g.cands[c] & bit(d)).length;
      const inTri = d === target && CELL_UNITS[tri].includes(u);
      if (n !== 0 && n !== (inTri ? 3 : 2)) return null;
    }
  }
  return makeStep('bug-1', RATING.bug1, {
    placements: [{ cell: tri, digit: target }],
    cells: [tri],
    marks: [{ cell: tri, digit: target, role: 'key' }],
  });
}
