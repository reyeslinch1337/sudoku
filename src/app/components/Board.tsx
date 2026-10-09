import { bit, boxOf, colOf, rowOf } from '../../engine/grid';
import type { Mark, MarkRole } from '../../engine/step';
import { conflicts } from '../../game/check';
import type { Store } from '../store';

const candX = (cell: number, d: number) => colOf(cell) * 100 + ((d - 1) % 3) * 33.33 + 16.67;
const candY = (cell: number, d: number) =>
  rowOf(cell) * 100 + Math.floor((d - 1) / 3) * 33.33 + 16.67;

function shorten(x1: number, y1: number, x2: number, y2: number, by: number) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const k = Math.min(by / len, 0.4);
  return [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k, x2 - (x2 - x1) * k, y2 - (y2 - y1) * k];
}

export function Board({ store }: { store: Store }) {
  const g = store.game.value;
  const sel = store.selected.value;
  const h = store.hint.value;
  const checked = store.checked.value;
  const bad = conflicts(g.values);
  const selValue = sel !== null ? g.values[sel] : 0;

  const showHint = h.level >= 2 && h.hint !== null;
  const step = showHint && h.hint!.kind === 'step' ? h.hint!.step : null;
  const errorCell = showHint && h.hint!.kind === 'error' ? h.hint!.error.cell : -1;
  const marks = new Map<number, Map<number, MarkRole>>();
  if (step) {
    for (const m of step.marks as Mark[]) {
      if (!marks.has(m.cell)) marks.set(m.cell, new Map());
      const prev = marks.get(m.cell)!.get(m.digit);
      // An eliminated candidate is the most important thing to see.
      if (prev !== 'elim') marks.get(m.cell)!.set(m.digit, m.role);
    }
  }
  const stepCells = new Set(step ? step.cells : []);
  const placements = new Map((step?.placements ?? []).map((p) => [p.cell, p.digit]));

  const cells = [];
  for (let i = 0; i < 81; i++) {
    const v = g.values[i];
    const cls = ['cell'];
    if (g.givens[i]) cls.push('given');
    else if (v) cls.push('entered');
    if (colOf(i) % 3 === 2 && colOf(i) < 8) cls.push('box-r');
    if (rowOf(i) % 3 === 2 && rowOf(i) < 8) cls.push('box-b');
    if (sel === i) cls.push('selected');
    else if (
      sel !== null &&
      (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel))
    )
      cls.push('peer');
    if (selValue && v === selValue && sel !== i) cls.push('same');
    if (bad.has(i)) cls.push('conflict');
    if (checked?.has(i) || errorCell === i) cls.push('error');
    if (stepCells.has(i)) cls.push('hint-cell');

    const cellMarks = marks.get(i);
    let content;
    if (v) {
      content = <span class="digit">{v}</span>;
    } else {
      const noteMask = g.notes[i];
      const notes = [];
      for (let d = 1; d <= 9; d++) {
        const role = cellMarks?.get(d);
        const shown = noteMask & bit(d) || role !== undefined || placements.get(i) === d;
        const ncls = ['note'];
        if (role) ncls.push(`mark-${role}`);
        if (placements.get(i) === d) ncls.push('mark-place');
        if (selValue && d === selValue && noteMask & bit(d)) ncls.push('same-note');
        notes.push(
          <span class={ncls.join(' ')} key={d}>
            {shown ? d : ''}
          </span>,
        );
      }
      content = <span class="notes">{notes}</span>;
    }
    const label = `r${rowOf(i) + 1}c${colOf(i) + 1}${v ? ` ${v}` : ''}`;
    cells.push(
      <button
        type="button"
        key={i}
        class={cls.join(' ')}
        aria-label={label}
        data-cell={i}
        onClick={() => (store.selected.value = i)}
      >
        {content}
      </button>,
    );
  }

  return (
    <div class="board-wrap">
      <div class="board" role="grid">
        {cells}
      </div>
      {step && step.links.length > 0 && (
        <svg class="links" viewBox="0 0 900 900" aria-hidden="true">
          {step.links.map((l, k) => {
            const [x1, y1, x2, y2] = shorten(
              candX(l.from.cell, l.from.digit),
              candY(l.from.cell, l.from.digit),
              candX(l.to.cell, l.to.digit),
              candY(l.to.cell, l.to.digit),
              12,
            );
            return (
              <line
                key={k}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                class={l.strong ? 'link strong' : 'link weak'}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
