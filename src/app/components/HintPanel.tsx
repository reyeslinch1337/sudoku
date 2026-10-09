import { cellName } from '../../engine/grid';
import { type Cand, TECHNIQUE_NAMES } from '../../engine/step';
import type { Dict } from '../i18n';
import type { Store } from '../store';

function groupByDigit(cands: Cand[]): [number, string][] {
  const by = new Map<number, string[]>();
  for (const c of cands) {
    if (!by.has(c.digit)) by.set(c.digit, []);
    by.get(c.digit)!.push(cellName(c.cell));
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([d, cells]) => [d, cells.join(', ')]);
}

export function conclusionLines(t: Dict, placements: Cand[], eliminations: Cand[]): string[] {
  return [
    ...groupByDigit(placements).map(([d, cells]) => t.place(d, cells)),
    ...groupByDigit(eliminations).map(([d, cells]) => t.remove(d, cells)),
  ];
}

export function HintPanel({ store }: { store: Store }) {
  const t = store.t.value;
  const { level, hint, loading } = store.hint.value;
  if (level === 0) return null;

  let title = '';
  let detail: string | null = null;
  let lines: string[] = [];
  let canApply = false;
  if (loading || !hint) {
    title = t.thinking;
  } else if (hint.kind === 'none') {
    title = t.hintNone;
  } else if (hint.kind === 'error') {
    const cell = cellName(hint.error.cell);
    title = t.hintError;
    if (level >= 2)
      detail =
        hint.error.kind === 'wrongDigit'
          ? t.wrongDigit(cell, hint.error.digit)
          : t.lostCandidate(cell);
    if (level >= 3) {
      lines = [
        hint.error.kind === 'wrongDigit'
          ? t.fixWrongDigit(cell, hint.error.digit)
          : t.fixLostCandidate(cell, hint.error.digit),
      ];
      canApply = true;
    }
  } else {
    title = TECHNIQUE_NAMES[hint.step.technique];
    if (level >= 2) detail = t.techniques[hint.step.technique];
    if (level >= 3) {
      lines = conclusionLines(t, hint.step.placements, hint.step.eliminations);
      canApply = true;
    }
  }
  const canMore = !loading && hint !== null && hint.kind !== 'none' && level < 3;

  return (
    <section class="hint-panel" aria-live="polite">
      <div class="hint-text">
        <strong class="hint-title">{title}</strong>
        {detail && <p class="hint-detail">{detail}</p>}
        {lines.map((l) => (
          <p class="hint-line" key={l}>
            {l}
          </p>
        ))}
      </div>
      <div class="hint-actions">
        {canMore && (
          <button type="button" class="btn" onClick={() => void store.pressHint()}>
            {t.more}
          </button>
        )}
        {canApply && (
          <button type="button" class="btn primary" onClick={store.applyHint}>
            {t.apply}
          </button>
        )}
        <button type="button" class="btn ghost" onClick={store.closeHint}>
          {t.close}
        </button>
      </div>
    </section>
  );
}
