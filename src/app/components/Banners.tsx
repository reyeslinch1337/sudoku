import type { Store } from '../store';

export function UpdateBanner({ store }: { store: Store }) {
  const apply = store.update.value;
  if (!apply) return null;
  const t = store.t.value;
  return (
    <div class="banner" role="status">
      <span>{t.updateAvailable}</span>
      <button
        type="button"
        class="btn primary"
        onClick={() => {
          store.persist();
          apply();
        }}
      >
        {t.update}
      </button>
    </div>
  );
}

/** True on iPhone and iPad Safari when the page is not running from the Home Screen. */
export function shouldOfferInstall(nav: Navigator, standalone: boolean): boolean {
  const ios =
    /iPhone|iPad|iPod/.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return ios && !standalone;
}

export function InstallTip({ store, offer }: { store: Store; offer: boolean }) {
  if (!offer || store.settings.value.installTipShown) return null;
  const t = store.t.value;
  return (
    <div class="banner" role="note">
      <span>{t.installTip}</span>
      <button type="button" class="btn ghost" onClick={store.dismissInstallTip}>
        {t.close}
      </button>
    </div>
  );
}
