import { type Grid, POPCOUNT, UNITS, bit, digitsOf } from '../grid';
import { RATING } from '../rating';
import { type Cand, type Mark, type Step, type TechniqueId, combinations, makeStep } from '../step';

const NAKED: Record<number, [TechniqueId, number]> = {
  2: ['naked-pair', RATING.nakedPair],
  3: ['naked-triple', RATING.nakedTriple],
  4: ['naked-quad', RATING.nakedQuad],
};
const HIDDEN: Record<number, [TechniqueId, number]> = {
  2: ['hidden-pair', RATING.hiddenPair],
  3: ['hidden-triple', RATING.hiddenTriple],
  4: ['hidden-quad', RATING.hiddenQuad],
};

function naked(g: Grid, n: number): Step | null {
  for (let u = 0; u < 27; u++) {
    const empty = UNITS[u].filter((c) => !g.digits[c]);
    if (empty.length <= n) continue;
    const small = empty.filter((c) => POPCOUNT[g.cands[c]] >= 2 && POPCOUNT[g.cands[c]] <= n);
    for (const set of combinations(small, n)) {
      let mask = 0;
      for (const c of set) mask |= g.cands[c];
      if (POPCOUNT[mask] !== n) continue;
      const elims: Cand[] = [];
      for (const c of empty) {
        if (set.includes(c)) continue;
        for (const d of digitsOf(g.cands[c] & mask)) elims.push({ cell: c, digit: d });
      }
      if (!elims.length) continue;
      const marks: Mark[] = [];
      for (const c of set)
        for (const d of digitsOf(g.cands[c])) marks.push({ cell: c, digit: d, role: 'key' });
      const [id, rating] = NAKED[n];
      return makeStep(id, rating, { eliminations: elims, cells: set, units: [u], marks });
    }
  }
  return null;
}

function hidden(g: Grid, n: number): Step | null {
  for (let u = 0; u < 27; u++) {
    const empty = UNITS[u].filter((c) => !g.digits[c]);
    if (empty.length <= n) continue;
    // Digit -> mask of positions (index within `empty`).
    const free: number[] = [];
    const where = new Map<number, number>();
    for (let d = 1; d <= 9; d++) {
      let m = 0;
      empty.forEach((c, k) => {
        if (g.cands[c] & bit(d)) m |= 1 << k;
      });
      const cnt = POPCOUNT[m & 0x1ff];
      if (cnt >= 2 && cnt <= n) {
        free.push(d);
        where.set(d, m);
      }
    }
    for (const ds of combinations(free, n)) {
      let pos = 0;
      let dmask = 0;
      for (const d of ds) {
        pos |= where.get(d)!;
        dmask |= bit(d);
      }
      if (POPCOUNT[pos] !== n) continue;
      const cells = empty.filter((_, k) => pos & (1 << k));
      const elims: Cand[] = [];
      for (const c of cells)
        for (const d of digitsOf(g.cands[c] & ~dmask)) elims.push({ cell: c, digit: d });
      if (!elims.length) continue;
      const marks: Mark[] = [];
      for (const c of cells)
        for (const d of digitsOf(g.cands[c] & dmask))
          marks.push({ cell: c, digit: d, role: 'key' });
      const [id, rating] = HIDDEN[n];
      return makeStep(id, rating, { eliminations: elims, cells, units: [u], marks });
    }
  }
  return null;
}

export const nakedPair = (g: Grid) => naked(g, 2);
export const nakedTriple = (g: Grid) => naked(g, 3);
export const nakedQuad = (g: Grid) => naked(g, 4);
export const hiddenPair = (g: Grid) => hidden(g, 2);
export const hiddenTriple = (g: Grid) => hidden(g, 3);
export const hiddenQuad = (g: Grid) => hidden(g, 4);
