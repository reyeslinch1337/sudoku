import { describe, expect, it } from 'vitest';
import { normalizeLine, pickFromCollection } from '../../src/engine/collections';
import { parseDigits } from '../../src/engine/grid';
import { createRng } from '../../src/engine/random';
import { fingerprint } from '../../src/engine/transform';
import calibration from '../fixtures/calibration.json';

const beyond = Object.values(calibration.unsolvable);
const solvable = calibration.rated.map((x) => x.p);
// Easter Monster with zeros instead of dots and a trailing rating, as some lists write it.
const zeroForm = beyond[0].replace(/\./g, '0') + ' 11.9';

describe('collections', () => {
  it('normalizes lines', () => {
    expect(normalizeLine(zeroForm)).toBe(beyond[0]);
    expect(normalizeLine('# comment')).toBeNull();
  });

  it('takes only unique puzzles beyond the solver, without duplicates', () => {
    const lines = [...solvable, zeroForm, ...beyond, 'garbage'];
    const seen = new Set<string>();
    const picked = pickFromCollection(lines, { level: 11, quota: 10, rng: createRng(1), seen });
    expect(picked.map((e) => e.p).sort()).toEqual([...beyond].sort());
    expect(picked.every((e) => e.l === 11 && e.r === undefined)).toBe(true);
    expect(seen.size).toBe(beyond.length);
  });

  it('honors quota, exclusions and known fingerprints, and is reproducible', () => {
    const run = (exclude?: Set<string>, seen = new Set<string>()) =>
      pickFromCollection(beyond, { level: 10, quota: 2, rng: createRng(7), seen, exclude });
    expect(run()).toHaveLength(2);
    expect(run()).toEqual(run());
    expect(run(new Set(beyond.slice(1))).map((e) => e.p)).toEqual([beyond[0]]);
    const known = new Set([fingerprint(parseDigits(beyond[2]))]);
    expect(run(undefined, known).map((e) => e.p)).not.toContain(beyond[2]);
  });
});
