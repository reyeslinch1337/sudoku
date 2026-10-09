import { describe, expect, it } from 'vitest';
import {
  PEERS,
  UNITS,
  basicCandidates,
  boxOf,
  formatDigits,
  parseDigits,
} from '../../src/engine/grid';
import { countSolutions, randomSolution, solve } from '../../src/engine/solve';
import { createRng, randInt } from '../../src/engine/random';
import { applyTransform, fingerprint, randomTransform, IDENTITY } from '../../src/engine/transform';

// A well-known 17-clue puzzle with a unique solution.
const P17 = '.......1.4.........2...........5.4.7..8...3....1.9....3..4..2...5.1........8.6...';

function isValidSolution(d: ArrayLike<number>): boolean {
  for (const u of UNITS) {
    const seen = new Set<number>();
    for (const i of u) seen.add(d[i]);
    if (seen.size !== 9 || seen.has(0)) return false;
  }
  return true;
}

describe('grid', () => {
  it('has 27 units and 20 peers per cell', () => {
    expect(UNITS).toHaveLength(27);
    for (const ps of PEERS) expect(ps).toHaveLength(20);
    expect(boxOf(80)).toBe(8);
    expect(boxOf(30)).toBe(4);
  });

  it('parses and formats', () => {
    expect(formatDigits(parseDigits(P17))).toBe(P17);
  });

  it('computes candidates from placed digits', () => {
    const d = new Uint8Array(81);
    d[0] = 5;
    const c = basicCandidates(d);
    expect(c[0]).toBe(0);
    expect(c[1] & (1 << 4)).toBe(0);
    expect(c[80]).toBe(0x1ff);
  });
});

describe('solve', () => {
  it('solves a 17-clue puzzle uniquely', () => {
    const d = parseDigits(P17);
    expect(countSolutions(d)).toBe(1);
    const s = solve(d)!;
    expect(isValidSolution(s)).toBe(true);
    for (let i = 0; i < 81; i++) if (d[i]) expect(s[i]).toBe(d[i]);
  });

  it('detects multiple and zero solutions', () => {
    const d = parseDigits(P17);
    d[7] = 0;
    expect(countSolutions(d)).toBe(2);
    const bad = parseDigits(P17);
    bad[0] = 1; // duplicates the 1 in row 1
    expect(countSolutions(bad)).toBe(0);
  });

  it('produces varied random solutions', () => {
    const rng = createRng(42);
    const a = randomSolution(rng)!;
    const b = randomSolution(rng)!;
    expect(isValidSolution(a)).toBe(true);
    expect(isValidSolution(b)).toBe(true);
    expect(formatDigits(a)).not.toBe(formatDigits(b));
  });
});

describe('transform', () => {
  it('identity keeps the puzzle', () => {
    expect(formatDigits(applyTransform(IDENTITY, parseDigits(P17)))).toBe(P17);
  });

  it('keeps validity and maps the solution consistently', () => {
    const rng = createRng(7);
    const d = parseDigits(P17);
    const sol = solve(d)!;
    for (let k = 0; k < 50; k++) {
      const t = randomTransform(rng);
      const td = applyTransform(t, d);
      const ts = applyTransform(t, sol);
      expect(isValidSolution(ts)).toBe(true);
      expect(countSolutions(td)).toBe(1);
      expect(formatDigits(solve(td)!)).toBe(formatDigits(ts));
    }
  });

  it('fingerprint is invariant under transformations', () => {
    const rng = createRng(11);
    const d = parseDigits(P17);
    const f = fingerprint(d);
    for (let k = 0; k < 50; k++)
      expect(fingerprint(applyTransform(randomTransform(rng), d))).toBe(f);
  });

  it('fingerprint distinguishes different puzzles', () => {
    const rng = createRng(3);
    const seen = new Set<string>();
    for (let k = 0; k < 200; k++) {
      const s = randomSolution(rng)!;
      for (let j = 0; j < 30; j++) s[randInt(rng, 81)] = 0;
      seen.add(fingerprint(s));
    }
    expect(seen.size).toBe(200);
  });
});

describe('performance', () => {
  it('finds 1000 random solutions quickly', () => {
    const rng = createRng(1);
    const t0 = performance.now();
    for (let k = 0; k < 1000; k++) randomSolution(rng)!;
    expect(performance.now() - t0).toBeLessThan(3000);
  });
});
