// A single logical deduction, shared by the rating code and by hints.

import { type Grid, bit, place } from './grid';

export type TechniqueId =
  | 'hidden-single'
  | 'naked-single'
  | 'pointing'
  | 'claiming'
  | 'naked-pair'
  | 'naked-triple'
  | 'naked-quad'
  | 'hidden-pair'
  | 'hidden-triple'
  | 'hidden-quad'
  | 'x-wing'
  | 'swordfish'
  | 'jellyfish'
  | 'finned-x-wing'
  | 'finned-swordfish'
  | 'xy-wing'
  | 'xyz-wing'
  | 'w-wing'
  | 'unique-rectangle-1'
  | 'unique-rectangle-2'
  | 'unique-rectangle-4'
  | 'bug-1'
  | 'skyscraper'
  | 'two-string-kite'
  | 'x-chain'
  | 'xy-chain'
  | 'aic'
  | 'als-xz'
  | 'als-xy-wing'
  | 'cell-forcing-chain'
  | 'unit-forcing-chain';

/** Display names; the same in every language. */
export const TECHNIQUE_NAMES: Record<TechniqueId, string> = {
  'hidden-single': 'Hidden Single',
  'naked-single': 'Naked Single',
  pointing: 'Pointing',
  claiming: 'Claiming',
  'naked-pair': 'Naked Pair',
  'naked-triple': 'Naked Triple',
  'naked-quad': 'Naked Quad',
  'hidden-pair': 'Hidden Pair',
  'hidden-triple': 'Hidden Triple',
  'hidden-quad': 'Hidden Quad',
  'x-wing': 'X-Wing',
  swordfish: 'Swordfish',
  jellyfish: 'Jellyfish',
  'finned-x-wing': 'Finned X-Wing',
  'finned-swordfish': 'Finned Swordfish',
  'xy-wing': 'XY-Wing',
  'xyz-wing': 'XYZ-Wing',
  'w-wing': 'W-Wing',
  'unique-rectangle-1': 'Unique Rectangle Type 1',
  'unique-rectangle-2': 'Unique Rectangle Type 2',
  'unique-rectangle-4': 'Unique Rectangle Type 4',
  'bug-1': 'BUG+1',
  skyscraper: 'Skyscraper',
  'two-string-kite': '2-String Kite',
  'x-chain': 'X-Chain',
  'xy-chain': 'XY-Chain',
  aic: 'AIC',
  'als-xz': 'ALS-XZ',
  'als-xy-wing': 'ALS-XY-Wing',
  'cell-forcing-chain': 'Cell Forcing Chain',
  'unit-forcing-chain': 'Unit Forcing Chain',
};

export interface Cand {
  cell: number;
  digit: number;
}

/**
 * Highlight role of a candidate: 'key' marks the pattern, 'on' and 'off' mark chain nodes
 * assumed true or false, 'fin' marks fish fins, 'elim' marks a removed candidate.
 */
export type MarkRole = 'key' | 'on' | 'off' | 'fin' | 'elim';

export interface Mark extends Cand {
  role: MarkRole;
}

export interface Link {
  from: Cand;
  to: Cand;
  strong: boolean;
}

export interface Step {
  technique: TechniqueId;
  rating: number;
  placements: Cand[];
  eliminations: Cand[];
  /** Cells that form the pattern. */
  cells: number[];
  /** Units (0-26) the pattern is built on. */
  units: number[];
  marks: Mark[];
  links: Link[];
}

export function makeStep(
  technique: TechniqueId,
  rating: number,
  parts: Partial<Omit<Step, 'technique' | 'rating'>>,
): Step {
  const step: Step = {
    technique,
    rating,
    placements: parts.placements ?? [],
    eliminations: parts.eliminations ?? [],
    cells: parts.cells ?? [],
    units: parts.units ?? [],
    marks: parts.marks ?? [],
    links: parts.links ?? [],
  };
  for (const e of step.eliminations) step.marks.push({ ...e, role: 'elim' });
  return step;
}

export function applyStep(g: Grid, s: Step): void {
  for (const e of s.eliminations) g.cands[e.cell] &= ~bit(e.digit);
  for (const p of s.placements) if (!g.digits[p.cell]) place(g, p.cell, p.digit);
}

/** Eliminations of digit d from the given cells, where present. */
export function elimsOf(g: Grid, cells: Iterable<number>, d: number): Cand[] {
  const out: Cand[] = [];
  const b = bit(d);
  for (const c of cells) if (g.cands[c] & b) out.push({ cell: c, digit: d });
  return out;
}

export function* combinations<T>(items: readonly T[], k: number, start = 0): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = start; i <= items.length - k; i++) {
    for (const rest of combinations(items, k - 1, i + 1)) yield [items[i], ...rest];
  }
}
