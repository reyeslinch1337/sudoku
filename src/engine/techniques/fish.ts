import { type Grid, UNITS, bit, boxOf, colOf, rowOf } from '../grid';
import { RATING } from '../rating';
import { type Cand, type Step, type TechniqueId, combinations, makeStep } from '../step';

const BASIC: Record<number, [TechniqueId, number]> = {
  2: ['x-wing', RATING.xWing],
  3: ['swordfish', RATING.swordfish],
  4: ['jellyfish', RATING.jellyfish],
};
const FINNED: Record<number, [TechniqueId, number]> = {
  2: ['finned-x-wing', RATING.finnedXWing],
  3: ['finned-swordfish', RATING.finnedSwordfish],
};

/** orientation 0: base lines are rows, cover lines are columns; 1: the reverse. */
const crossOf = (o: number, c: number) => (o === 0 ? colOf(c) : rowOf(c));
const baseOf = (o: number, c: number) => (o === 0 ? rowOf(c) : colOf(c));
const lineUnit = (o: number, i: number) => (o === 0 ? i : 9 + i);
const coverUnit = (o: number, i: number) => (o === 0 ? 9 + i : i);

function linePositions(g: Grid, o: number, d: number): number[][] {
  const b = bit(d);
  return Array.from({ length: 9 }, (_, i) => UNITS[lineUnit(o, i)].filter((c) => g.cands[c] & b));
}

function fish(g: Grid, n: number, finned: boolean): Step | null {
  for (let d = 1; d <= 9; d++) {
    const b = bit(d);
    for (let o = 0; o < 2; o++) {
      const pos = linePositions(g, o, d);
      const maxPer = finned ? n + 2 : n;
      const lines = [...Array(9).keys()].filter(
        (i) => pos[i].length >= (finned ? 1 : 2) && pos[i].length <= maxPer,
      );
      for (const base of combinations(lines, n)) {
        const baseCells = base.flatMap((i) => pos[i]);
        const crossSet = [...new Set(baseCells.map((c) => crossOf(o, c)))].sort((x, y) => x - y);
        if (!finned) {
          if (crossSet.length !== n) continue;
          const elims: Cand[] = [];
          for (const x of crossSet) {
            for (const c of UNITS[coverUnit(o, x)]) {
              if (!base.includes(baseOf(o, c)) && g.cands[c] & b) elims.push({ cell: c, digit: d });
            }
          }
          if (!elims.length) continue;
          const [id, rating] = BASIC[n];
          return makeStep(id, rating, {
            eliminations: elims,
            cells: baseCells,
            units: [...base.map((i) => lineUnit(o, i)), ...crossSet.map((x) => coverUnit(o, x))],
            marks: baseCells.map((cell) => ({ cell, digit: d, role: 'key' as const })),
          });
        }
        if (crossSet.length <= n) continue;
        for (const cover of combinations(crossSet, n)) {
          const fins = baseCells.filter((c) => !cover.includes(crossOf(o, c)));
          const finBox = boxOf(fins[0]);
          if (!fins.every((c) => boxOf(c) === finBox)) continue;
          if (!base.every((i) => pos[i].some((c) => cover.includes(crossOf(o, c))))) continue;
          const elims: Cand[] = [];
          for (const x of cover) {
            for (const c of UNITS[coverUnit(o, x)]) {
              if (base.includes(baseOf(o, c)) || boxOf(c) !== finBox) continue;
              if (g.cands[c] & b) elims.push({ cell: c, digit: d });
            }
          }
          if (!elims.length) continue;
          const [id, rating] = FINNED[n];
          return makeStep(id, rating, {
            eliminations: elims,
            cells: baseCells,
            units: [...base.map((i) => lineUnit(o, i)), ...cover.map((x) => coverUnit(o, x))],
            marks: baseCells.map((cell) => ({
              cell,
              digit: d,
              role: fins.includes(cell) ? ('fin' as const) : ('key' as const),
            })),
          });
        }
      }
    }
  }
  return null;
}

export const xWing = (g: Grid) => fish(g, 2, false);
export const swordfish = (g: Grid) => fish(g, 3, false);
export const jellyfish = (g: Grid) => fish(g, 4, false);
export const finnedXWing = (g: Grid) => fish(g, 2, true);
export const finnedSwordfish = (g: Grid) => fish(g, 3, true);
