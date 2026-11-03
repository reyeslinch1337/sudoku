import { LEVEL_NAMES } from '../../game/stats';
import { ratingLabel } from '../../game/pick';
import { formatTime } from '../../game/timer';
import type { Store } from '../store';
import { Burst, GOLD_COLORS } from './Burst';

const GoldFill = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe27a" />
      <stop offset="0.55" stop-color="#f4b400" />
      <stop offset="1" stop-color="#c98a00" />
    </linearGradient>
  </defs>
);

export const Star = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} class="reward-icon" aria-hidden="true">
    <GoldFill id="gold-star" />
    <path
      d="M12 1.8l3.1 6.4 7 1-5.1 4.9 1.2 7L12 17.8l-6.2 3.3 1.2-7L1.9 9.2l7-1z"
      fill="url(#gold-star)"
      stroke="#b07a00"
      stroke-width="0.6"
      stroke-linejoin="round"
    />
  </svg>
);

export const Crown = ({ size, class: cls }: { size: number; class?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} class={cls} aria-hidden="true">
    <GoldFill id="gold-crown" />
    <path
      d="M2.5 7.5l5 4.5L12 4l4.5 8 5-4.5-2 11h-15z"
      fill="url(#gold-crown)"
      stroke="#b07a00"
      stroke-width="0.6"
      stroke-linejoin="round"
    />
    <rect x="4.3" y="19.5" width="15.4" height="2.4" rx="1" fill="#c98a00" />
    <circle cx="12" cy="4" r="1.3" fill="#ffe27a" />
    <circle cx="2.5" cy="7.5" r="1.1" fill="#ffe27a" />
    <circle cx="21.5" cy="7.5" r="1.1" fill="#ffe27a" />
  </svg>
);

function SolveFacts({ store }: { store: Store }) {
  const t = store.t.value;
  const g = store.game.value;
  return (
    <dl class="stats-grid">
      <dt>{t.time}</dt>
      <dd>{formatTime(g.elapsedMs)}</dd>
      <dt>{t.hints}</dt>
      <dd>{g.hints}</dd>
      <dt>{t.checks}</dt>
      <dd>{g.checks}</dd>
      <dt>{t.rating}</dt>
      <dd>{ratingLabel(g.ref)}</dd>
    </dl>
  );
}

/** Shown after a solve: a golden star and a burst of gold confetti. */
export function Win({ store }: { store: Store }) {
  const t = store.t.value;
  return (
    <div class="overlay reward" role="dialog" aria-modal="true" aria-label={t.success}>
      <Burst colors={GOLD_COLORS} confetti={60} ms={3200} />
      <div class="reward-card">
        <Star size={88} />
        <h2 class="reward-title">{t.success}</h2>
        <SolveFacts store={store} />
        <button type="button" class="btn primary" onClick={store.requestNewGame}>
          {t.newGame}
        </button>
      </div>
    </div>
  );
}

/** Shown instead of the win screen when the solve completes a whole level. */
export function CrownCard({ store }: { store: Store }) {
  const t = store.t.value;
  const level = store.game.value.ref.level ?? 9;
  const crown = store.crowns.value.find((c) => c.level === level);
  const title = t.crownTitle(LEVEL_NAMES[level]);
  return (
    <div class="overlay reward crown" role="dialog" aria-modal="true" aria-label={title}>
      <Burst colors={GOLD_COLORS} confetti={120} ms={4500} />
      <div class="reward-card">
        <Crown size={104} class="reward-icon" />
        <h2 class="reward-title">{title}</h2>
        {crown && <p class="reward-text">{t.crownText(crown.total)}</p>}
        <SolveFacts store={store} />
        <button type="button" class="btn primary" onClick={store.requestNewGame}>
          {t.newGame}
        </button>
      </div>
    </div>
  );
}
