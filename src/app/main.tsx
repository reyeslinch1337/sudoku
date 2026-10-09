import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import bank from '../data/puzzles.json';
import type { BankEntry } from '../engine/generator';
import { App } from './App';
import { createStore } from './store';
import { workerHints } from './hintClient';
import { shouldOfferInstall } from './components/Banners';
import './styles.css';

const store = createStore({
  bank: bank as BankEntry[],
  storage: window.localStorage,
  language: navigator.language,
  hints: workerHints(),
});

const updateSW = registerSW({
  onNeedRefresh() {
    store.update.value = () => void updateSW(true);
  },
});

const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

render(
  <App store={store} offerInstall={shouldOfferInstall(navigator, standalone)} />,
  document.getElementById('app')!,
);
