import { describe, expect, it } from 'vitest';
import { UNITS, cellAt } from '../../src/engine/grid';
import type { Grid } from '../../src/engine/grid';
import type { Step } from '../../src/engine/step';
import { hiddenSingleBox, nakedSingle } from '../../src/engine/techniques/singles';
import { claiming, pointing } from '../../src/engine/techniques/intersections';
import {
  hiddenPair,
  hiddenQuad,
  hiddenTriple,
  nakedPair,
  nakedQuad,
  nakedTriple,
} from '../../src/engine/techniques/subsets';
import {
  finnedSwordfish,
  finnedXWing,
  jellyfish,
  swordfish,
  xWing,
} from '../../src/engine/techniques/fish';
import { wWing, xyWing, xyzWing } from '../../src/engine/techniques/wings';
import {
  bug1,
  uniqueRectangle1,
  uniqueRectangle2,
  uniqueRectangle4,
} from '../../src/engine/techniques/uniqueness';
import { onlyAt, openGrid, setCands, sortCands } from './helpers';

/** 1-based row and column, as in r1c1 notation. */
const rc = (r: number, c: number) => cellAt(r - 1, c - 1);
const row = (r: number) => UNITS[r - 1] as number[];
const box = (b: number) => UNITS[17 + b] as number[];

const elims = (s: Step | null) => sortCands(s!.eliminations);
const cands = (list: [number, number, number][]) =>
  sortCands(list.map(([r, c, digit]) => ({ cell: rc(r, c), digit })));

/** Removes digit d from every cell of a line except the given ones. */
function restrict(g: Grid, d: number, line: number[], keep: number[]) {
  onlyAt(g, d, keep, line);
}

describe('singles', () => {
  it('hidden single in a box', () => {
    const g = openGrid();
    restrict(g, 5, box(1), [rc(2, 2)]);
    const s = hiddenSingleBox(g)!;
    expect(s.technique).toBe('hidden-single');
    expect(s.placements).toEqual([{ cell: rc(2, 2), digit: 5 }]);
  });

  it('naked single', () => {
    const g = openGrid();
    setCands(g, rc(4, 4), [7]);
    expect(nakedSingle(g)!.placements).toEqual([{ cell: rc(4, 4), digit: 7 }]);
    expect(nakedSingle(openGrid())).toBeNull();
  });
});

describe('intersections', () => {
  it('pointing', () => {
    const g = openGrid();
    restrict(g, 4, box(1), [rc(1, 1), rc(1, 2)]);
    const s = pointing(g);
    expect(elims(s)).toEqual(cands([4, 5, 6, 7, 8, 9].map((c) => [1, c, 4])));
  });

  it('claiming', () => {
    const g = openGrid();
    restrict(g, 4, row(1), [rc(1, 1), rc(1, 3)]);
    const s = claiming(g);
    expect(elims(s)).toEqual(
      cands([
        [2, 1, 4],
        [2, 2, 4],
        [2, 3, 4],
        [3, 1, 4],
        [3, 2, 4],
        [3, 3, 4],
      ]),
    );
  });
});

describe('subsets', () => {
  const others = (keep: number[], digits: number[]) =>
    cands(
      [1, 2, 3, 4, 5, 6, 7, 8, 9]
        .filter((c) => !keep.includes(c))
        .flatMap((c) => digits.map((d) => [1, c, d] as [number, number, number])),
    );

  it('naked pair', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 2), [1, 2]);
    expect(elims(nakedPair(g))).toEqual(others([1, 2], [1, 2]));
  });

  it('naked triple', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 5), [2, 3]);
    setCands(g, rc(1, 9), [1, 3]);
    expect(elims(nakedTriple(g))).toEqual(others([1, 5, 9], [1, 2, 3]));
  });

  it('naked quad', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 4), [2, 3]);
    setCands(g, rc(1, 7), [3, 4]);
    setCands(g, rc(1, 8), [1, 4]);
    expect(elims(nakedQuad(g))).toEqual(others([1, 4, 7, 8], [1, 2, 3, 4]));
  });

  const hiddenCase = (keep: number[], digits: number[]) => {
    const g = openGrid();
    for (const d of digits)
      restrict(
        g,
        d,
        row(1),
        keep.map((c) => rc(1, c)),
      );
    const rest = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !digits.includes(d));
    return {
      g,
      expected: cands(keep.flatMap((c) => rest.map((d) => [1, c, d] as [number, number, number]))),
    };
  };

  it('hidden pair', () => {
    const { g, expected } = hiddenCase([3, 7], [1, 2]);
    expect(elims(hiddenPair(g))).toEqual(expected);
  });

  it('hidden triple', () => {
    const { g, expected } = hiddenCase([1, 2, 9], [4, 5, 6]);
    expect(elims(hiddenTriple(g))).toEqual(expected);
  });

  it('hidden quad', () => {
    const { g, expected } = hiddenCase([2, 4, 6, 8], [1, 3, 5, 7]);
    expect(elims(hiddenQuad(g))).toEqual(expected);
  });
});

