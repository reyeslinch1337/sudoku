// Game state and its reducer. The state is immutable: every action returns a new object.

import { PEERS, basicCandidates, bit, parseDigits } from '../engine/grid';
import { solve } from '../engine/solve';
import { type Transform, applyTransform } from '../engine/transform';
import type { Cand } from '../engine/step';
import type { Level } from '../engine/generator';

export const HISTORY_LIMIT = 500;

export interface PuzzleRef {
  /** The puzzle as stored in the bank; identifies it in statistics. */
  id: string;
  rating: number;
  transform: Transform;
  /** Bank level; absent for games started from the earlier bank of 7.x-9.x puzzles. */
  level?: Level;
}

export interface Snapshot {
  /** Digits on the board including givens; 0 for empty. */
  values: number[];
  /** Pencil marks as 9-bit masks. */
  notes: number[];
  autoCandidates: boolean;
}

export interface GameState extends Snapshot {
  ref: PuzzleRef;
  givens: number[];
  solution: number[];
  past: Snapshot[];
  future: Snapshot[];
  elapsedMs: number;
  hints: number;
  checks: number;
  solved: boolean;
}

export function newGame(ref: PuzzleRef): GameState {
  const givens = [...applyTransform(ref.transform, parseDigits(ref.id))];
  const solution = solve(givens);
  if (!solution) throw new Error('Puzzle has no solution');
  return {
    ref,
    givens,
    solution: [...solution],
    values: [...givens],
    notes: new Array(81).fill(0),
    autoCandidates: false,
    past: [],
    future: [],
    elapsedMs: 0,
    hints: 0,
    checks: 0,
    solved: false,
  };
}

export type Action =
  | { type: 'digit'; cell: number; digit: number }
  | { type: 'note'; cell: number; digit: number }
  | { type: 'erase'; cell: number }
  | { type: 'toggleAuto' }
  | { type: 'apply'; placements: Cand[]; eliminations: Cand[] }
  | { type: 'restoreCandidate'; cell: number; digit: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'tick'; ms: number }
  | { type: 'hintUsed' }
  | { type: 'checkUsed' };

const snapshot = (s: GameState): Snapshot => ({
  values: s.values,
  notes: s.notes,
  autoCandidates: s.autoCandidates,
});

const isSolved = (values: number[], solution: number[]) =>
  values.every((v, i) => v === solution[i]);

/** Records the current board in history and applies a board change. */
function commit(s: GameState, next: Snapshot): GameState {
  if (
    next.autoCandidates === s.autoCandidates &&
    next.values.every((v, i) => v === s.values[i]) &&
    next.notes.every((n, i) => n === s.notes[i])
  )
    return s;
  const past = [...s.past, snapshot(s)];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return {
    ...s,
    ...next,
    past,
    future: [],
    solved: isSolved(next.values, s.solution),
  };
}

function placeDigit(s: GameState, values: number[], notes: number[], cell: number, d: number) {
  values[cell] = d;
  if (s.autoCandidates) {
    const m = ~bit(d);
    for (const p of PEERS[cell]) notes[p] &= m;
  }
}

/** Notes of a cell, or all candidates allowed by the digits when the cell has no notes. */
function notesOrAllowed(values: number[], notes: number[], cell: number): number {
  return notes[cell] || basicCandidates(values)[cell];
}

export function reduce(s: GameState, a: Action): GameState {
  // A solved game is over: the board and the clock freeze.
  if (s.solved) return s;
  const editable = (cell: number) => s.givens[cell] === 0;
  switch (a.type) {
    case 'digit': {
      if (!editable(a.cell)) return s;
      const values = [...s.values];
      const notes = [...s.notes];
      if (values[a.cell] === a.digit) values[a.cell] = 0;
      else placeDigit(s, values, notes, a.cell, a.digit);
      return commit(s, { values, notes, autoCandidates: s.autoCandidates });
    }
    case 'note': {
      if (!editable(a.cell) || s.values[a.cell]) return s;
      const notes = [...s.notes];
      notes[a.cell] ^= bit(a.digit);
      return commit(s, { values: s.values, notes, autoCandidates: s.autoCandidates });
    }
    case 'erase': {
      if (!editable(a.cell)) return s;
      const values = [...s.values];
      const notes = [...s.notes];
      if (values[a.cell]) values[a.cell] = 0;
      else notes[a.cell] = 0;
      return commit(s, { values, notes, autoCandidates: s.autoCandidates });
    }
    case 'toggleAuto': {
      if (s.autoCandidates) return commit(s, { ...snapshot(s), autoCandidates: false });
      const allowed = basicCandidates(s.values);
      const notes = s.values.map((v, i) => (v ? s.notes[i] : allowed[i]));
      return commit(s, { values: s.values, notes, autoCandidates: true });
    }
    case 'apply': {
      const values = [...s.values];
      const notes = [...s.notes];
      for (const e of a.eliminations) {
        if (values[e.cell]) continue;
        notes[e.cell] = notesOrAllowed(values, notes, e.cell) & ~bit(e.digit);
      }
      for (const p of a.placements)
        if (editable(p.cell)) placeDigit(s, values, notes, p.cell, p.digit);
      return commit(s, { values, notes, autoCandidates: s.autoCandidates });
    }
    case 'restoreCandidate': {
      const notes = [...s.notes];
      notes[a.cell] |= bit(a.digit);
      return commit(s, { values: s.values, notes, autoCandidates: s.autoCandidates });
    }
    case 'undo': {
      const prev = s.past.at(-1);
      if (!prev) return s;
      return {
        ...s,
        ...prev,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future],
      };
    }
    case 'redo': {
      const next = s.future[0];
      if (!next) return s;
      return {
        ...s,
        ...next,
        past: [...s.past, snapshot(s)],
        future: s.future.slice(1),
        solved: isSolved(next.values, s.solution),
      };
    }
    case 'tick':
      return { ...s, elapsedMs: s.elapsedMs + a.ms };
    case 'hintUsed':
      return { ...s, hints: s.hints + 1 };
    case 'checkUsed':
      return { ...s, checks: s.checks + 1 };
  }
}
