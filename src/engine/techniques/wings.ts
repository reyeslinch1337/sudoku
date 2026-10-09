import { type Grid, PEERS, POPCOUNT, UNITS, bit, digitsOf, sees } from '../grid';
import { RATING } from '../rating';
import { type Cand, type Step, elimsOf, makeStep } from '../step';

const bivalues = (g: Grid): number[] =>
  [...Array(81).keys()].filter((c) => !g.digits[c] && POPCOUNT[g.cands[c]] === 2);

const commonPeers = (cells: number[]): number[] =>
  PEERS[cells[0]].filter((p) => cells.every((c) => c !== p && sees(c, p)));

export function xyWing(g: Grid): Step | null {
  const bv = bivalues(g);
  for (const pivot of bv) {
    const [x, y] = digitsOf(g.cands[pivot]);
    const wings = bv.filter((c) => c !== pivot && sees(c, pivot));
    for (const a of wings) {
      const am = g.cands[a];
      if (!(am & bit(x)) || am & bit(y)) continue;
      const z = digitsOf(am & ~bit(x))[0];
      for (const b of wings) {
        if (b === a || g.cands[b] !== (bit(y) | bit(z))) continue;
        const elims = elimsOf(g, commonPeers([a, b]), z).filter((e) => e.cell !== pivot);
        if (!elims.length) continue;
        return makeStep('xy-wing', RATING.xyWing, {
          eliminations: elims,
          cells: [pivot, a, b],
          marks: [
            { cell: pivot, digit: x, role: 'key' },
            { cell: pivot, digit: y, role: 'key' },
            { cell: a, digit: x, role: 'key' },
            { cell: a, digit: z, role: 'key' },
            { cell: b, digit: y, role: 'key' },
            { cell: b, digit: z, role: 'key' },
          ],
        });
      }
    }
  }
  return null;
}

export function xyzWing(g: Grid): Step | null {
  const bv = bivalues(g);
  for (let pivot = 0; pivot < 81; pivot++) {
    if (g.digits[pivot] || POPCOUNT[g.cands[pivot]] !== 3) continue;
    const pm = g.cands[pivot];
    const wings = bv.filter((c) => sees(c, pivot) && (g.cands[c] & pm) === g.cands[c]);
    for (let i = 0; i < wings.length; i++) {
      for (let j = i + 1; j < wings.length; j++) {
        const a = wings[i];
        const b = wings[j];
        if ((g.cands[a] | g.cands[b]) !== pm) continue;
        const z = digitsOf(g.cands[a] & g.cands[b])[0];
        if (z === undefined) continue;
        const elims = elimsOf(g, commonPeers([pivot, a, b]), z);
        if (!elims.length) continue;
        const marks = [pivot, a, b].flatMap((c) =>
          digitsOf(g.cands[c]).map((digit) => ({ cell: c, digit, role: 'key' as const })),
        );
        return makeStep('xyz-wing', RATING.xyzWing, {
          eliminations: elims,
          cells: [pivot, a, b],
          marks,
        });
      }
    }
  }
  return null;
}

/**
 * Two bivalue cells {x,y} joined by a strong link on x: one of them must be y, so y is removed
 * from every cell that sees both.
 */
export function wWing(g: Grid): Step | null {
  const bv = bivalues(g);
  for (let i = 0; i < bv.length; i++) {
    for (let j = i + 1; j < bv.length; j++) {
      const a = bv[i];
      const b = bv[j];
      if (g.cands[a] !== g.cands[b] || sees(a, b)) continue;
      const [d1, d2] = digitsOf(g.cands[a]);
      for (const [x, y] of [
        [d1, d2],
        [d2, d1],
      ]) {
        for (let u = 0; u < 27; u++) {
          const ps = UNITS[u].filter((c) => g.cands[c] & bit(x));
          if (ps.length !== 2) continue;
          const [p, q] = ps;
          let ends: [number, number] | null = null;
          if (p !== a && p !== b && q !== a && q !== b) {
            if (sees(p, a) && sees(q, b)) ends = [p, q];
            else if (sees(q, a) && sees(p, b)) ends = [q, p];
          }
          if (!ends) continue;
          const elims: Cand[] = elimsOf(g, commonPeers([a, b]), y);
          if (!elims.length) continue;
          const [ea, eb] = ends;
          return makeStep('w-wing', RATING.wWing, {
            eliminations: elims,
            cells: [a, b, ea, eb],
            units: [u],
            marks: [
              { cell: a, digit: x, role: 'off' },
              { cell: a, digit: y, role: 'on' },
              { cell: b, digit: x, role: 'off' },
              { cell: b, digit: y, role: 'on' },
              { cell: ea, digit: x, role: 'on' },
              { cell: eb, digit: x, role: 'key' },
            ],
            links: [
              { from: { cell: a, digit: x }, to: { cell: ea, digit: x }, strong: false },
              { from: { cell: ea, digit: x }, to: { cell: eb, digit: x }, strong: true },
              { from: { cell: eb, digit: x }, to: { cell: b, digit: x }, strong: false },
            ],
          });
        }
      }
    }
  }
  return null;
}
