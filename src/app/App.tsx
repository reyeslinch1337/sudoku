import { useEffect } from 'preact/hooks';
import { Timer } from '../game/timer';
import type { Store } from './store';
import { Board } from './components/Board';
import { NumPad, Toolbar } from './components/Controls';
import { Header } from './components/Header';
import { HintPanel } from './components/HintPanel';
import { ConfirmNew, Menu, Pause, Settings, Stats, Win } from './components/Overlays';
import { InstallTip, UpdateBanner } from './components/Banners';

const AUTOSAVE_MS = 15_000;

/** The clock runs only while the page is visible, the game is on screen and not finished. */
function useClock(store: Store) {
  const running = !store.paused.value && store.overlay.value === 'none' && !store.game.value.solved;
  useEffect(() => {
    const timer = new Timer((ms) => store.dispatch({ type: 'tick', ms }));
    const sync = () => {
      if (running && document.visibilityState === 'visible') timer.start(performance.now());
      else timer.stop(performance.now());
    };
    const onHide = () => {
      sync();
      store.persist();
    };
    sync();
    const tick = setInterval(() => timer.flush(performance.now()), 1000);
    const save = setInterval(store.persist, AUTOSAVE_MS);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      timer.stop(performance.now());
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [running]);
}

function useKeyboard(store: Store) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.overlay.value !== 'none' || store.paused.value) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        store.dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      } else if (!mod && /^[1-9]$/.test(e.key)) {
        store.inputDigit(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        store.erase();
      } else if (e.key === ' ') {
        store.noteMode.value = !store.noteMode.value;
      } else if (e.key === 'ArrowUp') store.moveSelection(-1, 0);
      else if (e.key === 'ArrowDown') store.moveSelection(1, 0);
      else if (e.key === 'ArrowLeft') store.moveSelection(0, -1);
      else if (e.key === 'ArrowRight') store.moveSelection(0, 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App({ store, offerInstall = false }: { store: Store; offerInstall?: boolean }) {
  useClock(store);
  useKeyboard(store);
  const overlay = store.overlay.value;
  useEffect(() => {
    document.documentElement.lang = store.settings.value.lang;
  }, [store.settings.value.lang]);

  return (
    <div class="app">
      <UpdateBanner store={store} />
      <InstallTip store={store} offer={offerInstall} />
      <Header store={store} />
      <main class="main">
        <Board store={store} />
        <div class="side">
          <Toolbar store={store} />
          {store.hint.value.level > 0 ? <HintPanel store={store} /> : <NumPad store={store} />}
        </div>
      </main>
      {store.toast.value && (
        <div class="toast" role="status">
          {store.toast.value}
        </div>
      )}
      {store.paused.value && <Pause store={store} />}
      {overlay === 'menu' && <Menu store={store} />}
      {overlay === 'confirmNew' && <ConfirmNew store={store} />}
      {overlay === 'stats' && <Stats store={store} />}
      {overlay === 'settings' && <Settings store={store} />}
      {overlay === 'win' && <Win store={store} />}
    </div>
  );
}
