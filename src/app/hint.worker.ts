import { type HintInput, computeHint } from '../game/hint';

self.onmessage = (e: MessageEvent<{ id: number; input: HintInput }>) => {
  self.postMessage({ id: e.data.id, hint: computeHint(e.data.input) });
};
