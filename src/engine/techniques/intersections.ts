import { type Grid, UNITS, bit, boxOf, colOf, rowOf } from '../grid';
import { RATING } from '../rating';
import { type Step, elimsOf, makeStep } from '../step';

function positions(g: Grid, u: number, d: number): number[] {
  const b = bit(d);
  return UNITS[u].filter((c) => g.cands[c] & b);
}

/** Candidates of a digit in a box confined to one line: remove from the rest of the line. */
export function pointing(g: Grid): Step | null {
  for (let u = 18; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      const ps = positions(g, u, d);
      if (ps.length < 2) continue;
      for (const line of [rowOf(ps[0]), 9 + colOf(ps[0])]) {
        const lineOf = line < 9 ? rowOf : (c: number) => 9 + colOf(c);
        if (!ps.every((c) => lineOf(c) === line)) continue;
        const elims = elimsOf(
          g,
          UNITS[line].filter((c) => 18 + boxOf(c) !== u),
          d,
        );
        if (elims.length) {
          return makeStep('pointing', RATING.pointing, {
            eliminations: elims,
            cells: ps,
            units: [u, line],
            marks: ps.map((cell) => ({ cell, digit: d, role: 'key' as const })),
          });
        }
      }
    }
  }
  return null;
}

/** Candidates of a digit in a line confined to one box: remove from the rest of the box. */
export function claiming(g: Grid): Step | null {
  for (let u = 0; u < 18; u++) {
    for (let d = 1; d <= 9; d++) {
      const ps = positions(g, u, d);
      if (ps.length < 2) continue;
      const box = 18 + boxOf(ps[0]);
      if (!ps.every((c) => 18 + boxOf(c) === box)) continue;
      const lineOf = u < 9 ? rowOf : (c: number) => 9 + colOf(c);
      const elims = elimsOf(
        g,
        UNITS[box].filter((c) => lineOf(c) !== u),
        d,
      );
      if (elims.length) {
        return makeStep('claiming', RATING.claiming, {
          eliminations: elims,
          cells: ps,
          units: [u, box],
          marks: ps.map((cell) => ({ cell, digit: d, role: 'key' as const })),
        });
      }
    }
  }
  return null;
}
