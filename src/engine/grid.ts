// Grid representation shared by the solver, the generator and the game.
// Cells are indexed 0..80 row by row. Candidates are 9-bit masks: bit (d - 1) set means digit d.

export const ALL = 0x1ff;

export const rowOf = (i: number): number => (i / 9) | 0;
export const colOf = (i: number): number => i % 9;
export const boxOf = (i: number): number => ((i / 27) | 0) * 3 + (((i % 9) / 3) | 0);
export const cellAt = (r: number, c: number): number => r * 9 + c;

/** 27 units: rows 0-8, columns 9-17, boxes 18-26. */
export const UNITS: readonly (readonly number[])[] = (() => {
  const units: number[][] = [];
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const r0 = ((b / 3) | 0) * 3;
    const c0 = (b % 3) * 3;
    units.push(Array.from({ length: 9 }, (_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)));
  }
  return units;
})();

/** Units containing each cell: [row unit, column unit, box unit]. */
export const CELL_UNITS: readonly (readonly [number, number, number])[] = Array.from(
  { length: 81 },
  (_, i) => [rowOf(i), 9 + colOf(i), 18 + boxOf(i)] as const,
);

/** The 20 peers of each cell. */
export const PEERS: readonly (readonly number[])[] = Array.from({ length: 81 }, (_, i) => {
  const set = new Set<number>();
  for (const u of CELL_UNITS[i]) for (const j of UNITS[u]) if (j !== i) set.add(j);
  return [...set].sort((a, b) => a - b);
});

const peerSets: Uint8Array[] = PEERS.map((ps) => {
  const a = new Uint8Array(81);
  for (const p of ps) a[p] = 1;
  return a;
});

export const sees = (a: number, b: number): boolean => peerSets[a][b] === 1;

export const POPCOUNT: Uint8Array = (() => {
  const t = new Uint8Array(512);
  for (let m = 1; m < 512; m++) t[m] = t[m >> 1] + (m & 1);
  return t;
})();

export const bit = (d: number): number => 1 << (d - 1);

/** Lowest digit present in a non-empty mask. */
export const firstDigit = (mask: number): number => 31 - Math.clz32(mask & -mask) + 1;

export const digitsOf = (mask: number): number[] => {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) out.push(d);
  return out;
};

export interface Grid {
  /** 0 for an empty cell. */
  digits: Uint8Array;
  /** Candidate masks; 0 for filled cells. */
  cands: Uint16Array;
}

export function parseDigits(s: string): Uint8Array {
  const clean = s.replace(/\s+/g, '');
  if (clean.length !== 81) throw new Error(`Expected 81 cells, got ${clean.length}`);
  const out = new Uint8Array(81);
  for (let i = 0; i < 81; i++) {
    const ch = clean[i];
    out[i] = ch >= '1' && ch <= '9' ? ch.charCodeAt(0) - 48 : 0;
  }
  return out;
}

export function formatDigits(digits: ArrayLike<number>): string {
  let s = '';
  for (let i = 0; i < 81; i++) s += digits[i] ? String(digits[i]) : '.';
  return s;
}

/** Candidates allowed by the placed digits alone. */
export function basicCandidates(digits: ArrayLike<number>): Uint16Array {
  const cands = new Uint16Array(81);
  for (let i = 0; i < 81; i++) {
    if (digits[i]) continue;
    let used = 0;
    for (const p of PEERS[i]) if (digits[p]) used |= bit(digits[p]);
    cands[i] = ALL & ~used;
  }
  return cands;
}

export function gridFromDigits(digits: ArrayLike<number>): Grid {
  const d = Uint8Array.from(digits);
  return { digits: d, cands: basicCandidates(d) };
}

export function cloneGrid(g: Grid): Grid {
  return { digits: g.digits.slice(), cands: g.cands.slice() };
}

/** Places a digit and removes it from the candidates of all peers. */
export function place(g: Grid, cell: number, d: number): void {
  g.digits[cell] = d;
  g.cands[cell] = 0;
  const m = ~bit(d);
  for (const p of PEERS[cell]) g.cands[p] &= m;
}

export function isSolved(g: Grid): boolean {
  for (let i = 0; i < 81; i++) if (!g.digits[i]) return false;
  return true;
}

export const cellName = (i: number): string => `r${rowOf(i) + 1}c${colOf(i) + 1}`;
