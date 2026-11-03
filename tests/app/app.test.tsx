// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { App } from '../../src/app/App';
import { createStore } from '../../src/app/store';
import type { KeyValueStore } from '../../src/app/storage';
import { saveGame } from '../../src/app/storage';
import { newGame, reduce } from '../../src/game/state';
import { IDENTITY } from '../../src/engine/transform';

const PUZZLE = '2..4..9.......18....762..4..8...5.3..6......7...1........34....3.52..6..6...5...9';
// Easter Monster: beyond our solver, so the hint finds no step.
const MONSTER = '1.......2.9.4...5...6...7...5.9.3.......7.......85..4.7.....6...3...9.8...2.....1';
const bank = [
  { p: PUZZLE, l: 9 as const, r: 9.2 },
  { p: MONSTER, l: 11 as const },
];

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function setup(
  opts: {
    storage?: KeyValueStore;
    language?: string;
    greeting?: string;
    bank?: typeof bank;
  } = {},
) {
  const storage = opts.storage ?? memoryStore();
  const store = createStore({
    bank: opts.bank ?? bank,
    storage,
    language: opts.language ?? 'en-US',
    random: () => 0,
    greeting: opts.greeting,
  });
  const view = render(<App store={store} />);
  return { store, storage, ...view };
}

const cell = (container: Element, i: number) =>
  container.querySelector(`[data-cell="${i}"]`) as HTMLElement;

afterEach(cleanup);