describe('fish', () => {
  /** Digit 5 restricted in the given rows to the given columns. */
  function fishGrid(rows: number[], colsByRow: number[][]) {
    const g = openGrid();
    rows.forEach((r, k) =>
      restrict(
        g,
        5,
        row(r),
        colsByRow[k].map((c) => rc(r, c)),
      ),
    );
    return g;
  }
  const inCols = (colsList: number[], exceptRows: number[]) =>
    cands(
      colsList.flatMap((c) =>
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
          .filter((r) => !exceptRows.includes(r))
          .map((r) => [r, c, 5] as [number, number, number]),
      ),
    );

  it('x-wing', () => {
    const g = fishGrid(
      [1, 4],
      [
        [2, 7],
        [2, 7],
      ],
    );
    expect(elims(xWing(g))).toEqual(inCols([2, 7], [1, 4]));
  });

  it('swordfish', () => {
    const g = fishGrid(
      [1, 4, 7],
      [
        [1, 5],
        [5, 9],
        [1, 9],
      ],
    );
    expect(xWing(g)).toBeNull();
    expect(elims(swordfish(g))).toEqual(inCols([1, 5, 9], [1, 4, 7]));
  });

  it('jellyfish', () => {
    const g = fishGrid(
      [1, 3, 5, 7],
      [
        [2, 4],
        [4, 6],
        [6, 8],
        [2, 8],
      ],
    );
    expect(swordfish(g)).toBeNull();
    expect(elims(jellyfish(g))).toEqual(inCols([2, 4, 6, 8], [1, 3, 5, 7]));
  });

  it('finned x-wing', () => {
    const g = fishGrid(
      [1, 5],
      [
        [1, 7],
        [1, 7, 8],
      ],
    );
    expect(xWing(g)).toBeNull();
    expect(elims(finnedXWing(g))).toEqual(
      cands([
        [4, 7, 5],
        [6, 7, 5],
      ]),
    );
  });

  it('finned swordfish', () => {
    const g = fishGrid(
      [1, 4, 7],
      [
        [1, 5],
        [5, 9],
        [1, 8, 9],
      ],
    );
    expect(swordfish(g)).toBeNull();
    expect(elims(finnedSwordfish(g))).toEqual(
      cands([
        [8, 9, 5],
        [9, 9, 5],
      ]),
    );
  });
});

describe('wings', () => {
  it('xy-wing', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 5), [1, 3]);
    setCands(g, rc(5, 1), [2, 3]);
    expect(elims(xyWing(g))).toEqual(cands([[5, 5, 3]]));
  });

  it('xyz-wing', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2, 3]);
    setCands(g, rc(1, 5), [1, 3]);
    setCands(g, rc(2, 2), [2, 3]);
    expect(elims(xyzWing(g))).toEqual(
      cands([
        [1, 2, 3],
        [1, 3, 3],
      ]),
    );
  });

  it('w-wing', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(5, 9), [1, 2]);
    restrict(g, 1, row(3), [rc(3, 1), rc(3, 9)]);
    expect(elims(wWing(g))).toEqual(
      cands([
        [1, 9, 2],
        [5, 1, 2],
      ]),
    );
  });
});

describe('uniqueness', () => {
  it('unique rectangle type 1', () => {
    const g = openGrid();
    for (const [r, c] of [
      [1, 1],
      [1, 4],
      [2, 1],
    ])
      setCands(g, rc(r, c), [1, 2]);
    setCands(g, rc(2, 4), [1, 2, 5]);
    expect(elims(uniqueRectangle1(g))).toEqual(
      cands([
        [2, 4, 1],
        [2, 4, 2],
      ]),
    );
  });

  it('rectangles inside one box are not unique rectangles', () => {
    const g = openGrid();
    for (const [r, c] of [
      [1, 1],
      [1, 2],
      [2, 1],
    ])
      setCands(g, rc(r, c), [1, 2]);
    setCands(g, rc(2, 2), [1, 2, 5]);
    expect(uniqueRectangle1(g)).toBeNull();
  });

  it('unique rectangle type 2', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 4), [1, 2]);
    setCands(g, rc(2, 1), [1, 2, 7]);
    setCands(g, rc(2, 4), [1, 2, 7]);
    expect(elims(uniqueRectangle2(g))).toEqual(
      cands([2, 3, 5, 6, 7, 8, 9].map((c) => [2, c, 7] as [number, number, number])),
    );
  });

  it('unique rectangle type 4', () => {
    const g = openGrid();
    setCands(g, rc(1, 1), [1, 2]);
    setCands(g, rc(1, 4), [1, 2]);
    setCands(g, rc(2, 1), [1, 2, 7, 8]);
    setCands(g, rc(2, 4), [1, 2, 7, 8]);
    restrict(g, 1, row(2), [rc(2, 1), rc(2, 4)]);
    expect(elims(uniqueRectangle4(g))).toEqual(
      cands([
        [2, 1, 2],
        [2, 4, 2],
      ]),
    );
  });

  it('bug+1 needs every other cell bivalue', () => {
    expect(bug1(openGrid())).toBeNull();
  });
});
