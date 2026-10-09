// Runs hint searches in a Web Worker so long forcing chains do not freeze the interface.

import { type Hint, type HintInput, computeHint } from '../game/hint';

export type HintProvider = (input: HintInput) => Promise<Hint>;

/** Synchronous fallback for environments without workers (tests). */
export const directHints: HintProvider = (input) => Promise.resolve(computeHint(input));

export function workerHints(): HintProvider {
  if (typeof Worker === 'undefined') return directHints;
  const worker = new Worker(new URL('./hint.worker.ts', import.meta.url), { type: 'module' });
  let nextId = 0;
  const pending = new Map<number, (h: Hint) => void>();
  worker.onmessage = (e: MessageEvent<{ id: number; hint: Hint }>) => {
    pending.get(e.data.id)?.(e.data.hint);
    pending.delete(e.data.id);
  };
  return (input) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      worker.postMessage({ id, input });
    });
}