describe('app', () => {
  it('enters a digit into the selected cell', () => {
    const { store, container } = setup();
    const i = store.game.value.givens.findIndex((v) => v === 0);
    fireEvent.click(cell(container, i));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(store.game.value.values[i]).toBe(5);
    expect(cell(container, i).textContent).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(store.game.value.values[i]).toBe(0);
  });

  it('notes mode toggles pencil marks', () => {
    const { store, container } = setup();
    const i = store.game.value.givens.findIndex((v) => v === 0);
    fireEvent.click(cell(container, i));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    expect(store.game.value.values[i]).toBe(0);
    expect(cell(container, i).textContent).toBe('37');
  });

  it('hint goes through three levels and applies', async () => {
    const { store } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await screen.findByRole('button', { name: 'More' });
    expect(store.game.value.hints).toBe(1);
    const title = document.querySelector('.hint-title')!.textContent;
    expect(title).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(document.querySelector('.hint-detail')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(document.querySelectorAll('.hint-line').length).toBeGreaterThan(0);
    const before = JSON.stringify([store.game.value.values, store.game.value.notes]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(JSON.stringify([store.game.value.values, store.game.value.notes])).not.toBe(before);
    expect(document.querySelector('.hint-panel')).toBeNull();
    expect(store.game.value.hints).toBe(1);
  });

  it('shows the win screen and records the solve', () => {
    const storage = memoryStore();
    let g = newGame({ id: PUZZLE, rating: 7.2, transform: IDENTITY });
    const empties = g.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const last = empties.pop()!;
    for (const i of empties) g = reduce(g, { type: 'digit', cell: i, digit: g.solution[i] });
    saveGame(storage, g);
    const { store, container } = setup({ storage });
    fireEvent.click(cell(container, last));
    fireEvent.click(screen.getByRole('button', { name: String(g.solution[last]) }));
    const dialog = screen.getByRole('dialog', { name: 'Success!' });
    expect(dialog.querySelector('.reward-icon')).not.toBeNull();
    expect(dialog.querySelectorAll('.confetti').length).toBeGreaterThan(0);
    expect(store.stats.value).toHaveLength(1);
    expect(store.crowns.value).toHaveLength(0);
  });

  /** A saved level 9 game one digit from the end; returns the last cell and its digit. */
  function nearlySolved(storage: KeyValueStore) {
    let g = newGame({ id: PUZZLE, rating: 9.2, level: 9, transform: IDENTITY });
    const empties = g.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    const last = empties.pop()!;
    for (const i of empties) g = reduce(g, { type: 'digit', cell: i, digit: g.solution[i] });
    saveGame(storage, g);
    return { last, digit: g.solution[last] };
  }

  it('awards a crown for the last unsolved puzzle of a level, once and for good', () => {
    const storage = memoryStore();
    const { last, digit } = nearlySolved(storage);
    const { store, container } = setup({ storage });
    fireEvent.click(cell(container, last));
    fireEvent.click(screen.getByRole('button', { name: String(digit) }));
    const dialog = screen.getByRole('dialog', { name: 'Level 9 fully completed!' });
    expect(dialog.textContent).toContain('All 1 puzzles solved');
    expect(store.crowns.value.map((c) => [c.level, c.total])).toEqual([[9, 1]]);
    cleanup();

    // Later the level grows: the crown stays, the picker shows it, solving again gives none.
    const grown = [...bank, { p: PUZZLE.replace('2', '.'), l: 9 as const, r: 9.0 }];
    const again = setup({ storage, bank: grown });
    expect(again.store.crowns.value).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    const picker = screen.getByRole('dialog', { name: 'Choose a level' });
    const levels = [...picker.querySelectorAll('.level-btn')];
    expect(levels[0].querySelector('.level-crown')).not.toBeNull();
    expect(levels[2].querySelector('.level-crown')).toBeNull();
  });

  it('gives no crown while the level has unsolved puzzles', () => {
    const storage = memoryStore();
    const { last, digit } = nearlySolved(storage);
    const two = [...bank, { p: PUZZLE.replace('2', '.'), l: 9 as const, r: 9.0 }];
    const { store, container } = setup({ storage, bank: two });
    fireEvent.click(cell(container, last));
    fireEvent.click(screen.getByRole('button', { name: String(digit) }));
    expect(screen.getByRole('dialog', { name: 'Success!' })).toBeTruthy();
    expect(store.crowns.value).toHaveLength(0);
  });

  it('switches language', async () => {
    setup({ language: 'en-US' });
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Русский' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Подсказка' })).toBeTruthy());
  });

  it('defaults to Russian for a Russian browser', () => {
    setup({ language: 'ru-RU' });
    expect(screen.getByRole('button', { name: 'Пометки' })).toBeTruthy();
  });

  it('check flags a wrong digit', () => {
    const { store, container } = setup();
    const i = store.game.value.givens.findIndex((v) => v === 0);
    const wrong = (store.game.value.solution[i] % 9) + 1;
    fireEvent.click(cell(container, i));
    fireEvent.click(screen.getByRole('button', { name: String(wrong) }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(cell(container, i).classList.contains('error')).toBe(true);
    expect(store.game.value.checks).toBe(1);
  });

  it('starts a new game on the chosen level', () => {
    const { store, storage } = setup();
    expect(store.game.value.ref.level).toBe(9);
    expect(document.querySelector('.rating')!.textContent).toBe('9.2');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('dialog', { name: 'Choose a level' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '11+' }));
    expect(store.game.value.ref.id).toBe(MONSTER);
    expect(document.querySelector('.rating')!.textContent).toBe('11+');
    expect(JSON.parse(storage.getItem('xsudoku.v1.settings')!).level).toBe(11);
  });

  it('asks before abandoning an unfinished game', () => {
    const { store, container } = setup();
    const i = store.game.value.givens.findIndex((v) => v === 0);
    fireEvent.click(cell(container, i));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(screen.getByRole('dialog', { name: 'Choose a level' })).toBeTruthy();
  });

  it('a hint that finds nothing says so and does not count', async () => {
    const storage = memoryStore();
    storage.setItem(
      'xsudoku.v1.settings',
      JSON.stringify({ lang: 'en', installTipShown: true, level: 11 }),
    );
    const { store } = setup({ storage });
    expect(store.game.value.ref.id).toBe(MONSTER);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    await screen.findByText('No logical hint is available for this puzzle');
    expect(store.game.value.hints).toBe(0);
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
  });

  it('shows a greeting from the link and closes it', () => {
    const { store } = setup({ greeting: 'To the best\nLegend' });
    const dialog = screen.getByRole('dialog', { name: 'To the best' });
    expect(dialog.textContent).toContain('Legend');
    expect(dialog.querySelectorAll('.confetti').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Thank you' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(store.overlay.value).toBe('none');
  });

  it('shows no greeting without a link', () => {
    setup();
    expect(document.querySelector('.greeting-card')).toBeNull();
  });

  it('creates a device code once and shows it in settings', () => {
    const { store, storage } = setup();
    const code = store.settings.value.deviceCode!;
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    cleanup();
    const again = setup({ storage });
    expect(again.store.settings.value.deviceCode).toBe(code);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('device-code').textContent).toBe(
      `${code.slice(0, 4)}-${code.slice(4)}`,
    );
  });

  it('shows an addressed message only when no other sheet is open', async () => {
    const { store } = setup();
    store.overlay.value = 'menu';
    expect(store.showMessage('Hello')).toBe(false);
    store.overlay.value = 'none';
    expect(store.showMessage('Hello')).toBe(true);
    expect(await screen.findByRole('dialog', { name: 'Hello' })).toBeTruthy();
  });
});
