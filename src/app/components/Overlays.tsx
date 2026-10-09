import { useState } from 'preact/hooks';
import { type Summary, summarize, summarizeByRange } from '../../game/stats';
import { formatTime } from '../../game/timer';
import type { Store } from '../store';

function Sheet(props: { title: string; onClose?: () => void; children: preact.ComponentChildren }) {
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label={props.title}>
      <div class="sheet">
        <h2 class="sheet-title">{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}

export function Menu({ store }: { store: Store }) {
  const t = store.t.value;
  return (
    <Sheet title={t.menu}>
      <div class="menu-list">
        <button type="button" class="btn primary" onClick={store.requestNewGame}>
          {t.newGame}
        </button>
        <button type="button" class="btn" onClick={() => (store.overlay.value = 'stats')}>
          {t.statistics}
        </button>
        <button type="button" class="btn" onClick={() => (store.overlay.value = 'settings')}>
          {t.settings}
        </button>
        <button type="button" class="btn ghost" onClick={() => (store.overlay.value = 'none')}>
          {t.close}
        </button>
      </div>
    </Sheet>
  );
}

export function ConfirmNew({ store }: { store: Store }) {
  const t = store.t.value;
  return (
    <Sheet title={t.newGame}>
      <p>{t.confirmNewGame}</p>
      <div class="row">
        <button type="button" class="btn primary" onClick={store.startNewGame}>
          {t.yes}
        </button>
        <button type="button" class="btn" onClick={() => (store.overlay.value = 'none')}>
          {t.no}
        </button>
      </div>
    </Sheet>
  );
}

const time = (ms: number | null) => (ms === null ? '-' : formatTime(ms));

function SummaryCard({ name, s, store }: { name: string; s: Summary; store: Store }) {
  const t = store.t.value;
  return (
    <div class="card">
      <h3>{name}</h3>
      <dl class="stats-grid">
        <dt>{t.solved}</dt>
        <dd>{s.solved}</dd>
        <dt>{t.clean}</dt>
        <dd>{s.clean}</dd>
        <dt>{t.best}</dt>
        <dd>{time(s.bestMs)}</dd>
        <dt>{t.average}</dt>
        <dd>{time(s.averageMs)}</dd>
      </dl>
    </div>
  );
}

export function Stats({ store }: { store: Store }) {
  const t = store.t.value;
  const records = store.stats.value;
  const bankIds = new Set(store.bank.map((e) => e.p));
  const solvedInBank = new Set(records.map((r) => r.id).filter((id) => bankIds.has(id))).size;
  return (
    <Sheet title={t.statistics}>
      <p class="progress">{t.progress(solvedInBank, store.bank.length)}</p>
      <SummaryCard name={t.all} s={summarize(records)} store={store} />
      {summarizeByRange(records).map((r) => (
        <SummaryCard key={r.name} name={r.name} s={r.summary} store={store} />
      ))}
      <button type="button" class="btn ghost" onClick={() => (store.overlay.value = 'none')}>
        {t.close}
      </button>
    </Sheet>
  );
}

export function Settings({ store }: { store: Store }) {
  const t = store.t.value;
  const lang = store.settings.value.lang;
  const [exported, setExported] = useState<string | null>(null);
  const [importing, setImporting] = useState('');
  const [confirming, setConfirming] = useState(false);

  async function doExport() {
    const text = store.exportText();
    try {
      await navigator.clipboard.writeText(text);
      store.showToast(t.exportCopied);
      setExported(null);
    } catch {
      setExported(text);
      store.showToast(t.exportManual);
    }
  }

  function doImport() {
    if (store.importText(importing)) {
      store.showToast(t.importDone);
      setImporting('');
      store.overlay.value = 'none';
    } else {
      store.showToast(t.importFailed);
    }
    setConfirming(false);
  }

  return (
    <Sheet title={t.settings}>
      <div class="field">
        <span class="field-label">{t.language}</span>
        <div class="segmented" role="group" aria-label={t.language}>
          <button
            type="button"
            class={lang === 'ru' ? 'seg active' : 'seg'}
            aria-pressed={lang === 'ru'}
            onClick={() => store.setLang('ru')}
          >
            Русский
          </button>
          <button
            type="button"
            class={lang === 'en' ? 'seg active' : 'seg'}
            aria-pressed={lang === 'en'}
            onClick={() => store.setLang('en')}
          >
            English
          </button>
        </div>
      </div>
      <div class="field">
        <button type="button" class="btn" onClick={() => void doExport()}>
          {t.exportData}
        </button>
        {exported && (
          <textarea
            class="export"
            readOnly
            value={exported}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
      </div>
      <div class="field">
        <textarea
          class="export"
          placeholder={t.importPlaceholder}
          value={importing}
          onInput={(e) => setImporting(e.currentTarget.value)}
        />
        {confirming ? (
          <>
            <p>{t.importConfirm}</p>
            <div class="row">
              <button type="button" class="btn primary" onClick={doImport}>
                {t.yes}
              </button>
              <button type="button" class="btn" onClick={() => setConfirming(false)}>
                {t.no}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            class="btn"
            disabled={!importing.trim()}
            onClick={() => setConfirming(true)}
          >
            {t.importData}
          </button>
        )}
      </div>
      <button type="button" class="btn ghost" onClick={() => (store.overlay.value = 'none')}>
        {t.close}
      </button>
    </Sheet>
  );
}

export function Win({ store }: { store: Store }) {
  const t = store.t.value;
  const g = store.game.value;
  return (
    <Sheet title={t.solvedTitle}>
      <dl class="stats-grid">
        <dt>{t.time}</dt>
        <dd>{formatTime(g.elapsedMs)}</dd>
        <dt>{t.hints}</dt>
        <dd>{g.hints}</dd>
        <dt>{t.checks}</dt>
        <dd>{g.checks}</dd>
        <dt>{t.rating}</dt>
        <dd>{g.ref.rating.toFixed(1)}</dd>
      </dl>
      <button type="button" class="btn primary" onClick={store.startNewGame}>
        {t.newGame}
      </button>
    </Sheet>
  );
}

export function Pause({ store }: { store: Store }) {
  const t = store.t.value;
  return (
    <div class="overlay pause" role="dialog" aria-modal="true" aria-label={t.paused}>
      <div class="sheet">
        <h2 class="sheet-title">{t.paused}</h2>
        <button type="button" class="btn primary" onClick={() => (store.paused.value = false)}>
          {t.resume}
        </button>
      </div>
    </div>
  );
}
