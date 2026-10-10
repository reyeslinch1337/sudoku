import { formatTime } from '../../game/timer';
import { ratingLabel } from '../../game/pick';
import type { Store } from '../store';
import { IconMenu, IconPause } from './Icons';

export function Header({ store }: { store: Store }) {
  const t = store.t.value;
  const g = store.game.value;
  return (
    <header class="header">
      <button
        type="button"
        class="icon-btn"
        aria-label={t.menu}
        onClick={() => (store.overlay.value = 'menu')}
      >
        <IconMenu />
      </button>
      <div class="header-info">
        <span class="rating" title={t.rating}>
          {ratingLabel(g.ref)}
        </span>
        <span class="timer">{formatTime(g.elapsedMs)}</span>
      </div>
      <button
        type="button"
        class="icon-btn"
        aria-label={t.pause}
        onClick={() => (store.paused.value = true)}
      >
        <IconPause />
      </button>
    </header>
  );
}
