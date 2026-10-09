// Almost Locked Sets: N cells in one unit holding N + 1 candidates.

import { type Grid, PEERS, POPCOUNT, UNITS, bit, digitsOf } from '../grid';
import { type CellSet, FULL, and, andNot, cellsOf, isEmpty, setOf, subset } from '../bitset';
import { RATING, sizeRating } from '../rating';
import { type Cand, type Mark, type Step, combinations, makeStep } from '../step';

interface Als {
  cells: number[];
  set: CellSet;
  digits: number;
  /** Cells of the set holding digit d. */
  with: CellSet[];
  /** Cells that see every cell of the set holding digit d. */
  seen: CellSet[];
}

const PEER_SETS: CellSet[] = PEERS.map((ps) => setOf(ps));

const MAX_ALS_CELLS = 4;

function findAls(g: Grid): Als[] {
  const out: Als[] = [];
  const seenKeys = new Set<string>();
  for (const unit of UNITS) {
    const empty = unit.filter((c) => !g.digits[c]);
    for (let n = 1; n <= Math.min(MAX_ALS_CELLS, empty.length - 1); n++) {
      for (const cells of combinations(empty, n)) {
        let digits = 0;
        for (const c of cells) digits |= g.cands[c];
        if (POPCOUNT[digits] !== n + 1) continue;
        const key = cells.join(',');
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const withD: CellSet[] = [];
        const seen: CellSet[] = [];
        for (let d = 1; d <= 9; d++) {
          const holders = cells.filter((c) => g.cands[c] & bit(d));
          withD[d] = setOf(holders);
          let s: CellSet = holders.length ? [...FULL] : [0, 0, 0];
          for (const c of holders) s = and(s, PEER_SETS[c]);
          seen[d] = s;
        }
        out.push({ cells, set: setOf(cells), digits, with: withD, seen });
      }
    }
  }
  return out;
}

/** Digits x that are restricted common candidates of two disjoint sets. */
function rccs(a: Als, b: Als): number[] {
  const out: number[] = [];
  for (const x of digitsOf(a.digits & b.digits)) if (subset(b.with[x], a.seen[x])) out.push(x);
  return out;
}

function candidateSets(g: Grid): CellSet[] {
  const sets: CellSet[] = [];
  for (let d = 1; d <= 9; d++) {
    const cells: number[] = [];
    for (let c = 0; c < 81; c++) if (g.cands[c] & bit(d)) cells.push(c);
    sets[d] = setOf(cells);
  }
  return sets;
}

function zElims(withZ: CellSet, sets: Als[], z: number): Cand[] {
  let target = withZ;
  for (const s of sets) target = andNot(and(target, s.seen[z]), s.set);
  return cellsOf(target).map((cell) => ({ cell, digit: z }));
}

function alsMarks(g: Grid, sets: Als[], rcc: number[]): Mark[] {
  return sets.flatMap((s) =>
    s.cells.flatMap((cell) =>
      digitsOf(g.cands[cell]).map((digit) => ({
        cell,
        digit,
        role: rcc.includes(digit) ? ('on' as const) : ('key' as const),
      })),
    ),
  );
}

export function alsXz(g: Grid, list = findAls(g), withSets = candidateSets(g)): Step | null {
  let best: Step | null = null;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!isEmpty(and(a.set, b.set))) continue;
      const size = a.cells.length + b.cells.length;
      const rating = sizeRating(RATING.alsXz, size, 4, RATING.alsXyWing);
      if (best && rating >= best.rating) continue;
      for (const x of rccs(a, b)) {
        const elims: Cand[] = [];
        for (const z of digitsOf(a.digits & b.digits & ~bit(x)))
          elims.push(...zElims(withSets[z], [a, b], z));
        if (!elims.length) continue;
        best = makeStep('als-xz', rating, {
          eliminations: elims,
          cells: [...a.cells, ...b.cells],
          marks: alsMarks(g, [a, b], [x]),
        });
        break;
      }
    }
  }
  return best;
}

export function alsXyWing(g: Grid, list = findAls(g), withSets = candidateSets(g)): Step | null {
  let best: Step | null = null;
  for (const c of list) {
    const partners: [Als, number][] = [];
    for (const o of list) {
      if (o === c || !isEmpty(and(o.set, c.set))) continue;
      for (const x of rccs(c, o)) partners.push([o, x]);
    }
    for (let i = 0; i < partners.length; i++) {
      const [a, x] = partners[i];
      for (let j = i + 1; j < partners.length; j++) {
        const [b, y] = partners[j];
        if (x === y || a === b || !isEmpty(and(a.set, b.set))) continue;
        const size = a.cells.length + b.cells.length + c.cells.length;
        const rating = sizeRating(RATING.alsXyWing, size, 6, RATING.alsMax);
        if (best && rating >= best.rating) continue;
        const elims: Cand[] = [];
        for (const z of digitsOf(a.digits & b.digits & ~bit(x) & ~bit(y)))
          elims.push(...zElims(withSets[z], [a, b], z));
        if (!elims.length) continue;
        best = makeStep('als-xy-wing', rating, {
          eliminations: elims,
          cells: [...c.cells, ...a.cells, ...b.cells],
          marks: alsMarks(g, [c, a, b], [x, y]),
        });
      }
    }
  }
  return best;
}

/** The lowest rated ALS deduction. ALS-XZ never rates above the lowest ALS-XY-Wing. */
export function als(g: Grid): Step | null {
  const list = findAls(g);
  const withSets = candidateSets(g);
  return alsXz(g, list, withSets) ?? alsXyWing(g, list, withSets);
}
