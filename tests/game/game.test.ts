import { describe, expect, it } from 'vitest';
import { type GameState, HISTORY_LIMIT, newGame, reduce } from '../../src/game/state';
import { conflicts, digitCounts, effectiveGrid, findErrors } from '../../src/game/check';
import { computeHint } from '../../src/game/hint';
import { Timer, formatTime } from '../../src/game/timer';
import { pickPuzzle, ratingLabel } from '../../src/game/pick';
import { summarize, summarizeByLevel, type SolveRecord } from '../../src/game/stats';
import { IDENTITY, randomTransform } from '../../src/engine/transform';
import { createRng } from '../../src/engine/random';
import { basicCandidates, bit } from '../../src/engine/grid';

// A 7.x puzzle from the calibration set.
const PUZZLE = '2..4..9.......18....762..4..8...5.3..6......7...1........34....3.52..6..6...5...9';
const ref = { id: PUZZLE, rating: 7.2, transform: IDENTITY };

const firstEmpty = (g: GameState) => g.values.findIndex((v) => v === 0);

describe('game state', () => {
  it('starts with givens and a solution', () => {
    const g = newGame(ref);
    expect(g.values).toEqual(g.givens);
    expect(g.solution.every((v) => v >= 1 && v <= 9)).toBe(true);
    expect(g.solved).toBe(false);
  });

  it('applies a transformation consistently', () => {
    const g = newGame({ ...ref, transform: randomTransform(createRng(4)) });
    for (let i = 0; i < 81; i++) if (g.givens[i]) expect(g.solution[i]).toBe(g.givens[i]);
  });

  it('places, toggles and erases digits; givens are locked', () => {
    let g = newGame(ref);
    const c = firstEmpty(g);
    g = reduce(g, { type: 'digit', cell: c, digit: 5 });
    expect(g.values[c]).toBe(5);
    g = reduce(g, { type: 'digit', cell: c, digit: 5 });
    expect(g.values[c]).toBe(0);
    g = reduce(g, { type: 'digit', cell: c, digit: 3 });
    g = reduce(g, { type: 'erase', cell: c });
    expect(g.values[c]).toBe(0);
    const given = g.givens.findIndex((v) => v);
    expect(reduce(g, { type: 'digit', cell: given, digit: 1 })).toBe(g);
  });

  it('toggles notes only in empty cells', () => {
    let g = newGame(ref);
    const c = firstEmpty(g);
    g = reduce(g, { type: 'note', cell: c, digit: 4 });
    g = reduce(g, { type: 'note', cell: c, digit: 6 });
    expect(g.notes[c]).toBe(bit(4) | bit(6));
    g = reduce(g, { type: 'note', cell: c, digit: 4 });
    expect(g.notes[c]).toBe(bit(6));
    g = reduce(g, { type: 'erase', cell: c });
    expect(g.notes[c]).toBe(0);
  });

  it('undo and redo', () => {
    let g = newGame(ref);
    const c = firstEmpty(g);
    g = reduce(g, { type: 'digit', cell: c, digit: 1 });
    g = reduce(g, { type: 'digit', cell: c, digit: 2 });
    g = reduce(g, { type: 'undo' });
    expect(g.values[c]).toBe(1);
    g = reduce(g, { type: 'undo' });
    expect(g.values[c]).toBe(0);
    expect(reduce(g, { type: 'undo' })).toBe(g);
    g = reduce(g, { type: 'redo' });
    expect(g.values[c]).toBe(1);
    g = reduce(g, { type: 'note', cell: firstEmpty(g), digit: 9 });
    expect(g.future).toHaveLength(0);
  });

  it('keeps at most HISTORY_LIMIT steps', () => {
    let g = newGame(ref);
    const c = firstEmpty(g);
    for (let k = 0; k < HISTORY_LIMIT + 20; k++)
      g = reduce(g, { type: 'note', cell: c, digit: (k % 9) + 1 });
    expect(g.past).toHaveLength(HISTORY_LIMIT);
  });

  it('auto candidates fill notes and follow placements', () => {
    let g = newGame(ref);
    g = reduce(g, { type: 'toggleAuto' });
    const allowed = basicCandidates(g.values);
    const c = firstEmpty(g);
    expect(g.notes[c]).toBe(allowed[c]);
    const d = g.solution[c];
    g = reduce(g, { type: 'digit', cell: c, digit: d });
    // Every peer lost d.
    const row = Math.floor(c / 9);
    for (let k = 0; k < 9; k++) {
      const p = row * 9 + k;
      if (p !== c) expect(g.notes[p] & bit(d)).toBe(0);
    }
    g = reduce(g, { type: 'toggleAuto' });
    expect(g.autoCandidates).toBe(false);
    expect(g.notes[firstEmpty(g)]).not.toBe(0);
  });

  it('detects the win and freezes', () => {
    let g = newGame(ref);
    for (let i = 0; i < 81; i++)
      if (!g.values[i]) g = reduce(g, { type: 'digit', cell: i, digit: g.solution[i] });
    expect(g.solved).toBe(true);
    expect(reduce(g, { type: 'undo' })).toBe(g);
    expect(reduce(g, { type: 'tick', ms: 1000 })).toBe(g);
  });

  it('counts time, hints and checks', () => {
    let g = newGame(ref);
    g = reduce(g, { type: 'tick', ms: 1500 });
    g = reduce(g, { type: 'hintUsed' });
    g = reduce(g, { type: 'checkUsed' });
    g = reduce(g, { type: 'checkUsed' });
    expect([g.elapsedMs, g.hints, g.checks]).toEqual([1500, 1, 2]);
  });
});

