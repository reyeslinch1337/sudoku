// Application state on signals. All game changes go through the pure reducer in game/state.

import { batch, computed, signal } from '@preact/signals';
import type { BankEntry } from '../engine/generator';
import { createRng } from '../engine/random';
import { type Action, type GameState, newGame, reduce } from '../game/state';
import { findErrors } from '../game/check';
import type { Hint } from '../game/hint';
import { pickPuzzle } from '../game/pick';
import { type SolveRecord, solvedIds } from '../game/stats';
import { type HintProvider, directHints } from './hintClient';
import { DICTS } from './i18n';
import {
  type KeyValueStore,
  type Lang,
  exportData,
  importData,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
  saveStats,
} from './storage';

export type Overlay = 'none' | 'menu' | 'stats' | 'settings' | 'win' | 'confirmNew';

export interface HintState {
  /** 0 closed, 1 technique name, 2 highlight, 3 conclusion. */
  level: number;
  hint: Hint | null;
  loading: boolean;
}

const CLOSED: HintState = { level: 0, hint: null, loading: false };

export interface StoreDeps {
  bank: BankEntry[];
  storage: KeyValueStore;
  language?: string;
  hints?: HintProvider;
  random?: () => number;
  now?: () => Date;
}

/** Actions that leave the board as it is. */
const BOOKKEEPING = new Set<Action['type']>(['tick', 'hintUsed', 'checkUsed']);

export function createStore(deps: StoreDeps) {
  const hints = deps.hints ?? directHints;
  const random = deps.random ?? Math.random;
  const now = deps.now ?? (() => new Date());

  const settings = signal(loadSettings(deps.storage, deps.language));
  const stats = signal<SolveRecord[]>(loadStats(deps.storage));

  const freshGame = (): GameState =>
    newGame(
      pickPuzzle(deps.bank, solvedIds(stats.value), createRng(Math.floor(random() * 2 ** 32))),
    );

  const loaded = loadGame(deps.storage);
  const game = signal<GameState>(loaded && !loaded.solved ? loaded : freshGame());
  const selected = signal<number | null>(null);
  const noteMode = signal(false);
  const overlay = signal<Overlay>('none');
  const paused = signal(false);
  const hint = signal<HintState>(CLOSED);
  /** Cells flagged by the last check; cleared by the next board change. */
  const checked = signal<Set<number> | null>(null);
  const toast = signal<string | null>(null);
  /** Set by the service worker registration when a new version is waiting. */
  const update = signal<(() => void) | null>(null);
  let hintToken = 0;

  const t = computed(() => DICTS[settings.value.lang]);

  const persist = () => saveGame(deps.storage, game.value);

  function showToast(text: string) {
    toast.value = text;
    setTimeout(() => {
      if (toast.value === text) toast.value = null;
    }, 2500);
  }

  function dispatch(a: Action) {
    const prev = game.value;
    const next = reduce(prev, a);
    if (next === prev) return;
    batch(() => {
      game.value = next;
      if (!BOOKKEEPING.has(a.type)) {
        hintToken++;
        hint.value = CLOSED;
        checked.value = null;
      }
      if (!prev.solved && next.solved) {
        const record: SolveRecord = {
          id: next.ref.id,
          rating: next.ref.rating,
          timeMs: next.elapsedMs,
          hints: next.hints,
          checks: next.checks,
          date: now().toISOString(),
        };
        stats.value = [...stats.value, record];
        saveStats(deps.storage, stats.value);
        selected.value = null;
        overlay.value = 'win';
      }
    });
    if (a.type !== 'tick') persist();
  }

  function inputDigit(d: number) {
    const cell = selected.value;
    if (cell === null) return;
    dispatch(noteMode.value ? { type: 'note', cell, digit: d } : { type: 'digit', cell, digit: d });
  }

  function erase() {
    if (selected.value !== null) dispatch({ type: 'erase', cell: selected.value });
  }

  function moveSelection(dr: number, dc: number) {
    const cur = selected.value ?? 40;
    const r = (Math.floor(cur / 9) + dr + 9) % 9;
    const c = ((cur % 9) + dc + 9) % 9;
    selected.value = r * 9 + c;
  }

  async function pressHint() {
    const h = hint.value;
    if (h.loading) return;
    if (h.level === 0) {
      dispatch({ type: 'hintUsed' });
      const token = ++hintToken;
      hint.value = { level: 1, hint: null, loading: true };
      const g = game.value;
      const result = await hints({
        values: g.values,
        notes: g.notes,
        givens: g.givens,
        solution: g.solution,
      });
      if (token !== hintToken) return;
      hint.value = { level: 1, hint: result, loading: false };
      return;
    }
    if (h.level < 3) hint.value = { ...h, level: h.level + 1 };
  }

  function applyHint() {
    const h = hint.value.hint;
    if (!h || h.kind === 'none') return;
    if (h.kind === 'step') {
      dispatch({ type: 'apply', placements: h.step.placements, eliminations: h.step.eliminations });
    } else if (h.error.kind === 'wrongDigit') {
      dispatch({ type: 'erase', cell: h.error.cell });
    } else {
      dispatch({ type: 'restoreCandidate', cell: h.error.cell, digit: h.error.digit });
    }
  }

  function closeHint() {
    hintToken++;
    hint.value = CLOSED;
  }

  function check() {
    dispatch({ type: 'checkUsed' });
    const g = game.value;
    const errors = findErrors(g, g.givens, g.solution);
    checked.value = new Set(errors.map((e) => e.cell));
    showToast(errors.length ? t.value.errorsFound(errors.length) : t.value.noErrors);
  }

  function requestNewGame() {
    const g = game.value;
    const started = g.values.some((v, i) => v !== g.givens[i]) || g.notes.some((n) => n);
    overlay.value = started && !g.solved ? 'confirmNew' : 'none';
    if (!started || g.solved) startNewGame();
  }

  function startNewGame() {
    batch(() => {
      game.value = freshGame();
      selected.value = null;
      noteMode.value = false;
      paused.value = false;
      hint.value = CLOSED;
      checked.value = null;
      overlay.value = 'none';
    });
    hintToken++;
    persist();
  }

  function setLang(lang: Lang) {
    settings.value = { ...settings.value, lang };
    saveSettings(deps.storage, settings.value);
  }

  function dismissInstallTip() {
    settings.value = { ...settings.value, installTipShown: true };
    saveSettings(deps.storage, settings.value);
  }

  const exportText = () => exportData(stats.value, game.value);

  /** Returns false when the text is not a valid export. */
  function importText(text: string): boolean {
    const data = importData(text);
    if (!data) return false;
    batch(() => {
      stats.value = data.stats;
      if (data.game) game.value = data.game;
      hint.value = CLOSED;
      checked.value = null;
      selected.value = null;
    });
    saveStats(deps.storage, stats.value);
    persist();
    return true;
  }

  return {
    bank: deps.bank,
    settings,
    stats,
    game,
    selected,
    noteMode,
    overlay,
    paused,
    hint,
    checked,
    toast,
    update,
    t,
    dispatch,
    inputDigit,
    erase,
    moveSelection,
    pressHint,
    applyHint,
    closeHint,
    check,
    requestNewGame,
    startNewGame,
    setLang,
    dismissInstallTip,
    exportText,
    importText,
    persist,
    showToast,
  };
}

export type Store = ReturnType<typeof createStore>;
