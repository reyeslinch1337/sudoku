import { describe, expect, it } from 'vitest';
import { gridFromDigits } from '../../src/engine/grid';
import { createRng } from '../../src/engine/random';
import { randomPuzzle } from '../../src/engine/minimize';
import { solve } from '../../src/engine/solve';
import { checkSoundness } from './helpers';

describe('solver soundness on random puzzles', () => {
  it('never contradicts the solution', () => {
    const rng = createRng(2024);
    const used = new Map<string, number>();
    let solved = 0;
    const N = 300;
    for (let k = 0; k < N; k++) {
      const p = randomPuzzle(rng);
      const res = checkSoundness(gridFromDigits(p), solve(p)!);
      if (res.solved) solved++;
      for (const s of res.steps) used.set(s.technique, (used.get(s.technique) ?? 0) + 1);
    }
    console.log(`solved ${solved}/${N}`, Object.fromEntries([...used].sort()));
    // Most random minimal puzzles are solvable with basic techniques.
    expect(solved).toBeGreaterThan(N * 0.7);
  }, 120_000);
});
