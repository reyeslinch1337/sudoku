import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import bank from '../data/puzzles.json';
import type { BankEntry } from '../engine/generator';
import { App } from './App';
import { createStore } from './store';
import { workerHints } from './hintClient';
import { shouldOfferInstall } from './components/Banners';
import { takeGreeting } from './greeting';
import { createInbox } from './inbox';
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

// Messages addressed to this device: checked at launch and when the app comes back.
const inbox = createInbox({
  storage: window.localStorage,
  code: store.settings.value.deviceCode!,
  fetchEntries: () =>
    fetch(new URL('messages.json', document.baseURI), { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`messages.json: ${r.status}`);
      return r.json();
    }),
  show: store.showMessage,
});
void inbox.start().catch(() => {});
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (hiddenAt) void inbox.resume(Date.now() - hiddenAt).catch(() => {});
});
