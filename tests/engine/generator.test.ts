import { describe, expect, it } from 'vitest';
import {
  type BankEntry,
  type Bucket,
  type Candidate,
  mutate,
  searchFresh,
  selectBank,
  verifyEntries,
  verifyQuotas,
} from '../../src/engine/generator';
import { createRng } from '../../src/engine/random';
import { randomPuzzle } from '../../src/engine/minimize';
import { countSolutions } from '../../src/engine/solve';
import { formatDigits, parseDigits } from '../../src/engine/grid';
import { applyTransform, fingerprint, randomTransform } from '../../src/engine/transform';

const isMinimal = (d: Uint8Array) => {
  for (let i = 0; i < 81; i++) {
    if (!d[i]) continue;
    const v = d[i];
    d[i] = 0;
    const n = countSolutions(d, 2);
    d[i] = v;
    if (n === 1) return false;
  }
  return true;
};

describe('generator', () => {
  it('mutations stay unique and minimal', () => {
    const rng = createRng(5);
    const base = randomPuzzle(rng);
    let made = 0;
    for (let k = 0; k < 10; k++) {
      const m = mutate(rng, base);
      if (!m) continue;
      made++;
      expect(countSolutions(m, 2)).toBe(1);
      expect(isMinimal(m)).toBe(true);
    }
    expect(made).toBeGreaterThan(5);
  });

  it('fresh search is reproducible and respects the threshold', () => {
    const a = searchFresh(createRng(9), 20, 3.0);
    const b = searchFresh(createRng(9), 20, 3.0);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    for (const f of a) expect(f.r).toBeGreaterThanOrEqual(3.0);
    const entries = a.map((f) => ({ p: f.p, l: 9 as const, r: f.r }));
    expect(verifyEntries(entries, [{ name: 'any', min: 0, max: 10, quota: 0 }])).toEqual([]);
  });

  it('selects by quota, spreads rating levels and caps lineages', () => {
    const buckets: Bucket[] = [{ name: 'b', min: 7.0, max: 7.9, quota: 4 }];
    const c = (p: string, r: number, lineage: number): Candidate => ({ p, r, lineage });
    const cands = [
      c('a', 7.0, 1),
      c('b', 7.0, 2),
      c('c', 7.0, 3),
      c('d', 7.5, 1),
      c('e', 7.5, 1),
      c('f', 8.2, 4),
    ];
    const bank = selectBank(cands, buckets, 2);
    expect(bank.map((e) => e.p)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('verification catches duplicates and wrong ratings', () => {
    const found = searchFresh(createRng(3), 30, 3.0)[0];
    const p = { p: found.p, l: 9 as const, r: found.r };
    const twin = formatDigits(applyTransform(randomTransform(createRng(1)), parseDigits(p.p)));
    expect(fingerprint(parseDigits(twin))).toBe(fingerprint(parseDigits(p.p)));
    const any: Bucket[] = [{ name: 'any', min: 0, max: 20, quota: 0 }];
    const problems = verifyEntries(
      [p, { ...p, p: twin }, { ...p, r: p.r + 1 }, { p: p.p, l: 11 }],
      any,
    );
    expect(problems.map((x) => x.index)).toEqual([1, 2, 2, 3, 3]);
    expect(verifyQuotas([p])).toEqual(['level 10: no puzzles', 'level 11: no puzzles']);
    expect(verifyQuotas([p, p], 1)).toContain('level 9: 2 puzzles, at most 1');
  });
});

// The committed bank, when present: quotas in full, a sample of entries in depth.
const bankModules = import.meta.glob<{ default: BankEntry[] }>('../../src/data/puzzles.json', {
  eager: true,
});
const bank = Object.values(bankModules)[0]?.default;

describe.runIf(bank)('puzzle bank', () => {
  it('has every level within its quota', () => {
    expect(verifyQuotas(bank!)).toEqual([]);
  });

  it('has no duplicates', () => {
    const fps = new Set(bank!.map((e) => fingerprint(parseDigits(e.p))));
    expect(fps.size).toBe(bank!.length);
  });

  it('sample entries pass the checks of their level', () => {
    const sample = bank!.filter((_, i) => i % 10 === 0);
    expect(verifyEntries(sample)).toEqual([]);
  }, 120_000);
});
