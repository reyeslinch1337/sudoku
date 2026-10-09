import { describe, expect, it } from 'vitest';
import {
  type KeyValueStore,
  KEYS,
  defaultLang,
  exportData,
  importData,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
  saveStats,
} from '../../src/app/storage';
import { newGame, reduce } from '../../src/game/state';
import { randomTransform } from '../../src/engine/transform';
import { createRng } from '../../src/engine/random';

const PUZZLE = '2..4..9.......18....762..4..8...5.3..6......7...1........34....3.52..6..6...5...9';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function playedGame() {
  let g = newGame({ id: PUZZLE, rating: 7.2, transform: randomTransform(createRng(2)) });
  const c = g.values.findIndex((v) => !v);
  g = reduce(g, { type: 'digit', cell: c, digit: g.solution[c] });
  g = reduce(g, { type: 'note', cell: g.values.findIndex((v) => !v), digit: 3 });
  g = reduce(g, { type: 'tick', ms: 42_000 });
  return reduce(g, { type: 'hintUsed' });
}

const record = { id: PUZZLE, rating: 7.2, timeMs: 1000, hints: 0, checks: 1, date: '2026-10-09' };

describe('storage', () => {
  it('round-trips a game', () => {
    const store = memoryStore();
    const g = playedGame();
    saveGame(store, g);
    const back = loadGame(store)!;
    expect(back.values).toEqual(g.values);
    expect(back.notes).toEqual(g.notes);
    expect(back.past).toEqual(g.past);
    expect(back.solution).toEqual(g.solution);
    expect([back.elapsedMs, back.hints]).toEqual([42_000, 1]);
  });

  it('survives corrupted or foreign data', () => {
    const store = memoryStore();
    expect(loadGame(store)).toBeNull();
    store.setItem(KEYS.game, '{not json');
    expect(loadGame(store)).toBeNull();
    store.setItem(KEYS.game, JSON.stringify({ ref: { id: 'x' } }));
    expect(loadGame(store)).toBeNull();
    const g = playedGame();
    saveGame(store, g);
    const saved = JSON.parse(store.getItem(KEYS.game)!);
    saved.values[g.givens.findIndex((v) => v)] = 0; // a given went missing
    store.setItem(KEYS.game, JSON.stringify(saved));
    expect(loadGame(store)).toBeNull();
    store.setItem(KEYS.stats, JSON.stringify([record, { bogus: true }]));
    expect(loadStats(store)).toEqual([record]);
    store.setItem(KEYS.stats, 'null');
    expect(loadStats(store)).toEqual([]);
  });

  it('keeps working when storage throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {},
    };
    expect(loadGame(broken)).toBeNull();
    expect(() => saveStats(broken, [record])).not.toThrow();
  });

  it('settings default to the browser language', () => {
    const store = memoryStore();
    expect(loadSettings(store, 'ru-RU').lang).toBe('ru');
    expect(loadSettings(store, 'de').lang).toBe('en');
    saveSettings(store, { lang: 'ru', installTipShown: true });
    expect(loadSettings(store, 'en-US')).toEqual({ lang: 'ru', installTipShown: true });
    expect(defaultLang(undefined)).toBe('en');
  });

  it('exports and imports', () => {
    const g = playedGame();
    const text = exportData([record], g);
    const back = importData('  ' + text + '\n')!;
    expect(back.stats).toEqual([record]);
    expect(back.game!.values).toEqual(g.values);
    expect(importData(exportData([], null))).toEqual({ stats: [], game: null });
    expect(importData('hello')).toBeNull();
    expect(importData('XSUDOKU1:###')).toBeNull();
  });
});