describe('checks', () => {
  it('effective candidates use notes minus placed peers', () => {
    const g = newGame(ref);
    const c = firstEmpty(g);
    const notes = [...g.notes];
    notes[c] = 0x1ff;
    const grid = effectiveGrid({ values: g.values, notes });
    expect(grid.cands[c]).toBe(basicCandidates(g.values)[c]);
    notes[c] = bit(g.solution[c]);
    expect(effectiveGrid({ values: g.values, notes }).cands[c]).toBe(bit(g.solution[c]));
  });

  it('finds wrong digits and lost candidates', () => {
    const g = newGame(ref);
    const [a, b] = g.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const values = [...g.values];
    values[a] = (g.solution[a] % 9) + 1;
    const notes = [...g.notes];
    notes[b] = 0x1ff & ~bit(g.solution[b]);
    expect(findErrors({ values, notes }, g.givens, g.solution)).toEqual([
      { kind: 'wrongDigit', cell: a, digit: values[a] },
      { kind: 'lostCandidate', cell: b, digit: g.solution[b] },
    ]);
  });

  it('finds visible conflicts and counts digits', () => {
    const values = new Array(81).fill(0);
    values[0] = 5;
    values[8] = 5;
    values[40] = 3;
    expect([...conflicts(values)].sort()).toEqual([0, 8]);
    expect(digitCounts(values)[5]).toBe(2);
  });
});

describe('hints', () => {
  it('reports an error before logic', () => {
    const g = newGame(ref);
    const c = firstEmpty(g);
    const values = [...g.values];
    values[c] = (g.solution[c] % 9) + 1;
    const h = computeHint({ ...g, values });
    expect(h.kind).toBe('error');
  });

  it('gives a sound next step and can be applied until solved', () => {
    let g = newGame({ ...ref, transform: randomTransform(createRng(8)) });
    for (let k = 0; k < 400 && !g.solved; k++) {
      const h = computeHint(g);
      expect(h.kind).toBe('step');
      if (h.kind !== 'step') break;
      for (const p of h.step.placements) expect(g.solution[p.cell]).toBe(p.digit);
      for (const e of h.step.eliminations) expect(g.solution[e.cell]).not.toBe(e.digit);
      g = reduce(g, { type: 'apply', ...h.step });
    }
    expect(g.solved).toBe(true);
  });

  it('applying an elimination to a cell without notes materializes its candidates', () => {
    let g = newGame(ref);
    const c = firstEmpty(g);
    const allowed = basicCandidates(g.values)[c];
    const d = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((x) => allowed & bit(x) && x !== g.solution[c])!;
    g = reduce(g, { type: 'apply', placements: [], eliminations: [{ cell: c, digit: d }] });
    expect(g.notes[c]).toBe(allowed & ~bit(d));
  });
});

describe('timer', () => {
  it('counts only while running', () => {
    let total = 0;
    const t = new Timer((ms) => (total += ms));
    t.start(1000);
    t.flush(3000);
    t.stop(4000);
    t.flush(9000);
    t.start(10000);
    t.stop(10500);
    expect(total).toBe(3500);
  });

  it('formats time', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65_000)).toBe('1:05');
    expect(formatTime(3_725_000)).toBe('1:02:05');
  });
});

describe('picking and stats', () => {
  const bank = [
    { p: 'a', l: 9 as const, r: 9.1 },
    { p: 'b', l: 9 as const, r: 9.4 },
    { p: 'c', l: 10 as const },
    { p: 'd', l: 11 as const },
  ];

  it('picks unsolved puzzles of the level first, then any of the level', () => {
    const rng = createRng(1);
    for (let k = 0; k < 10; k++) expect(pickPuzzle(bank, 9, new Set(['a']), rng).id).toBe('b');
    const ids = new Set(
      Array.from({ length: 20 }, () => pickPuzzle(bank, 9, new Set(['a', 'b']), rng).id),
    );
    expect(ids).toEqual(new Set(['a', 'b']));
    const ref = pickPuzzle(bank, 11, new Set(), rng);
    expect([ref.id, ref.level, ref.rating]).toEqual(['d', 11, 11]);
    expect(pickPuzzle(bank, 10, new Set(['c']), rng).id).toBe('c');
  });

  it('labels ratings by level', () => {
    expect(ratingLabel({ rating: 9.14, level: 9 })).toBe('9.1');
    expect(ratingLabel({ rating: 10, level: 10 })).toBe('10');
    expect(ratingLabel({ rating: 11, level: 11 })).toBe('11+');
    expect(ratingLabel({ rating: 7.5 })).toBe('7.5');
  });

  it('summarizes solves', () => {
    const r = (rating: number, timeMs: number, hints = 0, checks = 0): SolveRecord => ({
      id: String(Math.random()),
      rating,
      level: rating >= 11 ? 11 : rating >= 10 ? 10 : rating >= 9 ? 9 : undefined,
      timeMs,
      hints,
      checks,
      date: '2026-10-09',
    });
    const records = [r(7.2, 600_000), r(9.1, 300_000, 1), r(11, 900_000, 0, 2), r(9.3, 1_200_000)];
    expect(summarize(records)).toEqual({
      solved: 4,
      clean: 2,
      bestMs: 600_000,
      averageMs: 750_000,
    });
    const by = summarizeByLevel(records);
    expect(by.map((x) => x.name)).toEqual(['9', '10', '11+']);
    expect(by.map((x) => x.summary.solved)).toEqual([2, 0, 1]);
    expect(by[0].summary.bestMs).toBe(1_200_000);
    expect(by[1].summary.bestMs).toBeNull();
  });
});
