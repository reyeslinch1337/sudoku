// Persistence in localStorage, plus export and import as a text string.

import type { GameState, PuzzleRef, Snapshot } from '../game/state';
import { newGame } from '../game/state';
import type { SolveRecord } from '../game/stats';
import type { Level } from '../engine/generator';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  game: 'xsudoku.v1.game',
  stats: 'xsudoku.v1.stats',
  settings: 'xsudoku.v1.settings',
} as const;

export type Lang = 'ru' | 'en';

export interface Settings {
  lang: Lang;
  installTipShown: boolean;
  /** Level chosen for the last new game. */
  level: Level;
}

const isLevel = (x: unknown): x is Level => x === 9 || x === 10 || x === 11;

/** What is saved of a game; givens and solution are rebuilt from the puzzle reference. */
interface SavedGame extends Snapshot {
  ref: PuzzleRef;
  past: Snapshot[];
  future: Snapshot[];
  elapsedMs: number;
  hints: number;
  checks: number;
  solved: boolean;
}

const isNumArray = (x: unknown, len: number, max: number): x is number[] =>
  Array.isArray(x) && x.length === len && x.every((v) => Number.isInteger(v) && v >= 0 && v <= max);

const isSnapshot = (x: unknown): x is Snapshot => {
  const s = x as Snapshot;
  return (
    !!s &&
    isNumArray(s.values, 81, 9) &&
    isNumArray(s.notes, 81, 0x1ff) &&
    typeof s.autoCandidates === 'boolean'
  );
};

const isRef = (x: unknown): x is PuzzleRef => {
  const r = x as PuzzleRef;
  return (
    !!r &&
    typeof r.id === 'string' &&
    /^[1-9.]{81}$/.test(r.id) &&
    typeof r.rating === 'number' &&
    !!r.transform &&
    isNumArray(r.transform.digitMap, 9, 9) &&
    isNumArray(r.transform.rowPerm, 9, 8) &&
    isNumArray(r.transform.colPerm, 9, 8) &&
    typeof r.transform.transpose === 'boolean' &&
    (r.level === undefined || isLevel(r.level))
  );
};

function toSaved(g: GameState): SavedGame {
  const { ref, values, notes, autoCandidates, past, future, elapsedMs, hints, checks, solved } = g;
  return { ref, values, notes, autoCandidates, past, future, elapsedMs, hints, checks, solved };
}

/** Rebuilds a game from saved data; null if anything does not fit. */
export function fromSaved(x: unknown): GameState | null {
  try {
    const s = x as SavedGame;
    if (!isRef(s.ref) || !isSnapshot(s)) return null;
    if (!Array.isArray(s.past) || !s.past.every(isSnapshot)) return null;
    if (!Array.isArray(s.future) || !s.future.every(isSnapshot)) return null;
    const base = newGame(s.ref);
    // Givens must match the puzzle; anything else means the data belongs to another puzzle.
    if (base.givens.some((v, i) => v && s.values[i] !== v)) return null;
    return {
      ...base,
      values: s.values,
      notes: s.notes,
      autoCandidates: s.autoCandidates,
      past: s.past,
      future: s.future,
      elapsedMs: Math.max(0, Number(s.elapsedMs) || 0),
      hints: Math.max(0, Number(s.hints) || 0),
      checks: Math.max(0, Number(s.checks) || 0),
      solved: !!s.solved,
    };
  } catch {
    return null;
  }
}

const isRecord = (x: unknown): x is SolveRecord => {
  const r = x as SolveRecord;
  return (
    !!r &&
    typeof r.id === 'string' &&
    typeof r.rating === 'number' &&
    typeof r.timeMs === 'number' &&
    typeof r.hints === 'number' &&
    typeof r.checks === 'number' &&
    typeof r.date === 'string' &&
    (r.level === undefined || isLevel(r.level))
  );
};

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (private mode): the game keeps working without saving.
  }
}

export const loadGame = (store: KeyValueStore): GameState | null =>
  fromSaved(readJson(store, KEYS.game));

export const saveGame = (store: KeyValueStore, g: GameState): void =>
  writeJson(store, KEYS.game, toSaved(g));

export function loadStats(store: KeyValueStore): SolveRecord[] {
  const x = readJson(store, KEYS.stats);
  return Array.isArray(x) ? x.filter(isRecord) : [];
}

export const saveStats = (store: KeyValueStore, records: SolveRecord[]): void =>
  writeJson(store, KEYS.stats, records);

export function defaultLang(language: string | undefined): Lang {
  return language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function loadSettings(store: KeyValueStore, language?: string): Settings {
  const x = readJson(store, KEYS.settings) as Partial<Settings> | null;
  return {
    lang: x?.lang === 'ru' || x?.lang === 'en' ? x.lang : defaultLang(language),
    installTipShown: x?.installTipShown === true,
    level: isLevel(x?.level) ? x.level : 9,
  };
}

export const saveSettings = (store: KeyValueStore, s: Settings): void =>
  writeJson(store, KEYS.settings, s);

const EXPORT_PREFIX = 'XSUDOKU1:';

interface ExportData {
  stats: SolveRecord[];
  game: SavedGame | null;
}

export function exportData(stats: SolveRecord[], game: GameState | null): string {
  const data: ExportData = { stats, game: game ? toSaved(game) : null };
  return EXPORT_PREFIX + btoa(JSON.stringify(data));
}

/** Parses an export string; null if it is not valid. */
export function importData(text: string): { stats: SolveRecord[]; game: GameState | null } | null {
  const t = text.trim();
  if (!t.startsWith(EXPORT_PREFIX)) return null;
  try {
    const data = JSON.parse(atob(t.slice(EXPORT_PREFIX.length))) as ExportData;
    if (!Array.isArray(data.stats) || !data.stats.every(isRecord)) return null;
    const game = data.game ? fromSaved(data.game) : null;
    if (data.game && !game) return null;
    return { stats: data.stats, game };
  } catch {
    return null;
  }
}
