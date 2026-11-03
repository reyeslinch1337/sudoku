import { useEffect, useState } from 'preact/hooks';

const HEART =
  'M12 21s-7.5-4.6-10-9.3C.4 8.6 2.3 4.5 6.2 4.5c2.3 0 3.9 1.3 5.8 3.6 1.9-2.3 3.5-3.6 5.8-3.6 3.9 0 5.8 4.1 4.2 7.2C19.5 16.4 12 21 12 21z';

export const Heart = ({ size, class: cls }: { size: number; class?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} class={cls} aria-hidden="true">
    <path d={HEART} fill="currentColor" />
  </svg>
);

export const PARTY_COLORS = ['#e0445f', '#ff8fa3', '#ffd166', '#6f95ff', '#5fd18d', '#c69cf0'];
export const GOLD_COLORS = ['#ffd54a', '#f4b400', '#e8a317', '#ffe9a3', '#c9932b', '#fff3c4'];

interface Particle {
  style: Record<string, string>;
  color: string;
}

const pick = (colors: string[]) => colors[Math.floor(Math.random() * colors.length)];

function makeConfetti(n: number, colors: string[]): Particle[] {
  return Array.from({ length: n }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 45;
    return {
      color: pick(colors),
      style: {
        '--x': `${Math.cos(angle) * dist}vmax`,
        '--y': `${Math.sin(angle) * dist + 25}vmax`,
        '--r': `${Math.round(Math.random() * 1080 - 540)}deg`,
        '--d': `${Math.round(Math.random() * 250)}ms`,
      },
    };
  });
}

function makeHearts(n: number, colors: string[]): Particle[] {
  return Array.from({ length: n }, () => ({
    color: pick(colors.slice(0, 2)),
    style: {
      left: `${Math.round(Math.random() * 100)}%`,
      '--s': `${(0.6 + Math.random() * 0.9).toFixed(2)}`,
      '--d': `${Math.round(Math.random() * 1800)}ms`,
      '--w': `${Math.round(Math.random() * 40 - 20)}px`,
    },
  }));
}

/** A one-off burst of confetti (and optionally rising hearts) behind a card. */
export function Burst(props: { colors: string[]; confetti: number; hearts?: number; ms: number }) {
  const [parts] = useState(() => ({
    confetti: makeConfetti(props.confetti, props.colors),
    hearts: makeHearts(props.hearts ?? 0, props.colors),
  }));
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setPlaying(false), props.ms);
    return () => clearTimeout(id);
  }, []);
  if (!playing) return null;
  return (
    <div class="burst" aria-hidden="true">
      {parts.confetti.map((p, k) => (
        <span key={`c${k}`} class="confetti" style={{ ...p.style, background: p.color }} />
      ))}
      {parts.hearts.map((p, k) => (
        <span key={`h${k}`} class="float-heart" style={{ ...p.style, color: p.color }}>
          <Heart size={28} />
        </span>
      ))}
    </div>
  );
}
