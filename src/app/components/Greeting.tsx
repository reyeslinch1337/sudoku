import type { Store } from '../store';
import { Burst, Heart, PARTY_COLORS } from './Burst';

/** A greeting card from the page address, with a burst of confetti and rising hearts. */
export function Greeting({ store }: { store: Store }) {
  const text = store.greeting.value;
  if (!text) return null;
  const t = store.t.value;

  return (
    <div class="overlay greeting" role="dialog" aria-modal="true" aria-label={text.split('\n')[0]}>
      <Burst colors={PARTY_COLORS} confetti={70} hearts={18} ms={4500} />
      <div class="greeting-card">
        <div class="greeting-hearts" aria-hidden="true">
          <Heart size={22} class="gh-small" />
          <Heart size={44} class="gh-big" />
          <Heart size={22} class="gh-small" />
        </div>
        {text.split('\n').map((line, k) => (line.trim() ? <p key={k}>{line}</p> : null))}
        <button type="button" class="btn greeting-btn" onClick={store.closeGreeting}>
          {t.thanks}
        </button>
      </div>
    </div>
  );
}
