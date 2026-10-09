// Validity-preserving transformations of a sudoku and a transformation-invariant fingerprint.

import { boxOf, colOf, rowOf } from './grid';
import { type Rng, shuffle } from './random';

export interface Transform {
  /** digitMap[d - 1] is the new digit for d. */
  digitMap: number[];
  /** Output row r takes source row rowPerm[r]; respects bands. */
  rowPerm: number[];
  /** Output column c takes source column colPerm[c]; respects stacks. */
  colPerm: number[];
  transpose: boolean;
}

export const IDENTITY: Transform = {
  digitMap: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  rowPerm: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  colPerm: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  transpose: false,
};

function randomLinePerm(rng: Rng): number[] {
  const bands = shuffle(rng, [0, 1, 2]);
  const out: number[] = [];
  for (const b of bands) for (const k of shuffle(rng, [0, 1, 2])) out.push(b * 3 + k);
  return out;
}

export function randomTransform(rng: Rng): Transform {
  return {
    digitMap: shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    rowPerm: randomLinePerm(rng),
    colPerm: randomLinePerm(rng),
    transpose: rng() < 0.5,
  };
}

/** Source cell index for output cell i. */
export function sourceCell(t: Transform, i: number): number {
  const r = t.rowPerm[rowOf(i)];
  const c = t.colPerm[colOf(i)];
  return t.transpose ? c * 9 + r : r * 9 + c;
}

export function applyTransform(t: Transform, digits: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(81);
  for (let i = 0; i < 81; i++) {
    const d = digits[sourceCell(t, i)];
    out[i] = d ? t.digitMap[d - 1] : 0;
  }
  return out;
}

function mix(h: number, n: number): number {
  h ^= n;
  h = Math.imul(h, 0x01000193);
  h ^= h >>> 15;
  return h >>> 0;
}

function hashList(nums: number[], seed: number): number {
  let h = seed >>> 0;
  h = mix(h, nums.length);
  for (const n of nums) h = mix(h, n);
  return h;
}

const sortedHash = (nums: number[], seed: number): number =>
  hashList(
    nums.slice().sort((a, b) => a - b),
    seed,
  );

/**
 * A string that is equal for a puzzle and all its transformations (digit relabeling, row and
 * column permutations within bands and stacks, band and stack permutations, transposition).
 * Built by iterative color refinement over the clue cells. Different puzzles collide only in
 * pathological cases, which for deduplication merely drops a puzzle.
 */
export function fingerprint(digits: ArrayLike<number>): string {
  const clues: number[] = [];
  for (let i = 0; i < 81; i++) if (digits[i]) clues.push(i);
  const digitCount = new Array<number>(10).fill(0);
  for (const i of clues) digitCount[digits[i]]++;

  let color = new Map<number, number>();
  for (const i of clues) color.set(i, mix(0x811c9dc5, digitCount[digits[i]]));

  const band = (i: number) => (rowOf(i) / 3) | 0;
  const stack = (i: number) => (colOf(i) / 3) | 0;

  for (let iter = 0; iter < 4; iter++) {
    const next = new Map<number, number>();
    for (const i of clues) {
      const sameRow: number[] = [];
      const sameCol: number[] = [];
      const sameBox: number[] = [];
      const sameBand: number[] = [];
      const sameStack: number[] = [];
      const sameDigit: number[] = [];
      for (const j of clues) {
        if (j === i) continue;
        const cj = color.get(j)!;
        if (rowOf(j) === rowOf(i)) sameRow.push(cj);
        else if (band(j) === band(i)) sameBand.push(cj);
        if (colOf(j) === colOf(i)) sameCol.push(cj);
        else if (stack(j) === stack(i)) sameStack.push(cj);
        if (boxOf(j) === boxOf(i)) sameBox.push(cj);
        if (digits[j] === digits[i]) sameDigit.push(cj);
      }
      const rowSide = hashList([sortedHash(sameRow, 1), sortedHash(sameBand, 2)], 3);
      const colSide = hashList([sortedHash(sameCol, 1), sortedHash(sameStack, 2)], 3);
      const lines = rowSide < colSide ? [rowSide, colSide] : [colSide, rowSide];
      next.set(
        i,
        hashList([color.get(i)!, ...lines, sortedHash(sameBox, 4), sortedHash(sameDigit, 5)], 6),
      );
    }
    color = next;
  }

  const all = [...color.values()];
  const a = sortedHash(all, 0x9e3779b9);
  const b = sortedHash(all, 0x85ebca6b);
  return `${clues.length}-${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}
