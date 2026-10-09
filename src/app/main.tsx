import { render } from 'preact';
import bank from '../data/puzzles.json';
import type { BankEntry } from '../engine/generator';
import { App } from './App';
import { createStore } from './store';
import { workerHints } from './hintClient';
import './styles.css';

const store = createStore({
  bank: bank as BankEntry[],
  storage: window.localStorage,
  language: navigator.language,
  hints: workerHints(),
});

render(<App store={store} />, document.getElementById('app')!);
