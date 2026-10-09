// Forcing chains: assume each alternative of a cell (or each place of a digit in a unit), follow
// the consequences with singles only, and keep what holds in every alternative that does not
// collapse into a contradiction.

import { type Grid, CELL_UNITS, PEERS, POPCOUNT, UNITS, bit, digitsOf, firstDigit } from '../grid';
import { RATING, chainRating } from '../rating';
import { type Cand, type Step, type TechniqueId, makeStep } from '../step';

/** Propagation stops after this many waves of singles. */
export const MAX_WAVES = 12;

interface Branch {
  /** Wave in which the contradiction appeared, or -1. */
  contradiction: number;
  /** Per candidate node (cell * 9 + d - 1): wave it was eliminated / placed in, or -1. */
  elimWave: Int8Array;
  placeWave: Int8Array;
  /** Placements made up to and including each wave. */
  placementsUpTo: number[];
}

/** Follows the assumption that digit d goes to cell, wave by wave. */
export function propagate(g: Grid, cell: number, d: number): Branch {
  const digits = g.digits.slice();
  const cands = g.cands.slice();
  const elimWave = new Int8Array(729).fill(-1);
  const placeWave = new Int8Array(729).fill(-1);
  const placementsUpTo: number[] = [];
  let placed = 0;

  // Returns false on a direct conflict.
  const put = (c: number, x: number, wave: number): boolean => {
    if (digits[c]) return digits[c] === x;
    if (!(cands[c] & bit(x))) return false;
    for (const y of digitsOf(cands[c])) if (y !== x) elimWave[c * 9 + y - 1] = wave;
    digits[c] = x;
    cands[c] = 0;
    placeWave[c * 9 + x - 1] = wave;
    placed++;
    const b = bit(x);
    for (const p of PEERS[c]) {
      if (cands[p] & b) {
        cands[p] &= ~b;
        elimWave[p * 9 + x - 1] = wave;
      }
    }
    return true;
  };

  const result = (contradiction: number): Branch => ({
    contradiction,
    elimWave,
    placeWave,
    placementsUpTo,
  });

  put(cell, d, 0);
  placementsUpTo.push(placed);
  for (let wave = 1; wave <= MAX_WAVES; wave++) {
    // Collect all singles visible after the previous wave, then place them together.
    const pending: [number, number][] = [];
    for (let c = 0; c < 81; c++) {
      if (digits[c]) continue;
      const n = POPCOUNT[cands[c]];
      if (n === 0) return result(wave - 1);
      if (n === 1) pending.push([c, firstDigit(cands[c])]);
    }
    for (let u = 0; u < 27; u++) {
      for (let x = 1; x <= 9; x++) {
        const b = bit(x);
        let pos = -1;
        let count = 0;
        let done = false;
        for (const c of UNITS[u]) {
          if (digits[c] === x) {
            done = true;
            break;
          }
          if (cands[c] & b) {
            pos = c;
            count++;
          }
        }
        if (done) continue;
        if (count === 0) return result(wave - 1);
        if (count === 1) pending.push([pos, x]);
      }
    }
    if (!pending.length) break;
    for (const [c, x] of pending) if (!put(c, x, wave)) return result(wave);
    placementsUpTo.push(placed);
    // A unit that lost every place for a digit is caught at the start of the next wave.
  }
  return result(-1);
}

interface Conclusion {
  cand: Cand;
  place: boolean;
  length: number;
}

/** Common conclusions of a set of branches, with the minimal length found. */
function commonConclusions(g: Grid, branches: Branch[]): Conclusion[] {
  const valid = branches.filter((b) => b.contradiction < 0);
  if (!valid.length) return [];
  let contraLength = 0;
  for (const b of branches)
    if (b.contradiction >= 0)
      contraLength += b.placementsUpTo[b.contradiction] ?? b.placementsUpTo.at(-1)!;
  const out: Conclusion[] = [];
  for (let c = 0; c < 81; c++) {
    if (g.digits[c]) continue;
    for (const d of digitsOf(g.cands[c])) {
      const n = c * 9 + d - 1;
      for (const place of [true, false]) {
        let length = contraLength;
        let ok = true;
        for (const b of valid) {
          const w = place ? b.placeWave[n] : b.elimWave[n];
          if (w < 0) {
            ok = false;
            break;
          }
          length += b.placementsUpTo[w];
        }
        if (ok) out.push({ cand: { cell: c, digit: d }, place, length });
      }
    }
  }
  return out;
}

interface Candidate {
  technique: TechniqueId;
  start: Cand[];
  conclusions: Conclusion[];
}

export function forcingChains(g: Grid): Step | null {
  const cache = new Map<number, Branch>();
  const branchOf = (c: number, d: number) => {
    const key = c * 9 + d - 1;
    let b = cache.get(key);
    if (!b) {
      b = propagate(g, c, d);
      cache.set(key, b);
    }
    return b;
  };

  const options: Candidate[] = [];
  for (let c = 0; c < 81; c++) {
    if (g.digits[c]) continue;
    const ds = digitsOf(g.cands[c]);
    if (ds.length < 2) continue;
    const start = ds.map((digit) => ({ cell: c, digit }));
    const conclusions = commonConclusions(
      g,
      ds.map((d) => branchOf(c, d)),
    );
    if (conclusions.length) options.push({ technique: 'cell-forcing-chain', start, conclusions });
  }
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      const ps = UNITS[u].filter((c) => g.cands[c] & bit(d));
      if (ps.length < 2) continue;
      const start = ps.map((cell) => ({ cell, digit: d }));
      const conclusions = commonConclusions(
        g,
        ps.map((c) => branchOf(c, d)),
      );
      if (conclusions.length) options.push({ technique: 'unit-forcing-chain', start, conclusions });
    }
  }

  let best: { option: Candidate; length: number } | null = null;
  for (const o of options) {
    const length = Math.min(...o.conclusions.map((k) => k.length));
    if (!best || length < best.length) best = { option: o, length };
  }
  if (!best) return null;
  const chosen = best.option.conclusions.filter((k) => k.length === best!.length);
  const placements = chosen.filter((k) => k.place).map((k) => k.cand);
  const placedCells = new Set(placements.map((p) => p.cell));
  const eliminations = chosen
    .filter((k) => !k.place && !placedCells.has(k.cand.cell))
    .map((k) => k.cand);
  return makeStep(
    best.option.technique,
    chainRating(RATING.forcingChain, best.length, RATING.forcingMax),
    {
      placements,
      eliminations,
      cells: [...new Set(best.option.start.map((s) => s.cell))],
      units: best.option.technique === 'unit-forcing-chain' ? unitOf(best.option.start) : [],
      marks: best.option.start.map((s) => ({ ...s, role: 'key' as const })),
    },
  );
}

function unitOf(start: Cand[]): number[] {
  const cells = start.map((s) => s.cell);
  const shared = CELL_UNITS[cells[0]].filter((u) => cells.every((c) => CELL_UNITS[c].includes(u)));
  return shared.slice(0, 1);
}
