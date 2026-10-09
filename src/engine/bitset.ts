// 81-bit cell sets stored in three 27-bit words.

export type CellSet = [number, number, number];

export const emptySet = (): CellSet => [0, 0, 0];

export function setOf(cells: Iterable<number>): CellSet {
  const s = emptySet();
  for (const c of cells) s[(c / 27) | 0] |= 1 << (c % 27);
  return s;
}

export const and = (a: CellSet, b: CellSet): CellSet => [a[0] & b[0], a[1] & b[1], a[2] & b[2]];
export const or = (a: CellSet, b: CellSet): CellSet => [a[0] | b[0], a[1] | b[1], a[2] | b[2]];
export const andNot = (a: CellSet, b: CellSet): CellSet => [
  a[0] & ~b[0],
  a[1] & ~b[1],
  a[2] & ~b[2],
];
export const isEmpty = (a: CellSet): boolean => !(a[0] | a[1] | a[2]);
export const subset = (a: CellSet, b: CellSet): boolean =>
  !(a[0] & ~b[0]) && !(a[1] & ~b[1]) && !(a[2] & ~b[2]);
export const has = (a: CellSet, c: number): boolean => (a[(c / 27) | 0] & (1 << (c % 27))) !== 0;

export function cellsOf(a: CellSet): number[] {
  const out: number[] = [];
  for (let w = 0; w < 3; w++) {
    let m = a[w];
    while (m) {
      const low = m & -m;
      out.push(w * 27 + 31 - Math.clz32(low));
      m ^= low;
    }
  }
  return out;
}

export const FULL: CellSet = [(1 << 27) - 1, (1 << 27) - 1, (1 << 27) - 1];
