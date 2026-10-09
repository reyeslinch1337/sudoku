import { describe, expect, it } from 'vitest';
import { UNITS, cellAt, parseDigits } from '../../src/engine/grid';
import { countSolutions, solve } from '../../src/engine/solve';
import { solveLogically } from '../../src/engine/solver';
import { chains } from '../../src/engine/techniques/chains';
import { als } from '../../src/engine/techniques/als';
import { chainRating, RATING } from '../../src/engine/rating';
import { assertStepSound, onlyAt, openGrid, setCands, sortCands } from './helpers';
import calibration from '../fixtures/calibration.json';

const rc = (r: number, c: number) => cellAt(r - 1, c - 1);
const row = (r: number) => UNITS[r - 1] as number[];
const col = (c: number) => UNITS[8 + c] as number[];
const cands = (list: [number, number, number][]) =>
  sortCands(list.map(([r, c, digit]) => ({ cell: rc(r, c), digit })));

describe('chains', () => {
  it('skyscraper', () => {
    const g = openGrid();
    onlyAt(g, 5, [rc(1, 1), rc(1, 5)], row(1));
    onlyAt(g, 5, [rc(4, 1), rc(4, 6)], row(4));
    const s = chains(g)!;
    expect(s.technique).toBe('skyscraper');
    expect(sortCands(s.eliminations)).toEqual(
      cands([
        [2, 6, 5],
        [3, 6, 5],
        [5, 5, 5],
        [6, 5, 5],
      ]),
    );
    expect(s.links).toHaveLength(3);
  });

  it('2-string kite', () => {
    const g = openGrid();
    onlyAt(g, 5, [rc(1, 2), rc(1, 7)], row(1));
    onlyAt(g, 5, [rc(3, 1), rc(8, 1)], col(1));
    const s = chains(g)!;
    expect(s.technique).toBe('two-string-kite');
    expect(sortCands(s.eliminations)).toEqual(cands([[8, 7, 5]]));
  });

  it('xy-chain', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 4), [2, 3]);
    setCands(g, rc(4, 4), [3, 4]);
    setCands(g, rc(4, 9), [4, 1]);
    const s = chains(g)!;
    expect(s.technique).toBe('xy-chain');
    expect(s.links).toHaveLength(7);
    expect(s.rating).toBe(chainRating(RATING.xyChain, 7, RATING.chainMax));
    expect(sortCands(s.eliminations)).toEqual(
      cands([
        [1, 9, 1],
        [4, 1, 1],
      ]),
    );
  });

  it('finds nothing without strong links', () => {
    expect(chains(openGrid())).toBeNull();
  });
});

describe('als', () => {
  it('als-xz', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 5), [1, 3]);
    setCands(g, rc(1, 6), [2, 3]);
    const s = als(g)!;
    expect(s.technique).toBe('als-xz');
    expect(s.eliminations.length).toBeGreaterThan(0);
    for (const e of s.eliminations) expect([1, 2]).toContain(e.digit);
  });
});

describe('ratings', () => {
  it('chain rating grows with length and is capped', () => {
    expect(chainRating(6.6, 3, 7.5)).toBe(6.6);
    expect(chainRating(6.6, 5, 7.5)).toBe(6.7);
    expect(chainRating(6.6, 7, 7.5)).toBe(6.8);
    expect(chainRating(7.0, 30, 7.5)).toBe(7.5);
  });
});

describe('calibration', () => {
  for (const [name, p] of Object.entries(calibration.unsolvable)) {
    it(`does not solve ${name}`, () => {
      const d = parseDigits(p);
      expect(countSolutions(d)).toBe(1);
      const res = solveLogically(d);
      expect(res.solved).toBe(false);
      const sol = solve(d)!;
      for (const s of res.steps) assertStepSound(s, sol);
    });
  }

  for (const { p, min, max } of calibration.rated) {
    it(`rates ${p.slice(0, 12)}... within ${min}-${max}`, () => {
      const d = parseDigits(p);
      const res = solveLogically(d);
      const sol = solve(d)!;
      for (const s of res.steps) assertStepSound(s, sol);
      expect(res.solved).toBe(true);
      expect(res.rating).toBeGreaterThanOrEqual(min);
      expect(res.rating).toBeLessThanOrEqual(max);
    });
  }

  it('rates an extreme puzzle fast enough', () => {
    const d = parseDigits(calibration.rated[3].p);
    const t = performance.now();
    solveLogically(d);
    expect(performance.now() - t).toBeLessThan(3000);
  });
});
