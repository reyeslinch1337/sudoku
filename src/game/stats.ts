export interface SolveRecord {
  id: string;
  rating: number;
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

export const RANGES = [
  { name: '7.x', min: 7, max: 8 },
  { name: '8.x', min: 8, max: 9 },
  { name: '9.x', min: 9, max: 10 },
] as const;

export function summarizeByRange(records: SolveRecord[]) {
  return RANGES.map((r) => ({
    name: r.name,
    summary: summarize(records.filter((x) => x.rating >= r.min && x.rating < r.max)),
  }));
}

/** Distinct puzzles solved. */
export const solvedIds = (records: SolveRecord[]): Set<string> => new Set(records.map((r) => r.id));
