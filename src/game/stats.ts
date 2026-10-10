import type { Level } from '../engine/generator';

export interface SolveRecord {
  id: string;
  rating: number;
  /** Bank level; absent for solves from the earlier bank. */
  level?: Level;
  timeMs: number;
  hints: number;
  checks: number;
  /** ISO date. */
  date: string;
}

export interface Summary {
  solved: number;
  clean: number;
  /** Best time among clean solves, or null. */
  bestMs: number | null;
  /** Average over all solves, or null. */
  averageMs: number | null;
}

export const isClean = (r: SolveRecord) => r.hints === 0 && r.checks === 0;

export function summarize(records: SolveRecord[]): Summary {
  const clean = records.filter(isClean);
  return {
    solved: records.length,
    clean: clean.length,
    bestMs: clean.length ? Math.min(...clean.map((r) => r.timeMs)) : null,
    averageMs: records.length
      ? Math.round(records.reduce((s, r) => s + r.timeMs, 0) / records.length)
      : null,
  };
}

export const LEVEL_NAMES: Record<Level, string> = { 9: '9', 10: '10', 11: '11+' };

/** Summaries per bank level; records without a level count only in the overall summary. */
export function summarizeByLevel(records: SolveRecord[]) {
  return ([9, 10, 11] as Level[]).map((level) => ({
    level,
    name: LEVEL_NAMES[level],
    summary: summarize(records.filter((x) => x.level === level)),
  }));
}

/** Distinct puzzles solved. */
export const solvedIds = (records: SolveRecord[]): Set<string> => new Set(records.map((r) => r.id));
