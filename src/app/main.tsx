import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import bank from '../data/puzzles.json';
import type { BankEntry } from '../engine/generator';
import { App } from './App';
import { createStore } from './store';
import { workerHints } from './hintClient';
import { shouldOfferInstall } from './components/Banners';
import { takeGreeting } from './greeting';
import './styles.css';

// A greeting link shows its card once; the address is cleaned so a reload does not repeat it.
const { text: greeting, cleanUrl } = takeGreeting(window.location.href);
if (greeting) window.history.replaceState(null, '', cleanUrl);

const store = createStore({
  greeting,
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
