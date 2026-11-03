import { useEffect, useState } from 'preact/hooks';
import type { Store } from '../store';

const HEART =
  'M12 21s-7.5-4.6-10-9.3C.4 8.6 2.3 4.5 6.2 4.5c2.3 0 3.9 1.3 5.8 3.6 1.9-2.3 3.5-3.6 5.8-3.6 3.9 0 5.8 4.1 4.2 7.2C19.5 16.4 12 21 12 21z';

const Heart = ({ size, class: cls }: { size: number; class?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} class={cls} aria-hidden="true">
    <path d={HEART} fill="currentColor" />
  </svg>
);

const CONFETTI_COLORS = ['#e0445f', '#ff8fa3', '#ffd166', '#6f95ff', '#5fd18d', '#c69cf0'];
const BURST_MS = 4500;

interface Particle {
  style: Record<string, string>;
  color: string;
}

function makeConfetti(n: number): Particle[] {
  return Array.from({ length: n }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 45;
    return {
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      style: {
        '--x': `${Math.cos(angle) * dist}vmax`,
        '--y': `${Math.sin(angle) * dist + 25}vmax`,
        '--r': `${Math.round(Math.random() * 1080 - 540)}deg`,
        '--d': `${Math.round(Math.random() * 250)}ms`,
      },
    };
  });
}

function makeHearts(n: number): Particle[] {
  return Array.from({ length: n }, () => ({
    color: CONFETTI_COLORS[Math.floor(Math.random() * 2)],
    style: {
      left: `${Math.round(Math.random() * 100)}%`,
      '--s': `${(0.6 + Math.random() * 0.9).toFixed(2)}`,
      '--d': `${Math.round(Math.random() * 1800)}ms`,
      '--w': `${Math.round(Math.random() * 40 - 20)}px`,
    },
  }));
}

/** A greeting card from the page address, with a burst of confetti and rising hearts. */
export function Greeting({ store }: { store: Store }) {
  const text = store.greeting.value;
  const [burst] = useState(() => ({ confetti: makeConfetti(70), hearts: makeHearts(18) }));
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setPlaying(false), BURST_MS);
    return () => clearTimeout(id);
  }, []);
  if (!text) return null;
  const t = store.t.value;

  return (
    <div class="overlay greeting" role="dialog" aria-modal="true" aria-label={text.split('\n')[0]}>
      {playing && (
        <div class="burst" aria-hidden="true">
          {burst.confetti.map((p, k) => (
            <span key={`c${k}`} class="confetti" style={{ ...p.style, background: p.color }} />
          ))}
          {burst.hearts.map((p, k) => (
            <span key={`h${k}`} class="float-heart" style={{ ...p.style, color: p.color }}>
              <Heart size={28} />
            </span>
          ))}
        </div>
      )}
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
